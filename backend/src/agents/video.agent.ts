import { prisma } from '../services/prisma.service.js';
import { getVideoProvider } from '../providers/video/index.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { getProjectStoragePath, resolveAssetLocalPath } from '../utils/storage.util.js';
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

      await prisma.videoProject.update({
        where: { id: projectId },
        data: { currentStage: 'video' },
      });

      const scenesToProcess = sceneId
        ? project.scenes.filter((s) => s.id === sceneId)
        : project.scenes;

      const videoProvider = getVideoProvider();
      const isShorts = project.format === 'SHORTS';
      const aspectRatio = isShorts ? '9:16' : '16:9';

      const results = [];

      for (const scene of scenesToProcess) {
        // Check if an externally imported/uploaded video clip is already associated with this scene
        if (scene.videoUrl && !sceneId) {
          const resolvedVideoPath = resolveAssetLocalPath(scene.videoUrl);
          if (resolvedVideoPath && resolvedVideoPath.endsWith('.mp4')) {
            logger.info(`Scene ${scene.sceneNumber} has existing imported clip: ${path.basename(resolvedVideoPath)}. Preserving external asset.`);
            results.push({
              sceneNumber: scene.sceneNumber,
              url: scene.videoUrl,
              localPath: resolvedVideoPath,
              durationSeconds: scene.duration || 5.0,
            });
            continue;
          }
        }

        const videoDir = getProjectStoragePath(project.id, 'video');
        const filename = `clip_scene_${scene.sceneNumber}_${Date.now()}.mp4`;
        const outputPath = path.join(videoDir, filename);

        // Find local image path if image exists
        let localImagePath: string | undefined;
        if (scene.imageUrl) {
          const resolvedImg = resolveAssetLocalPath(scene.imageUrl);
          if (resolvedImg) {
            localImagePath = resolvedImg;
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

