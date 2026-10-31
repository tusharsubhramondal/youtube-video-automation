import { LLMProvider, ResearchResult, ScriptResult } from '../interfaces.js';

export class MockLLMProvider implements LLMProvider {
  name = 'Mock Local LLM';

  async generateResearch(topic: string, category: string, language: string): Promise<ResearchResult> {
    return {
      topic,
      angle: `The untold secrets and future breakthrough of ${topic} that no one is talking about.`,
      targetAudience: `Tech enthusiasts, curious learners, and creators interested in ${category}.`,
      keywords: [
        topic.toLowerCase(),
        `${topic.toLowerCase()} explained`,
        `${topic.toLowerCase()} tutorial`,
        'future of technology',
        'ai automation',
        'breakthrough guide',
        'top secrets',
        'in-depth analysis',
      ],
      contentOutline: [
        {
          sectionTitle: 'The Opening Hook',
          points: ['Shocking statistic or question', 'Why this matters right now', 'What viewers will discover'],
        },
        {
          sectionTitle: 'The Core Mechanism',
          points: ['How it actually works under the hood', 'Breakdown of primary concepts', 'Real-world example'],
        },
        {
          sectionTitle: 'The Game Changer',
          points: ['The turning point', 'Critical advantages', 'Addressing common pitfalls'],
        },
        {
          sectionTitle: 'Actionable Takeaways & Outro',
          points: ['Summary of 3 key rules', 'Final thought', 'Call to action to like and subscribe'],
        },
      ],
      hooks: [
        `What if everything you knew about ${topic} was about to change forever?`,
        `99% of people misunderstand ${topic} — here is what actually happens.`,
        `In the next 60 seconds, you will discover the real truth behind ${topic}.`,
      ],
    };
  }

  async generateScript(params: {
    topic: string;
    research: ResearchResult;
    targetDuration: number;
    format: 'SHORTS' | 'REGULAR';
    visualStyle: string;
    voiceStyle: string;
    language: string;
  }): Promise<ScriptResult> {
    const isShorts = params.format === 'SHORTS';
    const sceneCount = isShorts ? 4 : 5;
    const durationPerScene = Math.max(4, Math.round(params.targetDuration / sceneCount));

    const scenes = [
      {
        sceneNumber: 1,
        narrationText: `Have you ever wondered what makes ${params.topic} so revolutionary? Most people never see what happens behind the scenes.`,
        visualPrompt: `Dramatic high contrast opening shot illustrating ${params.topic}, ${params.visualStyle} aesthetic, cinematic volumetric lighting, 8k hyper-detailed rendering.`,
        cameraMovement: 'Slow zoom in',
        transition: 'fade',
        durationSeconds: durationPerScene,
      },
      {
        sceneNumber: 2,
        narrationText: `It starts with a fundamental principle that completely redefines the workflow. Everything accelerates when the pieces click together.`,
        visualPrompt: `Futuristic schematic blueprints and glowing neural data streams representing ${params.topic}, vibrant neon palette, ${params.visualStyle} style.`,
        cameraMovement: 'Pan right across landscape',
        transition: 'wipe',
        durationSeconds: durationPerScene,
      },
      {
        sceneNumber: 3,
        narrationText: `Instead of wasting countless hours on manual repetition, modern technology handles the heavy lifting in seconds.`,
        visualPrompt: `High-tech automated digital robotic arms orchestrating digital nodes and timeline sequences, ${params.visualStyle} render.`,
        cameraMovement: 'Slow pan up with tilt',
        transition: 'fade',
        durationSeconds: durationPerScene,
      },
      {
        sceneNumber: 4,
        narrationText: `The real secret lies in consistency and precision. When you master this, the possibilities become virtually limitless.`,
        visualPrompt: `Awe-inspiring wide vista of digital skyline with radiant horizon sunrise, symbolizing triumph and limitless potential, ${params.visualStyle}.`,
        cameraMovement: 'Aerial descent',
        transition: 'fade',
        durationSeconds: durationPerScene,
      },
    ];

    if (!isShorts) {
      scenes.push({
        sceneNumber: 5,
        narrationText: `If you found this insight valuable, hit that subscribe button and drop a comment below on what you want to explore next!`,
        visualPrompt: `Polished sleek outro screen with vibrant interactive subscribe icons and glowing light trails, ${params.visualStyle} studio look.`,
        cameraMovement: 'Gentle slow drift',
        transition: 'fade',
        durationSeconds: durationPerScene,
      });
    }

    return {
      title: `The Ultimate Guide to ${params.topic}`,
      hook: `What if everything you knew about ${params.topic} was about to change?`,
      scenes,
      callToAction: 'Subscribe for weekly deep-dives into cutting-edge technology and automation!',
      totalEstimatedDuration: scenes.reduce((acc, s) => acc + s.durationSeconds, 0),
    };
  }

  async generateSeoMetadata(params: {
    topic: string;
    script: ScriptResult;
    category: string;
  }): Promise<{
    titles: string[];
    description: string;
    tags: string[];
    hashtags: string[];
    thumbnailTextIdeas: string[];
  }> {
    return {
      titles: [
        `How ${params.topic} is Changing Everything (Explained)`,
        `The Future of ${params.topic}: What You Need to Know`,
        `Stop Doing This with ${params.topic}! (Do This Instead)`,
        `I Tested ${params.topic} So You Don't Have To`,
        `The Ultimate Guide to ${params.topic} in 2026`,
      ],
      description: `In this video, we dive deep into ${params.topic}.\n\n⏱️ TIMESTAMPS:\n0:00 - Introduction & The Big Hook\n0:30 - How It Really Works\n1:15 - The Breakthrough Strategy\n2:00 - Final Takeaways & Next Steps\n\n🔔 Don't forget to like and subscribe for more in-depth breakdowns on ${params.category} and cutting-edge tech!`,
      tags: [
        params.topic.toLowerCase(),
        `${params.topic.toLowerCase()} guide`,
        `${params.topic.toLowerCase()} 2026`,
        'automation',
        'technology',
        'ai',
        'tutorial',
        'future tech',
        'breakthrough',
        'youtube automation',
      ],
      hashtags: [
        `#${params.topic.replace(/\s+/g, '')}`,
        '#TechTrends',
        '#Automation',
        '#FutureTech',
        '#CreatorEconomy',
      ],
      thumbnailTextIdeas: [
        'DON\'T MISS THIS',
        'CHANGES EVERYTHING',
        'THE REAL TRUTH',
        '99% DON\'T KNOW',
      ],
    };
  }

  async generateThumbnailPrompt(topic: string, visualStyle: string): Promise<{
    concept: string;
    prompt: string;
    overlayText: string;
  }> {
    return {
      concept: `High-voltage shock expression with glowing holographic tech display visualizing ${topic}`,
      prompt: `Close-up expressive portrait with glowing neon lighting, holding futuristic transparent holographic device projecting ${topic}, ultra-detailed, cinematic dynamic lighting, 8k, photorealistic studio quality, style of ${visualStyle}`,
      overlayText: 'INSANE RESULTS!',
    };
  }
}

