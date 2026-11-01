import { VideoProvider, VideoGenerationOptions } from '../interfaces.js';
import { ffmpeg } from '../../services/ffmpeg.service.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';
import fs from 'fs';
import path from 'path';

export class FFmpegVideoProvider implements VideoProvider {
  name = 'FFmpeg Motion Video Synthesizer';

  async generateVideo(options: VideoGenerationOptions): Promise<{
    url: string;
    localPath: string;
    fileSizeBytes?: number;
  }> {
    return new Promise((resolve, reject) => {
      const isShorts = options.aspectRatio === '9:16';
      const width = isShorts ? 1080 : 1920;
      const height = isShorts ? 1920 : 1080;
      const duration = Math.max(1, Math.round(options.durationSeconds || 5));
      const fps = 30;
      const totalFrames = duration * fps;

      let cmd = ffmpeg();

      if (options.imagePath && fs.existsSync(options.imagePath)) {
        // Apply Ken Burns dynamic zoom filter on image
        // zoompan=z='min(zoom+0.0015,1.2)':d=totalFrames:s=WxH
        cmd = cmd
          .input(options.imagePath)
          .loop(duration)
          .videoFilters([
            `scale=${width * 2}:${height * 2}`,
            `zoompan=z='min(zoom+0.0015,1.25)':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps}`,
            'format=yuv420p',
          ]);
      } else {
        // Fallback procedural video generator
        cmd = cmd
          .input(`testsrc=duration=${duration}:size=${width}x${height}:rate=${fps}`)
          .inputFormat('lavfi')
          .videoFilters(['format=yuv420p']);
      }

      cmd
        .outputOptions([
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-t', `${duration}`,
        ])
        .output(options.outputPath)
        .on('end', () => {
          const stats = fs.statSync(options.outputPath);
          const relPath = path.relative(config.storage.uploadDir, options.outputPath).replace(/\\/g, '/');
          logger.info(`Generated video clip: ${relPath} (${stats.size} bytes)`);
          resolve({
            url: `/uploads/${relPath}`,
            localPath: options.outputPath,
            fileSizeBytes: stats.size,
          });
        })
        .on('error', (err) => {
          logger.error('FFmpeg video generation error:', err);
          reject(err);
        })
        .run();
    });
  }
}

