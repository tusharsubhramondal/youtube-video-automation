import { prisma } from '../services/prisma.service.js';
import { getYouTubeProvider } from '../providers/youtube/index.js';
import { metaGraphProvider } from '../providers/meta/meta.provider.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import fs from 'fs';
import path from 'path';

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

      // Resolve local thumbnail file path on disk
      let resolvedThumbPath: string | undefined;
      if (project.thumbnailUrl) {
        const thumbFilename = path.basename(project.thumbnailUrl);
        const candidate = path.join(config.storage.uploadDir, thumbFilename);
        if (fs.existsSync(candidate)) {
          resolvedThumbPath = candidate;
        }
      }

      const uploadResult = await provider.uploadVideo({
        videoFilePath: project.finalVideoPath,
        title: params.title,
        description: params.description,
        tags: tagList,
        categoryId: params.categoryId || '22',
        privacyStatus: params.privacyStatus.toLowerCase() as any,
        thumbnailPath: resolvedThumbPath,
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

  async publishReel(params: {
    projectId: string;
    platform: 'INSTAGRAM_REELS' | 'FACEBOOK_REELS';
    metaAccountId?: string;
    caption?: string;
    title?: string;
    userApproved: boolean;
  }) {
    const startTime = Date.now();
    logger.info(`[PublishingAgent] Initiating Reel publish on ${params.platform} for project ${params.projectId}`);

    if (!params.userApproved) {
      throw new Error('Strict safety policy: Reel publication cannot proceed without explicit user confirmation.');
    }

    const execution = await prisma.agentExecution.create({
      data: {
        projectId: params.projectId,
        agentType: 'PUBLISHING',
        status: 'RUNNING',
        startedAt: new Date(),
        logs: `Preparing upload payload for Meta Graph API (${params.platform})...`,
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

      // Find active Meta account
      let metaAccount = null;
      if (params.metaAccountId) {
        metaAccount = await prisma.metaAccount.findUnique({ where: { id: params.metaAccountId } });
      } else {
        metaAccount = await prisma.metaAccount.findFirst({ where: { isConnected: true } });
      }

      if (!metaAccount) {
        throw new Error('No connected Meta Account found. Please connect your Facebook Page / Instagram account in Settings.');
      }

      // Resolve public video URL for Meta ingest
      const publicBase = config.meta.publicBaseUrl || config.frontendUrl || 'http://localhost:5000';
      const relVideoPath = path.relative(config.storage.renderDir, project.finalVideoPath).replace(/\\/g, '/');
      const publicVideoUrl = `${publicBase.replace(/\/+$/, '')}/renders/${relVideoPath}`;

      const textCaption = params.caption || project.seoDescription || project.title;
      const textTitle = params.title || project.seoTitle || project.title;

      let result;
      if (params.platform === 'INSTAGRAM_REELS') {
        if (!metaAccount.instagramAccountId) {
          throw new Error(`Connected Facebook Page "${metaAccount.pageName}" does not have a linked Instagram Professional Account. Please link an Instagram Business or Creator account to your Page.`);
        }
        result = await metaGraphProvider.publishInstagramReel({
          instagramAccountId: metaAccount.instagramAccountId,
          pageAccessToken: metaAccount.pageAccessToken,
          videoUrl: publicVideoUrl,
          caption: textCaption,
        });
      } else {
        result = await metaGraphProvider.publishFacebookReel({
          pageId: metaAccount.pageId,
          pageAccessToken: metaAccount.pageAccessToken,
          videoUrl: publicVideoUrl,
          description: textCaption,
          title: textTitle,
        });
      }

      const reelRecord = await prisma.publishedReel.create({
        data: {
          projectId: params.projectId,
          metaAccountId: metaAccount.id,
          platform: params.platform,
          mediaId: result.mediaId,
          title: textTitle,
          description: textCaption,
          permalink: result.permalink,
          userApproved: true,
          status: 'PUBLISHED',
          publishedAt: new Date(),
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
          outputPayload: JSON.stringify(result),
          logs: `Published Reel successfully to ${params.platform}! Media ID: ${result.mediaId}, URL: ${result.permalink || 'N/A'}`,
        },
      });

      return reelRecord;
    } catch (err: any) {
      logger.error(`[PublishingAgent] Reel publish failed for project ${params.projectId}:`, err);
      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: err.message,
          logs: `Reel Publishing failed: ${err.message}`,
        },
      });
      throw err;
    }
  },

  async publishMultiPlatform(params: {
    projectId: string;
    platforms: ('YOUTUBE_SHORTS' | 'INSTAGRAM_REELS' | 'FACEBOOK_REELS')[];
    userApproved: boolean;
  }) {
    const results: Record<string, any> = {};
    const errors: Record<string, string> = {};

    for (const p of params.platforms) {
      try {
        if (p === 'YOUTUBE_SHORTS') {
          const project = await prisma.videoProject.findUnique({ where: { id: params.projectId } });
          results.YOUTUBE = await this.publishVideo({
            projectId: params.projectId,
            title: project?.seoTitle || project?.title || 'Shorts',
            description: project?.seoDescription || '',
            privacyStatus: 'PUBLIC',
            userApproved: params.userApproved,
          });
        } else if (p === 'INSTAGRAM_REELS') {
          results.INSTAGRAM = await this.publishReel({
            projectId: params.projectId,
            platform: 'INSTAGRAM_REELS',
            userApproved: params.userApproved,
          });
        } else if (p === 'FACEBOOK_REELS') {
          results.FACEBOOK = await this.publishReel({
            projectId: params.projectId,
            platform: 'FACEBOOK_REELS',
            userApproved: params.userApproved,
          });
        }
      } catch (err: any) {
        errors[p] = err.message;
        logger.error(`[PublishingAgent] Multi-platform publish failed for ${p}:`, err);
      }
    }

    return { results, errors, success: Object.keys(errors).length === 0 };
  },
};
