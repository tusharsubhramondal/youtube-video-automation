import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { ImageProvider, ImageGenerationOptions } from '../interfaces.js';
import { ffmpeg } from '../../services/ffmpeg.service.js';
import { logger } from '../../utils/logger.js';

export class RealPhotoProvider implements ImageProvider {
  name = 'Real Photographic Scene Engine';

  private extractKeywords(prompt: string): string {
    const cleaned = prompt
      .replace(/(cinematic lighting|sharp details|8k|high quality|photorealistic|hyperrealistic|coherent wardrobe|consistent character|aesthetic|visual prompt)/gi, '')
      .replace(/[^a-zA-Z0-9 ]/g, ' ')
      .trim();
    const words = cleaned.split(/\s+/).filter((w) => w.length > 2);
    // Take 2-3 most relevant terms
    return words.slice(0, 3).join(' ') || 'cinematic scene';
  }

  async generateImage(options: ImageGenerationOptions): Promise<{
    url: string;
    localPath: string;
    fileSizeBytes?: number;
  }> {
    const isShorts = options.aspectRatio === '9:16';
    const targetWidth = isShorts ? 720 : 1280;
    const targetHeight = isShorts ? 1280 : 720;

    const keywords = this.extractKeywords(options.prompt);
    logger.info(`[RealPhotoProvider] Searching real photographic visual for: "${keywords}"`);

    // Search Wikimedia Commons public domain / CC photographic media
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
      keywords + ' filetype:bitmap'
    )}&gsrlimit=10&prop=imageinfo&iiprop=url|size|mime&format=json`;

    let imageUrl: string | null = null;

    try {
      const searchRes = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'YouTubeVideoAutomation/2.0 (real-media-pipeline)',
        },
        timeout: 15000,
      });

      const pages = Object.values(searchRes.data?.query?.pages || {});
      for (const page of pages as any[]) {
        const info = page.imageinfo?.[0];
        if (
          info &&
          (info.mime === 'image/jpeg' || info.mime === 'image/png') &&
          info.width >= 600 &&
          info.height >= 400 &&
          !info.url.endsWith('.svg')
        ) {
          imageUrl = info.url;
          break;
        }
      }
    } catch (searchErr: any) {
      logger.warn(`[RealPhotoProvider] Primary image search failed: ${searchErr.message}`);
    }

    // Fallback: broader query if specific keywords produced no suitable images
    if (!imageUrl) {
      try {
        const fallbackWord = keywords.split(' ')[0] || 'nature';
        const fallbackUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
          fallbackWord + ' filetype:bitmap'
        )}&gsrlimit=5&prop=imageinfo&iiprop=url|size|mime&format=json`;
        const fbRes = await axios.get(fallbackUrl, {
          headers: { 'User-Agent': 'YouTubeVideoAutomation/2.0 (real-media-pipeline)' },
          timeout: 10000,
        });
        const pages = Object.values(fbRes.data?.query?.pages || {});
        for (const page of pages as any[]) {
          const info = page.imageinfo?.[0];
          if (info && (info.mime === 'image/jpeg' || info.mime === 'image/png') && !info.url.endsWith('.svg')) {
            imageUrl = info.url;
            break;
          }
        }
      } catch (fbErr: any) {
        logger.warn(`[RealPhotoProvider] Fallback search also failed: ${fbErr.message}`);
      }
    }

    if (!imageUrl) {
      throw new Error(`No real photographic imagery found matching keywords: "${keywords}"`);
    }

    logger.info(`[RealPhotoProvider] Downloading real image: ${imageUrl.substring(0, 90)}...`);

    const tempRawPath = options.outputPath + '.raw.jpg';
    const cleanImageUrl = imageUrl.split('?')[0];

    try {
      const downloadRes = await axios.get(cleanImageUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'YouTubeVideoAutomation/2.0 (contact: developer@gmail.com; educational research)',
        },
        timeout: 25000,
      });

      fs.writeFileSync(tempRawPath, Buffer.from(downloadRes.data));

      // Use FFmpeg to crop and scale the real photo to the exact aspect ratio & resolution
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempRawPath)
          .outputOptions([
            '-vf',
            `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight}`,
            '-vframes',
            '1',
          ])
          .output(options.outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      const stats = fs.statSync(options.outputPath);
      const filename = path.basename(options.outputPath);

      return {
        url: `/uploads/${filename}`,
        localPath: options.outputPath,
        fileSizeBytes: stats.size,
      };
    } finally {
      // Clean up raw temp file
      if (fs.existsSync(tempRawPath)) {
        try {
          fs.unlinkSync(tempRawPath);
        } catch {}
      }
    }
  }
}
