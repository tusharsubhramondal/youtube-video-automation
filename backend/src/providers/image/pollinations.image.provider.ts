import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { ImageProvider, ImageGenerationOptions } from '../interfaces.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../services/prisma.service.js';
import { config } from '../../config/index.js';

export class PollinationsImageProvider implements ImageProvider {
  name = 'Pollinations AI (Flux / Turbo / Sana)';

  private async getApiKey(): Promise<string | null> {
    if (process.env.POLLEN_API_KEY) return process.env.POLLEN_API_KEY;
    if (process.env.POLLINATIONS_API_KEY) return process.env.POLLINATIONS_API_KEY;
    try {
      const provider = await prisma.aIProvider.findFirst({
        where: {
          name: { contains: 'Pollinations', mode: 'insensitive' },
          apiKey: { not: null },
        },
      });
      return provider?.apiKey || null;
    } catch {
      return null;
    }
  }

  async generateImage(options: ImageGenerationOptions): Promise<{
    url: string;
    localPath: string;
    fileSizeBytes?: number;
  }> {
    const isShorts = options.aspectRatio === '9:16';
    const width = isShorts ? 720 : 1280;
    const height = isShorts ? 1280 : 720;
    const seed = Math.floor(Math.random() * 1000000);

    const enhancedPrompt = `${options.prompt}, ${options.style || 'cinematic'}, high quality, 8k, detailed`;
    const encodedPrompt = encodeURIComponent(enhancedPrompt);

    const apiKey = await this.getApiKey();
    const headers: Record<string, string> = {
      'User-Agent': 'YouTubeVideoAutomation/2.0 (image-engine)',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const keyParam = apiKey ? `&key=${apiKey}` : '';

    // Models to attempt in order
    const candidateUrls = [
      `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true${keyParam}`,
      `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&model=sana&nologo=true${keyParam}`,
      `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&model=turbo&nologo=true${keyParam}`,
    ];

    let lastError: any = null;

    for (const imageUrl of candidateUrls) {
      try {
        logger.info(`[Pollinations] Requesting AI visual: ${imageUrl.substring(0, 110)}...`);

        const response = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          headers,
          timeout: 45000,
        });

        // Ensure we actually got image bytes and not an error JSON payload
        const buffer = Buffer.from(response.data);
        if (buffer.length < 1000) {
          const str = buffer.toString('utf-8');
          if (str.includes('error') || str.includes('FREE_LIMIT')) {
            throw new Error(`Pollinations returned error payload: ${str}`);
          }
        }

        fs.writeFileSync(options.outputPath, buffer);

        const stats = fs.statSync(options.outputPath);
        const relPath = path.relative(config.storage.uploadDir, options.outputPath).replace(/\\/g, '/');

        logger.info(`[Pollinations] Successfully generated AI image (${stats.size} bytes)`);

        return {
          url: `/uploads/${relPath}`,
          localPath: options.outputPath,
          fileSizeBytes: stats.size,
        };
      } catch (err: any) {
        lastError = err;
        const status = err.response?.status;
        const errBody = err.response?.data ? Buffer.from(err.response.data).toString('utf-8') : err.message;
        logger.warn(`[Pollinations] Attempt failed (status ${status}): ${errBody.substring(0, 120)}`);

        // If rate limited with cooldown seconds and retry is possible
        if (status === 402 || status === 503) {
          const match = errBody.match(/Retry after (\d+)s/i);
          const waitSec = match ? parseInt(match[1], 10) + 1 : 0;
          if (waitSec > 0 && waitSec <= 20) {
            logger.info(`[Pollinations] Waiting ${waitSec}s for rate limit cooldown...`);
            await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
            // Retry the same URL once
            try {
              const retryRes = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                headers,
                timeout: 45000,
              });
              const retryBuffer = Buffer.from(retryRes.data);
              fs.writeFileSync(options.outputPath, retryBuffer);
              const stats = fs.statSync(options.outputPath);
              const filename = path.basename(options.outputPath);
              return {
                url: `/uploads/${filename}`,
                localPath: options.outputPath,
                fileSizeBytes: stats.size,
              };
            } catch (retryErr: any) {
              logger.warn(`[Pollinations] Retry after wait also failed: ${retryErr.message}`);
            }
          }
        }
      }
    }

    throw lastError || new Error('Pollinations AI image generation failed across all models');
  }
}
