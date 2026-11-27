import { prisma } from '../services/prisma.service.js';
import { getLLMProvider } from '../providers/llm/index.js';
import { getImageProvider } from '../providers/image/index.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { getProjectStoragePath, resolveAssetLocalPath } from '../utils/storage.util.js';
import { overlayThumbnailText } from '../utils/thumbnail.util.js';
import path from 'path';
import fs from 'fs';

export interface ThumbnailAgentOptions {
  customPrompt?: string;
  overlayText?: string;
  textColor?: string;
  accentBorderColor?: string;
  position?: 'bottom' | 'top' | 'center';
  onlyOverlay?: boolean;
}

export interface ThumbnailAgentResult {
  success: boolean;
  data: {
    concept: string;
    prompt: string;
    overlayText?: string;
    thumbnailUrl: string;
    url?: string;
    localPath?: string;
    fileSizeBytes?: number;
    provider?: string;
    model?: string;
  };
}

export const thumbnailAgent = {
  name: 'Thumbnail Agent',

  async run(projectId: string, optionsOrPrompt?: string | ThumbnailAgentOptions): Promise<ThumbnailAgentResult> {
    const startTime = Date.now();
    const options: ThumbnailAgentOptions =
      typeof optionsOrPrompt === 'string'
        ? { customPrompt: optionsOrPrompt }
        : optionsOrPrompt || {};

    logger.info(`[ThumbnailAgent] Processing high-CTR thumbnail for project ${projectId}`, options);

    const execution = await prisma.agentExecution.create({
      data: {
        projectId,
        agentType: 'THUMBNAIL',
        status: 'RUNNING',
        startedAt: new Date(),
        logs: options.onlyOverlay
          ? 'Compositing updated typography overlay onto existing thumbnail image...'
          : 'Synthesizing viral thumbnail concept and generating visual asset...',
      },
    });

    try {
      const project = await prisma.videoProject.findUnique({
        where: { id: projectId },
      });

      if (!project) throw new Error('Project not found');

      // 1. FAST PATH: Only burn/re-burn overlay text onto existing thumbnail image
      if (options.onlyOverlay && project.thumbnailUrl) {
        let localPath = resolveAssetLocalPath(project.thumbnailUrl);
        if (!localPath || !fs.existsSync(localPath)) {
          // Fallback search in project thumbnails folder
          const thumbDir = getProjectStoragePath(project.id, 'thumbnails');
          const thumbFilename = path.basename(project.thumbnailUrl.split('?')[0]);
          const candidate = path.join(thumbDir, thumbFilename);
          if (fs.existsSync(candidate)) localPath = candidate;
        }

        if (!localPath || !fs.existsSync(localPath)) {
          throw new Error('Existing thumbnail image file could not be located on disk.');
        }

        const textToUse = options.overlayText || 'WATCH THIS!';
        await overlayThumbnailText({
          inputImagePath: localPath,
          outputImagePath: localPath,
          overlayText: textToUse,
          language: project.language,
          textColor: options.textColor || '#FFE600',
          accentBorderColor: options.accentBorderColor || '#FF3C00',
          position: options.position || 'bottom',
        });

        const updatedSize = fs.statSync(localPath).size;
        const durationMs = Date.now() - startTime;

        await prisma.agentExecution.update({
          where: { id: execution.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            executionTimeMs: durationMs,
            logs: `Successfully baked overlay text "${textToUse}" onto thumbnail in ${durationMs}ms.`,
          },
        });

        return {
          success: true,
          data: {
            concept: project.thumbnailPrompt || '',
            prompt: project.thumbnailPrompt || '',
            thumbnailUrl: project.thumbnailUrl,
            url: project.thumbnailUrl,
            localPath,
            overlayText: textToUse,
            fileSizeBytes: updatedSize,
          },
        };
      }

      // 2. STANDARD PATH: Full AI visual concept generation & text burn-in
      await prisma.videoProject.update({
        where: { id: projectId },
        data: { status: 'THUMBNAIL_SEO', currentStage: 'thumbnail' },
      });

      const llm = await getLLMProvider('THUMBNAIL');
      const imageProvider = getImageProvider('THUMBNAIL');

      const thumbConcept = await llm.generateThumbnailPrompt(project.topic, project.visualStyle);
      const promptToUse = options.customPrompt || thumbConcept.prompt;
      const textToBurn = options.overlayText !== undefined ? options.overlayText : thumbConcept.overlayText;

      const thumbDir = getProjectStoragePath(project.id, 'thumbnails');
      const filename = `thumbnail_${Date.now()}.png`;
      const outputPath = path.join(thumbDir, filename);

      const imgResult = await imageProvider.generateImage({
        prompt: promptToUse,
        aspectRatio: '16:9',
        style: project.visualStyle,
        outputPath,
      });

      // 3. Burn-in high-CTR overlay typography directly onto image file
      if (textToBurn && textToBurn.trim()) {
        try {
          await overlayThumbnailText({
            inputImagePath: outputPath,
            outputImagePath: outputPath,
            overlayText: textToBurn.trim(),
            language: project.language,
            textColor: options.textColor || '#FFE600',
            accentBorderColor: options.accentBorderColor || '#FF3C00',
            position: options.position || 'bottom',
          });
          imgResult.fileSizeBytes = fs.statSync(outputPath).size;
          logger.info(`[ThumbnailAgent] Successfully baked overlay text "${textToBurn}" into thumbnail image.`);
        } catch (textErr: any) {
          logger.warn(`[ThumbnailAgent] Failed to composite text overlay: ${textErr.message}`);
        }
      }

      // Save asset in database
      await prisma.generatedAsset.create({
        data: {
          projectId,
          type: 'THUMBNAIL',
          provider: imgResult.provider || imageProvider.name,
          prompt: promptToUse,
          url: imgResult.url,
          localPath: imgResult.localPath,
          fileSizeBytes: imgResult.fileSizeBytes,
        },
      });

      // Update project record
      await prisma.videoProject.update({
        where: { id: projectId },
        data: {
          thumbnailPrompt: promptToUse,
          thumbnailUrl: imgResult.url,
          progress: 92,
        },
      });

      const durationMs = Date.now() - startTime;
      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          executionTimeMs: durationMs,
          outputPayload: JSON.stringify({ ...thumbConcept, ...imgResult, overlayText: textToBurn }),
          logs: `Thumbnail generated in ${durationMs}ms using ${imgResult.provider || imageProvider.name} with burned overlay text "${textToBurn}".`,
        },
      });

      return {
        success: true,
        data: {
          ...thumbConcept,
          ...imgResult,
          thumbnailUrl: imgResult.url,
          overlayText: textToBurn,
        },
      };
    } catch (err: any) {
      logger.error(`[ThumbnailAgent] Failed for project ${projectId}:`, err);
      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: err.message,
          logs: `Thumbnail Agent failed: ${err.message}`,
        },
      });
      throw err;
    }
  },
};
