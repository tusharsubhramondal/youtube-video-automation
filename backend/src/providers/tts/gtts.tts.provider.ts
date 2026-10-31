import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { TTSProvider, TTSOptions } from '../interfaces.js';
import { ffmpeg } from '../../services/ffmpeg.service.js';
import { logger } from '../../utils/logger.js';

export class GoogleTTSProvider implements TTSProvider {
  name = 'Google Free TTS Engine';

  async generateSpeech(options: TTSOptions): Promise<{
    url: string;
    localPath: string;
    durationSeconds: number;
  }> {
    const cleanText = options.text.substring(0, 200); // Google TTS limit per chunk
    const lang = options.language || 'en';
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=${lang}&client=tw-ob`;

    try {
      logger.info(`Fetching speech audio for: "${cleanText.substring(0, 40)}..."`);
      const response = await axios.get(ttsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        responseType: 'arraybuffer',
        timeout: 10000,
      });

      fs.writeFileSync(options.outputPath, Buffer.from(response.data));

      // Measure duration with ffprobe
      const duration = await this.getAudioDuration(options.outputPath);
      const filename = path.basename(options.outputPath);

      return {
        url: `/uploads/${filename}`,
        localPath: options.outputPath,
        durationSeconds: duration,
      };
    } catch (err: any) {
      logger.warn(`Google TTS failed: ${err.message}. Using synthetic audio generator.`);
      throw err;
    }
  }

  private async getAudioDuration(filePath: string): Promise<number> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (!err && metadata && metadata.format && metadata.format.duration) {
          resolve(parseFloat(metadata.format.duration.toString()));
        } else {
          // Fallback estimated duration based on text length (~2.5 words per second)
          resolve(5.0);
        }
      });
    });
  }
}

