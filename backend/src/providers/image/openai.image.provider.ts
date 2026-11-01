import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { ImageProvider, ImageGenerationOptions } from '../interfaces.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../services/prisma.service.js';

export class OpenAIImageProvider implements ImageProvider {
  name = 'OpenAI DALL-E 3 Image Engine';

  async getApiKey(): Promise<string | null> {
    if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
    try {
      const provider = await prisma.aIProvider.findFirst({
        where: {
          name: { contains: 'OpenAI', mode: 'insensitive' },
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
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    const isShorts = options.aspectRatio === '9:16';
    const size = isShorts ? '1024x1792' : '1792x1024';

    logger.info(`[OpenAIImage] Generating DALL-E 3 visual: "${options.prompt.substring(0, 50)}..."`);

    const response = await axios.post(
      'https://api.openai.com/v1/images/generations',
      {
        model: 'dall-e-3',
        prompt: options.prompt,
        n: 1,
        size,
        response_format: 'b64_json',
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 90000,
      }
    );

    const b64Data = response.data?.data?.[0]?.b64_json;
    if (!b64Data) {
      throw new Error('No image data returned from OpenAI DALL-E API');
    }

    const buffer = Buffer.from(b64Data, 'base64');
    fs.writeFileSync(options.outputPath, buffer);

    const stats = fs.statSync(options.outputPath);
    const filename = path.basename(options.outputPath);

    return {
      url: `/uploads/${filename}`,
      localPath: options.outputPath,
      fileSizeBytes: stats.size,
    };
  }
}
