import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IAiProvider,
  AiGenerationRequest,
  AiGenerationResult,
} from '../../../types/ai.type.js';

@Injectable()
export class GeminiProvider implements IAiProvider {
  readonly providerName = 'gemini';
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly embeddingModel: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY', '');
    this.defaultModel = this.configService.get<string>('GEMINI_MODEL', 'gemini-3.5-flash-lite');
    this.embeddingModel = this.configService.get<string>(
      'GEMINI_EMBEDDING_MODEL',
      'gemini-embedding-001',
    );
  }

  async generate(request: AiGenerationRequest): Promise<AiGenerationResult> {
    const startTime = Date.now();
    const model = request.model || this.defaultModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    // Build system instruction if provided or if context chunks are supplied
    let systemText = request.systemInstruction || 'You are a helpful, accurate AI assistant.';
    if (request.contextChunks && request.contextChunks.length > 0) {
      const contextText = request.contextChunks
        .map((c: any, i: number) => `[Source ${i + 1}${c.source ? ` (${c.source})` : ''}]:\n${c.content}`)
        .join('\n\n');
      systemText += `\n\n--- AUTHORIZED BUSINESS CONTEXT ---\nUse ONLY the following authorized business information to answer the user inquiry when relevant. Do not fabricate information.\n\n${contextText}`;
    }

    // Format messages for Gemini API
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    for (const msg of request.messages) {
      if (msg.role === 'system') continue;
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    // Ensure at least one user content exists
    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
    }

    const payload = {
      systemInstruction: {
        parts: [{ text: systemText }],
      },
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxOutputTokens ?? 2048,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`Gemini API error (${response.status}): ${errText}`);
      throw new Error(`Gemini API generation failed with status ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    const candidate = data.candidates?.[0];
    const generatedText = candidate?.content?.parts?.[0]?.text ?? '';
    const finishReason = candidate?.finishReason;

    const usage = {
      inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
    };

    return {
      text: generatedText,
      provider: this.providerName,
      model,
      usage,
      finishReason,
      latencyMs: Date.now() - startTime,
    };
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) return [];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.embeddingModel}:batchEmbedContents?key=${this.apiKey}`;

    const requests = texts.map((text) => ({
      model: `models/${this.embeddingModel}`,
      content: { parts: [{ text }] },
    }));

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`Gemini Embeddings API error (${response.status}): ${errText}`);
      throw new Error(`Gemini Embedding failed: ${errText}`);
    }

    const data: any = await response.json();
    return data.embeddings.map((e: any) => e.values);
  }
}
