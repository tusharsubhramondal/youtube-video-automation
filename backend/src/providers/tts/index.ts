import { TTSProvider, TTSOptions } from '../interfaces.js';
import { EdgeTTSProvider } from './edge.tts.provider.js';
import { GoogleTTSProvider } from './gtts.tts.provider.js';
import { logger } from '../../utils/logger.js';

class ResilientTTSProvider implements TTSProvider {
  name = 'Microsoft Edge Neural TTS';
  private edgeTts = new EdgeTTSProvider();
  private googleTts = new GoogleTTSProvider();

  async generateSpeech(options: TTSOptions) {
    try {
      return await this.edgeTts.generateSpeech(options);
    } catch (edgeErr: any) {
      logger.warn(`[TTS Router] Edge Neural TTS failed (${edgeErr.message}). Trying Google TTS...`);
      try {
        return await this.googleTts.generateSpeech(options);
      } catch (gErr: any) {
        logger.error(`[TTS Router] Google TTS also failed (${gErr.message})`);
        throw new Error(
          `[TTS Router] Real voiceover generation failed. Both Microsoft Edge Neural TTS and Google TTS failed:\n` +
          `- EdgeTTS: ${edgeErr.message}\n` +
          `- GoogleTTS: ${gErr.message}\n` +
          `Zero mock fallback policy enforced. Please verify your internet connection.`
        );
      }
    }
  }
}

export function getTTSProvider(): TTSProvider {
  return new ResilientTTSProvider();
}

