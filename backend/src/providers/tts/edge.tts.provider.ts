import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import fs from 'fs';
import path from 'path';
import { TTSProvider, TTSOptions } from '../interfaces.js';
import { ffmpeg } from '../../services/ffmpeg.service.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

export const VOICE_STYLE_TO_EDGE_VOICE: Record<string, string> = {
  // Common style descriptions
  'Deep Narration (Christopher)': 'en-US-ChristopherNeural',
  'Deep Narration': 'en-US-ChristopherNeural',
  'Christopher': 'en-US-ChristopherNeural',
  'Casual & Friendly (Guy)': 'en-US-GuyNeural',
  'Casual & Friendly': 'en-US-GuyNeural',
  'Guy': 'en-US-GuyNeural',
  'High Energy & Upbeat (Jenny)': 'en-US-JennyNeural',
  'High Energy & Enthusiastic': 'en-US-EricNeural',
  'Jenny': 'en-US-JennyNeural',
  'Calm Storyteller (Aria)': 'en-US-AriaNeural',
  'Calm Storyteller': 'en-US-AriaNeural',
  'Aria': 'en-US-AriaNeural',
  'Dramatic Documentary (Brian)': 'en-GB-BrianNeural',
  'Dramatic Documentary': 'en-GB-BrianNeural',
  'Brian': 'en-GB-BrianNeural',
  'Ryan': 'en-GB-RyanNeural',
  'Sonia': 'en-GB-SoniaNeural',

  // Language mappings
  'Spanish': 'es-ES-AlvaroNeural',
  'French': 'fr-FR-HenriNeural',
  'German': 'de-DE-ConradNeural',
  'Hindi': 'hi-IN-MadhurNeural',
  'Japanese': 'ja-JP-KeitaNeural',

  // Bengali neural voices (India & Bangladesh)
  'Bengali': 'bn-IN-BashkarNeural',
  'Bengali (Bashkar)': 'bn-IN-BashkarNeural',
  'Deep Storyteller (Bashkar - বাংলা)': 'bn-IN-BashkarNeural',
  'Bashkar': 'bn-IN-BashkarNeural',
  'Bengali (Tanishaa)': 'bn-IN-TanishaaNeural',
  'Calm Narrator (Tanishaa - বাংলা)': 'bn-IN-TanishaaNeural',
  'Tanishaa': 'bn-IN-TanishaaNeural',
  'Pradeep': 'bn-BD-PradeepNeural',
  'Nabanita': 'bn-BD-NabanitaNeural',
  'bn-IN': 'bn-IN-BashkarNeural',
  'bn': 'bn-IN-BashkarNeural',
  'বাংলা': 'bn-IN-BashkarNeural',
};

export class EdgeTTSProvider implements TTSProvider {
  name = 'Microsoft Edge Neural TTS';

