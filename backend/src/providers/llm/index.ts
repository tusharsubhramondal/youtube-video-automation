import { LLMProvider } from '../interfaces.js';
import { GeminiProvider } from './gemini.provider.js';
import { MockLLMProvider } from './mock.llm.provider.js';
import { config } from '../../config/index.js';
import { prisma } from '../../services/prisma.service.js';
import { logger } from '../../utils/logger.js';

export async function getLLMProvider(): Promise<LLMProvider> {
  // Check if Gemini is configured in database
  try {
    const dbProvider = await prisma.aIProvider.findUnique({
      where: { providerKey: 'gemini' },
    });
    if (dbProvider && dbProvider.isEnabled && dbProvider.apiKey) {
      logger.info('Using Gemini LLM provider configured from database');
      return new GeminiProvider(dbProvider.apiKey, dbProvider.modelName || 'gemini-1.5-flash');
    }
  } catch (err) {
    // If DB is offline or table empty, fallback to env config
  }

  // Check if Gemini is configured in environment variables
  if (config.ai.geminiApiKey) {
    logger.info('Using Gemini LLM provider configured from environment');
    return new GeminiProvider(config.ai.geminiApiKey);
  }

  // Fallback to high quality mock provider
  logger.info('No Gemini API key detected. Utilizing Mock LLM Provider for local development.');
  return new MockLLMProvider();
}

