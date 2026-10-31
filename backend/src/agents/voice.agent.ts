import { prisma } from '../services/prisma.service.js';
import { getTTSProvider } from '../providers/tts/index.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import path from 'path';

export const voiceAgent = {
  name: 'Voice Agent',

  async run(projectId: string, sceneId?: string) {
    const startTime = Date.now();
    logger.info(`[VoiceAgent] Synthesizing narration voiceover for project ${projectId}`);

    const execution = await prisma.agentExecution.create({
      data: {
        projectId,
        agentType: 'VOICE',
        status: 'RUNNING',
        startedAt: new Date(),
        logs: 'Synthesizing voiceover audio tracks and calculating precise scene durations...',
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

      const ttsProvider = getTTSProvider();
      const results = [];

      for (const scene of scenesToProcess) {
        const filename = `voice_${project.id}_${scene.sceneNumber}_${Date.now()}.mp3`;
        const outputPath = path.join(config.storage.uploadDir, filename);

        const ttsResult = await ttsProvider.generateSpeech({
          text: scene.narrationText,
          voiceStyle: project.voiceStyle,
          language: project.language === 'English' ? 'en' : 'en',
          outputPath,
        });

        // Create asset record
        await prisma.generatedAsset.create({
          data: {
            projectId,
            sceneId: scene.id,
            type: 'AUDIO',
            provider: ttsProvider.name,
            prompt: scene.narrationText,
            url: ttsResult.url,
            localPath: ttsResult.localPath,
          },
        });

        // Update scene audio URL and duration matching spoken voice
        await prisma.videoScene.update({
          where: { id: scene.id },
          data: {
            audioUrl: ttsResult.url,
            duration: Math.max(scene.duration, ttsResult.durationSeconds),
          },
        });

        results.push({ sceneNumber: scene.sceneNumber, ...ttsResult });
      }

      const durationMs = Date.now() - startTime;
      await prisma.videoProject.update({
        where: { id: projectId },
        data: { progress: 70 },
      });

      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          executionTimeMs: durationMs,
          outputPayload: JSON.stringify(results),
          logs: `Generated ${results.length} audio narration tracks in ${durationMs}ms.`,
        },
      });

      return { success: true, data: results };
    } catch (err: any) {
      logger.error(`[VoiceAgent] Failed for project ${projectId}:`, err);
      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: err.message,
          logs: `Voice Agent failed: ${err.message}`,
        },
      });
      throw err;
    }
  },
};

