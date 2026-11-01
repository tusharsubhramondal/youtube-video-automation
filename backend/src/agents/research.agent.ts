import { prisma } from '../services/prisma.service.js';
import { getLLMProvider } from '../providers/llm/index.js';
import { logger } from '../utils/logger.js';

export const researchAgent = {
  name: 'Research Agent',

  async run(projectId: string) {
    const startTime = Date.now();
    logger.info(`[ResearchAgent] Starting research for project ${projectId}`);

    // Create AgentExecution record
    const execution = await prisma.agentExecution.create({
      data: {
        projectId,
        agentType: 'RESEARCH',
        status: 'RUNNING',
        startedAt: new Date(),
        logs: 'Initializing topic research and SEO keyword extraction...',
      },
    });

    try {
      const project = await prisma.videoProject.findUnique({
        where: { id: projectId },
      });

      if (!project) throw new Error('Project not found');

      await prisma.videoProject.update({
        where: { id: projectId },
        data: { status: 'RESEARCHING', currentStage: 'research' },
      });

      const llm = await getLLMProvider('RESEARCH');
      const research = await llm.generateResearch(project.topic, project.category, project.language);

      // Save research output into project
      const updatedProject = await prisma.videoProject.update({
        where: { id: projectId },
        data: {
          researchNotes: research.angle,
          targetAudience: research.targetAudience,
          keywords: JSON.stringify(research.keywords),
          contentOutline: JSON.stringify(research.contentOutline),
          progress: 15,
        },
      });

      const durationMs = Date.now() - startTime;
      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          executionTimeMs: durationMs,
          outputPayload: JSON.stringify(research),
          logs: `Research completed successfully in ${durationMs}ms with ${research.keywords.length} keywords and structured outline.`,
        },
      });

      return { success: true, data: research };
    } catch (err: any) {
      logger.error(`[ResearchAgent] Failed for project ${projectId}:`, err);
      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: err.message,
          logs: `Research Agent failed: ${err.message}`,
        },
      });
      throw err;
    }
  },
};

