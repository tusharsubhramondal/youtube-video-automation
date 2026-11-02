import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma.service.js';
import { getTTSProvider } from '../providers/tts/index.js';
import { config } from '../config/index.js';
import path from 'path';
import fs from 'fs';

const router = Router();

const DEFAULT_VOICES = [
  {
    name: 'Deep Storyteller (Bashkar - বাংলা)',
    voiceId: 'bn-IN-BashkarNeural',
    language: 'bn-IN',
    gender: 'Male',
    sampleUrl: null,
    isDefault: false,
  },
  {
    name: 'Calm Narrator (Tanishaa - বাংলা)',
    voiceId: 'bn-IN-TanishaaNeural',
    language: 'bn-IN',
    gender: 'Female',
    sampleUrl: null,
    isDefault: false,
  },
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
  {
    name: 'Youthful & Dynamic (Eric)',
    voiceId: 'en-US-EricNeural',
    language: 'en-US',
    gender: 'Male',
    sampleUrl: null,
    isDefault: false,
  },
  {
    name: 'Refined & Elegant (Sonia)',
    voiceId: 'en-GB-SoniaNeural',
    language: 'en-GB',
    gender: 'Female',
    sampleUrl: null,
    isDefault: false,
  },
  {
    name: 'Warm & Empathetic (Michelle)',
    voiceId: 'en-US-MichelleNeural',
    language: 'en-US',
    gender: 'Female',
    sampleUrl: null,
    isDefault: false,
  },
  {
    name: 'Indian English (Neerja)',
    voiceId: 'en-IN-NeerjaNeural',
    language: 'en-IN',
    gender: 'Female',
    sampleUrl: null,
    isDefault: false,
  },
];

// Get all voice profiles (with auto-sync for default voices)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    for (const v of DEFAULT_VOICES) {
      const exists = await prisma.voiceProfile.findFirst({
        where: { voiceId: v.voiceId },
      });
      if (!exists) {
        await prisma.voiceProfile.create({ data: v });
      }
    }

    const voices = await prisma.voiceProfile.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

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

// Synthesize preview sample for voice profile (stored in isolated voices/ folder)
router.post('/:id/preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const voice = await prisma.voiceProfile.findUnique({ where: { id } });

    if (!voice) {
      return res.status(404).json({ success: false, error: 'Voice profile not found' });
    }

    const voiceDir = config.storage.voiceDir;
    if (!fs.existsSync(voiceDir)) {
      fs.mkdirSync(voiceDir, { recursive: true });
    }

    // Stable, isolated preview filename per voice (safe from project asset cleanups)
    const safeVoiceId = (voice.voiceId || voice.name).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeVoiceId}.mp3`;
    const outputPath = path.join(voiceDir, filename);
    const publicUrl = `/uploads/voices/${filename}`;

    // If already generated and healthy, reuse cached audio immediately
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
      if (voice.sampleUrl !== publicUrl) {
        await prisma.voiceProfile.update({
          where: { id: voice.id },
          data: { sampleUrl: publicUrl },
        });
      }
      return res.json({
        success: true,
        data: {
          url: publicUrl,
          localPath: outputPath,
          durationSeconds: 5.0,
          sampleUrl: publicUrl,
        },
      });
    }

    const previewText = `Hello! This is a preview of the ${voice.name} voice in AutoTube Studio.`;

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
      data: { sampleUrl: publicUrl },
    });

    res.json({
      success: true,
      data: {
        ...result,
        url: publicUrl,
        localPath: outputPath,
        sampleUrl: publicUrl,
      },
    });
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

