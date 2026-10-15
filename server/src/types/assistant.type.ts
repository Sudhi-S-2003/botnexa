export type AssistantStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type AssistantAccessPolicy = 'PUBLIC' | 'PRIVATE';

export interface ModelParameters {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  systemInstruction?: string;
  responseTone?: 'PROFESSIONAL' | 'FRIENDLY' | 'CONCISE' | 'DETAILED';
  responseLanguage?: string;
}

export interface AssistantConfig {
  provider: string; // 'gemini' | 'openai' | 'anthropic'
  model: string;    // e.g. 'gemini-3.5-flash-lite'
  parameters: ModelParameters;
}
