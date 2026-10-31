import { researchAgent } from './research.agent.js';
import { scriptAgent } from './script.agent.js';
import { imageAgent } from './image.agent.js';
import { videoAgent } from './video.agent.js';
import { voiceAgent } from './voice.agent.js';
import { editingAgent } from './editing.agent.js';
import { thumbnailAgent } from './thumbnail.agent.js';
import { seoAgent } from './seo.agent.js';
import { publishingAgent } from './publishing.agent.js';
import { prisma } from '../services/prisma.service.js';
import { logger } from '../utils/logger.js';

export type AgentTypeName =
  | 'RESEARCH'
  | 'SCRIPT'
  | 'IMAGE'
  | 'VIDEO'
  | 'VOICE'
  | 'EDITING'
  | 'THUMBNAIL'
  | 'SEO'
  | 'PUBLISHING';

export class MasterOrchestrator {
  async runAgent(agentType: AgentTypeName, projectId: string, payload?: any) {
    logger.info(`[MasterOrchestrator] Invoking Agent: ${agentType} on Project ${projectId}`);

    switch (agentType) {
      case 'RESEARCH':
        return await researchAgent.run(projectId);
      case 'SCRIPT':
        return await scriptAgent.run(projectId);
      case 'IMAGE':
        return await imageAgent.run(projectId, payload?.sceneId);
      case 'VIDEO':
        return await videoAgent.run(projectId, payload?.sceneId);
      case 'VOICE':
        return await voiceAgent.run(projectId, payload?.sceneId);
      case 'EDITING':
        return await editingAgent.run(projectId, payload?.renderId, payload);
      case 'THUMBNAIL':
        return await thumbnailAgent.run(projectId, payload?.customPrompt);
      case 'SEO':
        return await seoAgent.run(projectId);
      case 'PUBLISHING':
        return await publishingAgent.publishVideo({
          projectId,
          ...payload,
        });
      default:
        throw new Error(`Unknown agent type: ${agentType}`);
    }
  }

  async runPipeline(projectId: string, startFromStage = 'research') {
    logger.info(`[MasterOrchestrator] Starting automated pipeline for Project ${projectId} starting at "${startFromStage}"`);

    const stages = ['research', 'script', 'image', 'video', 'voice', 'editing', 'thumbnail', 'seo'];
    const startIndex = Math.max(0, stages.indexOf(startFromStage.toLowerCase()));

    const executionSummary: Record<string, any> = {};

    try {
      if (startIndex <= 0) {
        logger.info('[Pipeline Stage 1/8] Running Research Agent...');
        executionSummary.research = await researchAgent.run(projectId);
      }

      if (startIndex <= 1) {
        logger.info('[Pipeline Stage 2/8] Running Script Agent...');
        executionSummary.script = await scriptAgent.run(projectId);
      }

      if (startIndex <= 2) {
        logger.info('[Pipeline Stage 3/8] Running Image Agent...');
        executionSummary.image = await imageAgent.run(projectId);
      }

      if (startIndex <= 3) {
        logger.info('[Pipeline Stage 4/8] Running Video Agent...');
        executionSummary.video = await videoAgent.run(projectId);
      }

      if (startIndex <= 4) {
        logger.info('[Pipeline Stage 5/8] Running Voice Agent...');
        executionSummary.voice = await voiceAgent.run(projectId);
      }

      if (startIndex <= 5) {
        logger.info('[Pipeline Stage 6/8] Running Editing Agent...');
        executionSummary.editing = await editingAgent.run(projectId);
      }

      if (startIndex <= 6) {
        logger.info('[Pipeline Stage 7/8] Running Thumbnail Agent...');
        executionSummary.thumbnail = await thumbnailAgent.run(projectId);
      }

      if (startIndex <= 7) {
        logger.info('[Pipeline Stage 8/8] Running SEO Agent...');
        executionSummary.seo = await seoAgent.run(projectId);
      }

      logger.info(`[MasterOrchestrator] Automated pipeline completed successfully for Project ${projectId}`);
      return { success: true, summary: executionSummary };
    } catch (error: any) {
      logger.error(`[MasterOrchestrator] Pipeline stopped due to error: ${error.message}`);
      await prisma.videoProject.update({
        where: { id: projectId },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  }
}

export const orchestrator = new MasterOrchestrator();

