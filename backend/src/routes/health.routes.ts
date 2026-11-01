import { Router, Request, Response } from 'express';
import { prisma } from '../services/prisma.service.js';
import { checkFfmpegAvailable } from '../services/ffmpeg.service.js';
import { config } from '../config/index.js';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (e: any) {
    dbStatus = `error: ${e.message}`;
  }

  const ffmpegOperational = await checkFfmpegAvailable();
  const dbGemini = await prisma.aIProvider.findUnique({ where: { providerKey: 'gemini' } }).catch(() => null);
  const isGeminiActive = !!(config.ai.geminiApiKey || (dbGemini?.apiKey && dbGemini.isEnabled));

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: dbStatus,
      ffmpeg: ffmpegOperational ? 'available' : 'unavailable',
      geminiConfigured: isGeminiActive,
      youtubeOAuthConfigured: !!(config.youtube.clientId && config.youtube.clientSecret),
    },
    version: '1.0.0',
  });
});

export default router;

