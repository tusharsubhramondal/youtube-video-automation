import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma.service.js';
import { publishingAgent } from '../agents/publishing.agent.js';
import { config } from '../config/index.js';

const router = Router();

// Get connected YouTube channels
router.get('/accounts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accounts = await prisma.youTubeAccount.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { publishedVideos: true } },
      },
    });
    res.json({
      success: true,
      data: accounts,
      isConfigured: !!(config.youtube.clientId && config.youtube.clientSecret),
    });
  } catch (error) {
    next(error);
  }
});

// Generate OAuth URL
router.get('/auth-url', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUrl = publishingAgent.getAuthUrl();
    res.json({ success: true, authUrl });
  } catch (error) {
    next(error);
  }
});

// OAuth Callback
router.get('/oauth2callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.query;
    if (!code || typeof code !== 'string') {
      return res.status(400).send('Authorization code is missing');
    }

    await publishingAgent.handleOAuthCallback(code);
    res.redirect(`${config.frontendUrl}/youtube?connected=true`);
  } catch (error: any) {
    res.redirect(`${config.frontendUrl}/youtube?error=${encodeURIComponent(error.message)}`);
  }
});

// Connect Mock Channel for local testing / demo without API keys
router.post('/connect-mock', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mockChannel = await prisma.youTubeAccount.upsert({
      where: { channelId: 'UC_MOCK_CHANNEL_123' },
      update: { isConnected: true },
      create: {
        channelId: 'UC_MOCK_CHANNEL_123',
        channelTitle: 'AI Creator Studio (Sandbox Channel)',
        channelDescription: 'Official test channel for AI YouTube Video Automation Platform',
        avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
        accessToken: 'mock_access_token_valid',
        refreshToken: 'mock_refresh_token_valid',
        isConnected: true,
      },
    });

    res.json({ success: true, data: mockChannel });
  } catch (error) {
    next(error);
  }
});

// Disconnect channel
router.delete('/account/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.youTubeAccount.delete({ where: { id } });
    res.json({ success: true, message: 'YouTube channel disconnected' });
  } catch (error) {
    next(error);
  }
});

// Publish video (CRITICAL: Requires explicit user approval)
router.post('/publish/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const {
      youtubeAccountId,
      title,
      description,
      tags,
      categoryId,
      privacyStatus,
      userApproved, // Must be true!
    } = req.body;

    if (!userApproved) {
      return res.status(400).json({
        success: false,
        error: 'Publishing requires explicit user confirmation. Please review and confirm publication.',
      });
    }

    const publishResult = await publishingAgent.publishVideo({
      projectId,
      youtubeAccountId,
      title,
      description,
      tags,
      categoryId: categoryId || '22',
      privacyStatus: privacyStatus || 'PRIVATE',
      userApproved: true,
    });

    res.json({ success: true, data: publishResult });
  } catch (error) {
    next(error);
  }
});

export default router;
