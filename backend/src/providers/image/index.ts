import { ImageProvider, ImageGenerationOptions } from '../interfaces.js';
import { PollinationsImageProvider } from './pollinations.image.provider.js';
import { OpenAIImageProvider } from './openai.image.provider.js';
import { RealPhotoProvider } from './realphoto.image.provider.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../services/prisma.service.js';

class ResilientImageProvider implements ImageProvider {
  name = 'Real AI & Photographic Visual Engine';
  private openai = new OpenAIImageProvider();
  private pollinations = new PollinationsImageProvider();
  private realPhoto = new RealPhotoProvider();
  private agentType?: string;

  constructor(agentType?: string) {
    this.agentType = agentType;
  }

  async generateImage(options: ImageGenerationOptions) {
    const failureLogs: string[] = [];

    // Check if user set specific preferred image provider for this agent
    let preferred = 'openai';
    try {
      const routingRecord = await prisma.aIProvider.findUnique({
        where: { providerKey: 'agent_routing' },
      });
      if (routingRecord?.configJson && this.agentType) {
        const routing = JSON.parse(routingRecord.configJson);
        const target = routing[this.agentType.toUpperCase()];
        if (target?.provider) {
          preferred = target.provider.toLowerCase();
        }
      }
    } catch {}

    const tryOpenAI = async () => {
      try {
        const apiKey = await this.openai.getApiKey();
        if (apiKey) {
          logger.info(`[ImageEngine] (${this.agentType || 'General'}) Generating with OpenAI DALL-E 3...`);
          return await this.openai.generateImage(options);
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
        return await this.pollinations.generateImage(options);
      } catch (err: any) {
        logger.warn(`[ImageEngine] Pollinations AI failed (${err.message})`);
        failureLogs.push(`Pollinations: ${err.message}`);
      }
      return null;
    };

    // If preferred is pollinations, prioritize it over OpenAI
    if (preferred === 'pollinations') {
      const res1 = await tryPollinations();
      if (res1) return res1;

      const res2 = await tryOpenAI();
      if (res2) return res2;
    } else {
      // Default order: OpenAI -> Pollinations
      const res1 = await tryOpenAI();
      if (res1) return res1;

      const res2 = await tryPollinations();
      if (res2) return res2;
    }

    // 3. Fallback to Real Photographic Scene Engine (Wikimedia Commons High-Res Media cropped via FFmpeg)
    try {
      logger.info(`[ImageEngine] (${this.agentType || 'General'}) Fetching high-resolution photographic scene visual...`);
      return await this.realPhoto.generateImage(options);
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