  async generateSpeech(options: TTSOptions): Promise<{
    url: string;
    localPath: string;
    durationSeconds: number;
  }> {
    const voiceId = this.resolveVoiceId(options.voiceStyle, options.language);
    logger.info(`[EdgeTTS] Synthesizing speech with neural voice "${voiceId}" for: "${options.text.substring(0, 40)}..."`);

    try {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

      const targetDir = path.dirname(options.outputPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const { audioStream } = tts.toStream(options.text);
      const fileStream = fs.createWriteStream(options.outputPath);

      let bytesReceived = 0;
      audioStream.on('data', (chunk) => {
        bytesReceived += chunk.length;
      });

      await new Promise<void>((resolve, reject) => {
        audioStream.pipe(fileStream);
        fileStream.on('finish', () => resolve());
        audioStream.on('error', (err) => {
          logger.error('[EdgeTTS] Audio stream error:', err);
          reject(err);
        });
        fileStream.on('error', (err) => {
          logger.error('[EdgeTTS] File write error:', err);
          reject(err);
        });
      });

      // Strict validation: Verify non-empty audio file
      if (!fs.existsSync(options.outputPath) || fs.statSync(options.outputPath).size < 200 || bytesReceived === 0) {
        if (fs.existsSync(options.outputPath)) {
          try { fs.unlinkSync(options.outputPath); } catch (_) {}
        }
        throw new Error(`Edge TTS produced an empty or invalid audio stream (0 bytes received) with voice "${voiceId}".`);
      }

      const duration = await this.getAudioDuration(options.outputPath, options.text);
      const relPath = path.relative(config.storage.uploadDir, options.outputPath).replace(/\\/g, '/');

      logger.info(`[EdgeTTS] Successfully synthesized ${duration.toFixed(2)}s audio (${bytesReceived} bytes): ${relPath}`);

      return {
        url: `/uploads/${relPath}`,
        localPath: options.outputPath,
        durationSeconds: duration,
      };
    } catch (err: any) {
      logger.error(`[EdgeTTS] Synthesis failed: ${err.message}`);
      throw err;
    }
  }

  private resolveVoiceId(voiceStyle?: string, language?: string): string {
    const lang = (language || '').toLowerCase().trim();
    const isHindi = lang.includes('hindi') || lang === 'hi' || lang === 'hi-in' || lang === 'हिंदी';
    const isBengali = lang.includes('bengali') || lang === 'bn' || lang === 'bn-in' || lang === 'বাংলা';
    const isSpanish = lang.includes('spanish') || lang === 'es' || lang === 'es-es';
    const isFrench = lang.includes('french') || lang === 'fr' || lang === 'fr-fr';
    const isGerman = lang.includes('german') || lang === 'de' || lang === 'de-de';
    const isJapanese = lang.includes('japanese') || lang === 'ja' || lang === 'ja-jp';

    // 1. If voiceStyle is an explicit Neural ID matching the target language
    if (voiceStyle && voiceStyle.includes('Neural')) {
      const isVoiceMatchingLang =
        (isHindi && voiceStyle.startsWith('hi-')) ||
        (isBengali && voiceStyle.startsWith('bn-')) ||
        (isSpanish && voiceStyle.startsWith('es-')) ||
        (isFrench && voiceStyle.startsWith('fr-')) ||
        (isGerman && voiceStyle.startsWith('de-')) ||
        (isJapanese && voiceStyle.startsWith('ja-')) ||
        (!isHindi && !isBengali && !isSpanish && !isFrench && !isGerman && !isJapanese);

      if (isVoiceMatchingLang) {
        return voiceStyle;
      }
    }

    // 2. Language-specific neural voice routing (prevents English voices speaking non-English text)
    if (isHindi) {
      if (voiceStyle && (voiceStyle.toLowerCase().includes('female') || voiceStyle.toLowerCase().includes('swara') || voiceStyle.toLowerCase().includes('calm'))) {
        return 'hi-IN-SwaraNeural';
      }
      return 'hi-IN-MadhurNeural';
    }

    if (isBengali) {
      if (voiceStyle && (voiceStyle.toLowerCase().includes('female') || voiceStyle.toLowerCase().includes('tanishaa') || voiceStyle.toLowerCase().includes('calm'))) {
        return 'bn-IN-TanishaaNeural';
      }
      return 'bn-IN-BashkarNeural';
    }

    if (isSpanish) {
      if (voiceStyle && (voiceStyle.toLowerCase().includes('female') || voiceStyle.toLowerCase().includes('elvira'))) {
        return 'es-ES-ElviraNeural';
      }
      return 'es-ES-AlvaroNeural';
    }

    if (isFrench) {
      if (voiceStyle && (voiceStyle.toLowerCase().includes('female') || voiceStyle.toLowerCase().includes('denise'))) {
        return 'fr-FR-DeniseNeural';
      }
      return 'fr-FR-HenriNeural';
    }

    if (isGerman) {
      if (voiceStyle && (voiceStyle.toLowerCase().includes('female') || voiceStyle.toLowerCase().includes('katja'))) {
        return 'de-DE-KatjaNeural';
      }
      return 'de-DE-ConradNeural';
    }

    if (isJapanese) {
      if (voiceStyle && (voiceStyle.toLowerCase().includes('female') || voiceStyle.toLowerCase().includes('nanami'))) {
        return 'ja-JP-NanamiNeural';
      }
      return 'ja-JP-KeitaNeural';
    }

    // 3. English voice selection
    if (voiceStyle) {
      // Check predefined map
      if (VOICE_STYLE_TO_EDGE_VOICE[voiceStyle]) {
        return VOICE_STYLE_TO_EDGE_VOICE[voiceStyle];
      }

      // Substring check
      for (const [key, id] of Object.entries(VOICE_STYLE_TO_EDGE_VOICE)) {
        if (voiceStyle.toLowerCase().includes(key.toLowerCase())) {
          return id;
        }
      }
    }

    // Default to the cinematic Christopher documentary voice
    return 'en-US-ChristopherNeural';
  }

  private async getAudioDuration(filePath: string, text: string): Promise<number> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (!err && metadata && metadata.format && metadata.format.duration) {
          resolve(parseFloat(metadata.format.duration.toString()));
        } else {
          // Fallback based on average speaking rate (~150 words per minute / 2.5 words per sec)
          const wordCount = text.split(/\s+/).filter(Boolean).length;
          const estimatedSec = Math.max(3.0, (wordCount / 2.5) + 0.5);
          resolve(estimatedSec);
        }
      });
    });
  }
}

