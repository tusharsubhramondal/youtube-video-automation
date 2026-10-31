import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma.service.js';
import { z } from 'zod';

const router = Router();

const sceneUpdateSchema = z.object({
  narrationText: z.string().optional(),
  visualPrompt: z.string().optional(),
  cameraMovement: z.string().optional(),
  transition: z.string().optional(),
  duration: z.number().positive().optional(),
  imageUrl: z.string().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  audioUrl: z.string().nullable().optional(),
  subtitleText: z.string().nullable().optional(),
  status: z.string().optional(),
});

// Update scene
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validated = sceneUpdateSchema.parse(req.body);

    const updated = await prisma.videoScene.update({
      where: { id },
      data: validated,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// Create scene manually
router.post('/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { narrationText, visualPrompt, duration, sceneNumber, cameraMovement, transition } = req.body;

    const count = await prisma.videoScene.count({ where: { projectId } });

    const scene = await prisma.videoScene.create({
      data: {
        projectId,
        sceneNumber: sceneNumber || count + 1,
        narrationText: narrationText || 'Scene narration',
        visualPrompt: visualPrompt || 'Cinematic visual scene description',
        duration: duration || 5.0,
        cameraMovement: cameraMovement || 'Pan slowly',
        transition: transition || 'fade',
        status: 'READY',
      },
    });

    res.status(201).json({ success: true, data: scene });
  } catch (error) {
    next(error);
  }
});

// Delete scene
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.videoScene.delete({ where: { id } });
    res.json({ success: true, message: 'Scene deleted' });
  } catch (error) {
    next(error);
  }
});

// Reorder scenes
router.post('/reorder', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items } = req.body as { items: { id: string; sceneNumber: number }[] };
    
    for (const item of items) {
      await prisma.videoScene.update({
        where: { id: item.id },
        data: { sceneNumber: item.sceneNumber },
      });
    }

    res.json({ success: true, message: 'Scenes reordered successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;

