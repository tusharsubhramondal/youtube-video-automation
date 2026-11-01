import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider, ResearchResult, ScriptResult } from '../interfaces.js';
import { logger } from '../../utils/logger.js';

export class GeminiProvider implements LLMProvider {
  name = 'Google Gemini';
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName = 'gemini-3.5-flash-lite') {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  private cleanJson(text: string): string {
    return text.replace(/```json/gi, '').replace(/```/g, '').trim();
  }

  private async executeWithModelFallback(prompt: string): Promise<string> {
    const candidateModels = Array.from(
      new Set([
        this.modelName,
        'gemini-3.5-flash-lite',
        'gemini-3.5-flash',
        'gemini-3.7-flash',
        'gemini-3.8-flash',
      ])
    ).filter(Boolean);

    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const generativeModel = this.genAI.getGenerativeModel({
          model,
          generationConfig: { responseMimeType: 'application/json' },
        });

        const response = await generativeModel.generateContent(prompt);
        const rawText = response.response.text();
        this.modelName = model; // Cache working model for subsequent agent calls
        return rawText;
      } catch (err: any) {
        lastError = err;
        logger.warn(`Gemini model "${model}" failed (${err.message?.substring(0, 80)}). Trying fallback model...`);
      }
    }

    throw lastError;
  }

  async generateResearch(topic: string, category: string, language: string): Promise<ResearchResult> {
    try {
      const prompt = `You are an expert YouTube Content Strategist and Research Agent.
Conduct comprehensive research for a high-performing YouTube video on the following topic:
Topic: "${topic}"
Category: "${category}"
Language: "${language}"

Return a valid JSON object matching this schema:
{
  "topic": string,
  "angle": string (the unique hook/angle for viral appeal),
  "targetAudience": string,
  "keywords": string[] (list of 8-12 high-intent search keywords),
  "contentOutline": [
    {
      "sectionTitle": string,
      "points": string[]
    }
  ],
  "hooks": string[] (3 captivating intro hook variations)
}`;

      const rawText = await this.executeWithModelFallback(prompt);
      return JSON.parse(this.cleanJson(rawText)) as ResearchResult;
    } catch (err) {
      logger.error('Gemini generateResearch error:', err);
      throw err;
    }
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
    try {
      const isShorts = params.format === 'SHORTS';
      const sceneCount = isShorts
        ? Math.max(3, Math.round(params.targetDuration / 5))
        : Math.max(4, Math.round(params.targetDuration / 12));

      const prompt = `You are an elite YouTube Scriptwriter and Director.
Craft a scene-by-scene production script for a YouTube video:
Topic: "${params.topic}"
Format: "${params.format}" (${isShorts ? '9:16 vertical fast-paced hook' : '16:9 standard cinematic storytelling'})
Target Duration: ${params.targetDuration} seconds
Visual Style: "${params.visualStyle}"
Voice Style: "${params.voiceStyle}"
Language: "${params.language}"
Target Scene Count: approximately ${sceneCount} scenes.

Research Context:
Angle: ${params.research.angle}
Keywords: ${params.research.keywords.join(', ')}

Return a valid JSON object matching this exact schema:
{
  "title": string,
  "hook": string,
  "scenes": [
    {
      "sceneNumber": number,
      "narrationText": string (exact spoken voiceover words),
      "visualPrompt": string (vivid text-to-image prompt tailored for ${params.visualStyle} style),
      "cameraMovement": string (e.g., "Slow zoom in", "Pan right across landscape", "High angle aerial descent"),
      "transition": string (e.g., "fade", "wipe", "cut"),
      "durationSeconds": number (estimated duration of this scene in seconds, e.g. 5)
    }
  ],
  "callToAction": string,
  "totalEstimatedDuration": number
}`;

      const rawText = await this.executeWithModelFallback(prompt);
      return JSON.parse(this.cleanJson(rawText)) as ScriptResult;
    } catch (err) {
      logger.error('Gemini generateScript error:', err);
      throw err;
    }
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
    try {
      const prompt = `You are a YouTube SEO Master.
Generate hyper-optimized YouTube metadata for this video:
Topic: "${params.topic}"
Category: "${params.category}"
Script Title: "${params.script.title}"
Script Hook: "${params.script.hook}"

Return valid JSON with:
{
  "titles": string[] (5 high-CTR title variations under 80 characters, avoiding spammy clickbait),
  "description": string (SEO-rich description including timestamps/chapters, hook, and call to action),
  "tags": string[] (15-20 relevant comma-separated YouTube tags),
  "hashtags": string[] (5 trending hashtags starting with #),
  "thumbnailTextIdeas": string[] (4 punchy 2-4 word phrases to put on the thumbnail image)
}`;

      const rawText = await this.executeWithModelFallback(prompt);
      return JSON.parse(this.cleanJson(rawText));
    } catch (err) {
      logger.error('Gemini generateSeoMetadata error:', err);
      throw err;
    }
  }

  async generateThumbnailPrompt(topic: string, visualStyle: string): Promise<{
    concept: string;
    prompt: string;
    overlayText: string;
  }> {
    try {
      const prompt = `You are a viral YouTube Thumbnail Designer.
Generate a thumbnail concept for:
Topic: "${topic}"
Visual Style: "${visualStyle}"

Return valid JSON:
{
  "concept": string (description of the visual concept and psychological trigger),
  "prompt": string (highly detailed text-to-image prompt with expressive facial reaction, lighting, vivid contrast, 8k resolution, photorealistic or matching ${visualStyle}),
  "overlayText": string (2 to 4 bold words to overlay on thumbnail)
}`;

      const rawText = await this.executeWithModelFallback(prompt);
      return JSON.parse(this.cleanJson(rawText));
    } catch (err) {
      logger.error('Gemini generateThumbnailPrompt error:', err);
      throw err;
    }
  }
}

