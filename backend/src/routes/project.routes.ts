import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma.service.js';
import { z } from 'zod';

const router = Router();

const createProjectSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  topic: z.string().min(1, 'Topic is required'),
  category: z.string().default('Entertainment'),
  language: z.string().default('English'),
  targetDuration: z.number().int().positive().default(60),
  format: z.enum(['SHORTS', 'REGULAR']).default('REGULAR'),
  visualStyle: z.string().default('Cinematic'),
  voiceStyle: z.string().default('Deep Narration'),
});

// GET all projects
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = await prisma.videoProject.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { scenes: true, assets: true, renders: true },
        },
      },
    });
    res.json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
});

// GET project stats / summary
router.get('/stats/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const totalProjects = await prisma.videoProject.count();
    const completedProjects = await prisma.videoProject.count({
      where: { status: { in: ['READY_TO_PUBLISH', 'PUBLISHED'] } },
    });
    const renderingProjects = await prisma.videoProject.count({
      where: { status: { in: ['EDITING', 'MEDIA_GENERATION'] } },
    });
    const totalPublished = await prisma.publishedVideo.count();

    res.json({
      success: true,
      data: {
        totalProjects,
        completedProjects,
        renderingProjects,
        totalPublished,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET project by ID with full details
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const project = await prisma.videoProject.findUnique({
      where: { id },
      include: {
        scenes: {
          orderBy: { sceneNumber: 'asc' },
          include: { assets: true },
        },
        agentExecutions: {
          orderBy: { createdAt: 'desc' },
        },
        assets: {
          orderBy: { createdAt: 'desc' },
        },
        renders: {
          orderBy: { createdAt: 'desc' },
        },
        publishedVideos: {
          include: { youtubeAccount: true },
        },
        settings: true,
      },
    });

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

// POST create project
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createProjectSchema.parse(req.body);

    const project = await prisma.videoProject.create({
      data: {
        title: validated.title,
        topic: validated.topic,
        category: validated.category,
        language: validated.language,
        targetDuration: validated.targetDuration,
        format: validated.format,
        visualStyle: validated.visualStyle,
        voiceStyle: validated.voiceStyle,
        status: 'DRAFT',
        currentStage: 'created',
        progress: 0,
        settings: {
          create: {
            resolution: '1080p',
            fps: 30,
            enableSubtitles: true,
            backgroundMusicVolume: 0.15,
            voiceVolume: 1.0,
          },
        },
      },
      include: {
        settings: true,
      },
    });

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

// PUT update project
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const project = await prisma.videoProject.update({
      where: { id },
      data: req.body,
    });
    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

// DELETE project
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.videoProject.delete({ where: { id } });
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;

