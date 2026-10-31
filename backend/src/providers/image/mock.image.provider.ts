import fs from 'fs';
import path from 'path';
import { ImageProvider, ImageGenerationOptions } from '../interfaces.js';
import { ffmpeg } from '../../services/ffmpeg.service.js';
import { logger } from '../../utils/logger.js';

export class MockImageProvider implements ImageProvider {
  name = 'Mock Local Image Engine';

  async generateImage(options: ImageGenerationOptions): Promise<{
    url: string;
    localPath: string;
    fileSizeBytes?: number;
  }> {
    return new Promise((resolve, reject) => {
      const isShorts = options.aspectRatio === '9:16';
      const width = isShorts ? 720 : 1280;
      const height = isShorts ? 1280 : 720;

      // Color palettes for cinematic background variations
      const palettes = ['#1e1b4b', '#0f172a', '#18181b', '#311042', '#064e3b', '#1e293b'];
      const randomColor = palettes[Math.floor(Math.random() * palettes.length)];

      const cleanPrompt = (options.prompt || 'Scene Visual')
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .substring(0, 50);

      ffmpeg()
        .input(`color=c=${randomColor.replace('#', '')}:s=${width}x${height}`)
        .inputFormat('lavfi')
        .outputOptions([
          '-vframes', '1',
          '-pix_fmt', 'yuv420p',
        ])
        .output(options.outputPath)
        .on('end', () => {
          const stats = fs.statSync(options.outputPath);
          const filename = path.basename(options.outputPath);
          resolve({
            url: `/uploads/${filename}`,
            localPath: options.outputPath,
            fileSizeBytes: stats.size,
          });
        })
        .on('error', (err) => {
          logger.warn(`FFmpeg image generation fallback: ${err.message}. Writing SVG fallback.`);
          try {
            // Ultimate fallback: write SVG
            const svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="${randomColor}"/>
              <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-size="28" font-family="sans-serif">${cleanPrompt}</text>
            </svg>`;
            fs.writeFileSync(options.outputPath, svgContent);
            const stats = fs.statSync(options.outputPath);
            const filename = path.basename(options.outputPath);
            resolve({
              url: `/uploads/${filename}`,
              localPath: options.outputPath,
              fileSizeBytes: stats.size,
            });
          } catch (svgErr) {
            reject(svgErr);
          }
        })
        .run();
    });
  }
}

