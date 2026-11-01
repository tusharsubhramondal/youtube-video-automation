import { prisma } from '../services/prisma.service.js';
import { getLLMProvider } from '../providers/llm/index.js';
import { getImageProvider } from '../providers/image/index.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import path from 'path';

export const thumbnailAgent = {
  name: 'Thumbnail Agent',

  async run(projectId: string, customPrompt?: string) {
    const startTime = Date.now();
    logger.info(`[ThumbnailAgent] Generating high-CTR thumbnail for project ${projectId}`);

    const execution = await prisma.agentExecution.create({
      data: {
        projectId,
        agentType: 'THUMBNAIL',
        status: 'RUNNING',
        startedAt: new Date(),
        logs: 'Synthesizing viral thumbnail concept and generating visual asset...',
      },
    });

    try {
      const project = await prisma.videoProject.findUnique({
        where: { id: projectId },
      });

      if (!project) throw new Error('Project not found');

      const llm = await getLLMProvider('THUMBNAIL');
      const imageProvider = getImageProvider('THUMBNAIL');

      const thumbConcept = await llm.generateThumbnailPrompt(project.topic, project.visualStyle);
      const promptToUse = customPrompt || thumbConcept.prompt;

      const filename = `thumbnail_${project.id}_${Date.now()}.png`;
      const outputPath = path.join(config.storage.uploadDir, filename);

      const imgResult = await imageProvider.generateImage({
        prompt: promptToUse,
        aspectRatio: '16:9',
        style: project.visualStyle,
        outputPath,
      });

      // Save asset
      await prisma.generatedAsset.create({
        data: {
          projectId,
          type: 'THUMBNAIL',
          provider: imageProvider.name,
          prompt: promptToUse,
          url: imgResult.url,
          localPath: imgResult.localPath,
          fileSizeBytes: imgResult.fileSizeBytes,
        },
      });

      // Update project
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
          outputPayload: JSON.stringify({ ...thumbConcept, ...imgResult }),
          logs: `Thumbnail generated in ${durationMs}ms with overlay text "${thumbConcept.overlayText}".`,
        },
      });

      return { success: true, data: { ...thumbConcept, ...imgResult } };
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

