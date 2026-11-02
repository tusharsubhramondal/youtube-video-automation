import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma.service.js';
import { addJob } from '../services/queue.service.js';
import { editingAgent } from '../agents/editing.agent.js';
import fs from 'fs';

const router = Router();

// Trigger video render
router.post('/start/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const {
      resolution,
      fps,
      enableSubtitles,
      subtitleFontSize,
      subtitleColor,
      backgroundMusicPath,
      bgMusicVolume,
      voiceVolume,
    } = req.body;

    const project = await prisma.videoProject.findUnique({
      where: { id: projectId },
      include: { scenes: { orderBy: { sceneNumber: 'asc' } }, settings: true },
    });

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    if (!project.scenes || project.scenes.length === 0) {
      return res.status(400).json({ success: false, error: 'Cannot render a project with no scenes' });
    }

    const renderRecord = await prisma.videoRender.create({
      data: {
        projectId,
        status: 'QUEUED',
        resolution: resolution || project.settings?.resolution || '1080p',
        aspectRatio: project.format === 'SHORTS' ? '9:16' : '16:9',
        fps: fps || project.settings?.fps || 30,
      },
    });

    // Dispatch background render with full options
    await addJob('video-renders', `render-${projectId}`, {
      renderId: renderRecord.id,
      projectId,
      resolution: renderRecord.resolution,
      fps: renderRecord.fps,
      aspectRatio: renderRecord.aspectRatio,
      enableSubtitles: enableSubtitles !== undefined
        ? enableSubtitles
        : project.settings?.enableSubtitles !== undefined
          ? project.settings.enableSubtitles
          : (project.format === 'SHORTS' ? false : true),
      subtitleFontSize: subtitleFontSize ?? project.settings?.subtitleFontSize ?? 24,
      subtitleColor: subtitleColor ?? project.settings?.subtitleColor ?? '#FFFFFF',
      bgMusicVolume: bgMusicVolume ?? project.settings?.backgroundMusicVolume ?? 0.15,
      voiceVolume: voiceVolume ?? project.settings?.voiceVolume ?? 1.0,
      backgroundMusicPath,
    });

    res.status(202).json({
      success: true,
      message: 'Video rendering queued successfully',
      data: renderRecord,
    });
  } catch (error) {
    next(error);
  }
});

// Get render status
router.get('/status/:renderId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { renderId } = req.params;
    const render = await prisma.videoRender.findUnique({
      where: { id: renderId },
    });

    if (!render) {
      return res.status(404).json({ success: false, error: 'Render record not found' });
    }

    res.json({ success: true, data: render });
  } catch (error) {
    next(error);
  }
});

// Get latest subtitle asset for project
router.get('/subtitles/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const subtitleAsset = await prisma.generatedAsset.findFirst({
      where: { projectId, type: 'SUBTITLE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!subtitleAsset) {
      return res.status(404).json({ success: false, error: 'No subtitles found for this project' });
    }

    res.json({ success: true, data: subtitleAsset });
  } catch (error) {
    next(error);
  }
});

export default router;
