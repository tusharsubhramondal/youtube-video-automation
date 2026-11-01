import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { ImageProvider, ImageGenerationOptions } from '../interfaces.js';
import { prisma } from '../../services/prisma.service.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export class CloudflareImageProvider implements ImageProvider {
  name = 'Cloudflare Workers AI';

  async getCredentials(): Promise<{ accountId: string; apiToken: string; modelName: string } | null> {
    try {
      const record = await prisma.aIProvider.findUnique({
        where: { providerKey: 'cloudflare' },
      });

      if (record?.isEnabled && record.apiKey) {
        let accountId = record.baseUrl || config.ai.cloudflareAccountId || '';
        if (!accountId && record.configJson) {
          try {
            const parsed = JSON.parse(record.configJson);
            accountId = parsed.accountId || '';
          } catch {}
        }

        if (accountId) {
          return {
            accountId: accountId.trim(),
            apiToken: record.apiKey.trim(),
            modelName: record.modelName || '@cf/black-forest-labs/flux-1-schnell',
          };
        }
      }
    } catch (err: any) {
      logger.warn(`[CloudflareAI] Could not load DB credentials: ${err.message}`);
    }

    if (config.ai.cloudflareApiToken && config.ai.cloudflareAccountId) {
      return {
        accountId: config.ai.cloudflareAccountId.trim(),
        apiToken: config.ai.cloudflareApiToken.trim(),
        modelName: '@cf/black-forest-labs/flux-1-schnell',
      };
    }

    return null;
  }

  async generateImage(options: ImageGenerationOptions): Promise<{
    url: string;
    localPath: string;
    provider?: string;
    model?: string;
    fileSizeBytes?: number;
  }> {
    const creds = await this.getCredentials();
    if (!creds || !creds.accountId || !creds.apiToken) {
      throw new Error(
        'Cloudflare Workers AI is not configured. Please provide both your Cloudflare Account ID and API Token in Settings.'
      );
    }

    const model = options.model || creds.modelName || '@cf/black-forest-labs/flux-1-schnell';
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${creds.accountId}/ai/run/${model}`;

    logger.info(`[CloudflareAI] Synthesizing image with model "${model}" for prompt: "${options.prompt.substring(0, 50)}..."`);

    try {
      const response = await axios.post(
        endpoint,
        {
          prompt: options.prompt,
        },
        {
          headers: {
            Authorization: `Bearer ${creds.apiToken}`,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
          timeout: 45000,
        }
      );

      let imageBuffer: Buffer;
      const rawBuffer = Buffer.from(response.data);
      const rawText = rawBuffer.toString('utf-8');

      if (rawText.startsWith('{')) {
        try {
          const json = JSON.parse(rawText);
          if (json.result?.image) {
            imageBuffer = Buffer.from(json.result.image, 'base64');
          } else if (json.errors && json.errors.length > 0) {
            throw new Error(json.errors.map((e: any) => e.message).join(', '));
          } else {
            imageBuffer = rawBuffer;
          }
        } catch (parseErr: any) {
          if (parseErr.message && !parseErr.message.includes('JSON')) {
            throw parseErr;
          }
          imageBuffer = rawBuffer;
        }
      } else {
        imageBuffer = rawBuffer;
      }

      const targetDir = path.dirname(options.outputPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      fs.writeFileSync(options.outputPath, imageBuffer);
      const filename = path.basename(options.outputPath);
      const fileSizeBytes = imageBuffer.length;

      logger.info(`[CloudflareAI] Successfully generated image (${fileSizeBytes} bytes): ${filename}`);

      return {
        url: `/uploads/${filename}`,
        localPath: options.outputPath,
        provider: `Cloudflare Workers AI (${model})`,
        model,
        fileSizeBytes,
      };
    } catch (err: any) {
      const errorMsg = err.response?.data
        ? Buffer.isBuffer(err.response.data)
          ? err.response.data.toString('utf-8')
          : JSON.stringify(err.response.data)
        : err.message;

      logger.error(`[CloudflareAI] Generation failed: ${errorMsg}`);
      throw new Error(`Cloudflare Workers AI error: ${errorMsg}`);
    }
  }
}

