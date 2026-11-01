import axios from 'axios';
import { getLLMProvider } from '../providers/llm/index.js';
import { prisma } from './prisma.service.js';
import { logger } from '../utils/logger.js';

export interface TrendingCandidate {
  title: string;
  hookAngle: string;
  source: string;
  viralScore: number;
  category: string;
  summary: string;
}

export class TrendDiscoveryService {
  /**
   * Discovers viral trending topics for a specific content niche using a combination of:
   * 1. Reddit public hot feeds for verified high-engagement community interest
   * 2. Google Trends daily signals
   * 3. LLM synthesis & hook extraction
   */
  async discoverViralTopics(niche = 'Technology & AI', count = 5): Promise<TrendingCandidate[]> {
    logger.info(`[TrendDiscovery] Searching daily viral trend signals for niche: "${niche}"...`);
    const rawSignals: string[] = [];

    // 1. Fetch Reddit viral hot signals via RSS feed
    try {
      const subreddit = this.resolveSubreddit(niche);
      const redditRssUrl = `https://www.reddit.com/r/${subreddit}/hot.rss`;
      const redditRes = await axios.get(redditRssUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
        timeout: 6000,
      });

      const entries = (redditRes.data as string).match(/<entry>[\s\S]*?<title>(.*?)<\/title>/g) || [];
      for (const entry of entries.slice(0, 10)) {
        const titleMatch = entry.match(/<title>(.*?)<\/title>/);
        if (titleMatch && titleMatch[1]) {
          const rawTitle = titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
          if (rawTitle && !rawTitle.toLowerCase().startsWith('daily') && !rawTitle.toLowerCase().startsWith('weekly')) {
            rawSignals.push(`[Reddit: ${rawTitle}]`);
          }
        }
      }
      logger.info(`[TrendDiscovery] Extracted ${rawSignals.length} community signals from r/${subreddit}`);
    } catch (err: any) {
      logger.warn(`[TrendDiscovery] Reddit signal fetch skipped (${err.message})`);
    }

    // 2. Fetch Google Trends daily RSS feed (US / Global)
    try {
      const trendsRssUrl = 'https://trends.google.com/trending/rss?geo=US';
      const rssRes = await axios.get(trendsRssUrl, { timeout: 8000 });
      const items = (rssRes.data as string).match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g) || [];
      for (const item of items.slice(0, 8)) {
        const title = item.replace(/<title><!\[CDATA\[/, '').replace(/\]\]><\/title>/, '');
        if (title && !title.toLowerCase().includes('daily search trends')) {
          rawSignals.push(`[Google Trends: ${title}]`);
        }
      }
    } catch (err: any) {
      logger.warn(`[TrendDiscovery] Google Trends RSS skipped: ${err.message}`);
    }

    // 3. Synthesize and score using Real LLM
    const llm = await getLLMProvider('RESEARCH');
    if (!llm.generateText) {
      throw new Error(`[TrendDiscovery] LLM Provider (${llm.name}) does not support generateText.`);
    }

    const signalContext = rawSignals.length > 0
      ? `Real-time community signals gathered today:\n${rawSignals.slice(0, 15).join('\n')}`
      : `Analyze the current global viral trends and breakout search queries for the niche: "${niche}".`;

    const prompt = `You are a viral YouTube Shorts, Instagram Reels, and Facebook Reels trend strategist.
Based on the following signals, synthesize the top ${count} most VIRAL short-form video topics for the niche: "${niche}".

${signalContext}

Format your response strictly as valid JSON array of objects with keys:
- "title": (string, under 50 characters, curiosity-inducing hook)
- "hookAngle": (string, powerful first 3-second opening hook line)
- "viralScore": (number, 80 to 99)
- "category": (string)
- "summary": (string, 1-2 sentence core insight)

Return ONLY JSON array.`;

    const rawText = await llm.generateText(prompt);
    if (!rawText) {
      throw new Error(`[TrendDiscovery] Real LLM (${llm.name}) returned an empty response. Zero mock fallback policy enforced.`);
    }

    const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed) && typeof parsed === 'object') {
        parsed = parsed.topics || parsed.candidates || parsed.results || Object.values(parsed)[0];
      }
    } catch (parseErr: any) {
      logger.error(`[TrendDiscovery] Failed to parse LLM JSON: ${parseErr.message}\nRaw text:\n${rawText}`);
      throw new Error(`[TrendDiscovery] Real LLM trend analysis returned invalid JSON: ${parseErr.message}. Zero mock fallback policy enforced.`);
    }

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item) => ({
        title: item.title || item.topic,
        hookAngle: item.hookAngle || item.hook,
        source: 'Real AI Viral Trend Signals',
        viralScore: typeof item.viralScore === 'number' ? item.viralScore : 92,
        category: item.category || niche,
        summary: item.summary || '',
      }));
    }

    throw new Error(`[TrendDiscovery] Real LLM did not return an array of viral trend candidates. Zero mock fallback policy enforced.`);
  }

  /**
   * Selects the single best viral topic for today, checking against the database to
   * prevent repeating topics covered in the past 14 days.
   */
  async selectDailyViralTopic(niche = 'Technology & AI'): Promise<TrendingCandidate> {
    const candidates = await this.discoverViralTopics(niche, 6);

    // Retrieve topics used in the past 14 days
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const recentProjects = await prisma.videoProject.findMany({
      where: {
        createdAt: { gte: twoWeeksAgo },
      },
      select: { topic: true, title: true },
    });

    const recentTexts = recentProjects.map((p) => `${p.topic} ${p.title}`.toLowerCase());

    for (const c of candidates) {
      const isRepeated = recentTexts.some((t) => t.includes(c.title.toLowerCase()) || c.title.toLowerCase().includes(t));
      if (!isRepeated) {
        logger.info(`[TrendDiscovery] Selected fresh daily viral topic: "${c.title}" (Score: ${c.viralScore})`);
        return c;
      }
    }

    return candidates[0];
  }

  private resolveSubreddit(niche: string): string {
    const lower = niche.toLowerCase();
    if (lower.includes('comedy') || lower.includes('humor') || lower.includes('joke') || lower.includes('funny') || lower.includes('meme')) return 'memes';
    if (lower.includes('dance') || lower.includes('choreograph')) return 'Dance';
    if (lower.includes('music') || lower.includes('song')) return 'Music';
    if (lower.includes('entertainment') || lower.includes('pop culture') || lower.includes('celeb') || lower.includes('drama')) return 'popculture';
    if (lower.includes('gaming') || lower.includes('gameplay')) return 'gaming';
    if (lower.includes('fitness') || lower.includes('workout') || lower.includes('gym')) return 'fitness';
    if (lower.includes('tech') || lower.includes('ai') || lower.includes('software')) return 'technology';
    if (lower.includes('science') || lower.includes('space') || lower.includes('physics')) return 'science';
    if (lower.includes('history') || lower.includes('ancient')) return 'todayilearned';
    if (lower.includes('money') || lower.includes('finance') || lower.includes('business') || lower.includes('wealth')) return 'wallstreetbets';
    return 'todayilearned';
  }
}

export const trendDiscoveryService = new TrendDiscoveryService();

