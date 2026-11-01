import { Router, Request, Response, NextFunction } from 'express';
import { dailyAutomationService } from '../services/automation.service.js';
import { trendDiscoveryService } from '../services/trend.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/automation/schedule - Get automation schedule configuration
router.get('/schedule', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schedule = await dailyAutomationService.getSchedule();
    res.json({
      success: true,
      data: {
        ...schedule,
        targetPlatforms: JSON.parse(schedule.targetPlatforms || '[]'),
      },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/automation/schedule - Update automation schedule configuration
router.put('/schedule', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { niche, language, visualStyle, voiceStyle, targetPlatforms, targetDuration, autoPublish, isActive } = req.body;

    const updated = await dailyAutomationService.updateSchedule({
      niche,
      language,
      visualStyle,
      voiceStyle,
      targetPlatforms,
      targetDuration,
      autoPublish,
      isActive,
    });

    res.json({
      success: true,
      message: 'Daily automation settings updated successfully!',
      data: {
        ...updated,
        targetPlatforms: JSON.parse(updated.targetPlatforms || '[]'),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/automation/trends - Preview today's viral trending topics for a niche
router.get('/trends', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const niche = (req.query.niche as string) || 'Technology & AI';
    const topics = await trendDiscoveryService.discoverViralTopics(niche, 5);
    res.json({
      success: true,
      data: topics,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/automation/trigger-now - Trigger today's viral Reel production immediately
router.post('/trigger-now', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customNiche, autoPublishOverride } = req.body;
    logger.info('[AutomationRoutes] Manual trigger requested for Daily Reel generation...');

    // Asynchronously run production or synchronously return progress
    const result = await dailyAutomationService.executeDailyProduction({
      customNiche,
      autoPublishOverride,
    });

    res.json({
      success: true,
      message: 'Daily Viral Reel generated successfully!',
      data: result,
    });
  } catch (error: any) {
    logger.error('[AutomationRoutes] Trigger now error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;

