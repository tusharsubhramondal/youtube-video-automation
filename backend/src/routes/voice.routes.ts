import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma.service.js';
import { getTTSProvider } from '../providers/tts/index.js';
import { config } from '../config/index.js';
import path from 'path';

const router = Router();

const DEFAULT_VOICES = [
  {
    name: 'Deep Narration (Christopher)',
    voiceId: 'en-US-ChristopherNeural',
    language: 'en-US',
    gender: 'Male',
    sampleUrl: null,
    isDefault: true,
  },
  {
    name: 'Casual & Friendly (Guy)',
    voiceId: 'en-US-GuyNeural',
    language: 'en-US',
    gender: 'Male',
    sampleUrl: null,
    isDefault: false,
  },
  {
    name: 'High Energy & Upbeat (Jenny)',
    voiceId: 'en-US-JennyNeural',
    language: 'en-US',
    gender: 'Female',
    sampleUrl: null,
    isDefault: false,
  },
  {
    name: 'Calm Storyteller (Aria)',
    voiceId: 'en-US-AriaNeural',
    language: 'en-US',
    gender: 'Female',
    sampleUrl: null,
    isDefault: false,
  },
  {
    name: 'Dramatic Documentary (Brian)',
    voiceId: 'en-GB-BrianNeural',
    language: 'en-GB',
    gender: 'Male',
    sampleUrl: null,
    isDefault: false,
  },
];

// Get all voice profiles (with auto-seeding if empty)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let voices = await prisma.voiceProfile.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    if (voices.length === 0) {
      for (const v of DEFAULT_VOICES) {
        await prisma.voiceProfile.create({ data: v });
      }
      voices = await prisma.voiceProfile.findMany({
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      });
    }

    res.json({ success: true, data: voices });
  } catch (error) {
    next(error);
  }
});

// Create custom voice profile
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, voiceId, language, gender, isDefault } = req.body;
    const voice = await prisma.voiceProfile.create({
      data: {
        name,
        voiceId: voiceId || name,
        language: language || 'en-US',
        gender: gender || 'Male',
        isDefault: isDefault ?? false,
      },
    });

    res.status(201).json({ success: true, data: voice });
  } catch (error) {
    next(error);
  }
});

// Synthesize preview sample for voice profile
router.post('/:id/preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const voice = await prisma.voiceProfile.findUnique({ where: { id } });

    if (!voice) {
      return res.status(404).json({ success: false, error: 'Voice profile not found' });
    }

    const previewText = `Hello! This is a preview of the ${voice.name} voice profile in AutoTube Studio.`;
    const filename = `voice_preview_${voice.id}_${Date.now()}.mp3`;
    const outputPath = path.join(config.storage.uploadDir, filename);

    const tts = getTTSProvider();
    const result = await tts.generateSpeech({
      text: previewText,
      voiceStyle: voice.voiceId || voice.name,
      language: voice.language.startsWith('en') ? 'en' : 'en',
      outputPath,
    });

    // Save sampleUrl in database
    await prisma.voiceProfile.update({
      where: { id: voice.id },
      data: { sampleUrl: result.url },
    });

    res.json({ success: true, data: { ...result, sampleUrl: result.url } });
  } catch (error) {
    next(error);
  }
});

// Delete voice profile
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.voiceProfile.delete({ where: { id } });
    res.json({ success: true, message: 'Voice profile removed' });
  } catch (error) {
    next(error);
  }
});

export default router;

