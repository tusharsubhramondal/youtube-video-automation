import { ImageProvider, ImageGenerationOptions } from '../interfaces.js';
import { PollinationsImageProvider } from './pollinations.image.provider.js';
import { OpenAIImageProvider } from './openai.image.provider.js';
import { RealPhotoProvider } from './realphoto.image.provider.js';
import { logger } from '../../utils/logger.js';

class ResilientImageProvider implements ImageProvider {
  name = 'Real AI & Photographic Visual Engine';
  private openai = new OpenAIImageProvider();
  private pollinations = new PollinationsImageProvider();
  private realPhoto = new RealPhotoProvider();

  async generateImage(options: ImageGenerationOptions) {
    const failureLogs: string[] = [];

    // 1. Try OpenAI DALL-E 3 if API key is configured
    try {
      const apiKey = await this.openai.getApiKey();
      if (apiKey) {
        logger.info('[ImageEngine] Attempting generation with OpenAI DALL-E 3...');
        return await this.openai.generateImage(options);
      }
    } catch (err: any) {
      logger.warn(`[ImageEngine] OpenAI DALL-E failed (${err.message}). Trying Pollinations AI...`);
      failureLogs.push(`OpenAI: ${err.message}`);
    }

    // 2. Try Pollinations AI (Flux / Sana / Turbo models)
    try {
      logger.info('[ImageEngine] Attempting generation with Pollinations AI...');
      return await this.pollinations.generateImage(options);
    } catch (err: any) {
      logger.warn(`[ImageEngine] Pollinations AI failed (${err.message}). Trying Real Photographic Scene Engine...`);
      failureLogs.push(`Pollinations: ${err.message}`);
    }

    // 3. Try Real Photographic Scene Engine (Wikimedia Commons High-Res Media cropped via FFmpeg)
    try {
      logger.info('[ImageEngine] Fetching high-resolution photographic scene visual...');
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

export function getImageProvider(): ImageProvider {
  return new ResilientImageProvider();
}
