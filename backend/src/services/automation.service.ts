import { prisma } from './prisma.service.js';
import { trendDiscoveryService } from './trend.service.js';
import { orchestrator } from '../agents/orchestrator.js';
import { publishingAgent } from '../agents/publishing.agent.js';
import { logger } from '../utils/logger.js';

export class DailyAutomationService {
  /**
   * Retrieves or initializes default daily automation schedule
   */
  async getSchedule() {
    let schedule = await prisma.automationSchedule.findFirst();
    if (!schedule) {
      schedule = await prisma.automationSchedule.create({
        data: {
          name: 'Daily Viral Reels Engine',
          niche: 'Tech & AI Facts',
          language: 'English',
          visualStyle: 'Cinematic',
          voiceStyle: 'Deep Narration (Christopher)',
          targetPlatforms: JSON.stringify(['INSTAGRAM_REELS', 'FACEBOOK_REELS', 'YOUTUBE_SHORTS']),
          format: 'SHORTS',
          targetDuration: 45,
          cronExpression: '0 9 * * *',
          runHourUtc: 3,
          runMinuteUtc: 30,
          autoPublish: false, // Safe default: generates video ready for one-click approval
          isActive: true,
        },
      });
    }
    return schedule;
  }

  /**
   * Updates schedule settings
   */
  async updateSchedule(data: {
    niche?: string;
    language?: string;
    visualStyle?: string;
    voiceStyle?: string;
    targetPlatforms?: string[];
    targetDuration?: number;
    autoPublish?: boolean;
    isActive?: boolean;
    runHourUtc?: number;
    runMinuteUtc?: number;
  }) {
    const current = await this.getSchedule();
    const updated = await prisma.automationSchedule.update({
      where: { id: current.id },
      data: {
        niche: data.niche ?? current.niche,
        language: data.language ?? current.language,
        visualStyle: data.visualStyle ?? current.visualStyle,
        voiceStyle: data.voiceStyle ?? current.voiceStyle,
        targetPlatforms: data.targetPlatforms ? JSON.stringify(data.targetPlatforms) : current.targetPlatforms,
        targetDuration: data.targetDuration ?? current.targetDuration,
        autoPublish: data.autoPublish ?? current.autoPublish,
        isActive: data.isActive ?? current.isActive,
        runHourUtc: data.runHourUtc ?? current.runHourUtc,
        runMinuteUtc: data.runMinuteUtc ?? current.runMinuteUtc,
      },
    });
    return updated;
  }

  /**
   * Executes the full automated daily production cycle:
   * 1. Discover daily trending topic
   * 2. Spin up 9:16 vertical short project
   * 3. Run all agents (Research -> Script -> Visuals -> Voice -> Reels Safe-Zone Editing -> SEO)
   * 4. Multi-platform publish if enabled
   */
  async executeDailyProduction(options?: {
    customNiche?: string;
    autoPublishOverride?: boolean;
  }) {
    const schedule = await this.getSchedule();
    const nicheToUse = options?.customNiche || schedule.niche;
    const shouldPublish = options?.autoPublishOverride ?? schedule.autoPublish;

    logger.info(`[DailyAutomation] Starting automated production cycle for niche: "${nicheToUse}"...`);

    // Step 1: Discover Daily Trending Topic
    const trendingTopic = await trendDiscoveryService.selectDailyViralTopic(nicheToUse);

    // Step 2: Create Vertical (9:16) Project
    const project = await prisma.videoProject.create({
      data: {
        title: trendingTopic.title,
        topic: `${trendingTopic.title}. Hook: ${trendingTopic.hookAngle}`,
        category: trendingTopic.category || 'Technology',
        language: schedule.language || 'English',
        targetDuration: schedule.targetDuration || 45,
        format: 'SHORTS', // 9:16 Vertical Video for Reels & Shorts
        visualStyle: schedule.visualStyle || 'Cinematic',
        voiceStyle: schedule.voiceStyle || 'Deep Narration',
        status: 'DRAFT',
        settings: {
          create: {
            resolution: '1080p',
            fps: 30,
            enableSubtitles: true,
            subtitleFontSize: 28, // High-visibility Reels kinetic captions
            voiceVolume: 1.0,
            backgroundMusicVolume: 0.12,
            autoPublish: shouldPublish,
          },
        },
      },
    });

    logger.info(`[DailyAutomation] Created Project ${project.id} ("${project.title}"). Launching full agent pipeline...`);

    try {
      // Step 3: Run Full Autonomous Agent Pipeline
      await orchestrator.runPipeline(project.id);

      // Step 4: Multi-Platform Auto-Publishing (if enabled)
      let publishResults = null;
      if (shouldPublish) {
        let platforms: ('YOUTUBE_SHORTS' | 'INSTAGRAM_REELS' | 'FACEBOOK_REELS')[] = [
          'INSTAGRAM_REELS',
          'FACEBOOK_REELS',
          'YOUTUBE_SHORTS',
        ];
        try {
          platforms = JSON.parse(schedule.targetPlatforms);
        } catch {}

        logger.info(`[DailyAutomation] Auto-Publish active! Publishing to: ${platforms.join(', ')}...`);
        publishResults = await publishingAgent.publishMultiPlatform({
          projectId: project.id,
          platforms,
          userApproved: true,
        });
      }

      // Step 5: Update Schedule Telemetry
      await prisma.automationSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: new Date(),
          lastRunStatus: 'SUCCESS',
          lastProjectId: project.id,
        },
      });

      return {
        success: true,
        project: await prisma.videoProject.findUnique({
          where: { id: project.id },
          include: { assets: true, publishedReels: true, publishedVideos: true },
        }),
        trendingTopic,
        publishResults,
      };
    } catch (err: any) {
      logger.error(`[DailyAutomation] Production cycle failed: ${err.message}`);
      await prisma.automationSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: new Date(),
          lastRunStatus: `FAILED: ${err.message}`,
          lastProjectId: project.id,
        },
      });
      throw err;
    }
  }
}

export const dailyAutomationService = new DailyAutomationService();
