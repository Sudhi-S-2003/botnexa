export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface RetrievedContext {
  content: string;
  source?: string;
  similarity?: number;
}

export interface AiGenerationRequest {
  provider: string; // 'gemini' | 'openai' | 'anthropic' | 'mock'
  model: string;    // e.g. 'gemini-3.5-flash-lite'
  systemInstruction?: string;
  messages: ChatMessage[];
  contextChunks?: RetrievedContext[];
  temperature?: number;
  maxOutputTokens?: number;
  stream?: boolean;
}

export interface AiGenerationResult {
  text: string;
  provider: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
  latencyMs?: number;
}

export interface IAiProvider {
  readonly providerName: string;
  generate(request: AiGenerationRequest): Promise<AiGenerationResult>;
  generateStream?(request: AiGenerationRequest): AsyncIterable<string>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}
