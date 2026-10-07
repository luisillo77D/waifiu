import { AppSettings, ChatMessage, ProviderType } from '../types';

const SETTINGS_KEY = 'waifiu_settings_v1';
const CHAT_HISTORY_KEY = 'waifiu_chat_history_v1';

export const ALL_AVAILABLE_PROVIDERS: ProviderType[] = [
  'gemini',
  'baseten',
  'openai',
  'claude',
  'ollama',
];

export const DEFAULT_SETTINGS: AppSettings = {
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',

  basetenApiKey: '',
  basetenModelId: '',

  openaiApiKey: '',
  openaiModel: 'gpt-4o-mini',

  claudeApiKey: '',
  claudeModel: 'claude-3-5-sonnet-20241022',

  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'llama3.2',

  fallbackChain: ALL_AVAILABLE_PROVIDERS,

  companionName: 'Waifiu',
  systemPrompt: 'You are Waifiu, an intelligent, cute, and helpful desktop companion pet. You keep responses friendly, concise, and helpful. Use expressive tone with occasional emoticons like (｡♥‿♥｡) or (◕‿◕).',
  alwaysOnTop: true,
  avatarVariant: 'neko',
  soundEffects: false,
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw);

    // Reconcile fallbackChain to include any newly registered providers missing from older localStorage
    let chain: ProviderType[] = Array.isArray(parsed.fallbackChain)
      ? [...parsed.fallbackChain]
      : [...DEFAULT_SETTINGS.fallbackChain];

    for (const provider of ALL_AVAILABLE_PROVIDERS) {
      if (!chain.includes(provider)) {
        chain.push(provider);
      }
    }

    chain = chain.filter((p) => ALL_AVAILABLE_PROVIDERS.includes(p));

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      fallbackChain: chain,
    };
  } catch (e) {
    console.error('Failed to load settings:', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function loadChatHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load chat history:', e);
    return [];
  }
}

export function saveChatHistory(messages: ChatMessage[]): void {
  try {
    // Keep last 50 messages to prevent excessive storage
    const trimmed = messages.slice(-50);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to save chat history:', e);
  }
}
