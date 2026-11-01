import { prisma } from '../services/prisma.service.js';
import { getLLMProvider } from '../providers/llm/index.js';
import { logger } from '../utils/logger.js';
import { ResearchResult } from '../providers/interfaces.js';

export const scriptAgent = {
  name: 'Script Agent',

  async run(projectId: string) {
    const startTime = Date.now();
    logger.info(`[ScriptAgent] Starting script generation for project ${projectId}`);

    const execution = await prisma.agentExecution.create({
      data: {
        projectId,
        agentType: 'SCRIPT',
        status: 'RUNNING',
        startedAt: new Date(),
        logs: 'Analyzing research data and drafting scene-by-scene script...',
      },
    });

    try {
      const project = await prisma.videoProject.findUnique({
        where: { id: projectId },
      });

      if (!project) throw new Error('Project not found');

      await prisma.videoProject.update({
        where: { id: projectId },
        data: { status: 'SCRIPTING', currentStage: 'script' },
      });

      const research: ResearchResult = {
        topic: project.topic,
        angle: project.researchNotes || `In-depth exploration of ${project.topic}`,
        targetAudience: project.targetAudience || 'General Audience',
        keywords: project.keywords ? JSON.parse(project.keywords) : [project.topic],
        contentOutline: project.contentOutline ? JSON.parse(project.contentOutline) : [],
        hooks: [],
      };

      const llm = await getLLMProvider('SCRIPT');
      const scriptResult = await llm.generateScript({
        topic: project.topic,
        research,
        targetDuration: project.targetDuration,
        format: project.format,
        visualStyle: project.visualStyle,
        voiceStyle: project.voiceStyle,
        language: project.language,
      });

      // Clear old scenes if regenerating
      await prisma.videoScene.deleteMany({
        where: { projectId },
      });

      // Insert new generated scenes
      for (const scene of scriptResult.scenes) {
        await prisma.videoScene.create({
          data: {
            projectId,
            sceneNumber: scene.sceneNumber,
            narrationText: scene.narrationText,
            visualPrompt: scene.visualPrompt,
            cameraMovement: scene.cameraMovement || 'Zoom in slowly',
            transition: scene.transition || 'fade',
            duration: scene.durationSeconds || 5.0,
            status: 'PENDING',
          },
        });
      }

      const durationMs = Date.now() - startTime;
      await prisma.videoProject.update({
        where: { id: projectId },
        data: {
          title: scriptResult.title || project.title,
          progress: 30,
        },
      });

      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          executionTimeMs: durationMs,
          outputPayload: JSON.stringify(scriptResult),
          logs: `Script completed with ${scriptResult.scenes.length} scenes. Estimated duration: ${scriptResult.totalEstimatedDuration}s.`,
        },
      });

      return { success: true, data: scriptResult };
    } catch (err: any) {
      logger.error(`[ScriptAgent] Failed for project ${projectId}:`, err);
      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: err.message,
          logs: `Script Agent failed: ${err.message}`,
        },
      });
      throw err;
    }
  },
};

