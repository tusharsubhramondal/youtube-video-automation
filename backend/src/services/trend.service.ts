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

    // 1. Fetch Reddit viral hot signals from relevant subreddits based on niche
    try {
      const subreddit = this.resolveSubreddit(niche);
      const redditUrl = `https://www.reddit.com/r/${subreddit}/hot.json?limit=12`;
      const redditRes = await axios.get(redditUrl, {
        headers: {
          'User-Agent': 'AutoTube/1.0 (Trend Discovery Agent)',
        },
        timeout: 8000,
      });

      const posts = redditRes.data?.data?.children || [];
      for (const p of posts) {
        if (!p.data.stickied && p.data.score > 200 && p.data.title) {
          rawSignals.push(`[Reddit: ${p.data.title}] (Score: ${p.data.score}, Comments: ${p.data.num_comments})`);
        }
      }
      logger.info(`[TrendDiscovery] Extracted ${rawSignals.length} community signals from r/${subreddit}`);
    } catch (err: any) {
      logger.warn(`[TrendDiscovery] Reddit signal fetch skipped: ${err.message}`);
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

    // 3. Synthesize and score using LLM
    const llm = await getLLMProvider('RESEARCH');
    const prompt = `You are a viral YouTube Shorts, Instagram Reels, and Facebook Reels trend strategist.
Analyze the following real-time signals and synthesize the top ${count} most VIRAL short-form video topics for the niche: "${niche}".

Signals gathered today:
${rawSignals.slice(0, 15).join('\n')}

Format your response strictly as valid JSON array of objects with keys:
- "title": (string, under 50 characters, curiosity-inducing hook)
- "hookAngle": (string, powerful first 3-second opening hook line)
- "viralScore": (number, 80 to 99)
- "category": (string)
- "summary": (string, 1-2 sentence core insight)

Return ONLY JSON array.`;

    try {
      // Use LLM to generate structured trend candidates
      const rawText = await (llm as any).generateText
        ? await (llm as any).generateText(prompt)
        : null;

      if (rawText) {
        const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item) => ({
            title: item.title,
            hookAngle: item.hookAngle,
            source: 'Synthesized Trend Signals',
            viralScore: item.viralScore || 90,
            category: item.category || niche,
            summary: item.summary || '',
          }));
        }
      }
    } catch (err: any) {
      logger.warn(`[TrendDiscovery] LLM trend synthesis parsing: ${err.message}. Using high-engagement algorithmic fallbacks.`);
    }

    // High-engagement curated fallback topics tailored to niche
    return this.getCuratedFallbackTrends(niche);
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

  private getCuratedFallbackTrends(niche: string): TrendingCandidate[] {
    const lower = niche.toLowerCase();

    if (lower.includes('comedy') || lower.includes('humor') || lower.includes('funny') || lower.includes('meme')) {
      return [
        {
          title: 'The Relatable Lie Everyone Tells Daily',
          hookAngle: 'Tell me you do this without telling me you do this... why does everybody panic when someone knocks on the door?',
          source: 'Curated Viral Signals',
          viralScore: 97,
          category: niche,
          summary: 'A fast-paced relatable observational humor reel about modern everyday awkward moments.',
        },
        {
          title: 'Expectation vs Reality: Working From Home',
          hookAngle: 'What people think working from home looks like versus what actually happens at 2:15 PM on a Tuesday...',
          source: 'Curated Viral Signals',
          viralScore: 95,
          category: niche,
          summary: 'A hilarious skit-style breakdown of remote work truths with punchy timing.',
        },
        {
          title: 'The 3 Types of People at Every Family Dinner',
          hookAngle: 'Every family has these exact three people at the dinner table, and person number two is definitely you...',
          source: 'Curated Viral Signals',
          viralScore: 94,
          category: niche,
          summary: 'Relatable family dynamic comedy that drives immediate comment-section tagging.',
        },
      ];
    }

    if (lower.includes('dance') || lower.includes('choreograph')) {
      return [
        {
          title: 'The Viral 10-Second Footwork Challenge',
          hookAngle: 'This footwork move looks 10x harder than it actually is. Here is the 3-step cheat code to nail it today...',
          source: 'Curated Viral Signals',
          viralScore: 98,
          category: niche,
          summary: 'Step-by-step breakdown of trending viral choreography with beat drops and visual cues.',
        },
        {
          title: 'How This Iconic Dance Move Was Invented',
          hookAngle: 'The real secret behind how the Moonwalk and smooth anti-gravity lean were actually created will blow your mind...',
          source: 'Curated Viral Signals',
          viralScore: 96,
          category: niche,
          summary: 'Behind-the-scenes history of world-famous choreography with performance insights.',
        },
        {
          title: 'Street Style vs Studio Dance: The Real Difference',
          hookAngle: 'Most dancers don’t realize this tiny posture change is what gives street dance that effortless groove...',
          source: 'Curated Viral Signals',
          viralScore: 93,
          category: niche,
          summary: 'Quick technique comparison reel with high visual replay value.',
        },
      ];
    }

    if (lower.includes('entertainment') || lower.includes('pop culture')) {
      return [
        {
          title: 'The Crazy Movie Scene That Was Never In The Script',
          hookAngle: 'This famous line in cinema history was completely unscripted, and the director’s reaction made it into the final cut...',
          source: 'Curated Viral Signals',
          viralScore: 96,
          category: niche,
          summary: 'Unbelievable behind-the-scenes movie trivia that hooks pop-culture fans.',
        },
        {
          title: 'The Hidden Easter Egg You Walked Past 100 Times',
          hookAngle: 'Almost everyone missed this subtle background detail that completely changes the meaning of the ending...',
          source: 'Curated Viral Signals',
          viralScore: 94,
          category: niche,
          summary: 'Pop culture fan theories and visual easter eggs that prompt debates.',
        },
      ];
    }

    return [
      {
        title: 'The AI Breakthrough Nobody Is Talking About',
        hookAngle: 'While everyone is looking at chatbots, scientists just used AI to solve something thought impossible...',
        source: 'Curated Viral Signals',
        viralScore: 96,
        category: niche,
        summary: 'A deep look into silent exponential shifts transforming industries behind closed doors.',
      },
      {
        title: 'The Psychological Trick That Always Works',
        hookAngle: 'If you want someone to agree with you instantly, never ask directly. Use this 19th-century secret instead...',
        source: 'Curated Viral Signals',
        viralScore: 94,
        category: niche,
        summary: 'A counter-intuitive psychological phenomenon proven by cognitive science research.',
      },
      {
        title: 'How This $10 Invention Changed Everything',
        hookAngle: 'This tiny everyday object is the only reason modern cities are able to exist today...',
        source: 'Curated Viral Signals',
        viralScore: 92,
        category: niche,
        summary: 'The surprising history of an overlooked technology that powers daily infrastructure.',
      },
    ];
  }
}

export const trendDiscoveryService = new TrendDiscoveryService();

