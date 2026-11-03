import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { connectPrisma } from './services/prisma.service.js';
import { initQueues, registerWorker } from './services/queue.service.js';
import { editingAgent } from './agents/editing.agent.js';
import { dailyAutomationService } from './services/automation.service.js';
import { errorHandler } from './middlewares/error.middleware.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import projectRoutes from './routes/project.routes.js';
import sceneRoutes from './routes/scene.routes.js';
import agentRoutes from './routes/agent.routes.js';
import assetRoutes from './routes/asset.routes.js';
import renderRoutes from './routes/render.routes.js';
import youtubeRoutes from './routes/youtube.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import voiceRoutes from './routes/voice.routes.js';
import metaRoutes from './routes/meta.routes.js';
import automationRoutes from './routes/automation.routes.js';

// Fix for BigInt JSON serialization in Express/Prisma
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

const app = express();

// Middlewares
app.use(cors({
  origin: [config.frontendUrl, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving for uploads and rendered videos (serving both backend and root paths)
app.use('/uploads', express.static(config.storage.uploadDir));
app.use('/uploads', express.static(path.resolve(process.cwd(), '../uploads')));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.use('/renders', express.static(config.storage.renderDir));
app.use('/renders', express.static(path.resolve(process.cwd(), '../renders')));
app.use('/renders', express.static(path.resolve(process.cwd(), 'renders')));

// API Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/voices', voiceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/scenes', sceneRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/renders', renderRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/settings', settingsRoutes);

// Error Handler Middleware
app.use(errorHandler);

export async function startServer() {
  await connectPrisma();
  await initQueues();

  // Register background video rendering worker
  registerWorker('video-renders', async (data: any) => {
    logger.info(`Starting background video render task for project ${data.projectId}, render ${data.renderId}`);
    return await editingAgent.run(data.projectId, data.renderId, {
      resolution: data.resolution,
      fps: data.fps,
      enableSubtitles: data.enableSubtitles,
      subtitleFontSize: data.subtitleFontSize,
      subtitleColor: data.subtitleColor,
      bgMusicVolume: data.bgMusicVolume,
      voiceVolume: data.voiceVolume,
      backgroundMusicPath: data.backgroundMusicPath,
    });
  });

  // Register daily automation worker for viral Reels
  registerWorker('daily-automation', async (data: any) => {
    logger.info('[DailyAutomationWorker] Triggered daily viral Reel production job...');
    return await dailyAutomationService.executeDailyProduction(data);
  });

  // Start internal automated cron scheduler loop
  dailyAutomationService.initScheduler();

  const server = app.listen(config.port, () => {
    logger.info(`Backend server running on http://localhost:${config.port}`);
    logger.info(`Serving uploads from ${config.storage.uploadDir}`);
    logger.info(`Serving renders from ${config.storage.renderDir}`);
  });

  return server;
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    logger.error('Failed to start server:', err);
    process.exit(1);
  });
}

export default app;
