import { VideoProvider } from '../interfaces.js';
import { FFmpegVideoProvider } from './ffmpeg.video.provider.js';

export function getVideoProvider(): VideoProvider {
  return new FFmpegVideoProvider();
}

