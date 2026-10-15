import { Injectable } from '@nestjs/common';
import {
  IAiProvider,
  AiGenerationRequest,
  AiGenerationResult,
} from '../../../types/ai.type.js';

@Injectable()
export class MockAiProvider implements IAiProvider {
  readonly providerName = 'mock';

  async generate(request: AiGenerationRequest): Promise<AiGenerationResult> {
    const lastMessage = request.messages[request.messages.length - 1]?.content || 'Hello';
    const hasContext = request.contextChunks && request.contextChunks.length > 0;

    let responseText = `[Mock AI Response to: "${lastMessage}"]`;
    if (hasContext) {
      responseText += ` [Utilized ${request.contextChunks!.length} business context sources]`;
    }

    return {
      text: responseText,
      provider: this.providerName,
      model: request.model || 'mock-model-v1',
      usage: {
        inputTokens: 15,
        outputTokens: 25,
        totalTokens: 40,
      },
      finishReason: 'STOP',
      latencyMs: 12,
    };
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    // Generate deterministic 3072-dimensional vector floats for testing
    return texts.map((_, i) => {
      const vector: number[] = new Array(3072).fill(0);
      vector[0] = 0.5 + (i * 0.01);
      vector[1] = 0.2;
      return vector;
    });
  }
}
