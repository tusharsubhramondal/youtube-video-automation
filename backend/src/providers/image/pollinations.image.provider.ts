import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { ImageProvider, ImageGenerationOptions } from '../interfaces.js';
import { logger } from '../../utils/logger.js';

export class PollinationsImageProvider implements ImageProvider {
  name = 'Pollinations AI (Free High-Resolution AI Images)';

  async generateImage(options: ImageGenerationOptions): Promise<{
    url: string;
    localPath: string;
    fileSizeBytes?: number;
  }> {
    try {
      const isShorts = options.aspectRatio === '9:16';
      const width = isShorts ? 720 : 1280;
      const height = isShorts ? 1280 : 720;
      const seed = Math.floor(Math.random() * 1000000);

      const enhancedPrompt = `${options.prompt}, ${options.style || 'cinematic'}, high quality, 8k, detailed`;
      const encodedPrompt = encodeURIComponent(enhancedPrompt);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`;

      logger.info(`Fetching AI image from Pollinations: ${imageUrl.substring(0, 100)}...`);

      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 45000,
      });

      const buffer = Buffer.from(response.data);
      fs.writeFileSync(options.outputPath, buffer);

      const stats = fs.statSync(options.outputPath);
      const filename = path.basename(options.outputPath);

      return {
        url: `/uploads/${filename}`,
        localPath: options.outputPath,
        fileSizeBytes: stats.size,
      };
    } catch (err: any) {
      logger.error('Failed to fetch from Pollinations. Falling back to local generation:', err.message);
      throw err;
    }
  }
}

