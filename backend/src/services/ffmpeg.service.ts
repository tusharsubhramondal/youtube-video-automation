import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

// Setup fluent-ffmpeg with bundled binary if available
let ffmpegPath = ffmpegInstaller.path;
let ffprobePath = ffprobeInstaller.path;

if (ffmpegPath && fs.existsSync(ffmpegPath)) {
  ffmpeg.setFfmpegPath(ffmpegPath);
  logger.info(`FFmpeg path set: ${ffmpegPath}`);
} else {
  logger.warn('FFmpeg bundled binary not found at default path, relying on system PATH');
}

if (ffprobePath && fs.existsSync(ffprobePath)) {
  ffmpeg.setFfprobePath(ffprobePath);
  logger.info(`FFprobe path set: ${ffprobePath}`);
}

export { ffmpeg, ffmpegPath, ffprobePath };

export interface RenderOptions {
  scenes: {
    imagePath?: string;
    videoPath?: string;
    audioPath?: string;
    duration: number;
    text?: string;
  }[];
  format: 'SHORTS' | 'REGULAR'; // 9:16 (1080x1920) or 16:9 (1920x1080)
  resolution: string; // '1080p' | '720p'
  fps: number;
  outputFilePath: string;
  backgroundMusicPath?: string;
  bgMusicVolume?: number;
  voiceVolume?: number;
  onProgress?: (percent: number) => void;
}

export async function checkFfmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    ffmpeg.getAvailableCodecs((err, codecs) => {
      if (err) {
        logger.error('FFmpeg codec check failed:', err);
        resolve(false);
      } else {
        logger.info('FFmpeg is verified operational with available codecs.');
        resolve(true);
      }
    });
  });
}

