import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiProvider } from './providers/gemini.provider.js';
import { MockAiProvider } from './providers/mock.provider.js';
import { AiProviderFactory } from './ai-provider.factory.js';

@Module({
  imports: [ConfigModule],
  providers: [GeminiProvider, MockAiProvider, AiProviderFactory],
  exports: [AiProviderFactory, GeminiProvider, MockAiProvider],
})
export class AiModule {}
