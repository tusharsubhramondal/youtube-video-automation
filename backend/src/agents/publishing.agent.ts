import { prisma } from '../services/prisma.service.js';
import { getYouTubeProvider } from '../providers/youtube/index.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';

export const publishingAgent = {
  name: 'Publishing Agent',

  getAuthUrl() {
    const provider = getYouTubeProvider();
    return provider.getAuthUrl();
  },

  async handleOAuthCallback(code: string) {
    const provider = getYouTubeProvider();
    const accountData = await provider.handleOAuthCallback(code);

    const saved = await prisma.youTubeAccount.upsert({
      where: { channelId: accountData.channelId },
      update: {
        accessToken: accountData.tokens.access_token || '',
        refreshToken: accountData.tokens.refresh_token || null,
        isConnected: true,
      },
      create: {
        channelId: accountData.channelId,
        channelTitle: accountData.channelTitle,
        avatarUrl: accountData.avatarUrl,
        accessToken: accountData.tokens.access_token || '',
        refreshToken: accountData.tokens.refresh_token || null,
        isConnected: true,
      },
    });

    return saved;
  },

  async publishVideo(params: {
    projectId: string;
    youtubeAccountId?: string;
    title: string;
    description: string;
    tags?: string;
    categoryId?: string;
    privacyStatus: 'PRIVATE' | 'UNLISTED' | 'PUBLIC';
    userApproved: boolean; // MANDATORY!
  }) {
    const startTime = Date.now();
    logger.info(`[PublishingAgent] Initiating publish request for project ${params.projectId}`);

    if (!params.userApproved) {
      throw new Error('Strict safety policy: Video publication cannot proceed without explicit user confirmation.');
    }

    const execution = await prisma.agentExecution.create({
      data: {
        projectId: params.projectId,
        agentType: 'PUBLISHING',
        status: 'RUNNING',
        startedAt: new Date(),
        logs: 'Verifying user approval and preparing upload payload for YouTube Data API...',
      },
    });

    try {
      const project = await prisma.videoProject.findUnique({
        where: { id: params.projectId },
      });

      if (!project) throw new Error('Project not found');
      if (!project.finalVideoPath || !fs.existsSync(project.finalVideoPath)) {
        throw new Error('Rendered video file is not available on disk. Please render the video first.');
      }

      // Find active YouTube account
      let account = null;
      if (params.youtubeAccountId) {
        account = await prisma.youTubeAccount.findUnique({ where: { id: params.youtubeAccountId } });
      } else {
        account = await prisma.youTubeAccount.findFirst({ where: { isConnected: true } });
      }

      if (!account) {
        throw new Error('No connected YouTube account found. Please connect your YouTube channel first.');
      }

      const provider = getYouTubeProvider();

      // Parse tags
      let tagList: string[] = [];
      if (params.tags) {
        try {
          tagList = JSON.parse(params.tags);
        } catch {
          tagList = params.tags.split(',').map((t) => t.trim());
        }
      }

      const uploadResult = await provider.uploadVideo({
        videoFilePath: project.finalVideoPath,
        title: params.title,
        description: params.description,
        tags: tagList,
        categoryId: params.categoryId || '22',
        privacyStatus: params.privacyStatus.toLowerCase() as any,
        thumbnailPath: project.thumbnailUrl ? project.thumbnailUrl : undefined,
      });

      // Record published video
      const publishedRecord = await prisma.publishedVideo.create({
        data: {
          projectId: params.projectId,
          youtubeAccountId: account.id,
          youtubeVideoId: uploadResult.videoId,
          title: params.title,
          description: params.description,
          tags: params.tags,
          categoryId: params.categoryId || '22',
          privacyStatus: params.privacyStatus,
          youtubeUrl: uploadResult.url,
          userApproved: true,
          approvedAt: new Date(),
          publishedAt: uploadResult.publishedAt,
        },
      });

      await prisma.videoProject.update({
        where: { id: params.projectId },
        data: {
          status: 'PUBLISHED',
          currentStage: 'published',
        },
      });

      const durationMs = Date.now() - startTime;
      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          executionTimeMs: durationMs,
          outputPayload: JSON.stringify(uploadResult),
          logs: `Published video successfully to YouTube! Video ID: ${uploadResult.videoId}, URL: ${uploadResult.url}`,
        },
      });

      return publishedRecord;
    } catch (err: any) {
      logger.error(`[PublishingAgent] Failed for project ${params.projectId}:`, err);
      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: err.message,
          logs: `Publishing Agent failed: ${err.message}`,
        },
      });
      throw err;
    }
  },
};
