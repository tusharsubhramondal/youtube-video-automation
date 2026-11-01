import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import fs from 'fs';
import path from 'path';
import { TTSProvider, TTSOptions } from '../interfaces.js';
import { ffmpeg } from '../../services/ffmpeg.service.js';
import { logger } from '../../utils/logger.js';

export const VOICE_STYLE_TO_EDGE_VOICE: Record<string, string> = {
  // Common style descriptions
  'Deep Narration (Christopher)': 'en-US-ChristopherNeural',
  'Deep Narration': 'en-US-ChristopherNeural',
  'Christopher': 'en-US-ChristopherNeural',
  'Casual & Friendly (Guy)': 'en-US-GuyNeural',
  'Casual & Friendly': 'en-US-GuyNeural',
  'Guy': 'en-US-GuyNeural',
  'High Energy & Upbeat (Jenny)': 'en-US-JennyNeural',
  'High Energy & Enthusiastic': 'en-US-EricNeural',
  'Jenny': 'en-US-JennyNeural',
  'Calm Storyteller (Aria)': 'en-US-AriaNeural',
  'Calm Storyteller': 'en-US-AriaNeural',
  'Aria': 'en-US-AriaNeural',
  'Dramatic Documentary (Brian)': 'en-GB-BrianNeural',
  'Dramatic Documentary': 'en-GB-BrianNeural',
  'Brian': 'en-GB-BrianNeural',
  'Ryan': 'en-GB-RyanNeural',
  'Sonia': 'en-GB-SoniaNeural',

  // Language mappings
  'Spanish': 'es-ES-AlvaroNeural',
  'French': 'fr-FR-HenriNeural',
  'German': 'de-DE-ConradNeural',
  'Hindi': 'hi-IN-MadhurNeural',
  'Japanese': 'ja-JP-KeitaNeural',
};

export class EdgeTTSProvider implements TTSProvider {
  name = 'Microsoft Edge Neural TTS';

  async generateSpeech(options: TTSOptions): Promise<{
    url: string;
    localPath: string;
    durationSeconds: number;
  }> {
    const voiceId = this.resolveVoiceId(options.voiceStyle, options.language);
    logger.info(`[EdgeTTS] Synthesizing speech with neural voice "${voiceId}" for: "${options.text.substring(0, 40)}..."`);

    try {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

      const targetDir = path.dirname(options.outputPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const { audioStream } = tts.toStream(options.text);
      const fileStream = fs.createWriteStream(options.outputPath);

      await new Promise<void>((resolve, reject) => {
        audioStream.pipe(fileStream);
        fileStream.on('finish', () => resolve());
        audioStream.on('error', (err) => {
          logger.error('[EdgeTTS] Audio stream error:', err);
          reject(err);
        });
        fileStream.on('error', (err) => {
          logger.error('[EdgeTTS] File write error:', err);
          reject(err);
        });
      });

      const duration = await this.getAudioDuration(options.outputPath, options.text);
      const filename = path.basename(options.outputPath);

      logger.info(`[EdgeTTS] Successfully synthesized ${duration.toFixed(2)}s audio: ${filename}`);

      return {
        url: `/uploads/${filename}`,
        localPath: options.outputPath,
        durationSeconds: duration,
      };
    } catch (err: any) {
      logger.error(`[EdgeTTS] Synthesis failed: ${err.message}`);
      throw err;
    }
  }

  private resolveVoiceId(voiceStyle?: string, language?: string): string {
    if (voiceStyle) {
      // If directly a Neural voice ID
      if (voiceStyle.includes('Neural')) {
        return voiceStyle;
      }

      // Check predefined map
      if (VOICE_STYLE_TO_EDGE_VOICE[voiceStyle]) {
        return VOICE_STYLE_TO_EDGE_VOICE[voiceStyle];
      }

      // Substring check
      for (const [key, id] of Object.entries(VOICE_STYLE_TO_EDGE_VOICE)) {
        if (voiceStyle.toLowerCase().includes(key.toLowerCase())) {
          return id;
        }
      }
    }

    if (language && VOICE_STYLE_TO_EDGE_VOICE[language]) {
      return VOICE_STYLE_TO_EDGE_VOICE[language];
    }

    // Default to the cinematic Christopher documentary voice
    return 'en-US-ChristopherNeural';
  }

  private async getAudioDuration(filePath: string, text: string): Promise<number> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (!err && metadata && metadata.format && metadata.format.duration) {
          resolve(parseFloat(metadata.format.duration.toString()));
        } else {
          // Fallback based on average speaking rate (~150 words per minute / 2.5 words per sec)
          const wordCount = text.split(/\s+/).filter(Boolean).length;
          const estimatedSec = Math.max(3.0, (wordCount / 2.5) + 0.5);
          resolve(estimatedSec);
        }
      });
    });
  }
}

