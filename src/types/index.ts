export type AvatarState = 'idle' | 'dragging' | 'thinking' | 'speaking' | 'error';

export type ProviderType = 'gemini' | 'openai' | 'claude' | 'ollama' | 'baseten';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  providerUsed?: ProviderType;
  modelUsed?: string;
  isStreaming?: boolean;
}

export interface AppSettings {
  // Provider API Keys & Config
  geminiApiKey: string;
  geminiModel: string;
  webSearch?: boolean;

  basetenApiKey: string;
  basetenModelId: string;

  openaiApiKey: string;
  openaiModel: string;

  claudeApiKey: string;
  claudeModel: string;

  ollamaEndpoint: string;
  ollamaModel: string;

  // Fallback priority chain
  fallbackChain: ProviderType[];

  // Companion Persona & behavior
  companionName: string;
  systemPrompt: string;
  alwaysOnTop: boolean;
  avatarVariant: 'neko' | 'cyber' | 'chibi';
  soundEffects: boolean;
  proactiveChatter?: boolean;
  proactiveIntervalMinutes?: number;
}
