import axios from 'axios';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

export interface MetaPageInfo {
  pageId: string;
  pageName: string;
  avatarUrl?: string;
  instagramAccountId?: string;
  instagramUsername?: string;
}

export interface PublishReelResult {
  mediaId: string;
  platform: 'INSTAGRAM_REELS' | 'FACEBOOK_REELS';
  permalink?: string;
}

export class MetaGraphProvider {
  private apiVersion = 'v19.0';
  private baseUrl = 'https://graph.facebook.com';

  /**
   * Validates a Facebook Page Access Token and retrieves Page details
   * including any linked Instagram Business or Creator account.
   */
  async validateAndGetPageDetails(pageId: string, pageAccessToken: string): Promise<MetaPageInfo> {
    try {
      logger.info(`[MetaProvider] Verifying Facebook Page ${pageId} via Graph API...`);
      const url = `${this.baseUrl}/${this.apiVersion}/${pageId}`;
      const res = await axios.get(url, {
        params: {
          fields: 'id,name,picture{url},instagram_business_account{id,username,profile_picture_url}',
          access_token: pageAccessToken,
        },
        timeout: 15000,
      });

      const data = res.data;
      const pageInfo: MetaPageInfo = {
        pageId: data.id,
        pageName: data.name,
        avatarUrl: data.picture?.data?.url,
      };

      if (data.instagram_business_account) {
        pageInfo.instagramAccountId = data.instagram_business_account.id;
        pageInfo.instagramUsername = data.instagram_business_account.username;
        logger.info(`[MetaProvider] Found linked Instagram Business Account: @${pageInfo.instagramUsername} (${pageInfo.instagramAccountId})`);
      } else {
        logger.warn(`[MetaProvider] Facebook Page ${pageId} has no linked Instagram Business Account. Facebook Reels will work, but Instagram Reels publishing requires linking an IG Business/Creator account in Page settings.`);
      }

      return pageInfo;
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || err.message;
      logger.error(`[MetaProvider] Failed to validate Page Token: ${errorMsg}`);
      throw new Error(`Meta Graph API Validation Error: ${errorMsg}`);
    }
  }

