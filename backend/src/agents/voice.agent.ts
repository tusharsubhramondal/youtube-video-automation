import { prisma } from '../services/prisma.service.js';
import { getTTSProvider } from '../providers/tts/index.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { getProjectStoragePath } from '../utils/storage.util.js';
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

      await prisma.videoProject.update({
        where: { id: projectId },
        data: { status: 'MEDIA_GENERATION', currentStage: 'voice' },
      });

      const scenesToProcess = sceneId
        ? project.scenes.filter((s) => s.id === sceneId)
        : project.scenes;

      const ttsProvider = getTTSProvider();
      const results = [];

      for (const scene of scenesToProcess) {
        const audioDir = getProjectStoragePath(project.id, 'audio');
        const filename = `voice_scene_${scene.sceneNumber}_${Date.now()}.mp3`;
        const outputPath = path.join(audioDir, filename);

        const isBengali = project.language?.toLowerCase().includes('bengali') || project.language === 'bn' || project.language === 'বাংলা';
        const ttsLanguage = isBengali
          ? 'bn-IN'
          : project.language === 'Spanish'
            ? 'es-ES'
            : project.language === 'French'
              ? 'fr-FR'
              : project.language === 'German'
                ? 'de-DE'
                : project.language === 'Hindi'
                  ? 'hi-IN'
                  : project.language === 'Japanese'
                    ? 'ja-JP'
                    : 'en';

        const ttsResult = await ttsProvider.generateSpeech({
          text: scene.narrationText,
          voiceStyle: project.voiceStyle,
          language: ttsLanguage,
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

