import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma.service.js';
import { metaGraphProvider } from '../providers/meta/meta.provider.js';
import { publishingAgent } from '../agents/publishing.agent.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/meta/accounts - List all connected Facebook & Instagram accounts
router.get('/accounts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accounts = await prisma.metaAccount.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { publishedReels: true },
        },
      },
    });

    res.json({
      success: true,
      data: accounts.map((a) => ({
        id: a.id,
        pageId: a.pageId,
        pageName: a.pageName,
        avatarUrl: a.avatarUrl,
        instagramAccountId: a.instagramAccountId,
        instagramUsername: a.instagramUsername,
        isConnected: a.isConnected,
        totalReelsPublished: a._count.publishedReels,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/meta/connect - Connect Facebook Page & linked Instagram Business Account
router.post('/connect', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pageId, pageAccessToken } = req.body;

    if (!pageId || !pageAccessToken) {
      return res.status(400).json({
        success: false,
        error: 'Both Page ID and Page Access Token are required.',
      });
    }

    // Verify token with Meta Graph API
    const pageDetails = await metaGraphProvider.validateAndGetPageDetails(
      pageId.trim(),
      pageAccessToken.trim()
    );

    const saved = await prisma.metaAccount.upsert({
      where: { pageId: pageDetails.pageId },
      update: {
        pageName: pageDetails.pageName,
        pageAccessToken: pageAccessToken.trim(),
        avatarUrl: pageDetails.avatarUrl,
        instagramAccountId: pageDetails.instagramAccountId || null,
        instagramUsername: pageDetails.instagramUsername || null,
        isConnected: true,
      },
      create: {
        pageId: pageDetails.pageId,
        pageName: pageDetails.pageName,
        pageAccessToken: pageAccessToken.trim(),
        avatarUrl: pageDetails.avatarUrl,
        instagramAccountId: pageDetails.instagramAccountId || null,
        instagramUsername: pageDetails.instagramUsername || null,
        isConnected: true,
      },
    });

    res.json({
      success: true,
      message: `Successfully connected Facebook Page "${saved.pageName}"${saved.instagramUsername ? ` and Instagram @${saved.instagramUsername}` : ''}!`,
      data: {
        id: saved.id,
        pageId: saved.pageId,
        pageName: saved.pageName,
        instagramAccountId: saved.instagramAccountId,
        instagramUsername: saved.instagramUsername,
      },
    });
  } catch (error: any) {
    logger.error('[MetaRoutes] Failed to connect Meta account:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to authenticate with Meta Graph API',
    });
  }
});

// DELETE /api/meta/accounts/:id - Disconnect Meta Account
router.delete('/accounts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.metaAccount.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Meta account disconnected successfully.',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/meta/publish-reel - Publish to Facebook or Instagram Reel
router.post('/publish-reel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, platform, metaAccountId, caption, title, userApproved } = req.body;

    if (!projectId || !platform) {
      return res.status(400).json({
        success: false,
        error: 'projectId and platform (INSTAGRAM_REELS or FACEBOOK_REELS) are required.',
      });
    }

    if (userApproved !== true) {
      return res.status(403).json({
        success: false,
        error: 'Safety guardrail: userApproved must be true to publish.',
      });
    }

    const reel = await publishingAgent.publishReel({
      projectId,
      platform,
      metaAccountId,
      caption,
      title,
      userApproved: true,
    });

    res.json({
      success: true,
      message: `Successfully published to ${platform}!`,
      data: reel,
    });
  } catch (error: any) {
    logger.error('[MetaRoutes] Publish reel error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/meta/reels/:projectId - Get published reels for a project
router.get('/reels/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const reels = await prisma.publishedReel.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        metaAccount: {
          select: { pageName: true, instagramUsername: true },
        },
      },
    });

    res.json({
      success: true,
      data: reels,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

