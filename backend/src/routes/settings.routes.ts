import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma.service.js';
import { config } from '../config/index.js';
import { checkFfmpegAvailable } from '../services/ffmpeg.service.js';

const router = Router();

const DEFAULT_ROUTING = {
  RESEARCH: { provider: 'gemini', model: 'gemini-flash-latest' },
  SCRIPT: { provider: 'gemini', model: 'gemini-flash-latest' },
  IMAGE: { provider: 'pollinations', model: 'flux' },
  THUMBNAIL: { provider: 'openai', model: 'dall-e-3' },
  SEO: { provider: 'gemini', model: 'gemini-flash-latest' },
  VOICE: { provider: 'edgetts', voiceId: 'en-US-ChristopherNeural' },
};

// Get current system settings and provider status
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const aiProviders = await prisma.aIProvider.findMany({
      orderBy: { name: 'asc' },
    });

    const routingRecord = await prisma.aIProvider.findUnique({
      where: { providerKey: 'agent_routing' },
    });

    let agentRouting = DEFAULT_ROUTING;
    if (routingRecord?.configJson) {
      try {
        agentRouting = { ...DEFAULT_ROUTING, ...JSON.parse(routingRecord.configJson) };
      } catch {}
    }

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
          hasCloudflareKey: !!(config.ai.cloudflareApiToken && config.ai.cloudflareAccountId),
          hasGoogleOAuth: !!(config.youtube.clientId && config.youtube.clientSecret),
          ffmpegReady,
        },
        providers: aiProviders.filter((p) => p.providerKey !== 'agent_routing'),
        agentRouting,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update or add AI provider configuration
router.post('/providers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, type, providerKey, apiKey, baseUrl, modelName, isDefault, isEnabled, configJson } = req.body;

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
        configJson: configJson || null,
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
        configJson: configJson || null,
      },
    });

    res.json({ success: true, data: provider });
  } catch (error) {
    next(error);
  }
});

// Update Agent Routing Matrix
router.post('/routing', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { routing } = req.body;
    if (!routing || typeof routing !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid routing payload' });
    }

    const record = await prisma.aIProvider.upsert({
      where: { providerKey: 'agent_routing' },
      update: {
        configJson: JSON.stringify(routing),
      },
      create: {
        name: 'Agent Model Routing Matrix',
        type: 'ROUTING',
        providerKey: 'agent_routing',
        configJson: JSON.stringify(routing),
        isEnabled: true,
      },
    });

    res.json({ success: true, data: JSON.parse(record.configJson!) });
  } catch (error) {
    next(error);
  }
});

// Update project settings
router.put('/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { resolution, fps, enableSubtitles, backgroundMusicVolume, voiceVolume, autoPublish } = req.body;

    const project = await prisma.videoProject.findUnique({ where: { id: projectId } });
    const defaultSubtitles = project?.format === 'SHORTS' ? false : true;

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
        enableSubtitles: enableSubtitles !== undefined ? enableSubtitles : defaultSubtitles,
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
