import { ImageProvider, ImageGenerationOptions } from '../interfaces.js';
import { PollinationsImageProvider } from './pollinations.image.provider.js';
import { OpenAIImageProvider } from './openai.image.provider.js';
import { CloudflareImageProvider } from './cloudflare.image.provider.js';
import { RealPhotoProvider } from './realphoto.image.provider.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../services/prisma.service.js';

class ResilientImageProvider implements ImageProvider {
  name = 'Real AI & Photographic Visual Engine';
  private openai = new OpenAIImageProvider();
  private pollinations = new PollinationsImageProvider();
  private cloudflare = new CloudflareImageProvider();
  private realPhoto = new RealPhotoProvider();
  private agentType?: string;

  constructor(agentType?: string) {
    this.agentType = agentType;
  }

  async generateImage(options: ImageGenerationOptions) {
    const failureLogs: string[] = [];

    // Check if user set specific preferred image provider for this agent
    let preferred = 'pollinations';
    let targetModel: string | undefined;

    try {
      const routingRecord = await prisma.aIProvider.findUnique({
        where: { providerKey: 'agent_routing' },
      });
      if (routingRecord?.configJson && this.agentType) {
        const routing = JSON.parse(routingRecord.configJson);
        const target = routing[this.agentType.toUpperCase()];
        if (target?.provider) {
          preferred = target.provider.toLowerCase();
          targetModel = target.model;
        }
      }
    } catch { }

    const tryCloudflare = async () => {
      try {
        const creds = await this.cloudflare.getCredentials();
        if (creds) {
          const modelToUse = targetModel || creds.modelName;
          logger.info(`[ImageEngine] (${this.agentType || 'General'}) Generating with Cloudflare Workers AI (${modelToUse})...`);
          const res = await this.cloudflare.generateImage({
            ...options,
            model: modelToUse,
          });
          return {
            ...res,
            provider: `Cloudflare Workers AI (${modelToUse})`,
            model: modelToUse,
          };
        } else {
          logger.info(`[ImageEngine] (${this.agentType || 'General'}) Cloudflare selected but credentials missing in settings, skipping to fallback...`);
        }
      } catch (err: any) {
        logger.warn(`[ImageEngine] Cloudflare Workers AI failed (${err.message})`);
        failureLogs.push(`CloudflareAI: ${err.message}`);
      }
      return null;
    };

    const tryOpenAI = async () => {
      try {
        const apiKey = await this.openai.getApiKey();
        if (apiKey) {
          logger.info(`[ImageEngine] (${this.agentType || 'General'}) Generating with OpenAI DALL-E 3...`);
          const res = await this.openai.generateImage(options);
          return {
            ...res,
            provider: 'OpenAI DALL-E 3',
            model: 'dall-e-3',
          };
        }
      } catch (err: any) {
        logger.warn(`[ImageEngine] OpenAI DALL-E failed (${err.message})`);
        failureLogs.push(`OpenAI: ${err.message}`);
      }
      return null;
    };

    const tryPollinations = async () => {
      try {
        logger.info(`[ImageEngine] (${this.agentType || 'General'}) Generating with Pollinations AI...`);
        const res = await this.pollinations.generateImage(options);
        return {
          ...res,
          provider: 'Pollinations AI (Flux)',
          model: 'flux',
        };
      } catch (err: any) {
        logger.warn(`[ImageEngine] Pollinations AI failed (${err.message})`);
        failureLogs.push(`Pollinations: ${err.message}`);
      }
      return null;
    };

    // Priority execution based on agent routing preference
    if (preferred === 'cloudflare') {
      const res1 = await tryCloudflare();
      if (res1) return res1;

      const res2 = await tryPollinations();
      if (res2) return res2;

      const res3 = await tryOpenAI();
      if (res3) return res3;
    } else if (preferred === 'openai') {
      const res1 = await tryOpenAI();
      if (res1) return res1;

      const res2 = await tryCloudflare();
      if (res2) return res2;

      const res3 = await tryPollinations();
      if (res3) return res3;
    } else {
      // Default: Pollinations -> Cloudflare -> OpenAI
      const res1 = await tryPollinations();
      if (res1) return res1;

      const res2 = await tryCloudflare();
      if (res2) return res2;

      const res3 = await tryOpenAI();
      if (res3) return res3;
    }

    // 4. Fallback to Real Photographic Scene Engine (Wikimedia Commons High-Res Media cropped via FFmpeg)
    try {
      logger.info(`[ImageEngine] (${this.agentType || 'General'}) Fetching high-resolution photographic scene visual...`);
      const res = await this.realPhoto.generateImage(options);
      return {
        ...res,
        provider: 'Real Photographic Scene Engine',
      };
    } catch (err: any) {
      logger.error(`[ImageEngine] Real Photo Engine failed: ${err.message}`);
      failureLogs.push(`RealPhotoEngine: ${err.message}`);
    }

    // Zero-tolerance policy for mock/colored box/SVG fallbacks: throw explicit descriptive error
    throw new Error(
      `Failed to generate real visual for scene. All real providers failed:\n${failureLogs.join('\n')}`
    );
  }
}

export function getImageProvider(agentType?: string): ImageProvider {
  return new ResilientImageProvider(agentType);
}
