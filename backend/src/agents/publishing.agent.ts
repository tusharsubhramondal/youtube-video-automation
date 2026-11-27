import { prisma } from '../services/prisma.service.js';
import { getYouTubeProvider } from '../providers/youtube/index.js';
import { metaGraphProvider } from '../providers/meta/meta.provider.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { resolveAssetLocalPath, getProjectStoragePath } from '../utils/storage.util.js';
import { SubtitleService } from '../services/subtitle.service.js';
import fs from 'fs';
import path from 'path';

function mapLanguageToBcp47(lang?: string): { code: string; label: string } {
  if (!lang) return { code: 'en', label: 'English' };
  const l = lang.toLowerCase();
  if (l.includes('bengali') || l === 'bn' || l === 'বাংলা') return { code: 'bn', label: 'Bengali' };
  if (l.includes('hindi') || l === 'hi' || l === 'हिंदी') return { code: 'hi', label: 'Hindi' };
  if (l.includes('spanish') || l === 'es') return { code: 'es', label: 'Spanish' };
  if (l.includes('french') || l === 'fr') return { code: 'fr', label: 'French' };
  if (l.includes('german') || l === 'de') return { code: 'de', label: 'German' };
  if (l.includes('japanese') || l === 'ja') return { code: 'ja', label: 'Japanese' };
  if (l.includes('italian') || l === 'it') return { code: 'it', label: 'Italian' };
  if (l.includes('portuguese') || l === 'pt') return { code: 'pt', label: 'Portuguese' };
  if (l.includes('russian') || l === 'ru') return { code: 'ru', label: 'Russian' };
  if (l.includes('chinese') || l === 'zh') return { code: 'zh', label: 'Chinese' };
  if (l.includes('korean') || l === 'ko') return { code: 'ko', label: 'Korean' };
  if (l.includes('arabic') || l === 'ar') return { code: 'ar', label: 'Arabic' };
  return { code: 'en', label: lang };
}

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
        ...(accountData.tokens.refresh_token ? { refreshToken: accountData.tokens.refresh_token } : {}),
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
    uploadSubtitles?: boolean;
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
        include: { scenes: { orderBy: { sceneNumber: 'asc' } } },
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

      const provider = getYouTubeProvider({
        access_token: account.accessToken,
        refresh_token: account.refreshToken,
        accountId: account.id,
      });

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
        const resolved = resolveAssetLocalPath(project.thumbnailUrl);
        if (resolved && fs.existsSync(resolved)) {
          resolvedThumbPath = resolved;
        } else {
          const thumbFilename = path.basename(project.thumbnailUrl);
          const candidate = path.join(config.storage.uploadDir, thumbFilename);
          if (fs.existsSync(candidate)) {
            resolvedThumbPath = candidate;
          }
        }
      }

      // Ensure YouTube Shorts indexing tag is present for vertical videos
      let uploadTitle = params.title;
      let uploadDescription = params.description;
      if (project.format === 'SHORTS') {
        if (!uploadTitle.toLowerCase().includes('#shorts')) {
          uploadTitle = `${uploadTitle} #Shorts`;
        }
        if (!uploadDescription.toLowerCase().includes('#shorts')) {
          uploadDescription = `${uploadDescription}\n\n#Shorts #YouTubeShorts`;
        }
        if (!tagList.some((t) => t.toLowerCase() === 'shorts')) {
          tagList.push('Shorts', 'YouTube Shorts');
        }
      }

      // -------------------------------------------------------------
      // AUTOMATED SUBTITLE RESOLUTION (.srt) FOR CLOSED CAPTIONS
      // -------------------------------------------------------------
      let resolvedSrtPath: string | undefined;
      const shouldUploadSubtitles = params.uploadSubtitles !== false;

      if (shouldUploadSubtitles) {
        // 1. Look for existing SUBTITLE asset
        const subtitleAsset = await prisma.generatedAsset.findFirst({
          where: { projectId: params.projectId, type: 'SUBTITLE' },
          orderBy: { createdAt: 'desc' },
        });

        if (subtitleAsset && subtitleAsset.localPath && fs.existsSync(subtitleAsset.localPath)) {
          resolvedSrtPath = subtitleAsset.localPath;
        }

        // 2. Check project subtitles folder
        if (!resolvedSrtPath) {
          const subDir = getProjectStoragePath(params.projectId, 'subtitles');
          if (fs.existsSync(subDir)) {
            const files = fs.readdirSync(subDir).filter((f) => f.endsWith('.srt'));
            if (files.length > 0) {
              resolvedSrtPath = path.join(subDir, files[files.length - 1]);
            }
          }
        }

        // 3. Fallback: on-the-fly synthesize standard SRT from scene narration
        if (!resolvedSrtPath && project.scenes && project.scenes.length > 0) {
          const subDir = getProjectStoragePath(params.projectId, 'subtitles');
          const srtFilename = `subtitles_${project.id}_${Date.now()}.srt`;
          const srtPath = path.join(subDir, srtFilename);
          const subtitleScenes = project.scenes.map((s) => ({
            sceneNumber: s.sceneNumber,
            narrationText: s.narrationText,
            duration: s.duration,
          }));
          SubtitleService.generateSrt(subtitleScenes, srtPath, project.format === 'SHORTS');
          resolvedSrtPath = srtPath;
        }
      }

      const langInfo = mapLanguageToBcp47(project.language);

      const uploadResult = await provider.uploadVideo({
        videoFilePath: project.finalVideoPath,
        title: uploadTitle,
        description: uploadDescription,
        tags: tagList,
        categoryId: params.categoryId || '22',
        privacyStatus: params.privacyStatus.toLowerCase() as any,
        thumbnailPath: resolvedThumbPath,
        subtitlePath: resolvedSrtPath,
        subtitleLanguage: langInfo.code,
        subtitleTrackName: `${langInfo.label} (Official)`,
        tokens: {
          access_token: account.accessToken,
          refresh_token: account.refreshToken,
        },
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
      const thumbInfo = uploadResult.thumbnailUploaded ? ' | Custom Thumbnail: Set' : '';
      const captionInfo = uploadResult.captionTrack
        ? ` | Closed Captions: Uploaded (${uploadResult.captionTrack.language} - ${uploadResult.captionTrack.name})`
        : '';

      await prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          executionTimeMs: durationMs,
          outputPayload: JSON.stringify(uploadResult),
          logs: `Published video successfully to YouTube! Video ID: ${uploadResult.videoId}, URL: ${uploadResult.url}${thumbInfo}${captionInfo}`,
        },
      });

      return {
        ...publishedRecord,
        captionTrack: uploadResult.captionTrack,
      };
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

  async uploadSubtitles(params: {
    projectId: string;
    youtubeAccountId?: string;
  }) {
    logger.info(`[PublishingAgent] Initiating standalone subtitle upload for project ${params.projectId}`);

    const project = await prisma.videoProject.findUnique({
      where: { id: params.projectId },
      include: {
        scenes: { orderBy: { sceneNumber: 'asc' } },
        publishedVideos: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!project) throw new Error('Project not found');
    const published = project.publishedVideos[0];
    if (!published || !published.youtubeVideoId) {
      throw new Error('This video has not been published to YouTube yet. Publish the video first.');
    }

    let account = null;
    if (params.youtubeAccountId) {
      account = await prisma.youTubeAccount.findUnique({ where: { id: params.youtubeAccountId } });
    } else {
      account = (await prisma.youTubeAccount.findUnique({ where: { id: published.youtubeAccountId } }))
        || (await prisma.youTubeAccount.findFirst({ where: { isConnected: true } }));
    }

    if (!account) throw new Error('No connected YouTube account found.');

    let srtPath: string | undefined;
    const subAsset = await prisma.generatedAsset.findFirst({
      where: { projectId: params.projectId, type: 'SUBTITLE' },
      orderBy: { createdAt: 'desc' },
    });
    if (subAsset?.localPath && fs.existsSync(subAsset.localPath)) {
      srtPath = subAsset.localPath;
    }

    if (!srtPath && project.scenes.length > 0) {
      const subDir = getProjectStoragePath(project.id, 'subtitles');
      srtPath = path.join(subDir, `subtitles_${project.id}_${Date.now()}.srt`);
      SubtitleService.generateSrt(
        project.scenes.map((s) => ({ sceneNumber: s.sceneNumber, narrationText: s.narrationText, duration: s.duration })),
        srtPath,
        project.format === 'SHORTS'
      );
    }

    if (!srtPath || !fs.existsSync(srtPath)) {
      throw new Error('No subtitle file available to upload.');
    }

    const provider = getYouTubeProvider({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
      accountId: account.id,
    });

    if (!provider.uploadCaptions) {
      throw new Error('The active YouTube provider does not support caption upload.');
    }

    const langInfo = mapLanguageToBcp47(project.language);
    const result = await provider.uploadCaptions({
      videoId: published.youtubeVideoId,
      subtitlePath: srtPath,
      language: langInfo.code,
      trackName: `${langInfo.label} (Official)`,
      tokens: {
        access_token: account.accessToken,
        refresh_token: account.refreshToken,
      },
    });

    logger.info(`[PublishingAgent] Subtitle track synced to YouTube for video ${published.youtubeVideoId}`);
    return result;
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
