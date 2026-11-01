import { prisma } from '../services/prisma.service.js';
import { getImageProvider } from '../providers/image/index.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import path from 'path';

export const imageAgent = {
  name: 'Image Agent',

  async run(projectId: string, sceneId?: string) {
    const startTime = Date.now();
    logger.info(`[ImageAgent] Generating scene images for project ${projectId}`);

    const execution = await prisma.agentExecution.create({
      data: {
        projectId,
        agentType: 'IMAGE',
        status: 'RUNNING',
        startedAt: new Date(),
        logs: 'Synthesizing scene visuals based on generated visual prompts...',
      },
    });

    try {
      const project = await prisma.videoProject.findUnique({
        where: { id: projectId },
        include: { scenes: { orderBy: { sceneNumber: 'asc' } } },
      });

      if (!project) throw new Error('Project not found');

      const scenesToProcess = sceneId
        ? project.scenes.filter((s) => s.id === sceneId)
        : project.scenes;

      if (scenesToProcess.length === 0) {
        throw new Error('No scenes found to generate images for');
      }

      const imageProvider = getImageProvider('IMAGE');
      const isShorts = project.format === 'SHORTS';
      const aspectRatio = isShorts ? '9:16' : '16:9';

      const results = [];

      for (const scene of scenesToProcess) {
        logger.info(`Generating image for scene ${scene.sceneNumber}: "${scene.visualPrompt.substring(0, 40)}..."`);
        const filename = `scene_${project.id}_${scene.sceneNumber}_${Date.now()}.png`;
        const outputPath = path.join(config.storage.uploadDir, filename);

        // Enhance prompt with character consistency & coherent artistic styling
        const consistencyDirective = `consistent character design and continuity, coherent wardrobe and identity, ${project.visualStyle} aesthetic, cinematic lighting`;
        const enrichedPrompt = `${scene.visualPrompt}, ${consistencyDirective}, sharp details, 8k`;

        const imgResult = await imageProvider.generateImage({
          prompt: enrichedPrompt,
          aspectRatio,
          style: project.visualStyle,
          outputPath,
        });

        // Create asset record
        const asset = await prisma.generatedAsset.create({
          data: {
            projectId,
            sceneId: scene.id,
            type: 'IMAGE',
            provider: imgResult.provider || imageProvider.name,
            prompt: scene.visualPrompt,
            url: imgResult.url,
            localPath: imgResult.localPath,
            fileSizeBytes: imgResult.fileSizeBytes,
          },
        });

        // Update scene
        await prisma.videoScene.update({
          where: { id: scene.id },
          data: {
            imageUrl: imgResult.url,
          },
        });

        results.push({ sceneNumber: scene.sceneNumber, ...imgResult });
      }

      const durationMs = Date.now() - startTime;
      await prisma.videoProject.update({
        where: { id: projectId },
        data: { progress: 45 },
      });

      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          executionTimeMs: durationMs,
          outputPayload: JSON.stringify(results),
          logs: `Generated ${results.length} scene images in ${durationMs}ms using ${results[0]?.provider || imageProvider.name}.`,
        },
      });

      return { success: true, data: results };
    } catch (err: any) {
      logger.error(`[ImageAgent] Failed for project ${projectId}:`, err);
      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: err.message,
          logs: `Image Agent failed: ${err.message}`,
        },
      });
      throw err;
    }
  },
};

