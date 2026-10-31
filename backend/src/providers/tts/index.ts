import { TTSProvider, TTSOptions } from '../interfaces.js';
import { GoogleTTSProvider } from './gtts.tts.provider.js';
import { MockTTSProvider } from './mock.tts.provider.js';

class ResilientTTSProvider implements TTSProvider {
  name = 'Resilient TTS Engine';
  private googleTts = new GoogleTTSProvider();
  private mockTts = new MockTTSProvider();

  async generateSpeech(options: TTSOptions) {
    try {
      return await this.googleTts.generateSpeech(options);
    } catch {
      return await this.mockTts.generateSpeech(options);
    }
  }
}

export function getTTSProvider(): TTSProvider {
  return new ResilientTTSProvider();
}

