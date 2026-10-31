import { google } from 'googleapis';
import fs from 'fs';
import { YouTubeProvider, YouTubeUploadParams } from '../interfaces.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

export class GoogleYouTubeProvider implements YouTubeProvider {
  name = 'Google YouTube Data API v3';
  private oauth2Client: any;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      config.youtube.clientId,
      config.youtube.clientSecret,
      config.youtube.redirectUri
    );
  }

  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });
  }

  async handleOAuthCallback(code: string): Promise<any> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    // Fetch channel profile
    const youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });
    const response = await youtube.channels.list({
      part: ['snippet'],
      mine: true,
    });

    const channel = response.data.items?.[0];
    return {
      tokens,
      channelId: channel?.id || 'unknown_channel',
      channelTitle: channel?.snippet?.title || 'YouTube Channel',
      avatarUrl: channel?.snippet?.thumbnails?.default?.url || null,
    };
  }

  async uploadVideo(params: YouTubeUploadParams): Promise<{
    videoId: string;
    url: string;
    publishedAt: Date;
  }> {
    if (!fs.existsSync(params.videoFilePath)) {
      throw new Error(`Video file does not exist at: ${params.videoFilePath}`);
    }

    const youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });

    logger.info(`Starting YouTube video upload: "${params.title}"`);

    const res = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: params.title,
          description: params.description,
          tags: params.tags,
          categoryId: params.categoryId || '22',
        },
        status: {
          privacyStatus: params.privacyStatus,
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: fs.createReadStream(params.videoFilePath),
      },
    });

    const videoId = res.data.id!;
    logger.info(`Uploaded video to YouTube successfully. Video ID: ${videoId}`);

    // If thumbnail provided, upload thumbnail
    if (params.thumbnailPath && fs.existsSync(params.thumbnailPath)) {
      try {
        await youtube.thumbnails.set({
          videoId,
          media: {
            body: fs.createReadStream(params.thumbnailPath),
          },
        });
        logger.info(`Uploaded thumbnail for YouTube video ${videoId}`);
      } catch (err: any) {
        logger.warn(`Failed to set thumbnail on YouTube: ${err.message}`);
      }
    }

    return {
      videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      publishedAt: new Date(),
    };
  }
}

