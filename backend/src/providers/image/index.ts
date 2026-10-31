import { ImageProvider, ImageGenerationOptions } from '../interfaces.js';
import { PollinationsImageProvider } from './pollinations.image.provider.js';
import { MockImageProvider } from './mock.image.provider.js';
import { logger } from '../../utils/logger.js';

class ResilientImageProvider implements ImageProvider {
  name = 'Resilient Multi-Source Image Engine';
  private pollinations = new PollinationsImageProvider();
  private mock = new MockImageProvider();

  async generateImage(options: ImageGenerationOptions) {
    try {
      return await this.pollinations.generateImage(options);
    } catch (err: any) {
      logger.warn(`Pollinations failed (${err.message}), falling back to local mock image provider.`);
      return await this.mock.generateImage(options);
    }
  }
}

export function getImageProvider(): ImageProvider {
  return new ResilientImageProvider();
}

