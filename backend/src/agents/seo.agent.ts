import { prisma } from '../services/prisma.service.js';
import { getLLMProvider } from '../providers/llm/index.js';
import { logger } from '../utils/logger.js';

export const seoAgent = {
  name: 'SEO Agent',

  async run(projectId: string) {
    const startTime = Date.now();
    logger.info(`[SeoAgent] Generating SEO titles, tags, and description for project ${projectId}`);

    const execution = await prisma.agentExecution.create({
      data: {
        projectId,
        agentType: 'SEO',
        status: 'RUNNING',
        startedAt: new Date(),
        logs: 'Synthesizing viral YouTube titles, SEO metadata, timestamps, and hashtags...',
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
        data: { currentStage: 'seo' },
      });

      const llm = await getLLMProvider('SEO');
      const seoData = await llm.generateSeoMetadata({
        topic: project.topic,
        category: project.category,
        language: project.language,
        script: {
          title: project.title,
          hook: project.researchNotes || '',
          scenes: project.scenes.map((s) => ({
            sceneNumber: s.sceneNumber,
            narrationText: s.narrationText,
            visualPrompt: s.visualPrompt,
            cameraMovement: s.cameraMovement || '',
            transition: s.transition || '',
            durationSeconds: s.duration || 5,
          })),
          callToAction: 'Subscribe for more videos',
          totalEstimatedDuration: project.scenes.reduce((acc, s) => acc + (s.duration || 5), 0),
        },
      });

      const selectedTitle = seoData.titles[0] || project.title;

      await prisma.videoProject.update({
        where: { id: projectId },
        data: {
          seoTitle: selectedTitle,
          seoDescription: seoData.description,
          seoTags: JSON.stringify(seoData.tags),
          status: 'READY_TO_PUBLISH',
          currentStage: 'ready_to_publish',
          progress: 100,
        },
      });

      const durationMs = Date.now() - startTime;
      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          executionTimeMs: durationMs,
          outputPayload: JSON.stringify(seoData),
          logs: `Generated ${seoData.titles.length} high-CTR titles, full SEO description, and ${seoData.tags.length} search tags.`,
        },
      });

      return { success: true, data: seoData };
    } catch (err: any) {
      logger.error(`[SeoAgent] Failed for project ${projectId}:`, err);
      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: err.message,
          logs: `SEO Agent failed: ${err.message}`,
        },
      });
      throw err;
    }
  },
};

