import { describe, it, expect, beforeEach } from 'vitest';
import { AiProviderFactory } from './ai-provider.factory.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { MockAiProvider } from './providers/mock.provider.js';

describe('AiProviderFactory - Extensible AI Architecture', () => {
  let factory: AiProviderFactory;
  let mockGemini: GeminiProvider;
  let mockProvider: MockAiProvider;

  beforeEach(() => {
    mockGemini = {
      providerName: 'gemini',
      generate: async () => ({} as any),
      embed: async () => [0.1, 0.2],
    } as unknown as GeminiProvider;

    mockProvider = new MockAiProvider();

    factory = new AiProviderFactory(mockGemini, mockProvider);
  });

  it('should return GeminiProvider when "gemini" or "google" is requested', () => {
    expect(factory.getProvider('gemini')).toBe(mockGemini);
    expect(factory.getProvider('GOOGLE')).toBe(mockGemini);
  });

  it('should return MockAiProvider when "mock" or "test" is requested', () => {
    expect(factory.getProvider('mock')).toBe(mockProvider);
    expect(factory.getProvider('TEST')).toBe(mockProvider);
  });

  it('should fallback to GeminiProvider when undefined or unknown provider is requested', () => {
    expect(factory.getProvider(undefined)).toBe(mockGemini);
    expect(factory.getProvider('unknown-future-ai')).toBe(mockGemini);
  });
});
