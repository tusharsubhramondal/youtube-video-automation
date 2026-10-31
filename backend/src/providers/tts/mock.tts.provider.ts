import { TTSProvider, TTSOptions } from '../interfaces.js';
import { ffmpeg } from '../../services/ffmpeg.service.js';
import { logger } from '../../utils/logger.js';
import path from 'path';

export class MockTTSProvider implements TTSProvider {
  name = 'Mock Synthetic TTS Generator';

  async generateSpeech(options: TTSOptions): Promise<{
    url: string;
    localPath: string;
    durationSeconds: number;
  }> {
    return new Promise((resolve, reject) => {
      // Calculate realistic spoken duration: ~2.5 words per second + 1 sec buffer
      const wordCount = options.text.trim().split(/\s+/).length;
      const durationSeconds = Math.max(3, Math.round(wordCount / 2.5) + 1);

      ffmpeg()
        .input(`aevalsrc=0:d=${durationSeconds}`)
        .inputFormat('lavfi')
        .outputOptions([
          '-c:a', 'libmp3lame',
          '-b:a', '128k',
          '-ar', '44100',
        ])
        .output(options.outputPath)
        .on('end', () => {
          const filename = path.basename(options.outputPath);
          logger.info(`Generated synthetic audio: ${filename} (duration: ${durationSeconds}s)`);
          resolve({
            url: `/uploads/${filename}`,
            localPath: options.outputPath,
            durationSeconds,
          });
        })
        .on('error', (err) => {
          logger.error('Failed to generate synthetic audio:', err);
          reject(err);
        })
        .run();
    });
  }
}

