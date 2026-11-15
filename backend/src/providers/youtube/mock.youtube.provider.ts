import { YouTubeProvider, YouTubeUploadParams, CaptionUploadParams, CaptionUploadResult } from '../interfaces.js';
import { logger } from '../../utils/logger.js';

export class MockYouTubeProvider implements YouTubeProvider {
  name = 'Mock YouTube Provider (Local Sandbox)';

  getAuthUrl(): string {
    return '/youtube?mock_auth=success';
  }

  async handleOAuthCallback(code: string): Promise<any> {
    return {
      tokens: { access_token: 'mock_token', refresh_token: 'mock_refresh' },
      channelId: 'UC_MOCK_CHANNEL_123',
      channelTitle: 'AI Creator Studio (Sandbox Channel)',
      avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
    };
  }

  async uploadCaptions(params: CaptionUploadParams): Promise<CaptionUploadResult> {
    const captionId = `mock_cap_${Math.random().toString(36).substring(2, 8)}`;
    logger.info(`[MOCK YOUTUBE] Synchronized closed captions uploaded for video ${params.videoId}: [${params.language} - ${params.trackName || 'Official Subtitles'}] -> ID: ${captionId}`);
    return {
      captionId,
      videoId: params.videoId,
      language: params.language,
      name: params.trackName || 'Official Subtitles',
    };
  }

  async uploadVideo(params: YouTubeUploadParams): Promise<{
    videoId: string;
    url: string;
    publishedAt: Date;
    captionTrack?: CaptionUploadResult;
  }> {
    const mockId = `mock_yt_${Math.random().toString(36).substring(2, 10)}`;
    logger.info(`[MOCK YOUTUBE] Video uploaded: "${params.title}" -> ID: ${mockId}`);

    let captionTrack: CaptionUploadResult | undefined;
    if (params.subtitlePath) {
      captionTrack = await this.uploadCaptions({
        videoId: mockId,
        subtitlePath: params.subtitlePath,
        language: params.subtitleLanguage || 'en',
        trackName: params.subtitleTrackName || 'Official Subtitles',
      });
    }

    return {
      videoId: mockId,
      url: `https://www.youtube.com/watch?v=${mockId}`,
      publishedAt: new Date(),
      captionTrack,
    };
  }
}

