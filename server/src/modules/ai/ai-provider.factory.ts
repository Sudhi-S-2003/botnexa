import { Injectable, Logger } from '@nestjs/common';
import { GeminiProvider } from './providers/gemini.provider.js';
import { MockAiProvider } from './providers/mock.provider.js';
import type { IAiProvider } from '../../types/ai.type.js';

@Injectable()
export class AiProviderFactory {
  private readonly logger = new Logger(AiProviderFactory.name);

  constructor(
    private readonly geminiProvider: GeminiProvider,
    private readonly mockProvider: MockAiProvider,
  ) {}

  getProvider(providerName?: string): IAiProvider {
    const key = providerName?.toLowerCase() || 'gemini';

    switch (key) {
      case 'gemini':
      case 'google':
        return this.geminiProvider;

      case 'mock':
      case 'test':
        return this.mockProvider;

      // Future Provider Extension slots:
      // case 'openai':
      // case 'chatgpt':
      //   return this.openAiProvider;
      // case 'anthropic':
      // case 'claude':
      //   return this.claudeProvider;

      default:
        this.logger.warn(`Unknown AI provider '${providerName}', falling back to default Gemini`);
        return this.geminiProvider;
    }
  }
}
