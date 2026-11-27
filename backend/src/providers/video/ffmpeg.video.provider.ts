import { VideoProvider, VideoGenerationOptions } from '../interfaces.js';
import { ffmpeg } from '../../services/ffmpeg.service.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';
import { buildCameraMotionFilter } from '../../utils/motion.util.js';
import fs from 'fs';
import path from 'path';

export class FFmpegVideoProvider implements VideoProvider {
  name = 'FFmpeg Motion Video Synthesizer';

  private runFfmpegCommand(
    options: VideoGenerationOptions,
    filterString: string,
    width: number,
    height: number,
    duration: number,
    fps: number
  ): Promise<{ url: string; localPath: string; fileSizeBytes?: number }> {
    return new Promise((resolve, reject) => {
      let cmd = ffmpeg();

      if (options.imagePath && fs.existsSync(options.imagePath)) {
        // Optimize pre-scale to 1.25x (instead of 4K) to eliminate memory bloat while preserving smooth zoompan
        const scaleW = Math.round((width * 1.25) / 2) * 2;
        const scaleH = Math.round((height * 1.25) / 2) * 2;

        cmd = cmd
          .input(options.imagePath)
          .inputOptions([
            '-framerate', `${fps}`,
            '-loop', '1',
          ])
          .videoFilters([
            `scale=${scaleW}:${scaleH}`,
            filterString,
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
          '-preset', 'veryfast',
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

  async generateVideo(options: VideoGenerationOptions): Promise<{
    url: string;
    localPath: string;
    fileSizeBytes?: number;
  }> {
    const isShorts = options.aspectRatio === '9:16';
    const width = isShorts ? 1080 : 1920;
    const height = isShorts ? 1920 : 1080;
    const duration = Math.max(1, Math.round(options.durationSeconds || 5));
    const fps = 30;
    const totalFrames = duration * fps;

    // Build targeted motion filter
    const { filter: motionFilter, motion } = buildCameraMotionFilter({
      movement: options.cameraMovement,
      sceneIndex: options.sceneIndex || 0,
      totalFrames,
      width,
      height,
      fps,
    });

    logger.info(`Applying camera motion / parallax [${motion}] (directive: "${options.cameraMovement || 'auto'}")`);

    try {
      return await this.runFfmpegCommand(options, motionFilter, width, height, duration, fps);
    } catch (primaryErr: any) {
      logger.warn(`Primary motion filter [${motion}] failed (${primaryErr.message}). Retrying with safe Ken Burns zoom...`);

      // Fallback to lightweight, rock-solid Ken Burns zoom to guarantee completion
      const safeStep = (0.15 / totalFrames).toFixed(5);
      const safeZoomFilter = `zoompan=z='min(zoom+${safeStep},1.15)':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps}`;

      try {
        return await this.runFfmpegCommand(options, safeZoomFilter, width, height, duration, fps);
      } catch (fallbackErr: any) {
        logger.error('FFmpeg fallback video generation error:', fallbackErr);
        throw fallbackErr;
      }
    }
  }
}
