import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma.service.js';
import { config } from '../config/index.js';
import { checkFfmpegAvailable } from '../services/ffmpeg.service.js';

const router = Router();

// Get current system settings and provider status
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const aiProviders = await prisma.aIProvider.findMany({
      orderBy: { name: 'asc' },
    });

    const ffmpegReady = await checkFfmpegAvailable();

    res.json({
      success: true,
      data: {
        env: {
          nodeEnv: config.env,
          port: config.port,
          hasGeminiKey: !!config.ai.geminiApiKey,
          hasOpenAiKey: !!config.ai.openAiApiKey,
          hasElevenLabsKey: !!config.ai.elevenLabsApiKey,
          hasGoogleOAuth: !!(config.youtube.clientId && config.youtube.clientSecret),
          ffmpegReady,
        },
        providers: aiProviders,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update or add AI provider configuration
router.post('/providers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, type, providerKey, apiKey, baseUrl, modelName, isDefault, isEnabled } = req.body;

    const provider = await prisma.aIProvider.upsert({
      where: { providerKey },
      update: {
        name,
        type,
        apiKey: apiKey || null,
        baseUrl: baseUrl || null,
        modelName: modelName || null,
        isDefault: isDefault ?? false,
        isEnabled: isEnabled ?? true,
      },
      create: {
        name,
        type,
        providerKey,
        apiKey: apiKey || null,
        baseUrl: baseUrl || null,
        modelName: modelName || null,
        isDefault: isDefault ?? false,
        isEnabled: isEnabled ?? true,
      },
    });

    res.json({ success: true, data: provider });
  } catch (error) {
    next(error);
  }
});

// Update project settings
router.put('/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { resolution, fps, enableSubtitles, backgroundMusicVolume, voiceVolume, autoPublish } = req.body;

    const settings = await prisma.projectSettings.upsert({
      where: { projectId },
      update: {
        resolution,
        fps,
        enableSubtitles,
        backgroundMusicVolume,
        voiceVolume,
        autoPublish,
      },
      create: {
        projectId,
        resolution: resolution || '1080p',
        fps: fps || 30,
        enableSubtitles: enableSubtitles ?? true,
        backgroundMusicVolume: backgroundMusicVolume ?? 0.15,
        voiceVolume: voiceVolume ?? 1.0,
        autoPublish: autoPublish ?? false,
      },
    });

    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

export default router;

