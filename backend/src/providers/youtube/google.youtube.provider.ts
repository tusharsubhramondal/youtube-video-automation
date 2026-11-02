import { google } from 'googleapis';
import fs from 'fs';
import { YouTubeProvider, YouTubeUploadParams } from '../interfaces.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../services/prisma.service.js';

export class GoogleYouTubeProvider implements YouTubeProvider {
  name = 'Google YouTube Data API v3';
  private oauth2Client: any;

  constructor(tokens?: { access_token?: string; refresh_token?: string | null }) {
    this.oauth2Client = new google.auth.OAuth2(
      config.youtube.clientId,
      config.youtube.clientSecret,
      config.youtube.redirectUri
    );

    if (tokens) {
      this.setCredentials(tokens);
    }

    // Auto-update tokens in database when refreshed by Google
    this.oauth2Client.on('tokens', async (newTokens: any) => {
      logger.info('[GoogleYouTubeProvider] OAuth access token refreshed automatically by Google.');
      try {
        if (newTokens.access_token) {
          await prisma.youTubeAccount.updateMany({
            where: { isConnected: true },
            data: {
              accessToken: newTokens.access_token,
              ...(newTokens.refresh_token ? { refreshToken: newTokens.refresh_token } : {}),
            },
          });
        }
      } catch (err: any) {
        logger.error(`[GoogleYouTubeProvider] Failed to update refreshed tokens: ${err.message}`);
      }
    });
  }

  setCredentials(tokens: { access_token?: string; refresh_token?: string | null }) {
    this.oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
  }

  async ensureValidToken(): Promise<void> {
    try {
      const credentials = this.oauth2Client.credentials;
      if (credentials?.refresh_token) {
        const res = await this.oauth2Client.getAccessToken();
        if (res?.token) {
          this.oauth2Client.setCredentials({
            ...this.oauth2Client.credentials,
            access_token: res.token,
          });
        }
      }
    } catch (err: any) {
      logger.warn(`[GoogleYouTubeProvider] Token refresh check warning: ${err.message}`);
    }
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

    if (params.tokens) {
      this.setCredentials(params.tokens);
    }

    await this.ensureValidToken();

    const youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });

    logger.info(`Starting YouTube video upload: "${params.title}"`);

    const insertPayload = () => ({
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

    let res: any;
    try {
      res = await youtube.videos.insert(insertPayload());
    } catch (uploadErr: any) {
      const isAuthError = uploadErr.status === 401 || uploadErr.code === 401 || uploadErr.message?.includes('Invalid Credentials');
      if (isAuthError && params.tokens?.refresh_token) {
        logger.warn('[GoogleYouTubeProvider] Auth error encountered during upload. Refreshing token and retrying...');
        const refreshed = await this.oauth2Client.refreshAccessToken();
        if (refreshed.credentials) {
          this.oauth2Client.setCredentials(refreshed.credentials);
          res = await youtube.videos.insert(insertPayload());
        } else {
          throw uploadErr;
        }
      } else {
        throw uploadErr;
      }
    }

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

