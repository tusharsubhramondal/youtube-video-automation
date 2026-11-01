import { LLMProvider } from '../interfaces.js';
import { GeminiProvider } from './gemini.provider.js';
import { OpenAIProvider } from './openai.provider.js';
import { MockLLMProvider } from './mock.llm.provider.js';
import { config } from '../../config/index.js';
import { prisma } from '../../services/prisma.service.js';
import { logger } from '../../utils/logger.js';

export interface AgentRoutingConfig {
  provider: 'gemini' | 'openai' | 'mock';
  model?: string;
}

export async function getAgentRouting(): Promise<Record<string, AgentRoutingConfig>> {
  try {
    const record = await prisma.aIProvider.findUnique({
      where: { providerKey: 'agent_routing' },
    });
    if (record?.configJson) {
      return JSON.parse(record.configJson);
    }
  } catch (err: any) {
    logger.warn(`Failed to read agent routing: ${err.message}`);
  }

  // Default sensible routing with official Google Gemini 2.0 Flash
  return {
    RESEARCH: { provider: 'gemini', model: 'gemini-2.0-flash' },
    SCRIPT: { provider: 'gemini', model: 'gemini-2.0-flash' },
    SEO: { provider: 'gemini', model: 'gemini-2.0-flash' },
    THUMBNAIL: { provider: 'gemini', model: 'gemini-2.0-flash' },
  };
}

export async function getLLMProvider(agentType?: string): Promise<LLMProvider> {
  const routing = await getAgentRouting();
  const target = agentType ? routing[agentType.toUpperCase()] : null;

  // 1. If agent explicitly requests OpenAI
  if (target?.provider === 'openai') {
    const dbOpenAi = await prisma.aIProvider.findUnique({ where: { providerKey: 'openai' } }).catch(() => null);
    const apiKey = dbOpenAi?.apiKey || config.ai.openAiApiKey || process.env.OPENAI_API_KEY;
    if (apiKey) {
      const model = target.model || dbOpenAi?.modelName || 'gpt-4o';
      logger.info(`[LLM Router] Routing ${agentType} Agent to OpenAI (${model})`);
      return new OpenAIProvider(apiKey, model);
    }
    logger.warn(`[LLM Router] ${agentType} assigned to OpenAI, but no OpenAI API key found. Falling back...`);
  }

  // 2. If agent explicitly requests Gemini
  if (target?.provider === 'gemini') {
    const dbGemini = await prisma.aIProvider.findUnique({ where: { providerKey: 'gemini' } }).catch(() => null);
    const apiKey = dbGemini?.apiKey || config.ai.geminiApiKey || process.env.GEMINI_API_KEY;
    if (apiKey) {
      let model = target.model || dbGemini?.modelName || 'gemini-2.0-flash';
      if (model.startsWith('gemini-3')) model = 'gemini-2.0-flash';
      logger.info(`[LLM Router] Routing ${agentType} Agent to Google Gemini (${model})`);
      return new GeminiProvider(apiKey, model);
    }
    logger.warn(`[LLM Router] ${agentType} assigned to Gemini, but no Gemini API key found. Falling back...`);
  }

  // 3. Fallback: Check if Gemini is configured anywhere
  try {
    const dbProvider = await prisma.aIProvider.findUnique({
      where: { providerKey: 'gemini' },
    });
    if (dbProvider?.isEnabled && dbProvider.apiKey) {
      let model = dbProvider.modelName || 'gemini-2.0-flash';
      if (model.startsWith('gemini-3')) model = 'gemini-2.0-flash';
      logger.info(`[LLM Router] Defaulting ${agentType || 'General'} to configured Gemini (${model})`);
      return new GeminiProvider(dbProvider.apiKey, model);
    }
  } catch {}

  if (config.ai.geminiApiKey) {
    logger.info(`[LLM Router] Defaulting ${agentType || 'General'} to environment Gemini (gemini-2.0-flash)`);
    return new GeminiProvider(config.ai.geminiApiKey, 'gemini-2.0-flash');
  }

  // 4. Fallback: Check if OpenAI is configured anywhere
  try {
    const dbOpenAi = await prisma.aIProvider.findUnique({
      where: { providerKey: 'openai' },
    });
    if (dbOpenAi?.isEnabled && dbOpenAi.apiKey) {
      const model = dbOpenAi.modelName || 'gpt-4o';
      logger.info(`[LLM Router] Defaulting ${agentType || 'General'} to configured OpenAI (${model})`);
      return new OpenAIProvider(dbOpenAi.apiKey, model);
    }
  } catch {}

  const envOpenAiKey = config.ai.openAiApiKey || process.env.OPENAI_API_KEY;
  if (envOpenAiKey) {
    logger.info(`[LLM Router] Defaulting ${agentType || 'General'} to environment OpenAI (gpt-4o)`);
    return new OpenAIProvider(envOpenAiKey, 'gpt-4o');
  }

  // 5. Zero-tolerance policy for mock LLM fallbacks
  throw new Error(
    `[LLM Router] No active AI provider API key found for ${agentType || 'General'} Agent. ` +
    `Please configure your Google Gemini API key or OpenAI API key in Settings -> AI Providers (http://localhost:5173/settings/providers).`
  );
}
