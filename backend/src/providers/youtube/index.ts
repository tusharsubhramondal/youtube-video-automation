import { YouTubeProvider } from '../interfaces.js';
import { GoogleYouTubeProvider } from './google.youtube.provider.js';
import { MockYouTubeProvider } from './mock.youtube.provider.js';
import { config } from '../../config/index.js';

export function getYouTubeProvider(): YouTubeProvider {
  if (config.youtube.clientId && config.youtube.clientSecret) {
    return new GoogleYouTubeProvider();
  }
  return new MockYouTubeProvider();
}