  /**
   * Publishes an Instagram Reel using Meta's 3-step asynchronous Container Flow:
   * 1. Initialize container (POST /{ig_user_id}/media with media_type=REELS)
   * 2. Poll container status until FINISHED
   * 3. Publish container (POST /{ig_user_id}/media_publish)
   */
  async publishInstagramReel(params: {
    instagramAccountId: string;
    pageAccessToken: string;
    videoUrl: string;
    caption: string;
  }): Promise<PublishReelResult> {
    const { instagramAccountId, pageAccessToken, videoUrl, caption } = params;
    logger.info(`[MetaProvider] Initiating Instagram Reel publishing on account ${instagramAccountId}...`);

    try {
      // Step 1: Create Media Container
      const createContainerUrl = `${this.baseUrl}/${this.apiVersion}/${instagramAccountId}/media`;
      const containerRes = await axios.post(
        createContainerUrl,
        null,
        {
          params: {
            media_type: 'REELS',
            video_url: videoUrl,
            caption: caption,
            share_to_feed: true,
            access_token: pageAccessToken,
          },
          timeout: 25000,
        }
      );

      const containerId = containerRes.data.id;
      if (!containerId) {
        throw new Error('Meta did not return a container ID for the Instagram Reel.');
      }
      logger.info(`[MetaProvider] Instagram Reel container created: ${containerId}. Awaiting video ingest & transcoding...`);

      // Step 2: Poll Container Status
      let isReady = false;
      const maxRetries = 30; // 30 * 4s = 120s timeout
      for (let i = 0; i < maxRetries; i++) {
        await new Promise((r) => setTimeout(r, 4000));
        const statusRes = await axios.get(
          `${this.baseUrl}/${this.apiVersion}/${containerId}`,
          {
            params: {
              fields: 'status_code,status',
              access_token: pageAccessToken,
            },
            timeout: 15000,
          }
        );

        const statusCode = statusRes.data.status_code;
        logger.info(`[MetaProvider] Container ${containerId} status check (${i + 1}/${maxRetries}): ${statusCode}`);

        if (statusCode === 'FINISHED') {
          isReady = true;
          break;
        } else if (statusCode === 'ERROR' || statusCode === 'EXPIRED') {
          throw new Error(`Meta video processing failed with status: ${statusCode} (${statusRes.data.status || 'Unknown error'})`);
        }
      }

      if (!isReady) {
        throw new Error('Timeout waiting for Meta to finish processing Instagram Reel container.');
      }

      // Step 3: Publish Container
      const publishUrl = `${this.baseUrl}/${this.apiVersion}/${instagramAccountId}/media_publish`;
      const publishRes = await axios.post(
        publishUrl,
        null,
        {
          params: {
            creation_id: containerId,
            access_token: pageAccessToken,
          },
          timeout: 25000,
        }
      );

      const mediaId = publishRes.data.id;
      logger.info(`[MetaProvider] Instagram Reel successfully published! Media ID: ${mediaId}`);

      // Step 4: Fetch published permalink
      let permalink: string | undefined;
      try {
        const permalinkRes = await axios.get(`${this.baseUrl}/${this.apiVersion}/${mediaId}`, {
          params: {
            fields: 'permalink',
            access_token: pageAccessToken,
          },
          timeout: 10000,
        });
        permalink = permalinkRes.data.permalink;
      } catch {}

      return {
        mediaId,
        platform: 'INSTAGRAM_REELS',
        permalink,
      };
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || err.message;
      logger.error(`[MetaProvider] Instagram Reel publish failed: ${errorMsg}`);
      throw new Error(`Instagram Reels API Error: ${errorMsg}`);
    }
  }

  /**
   * Publishes a Facebook Page Reel using the Facebook Video Reels API
   */
  async publishFacebookReel(params: {
    pageId: string;
    pageAccessToken: string;
    videoUrl: string;
    description: string;
    title?: string;
  }): Promise<PublishReelResult> {
    const { pageId, pageAccessToken, videoUrl, description, title } = params;
    logger.info(`[MetaProvider] Initiating Facebook Reel publishing on Page ${pageId}...`);

    try {
      // 1. Initialize Reel upload session
      const startUrl = `${this.baseUrl}/${this.apiVersion}/${pageId}/video_reels`;
      const startRes = await axios.post(
        startUrl,
        null,
        {
          params: {
            upload_phase: 'start',
            access_token: pageAccessToken,
          },
          timeout: 20000,
        }
      );

      const videoId = startRes.data.video_id;
      if (!videoId) {
        throw new Error('Meta did not return a video_id for Facebook Reel upload session.');
      }

      logger.info(`[MetaProvider] Facebook Reel upload session initialized: ${videoId}. Ingesting video stream...`);

      // 2. Publish video via Page Video URL ingestion
      const publishUrl = `${this.baseUrl}/${this.apiVersion}/${pageId}/videos`;
      const publishRes = await axios.post(
        publishUrl,
        null,
        {
          params: {
            file_url: videoUrl,
            description: description,
            title: title || description.substring(0, 60),
            access_token: pageAccessToken,
          },
          timeout: 30000,
        }
      );

      const finalVideoId = publishRes.data.id || videoId;
      const permalink = `https://www.facebook.com/reel/${finalVideoId}`;

      logger.info(`[MetaProvider] Facebook Reel successfully published! Video ID: ${finalVideoId}`);

      return {
        mediaId: finalVideoId,
        platform: 'FACEBOOK_REELS',
        permalink,
      };
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || err.message;
      logger.error(`[MetaProvider] Facebook Reel publish failed: ${errorMsg}`);
      throw new Error(`Facebook Reels API Error: ${errorMsg}`);
    }
  }
}

export const metaGraphProvider = new MetaGraphProvider();
