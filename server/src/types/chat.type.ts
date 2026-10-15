export type ChatLinkMode = 'PUBLIC' | 'PROTECTED' | 'PRIVATE';
export type ChatLinkPermission = 'chat' | 'view' | 'none';

export interface ChatCompletionRequest {
  assistantId: string;
  conversationId?: string;
  message: string;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  conversationId: string;
  messageId: string;
  reply: string;
  model: string;
  provider: string;
  message?: {
    id: string;
    role: 'assistant';
    content: string;
    createdAt?: Date;
  };
  citations?: Array<{
    chunkId: string;
    snippet: string;
    similarity: number;
    contextId?: string;
  }>;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCostMinor?: number;
    customerChargeMinorUnits?: number;
    chargeFormatted?: string;
  };
  wallet?: {
    balance?: number;
    reservedAmount?: number;
  };
  sources?: Array<{
    chunkId: string;
    content: string;
    similarity: number;
  }>;
  latencyMs: number;
  requestId: string;
}
