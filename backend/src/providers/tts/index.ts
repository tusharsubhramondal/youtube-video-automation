import { TTSProvider, TTSOptions } from '../interfaces.js';
import { EdgeTTSProvider } from './edge.tts.provider.js';
import { GoogleTTSProvider } from './gtts.tts.provider.js';
import { MockTTSProvider } from './mock.tts.provider.js';
import { logger } from '../../utils/logger.js';

class ResilientTTSProvider implements TTSProvider {
  name = 'Microsoft Edge Neural TTS';
  private edgeTts = new EdgeTTSProvider();
  private googleTts = new GoogleTTSProvider();
  private mockTts = new MockTTSProvider();

  async generateSpeech(options: TTSOptions) {
    try {
      return await this.edgeTts.generateSpeech(options);
    } catch (edgeErr: any) {
      logger.warn(`[TTS Router] Edge Neural TTS failed (${edgeErr.message}). Falling back to Google TTS...`);
      try {
        return await this.googleTts.generateSpeech(options);
      } catch (gErr: any) {
        logger.warn(`[TTS Router] Google TTS failed (${gErr.message}). Falling back to synthetic tone...`);
        return await this.mockTts.generateSpeech(options);
      }
    }
  }
}

export function getTTSProvider(): TTSProvider {
  return new ResilientTTSProvider();
}

