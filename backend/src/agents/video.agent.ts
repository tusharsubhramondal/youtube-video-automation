import { prisma } from '../services/prisma.service.js';
import { getVideoProvider } from '../providers/video/index.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import path from 'path';
import fs from 'fs';

export const videoAgent = {
  name: 'Video Agent',

  async run(projectId: string, sceneId?: string) {
    const startTime = Date.now();
    logger.info(`[VideoAgent] Generating motion video clips for project ${projectId}`);

    const execution = await prisma.agentExecution.create({
      data: {
        projectId,
        agentType: 'VIDEO',
        status: 'RUNNING',
        startedAt: new Date(),
        logs: 'Generating dynamic scene video clips with camera motion and transitions...',
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

      const videoProvider = getVideoProvider();
      const isShorts = project.format === 'SHORTS';
      const aspectRatio = isShorts ? '9:16' : '16:9';

      const results = [];

      for (const scene of scenesToProcess) {
        const filename = `clip_${project.id}_${scene.sceneNumber}_${Date.now()}.mp4`;
        const outputPath = path.join(config.storage.uploadDir, filename);

        // Find local image path if image exists
        let localImagePath: string | undefined;
        if (scene.imageUrl) {
          const imgFilename = path.basename(scene.imageUrl);
          const candidatePath = path.join(config.storage.uploadDir, imgFilename);
          if (fs.existsSync(candidatePath)) {
            localImagePath = candidatePath;
          }
        }

        const vidResult = await videoProvider.generateVideo({
          imagePath: localImagePath,
          durationSeconds: scene.duration || 5.0,
          aspectRatio,
          cameraMovement: scene.cameraMovement || 'Zoom in slowly',
          outputPath,
        });

        // Create asset record
        await prisma.generatedAsset.create({
          data: {
            projectId,
            sceneId: scene.id,
            type: 'VIDEO',
            provider: videoProvider.name,
            prompt: scene.visualPrompt,
            url: vidResult.url,
            localPath: vidResult.localPath,
            fileSizeBytes: vidResult.fileSizeBytes,
          },
        });

        // Update scene
        await prisma.videoScene.update({
          where: { id: scene.id },
          data: {
            videoUrl: vidResult.url,
          },
        });

        results.push({ sceneNumber: scene.sceneNumber, ...vidResult });
      }

      const durationMs = Date.now() - startTime;
      await prisma.videoProject.update({
        where: { id: projectId },
        data: { progress: 60 },
      });

      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          executionTimeMs: durationMs,
          outputPayload: JSON.stringify(results),
          logs: `Generated ${results.length} video clips in ${durationMs}ms with motion synthesis.`,
        },
      });

      return { success: true, data: results };
    } catch (err: any) {
      logger.error(`[VideoAgent] Failed for project ${projectId}:`, err);
      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: err.message,
          logs: `Video Agent failed: ${err.message}`,
        },
      });
      throw err;
    }
  },
};

