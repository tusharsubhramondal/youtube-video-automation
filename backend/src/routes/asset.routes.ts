import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma.service.js';
import { upload } from '../middlewares/upload.middleware.js';
import path from 'path';
import fs from 'fs';

const router = Router();

// Upload asset manually (image, audio, video, music)
router.post('/upload/:projectId', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { type, sceneId, prompt } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const relativeUrl = `/uploads/${file.filename}`;
    const asset = await prisma.generatedAsset.create({
      data: {
        projectId,
        sceneId: sceneId || null,
        type: (type as any) || 'IMAGE',
        provider: 'manual_upload',
        prompt: prompt || file.originalname,
        url: relativeUrl,
        localPath: file.path,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
      },
    });

    // If sceneId is provided, also attach to the scene
    if (sceneId) {
      if (file.mimetype.startsWith('image/')) {
        await prisma.videoScene.update({ where: { id: sceneId }, data: { imageUrl: relativeUrl } });
      } else if (file.mimetype.startsWith('video/')) {
        await prisma.videoScene.update({ where: { id: sceneId }, data: { videoUrl: relativeUrl } });
      } else if (file.mimetype.startsWith('audio/')) {
        await prisma.videoScene.update({ where: { id: sceneId }, data: { audioUrl: relativeUrl } });
      }
    }

    res.status(201).json({ success: true, data: asset });
  } catch (error) {
    next(error);
  }
});

// List assets for project
router.get('/project/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const assets = await prisma.generatedAsset.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: { scene: true },
    });
    res.json({ success: true, data: assets });
  } catch (error) {
    next(error);
  }
});

// Delete asset
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const asset = await prisma.generatedAsset.findUnique({ where: { id } });
    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }

    if (fs.existsSync(asset.localPath)) {
      try {
        fs.unlinkSync(asset.localPath);
      } catch (err) {
        // ignore deletion errors if file was already removed
      }
    }

    await prisma.generatedAsset.delete({ where: { id } });
    res.json({ success: true, message: 'Asset deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;

