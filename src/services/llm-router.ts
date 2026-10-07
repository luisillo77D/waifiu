import { AppSettings, ChatMessage, ProviderType } from '../types';

export interface StreamChatOptions {
  messages: ChatMessage[];
  settings: AppSettings;
  signal?: AbortSignal;
  onChunk: (chunk: string, accumulated: string) => void;
  onProviderSelected?: (provider: ProviderType, model: string) => void;
  onProviderFailed?: (provider: ProviderType, reason: string) => void;
}

const FIRST_TOKEN_TIMEOUT_MS = 6000; // 6 seconds per spec

export class LLMRouter {
  static async streamWithFallback(options: StreamChatOptions): Promise<{ provider: ProviderType; model: string; text: string }> {
    const { messages, settings, signal, onChunk, onProviderSelected, onProviderFailed } = options;

    const chain = settings.fallbackChain && settings.fallbackChain.length > 0
      ? settings.fallbackChain
      : (['gemini', 'baseten', 'openai', 'claude', 'ollama'] as ProviderType[]);

    const errors: { provider: ProviderType; error: string }[] = [];

    for (const provider of chain) {
      if (signal?.aborted) {
        throw new DOMException('Aborted by user', 'AbortError');
      }

      // Check if provider has required configuration
      const hasKey = this.hasCredentials(provider, settings);
      if (!hasKey) {
        onProviderFailed?.(provider, 'No API key or endpoint configured');
        errors.push({ provider, error: 'No API key configured' });
        continue;
      }

      // Multi-model fallback within Gemini
      if (provider === 'gemini') {
        const geminiModels = this.getGeminiModels(settings);

        for (const modelName of geminiModels) {
          if (signal?.aborted) {
            throw new DOMException('Aborted by user', 'AbortError');
          }

          try {
            onProviderSelected?.('gemini', modelName);

            const resultText = await this.streamFromProvider('gemini', {
              messages,
              settings,
              parentSignal: signal,
              onChunk,
              modelOverride: modelName,
            });

            return {
              provider: 'gemini',
              model: modelName,
              text: resultText,
            };
          } catch (err: any) {
            const errorMsg = err?.message || String(err);
            console.warn(`[LLMRouter] Gemini model ${modelName} failed: ${errorMsg}`);
            onProviderFailed?.('gemini', `Model ${modelName}: ${errorMsg}`);
            errors.push({ provider: 'gemini', error: `${modelName}: ${errorMsg}` });
            // Continue to next configured Gemini model
          }
        }
        // If all Gemini models failed, continue to the next provider in the fallback chain
        continue;
      }

      try {
        const modelName = this.getModelName(provider, settings);
        onProviderSelected?.(provider, modelName);

        const resultText = await this.streamFromProvider(provider, {
          messages,
          settings,
          parentSignal: signal,
          onChunk,
        });

        return {
          provider,
          model: modelName,
          text: resultText,
        };
      } catch (err: any) {
        const errorMsg = err?.message || String(err);
        console.warn(`[LLMRouter] Provider ${provider} failed: ${errorMsg}`);
        onProviderFailed?.(provider, errorMsg);
        errors.push({ provider, error: errorMsg });
        // Proceed to next fallback tier
      }
    }

    // If all configured providers failed, use friendly built-in companion response
    console.warn('[LLMRouter] All providers in fallback chain failed. Using companion fallback.', errors);
    const fallbackText = this.generateOfflineFallback(messages, errors);
    
    // Simulate streaming for the fallback response so the avatar still talks
    let accumulated = '';
    const words = fallbackText.split(' ');
    for (let i = 0; i < words.length; i++) {
      if (signal?.aborted) break;
      const piece = (i === 0 ? '' : ' ') + words[i];
      accumulated += piece;
      onChunk(piece, accumulated);
      await new Promise((r) => setTimeout(r, 45));
    }

    return {
      provider: 'ollama',
      model: 'companion-offline-fallback',
      text: accumulated,
    };
  }

  private static hasCredentials(provider: ProviderType, settings: AppSettings): boolean {
    switch (provider) {
      case 'gemini':
        return !!settings.geminiApiKey?.trim();
      case 'openai':
        return !!settings.openaiApiKey?.trim();
      case 'claude':
        return !!settings.claudeApiKey?.trim();
      case 'ollama':
        return !!settings.ollamaEndpoint?.trim();
      case 'baseten':
        return !!(settings.basetenApiKey?.trim() && settings.basetenModelId?.trim());
      default:
        return false;
    }
  }

  public static getGeminiModels(settings: AppSettings): string[] {
    const raw = settings.geminiModel?.trim() || 'gemini-3.1-flash-lite';
    const models = raw
      .split(',')
      .map((m) => m.trim().replace(/^models\//, ''))
      .filter(Boolean);
    return models.length > 0 ? models : ['gemini-3.1-flash-lite'];
  }

  private static getModelName(provider: ProviderType, settings: AppSettings): string {
    switch (provider) {
      case 'gemini':
        return this.getGeminiModels(settings)[0];
      case 'openai':
        return settings.openaiModel || 'gpt-4o-mini';
      case 'claude':
        return settings.claudeModel || 'claude-3-5-sonnet-20241022';
      case 'ollama':
        return settings.ollamaModel || 'llama3.2';
      case 'baseten':
        return settings.basetenModelId || 'baseten-model';
    }
  }

  private static readonly MAX_CONTEXT_TURNS = 10;
  private static readonly MAX_OUTPUT_TOKENS = 250;

  private static pruneContext(messages: ChatMessage[]): ChatMessage[] {
    const valid = messages.filter((m) => m.content && m.content.trim().length > 0);
    return valid.slice(-this.MAX_CONTEXT_TURNS);
  }

  private static async streamFromProvider(
    provider: ProviderType,
    params: {
      messages: ChatMessage[];
      settings: AppSettings;
      parentSignal?: AbortSignal;
      onChunk: (chunk: string, accumulated: string) => void;
      modelOverride?: string;
    }
  ): Promise<string> {
    const { messages, settings, parentSignal, onChunk, modelOverride } = params;
    const prunedMessages = this.pruneContext(messages);

    // Timeout controller for 6s first token
    const timeoutController = new AbortController();
    let firstTokenReceived = false;

    const timeoutId = setTimeout(() => {
      if (!firstTokenReceived) {
        timeoutController.abort(new Error(`Timeout: No token received within ${FIRST_TOKEN_TIMEOUT_MS / 1000}s`));
      }
    }, FIRST_TOKEN_TIMEOUT_MS);

    // Combine parent abort signal and timeout abort signal
    const combinedSignal = parentSignal
      ? anySignal([parentSignal, timeoutController.signal])
      : timeoutController.signal;

    const markFirstToken = () => {
      if (!firstTokenReceived) {
        firstTokenReceived = true;
        clearTimeout(timeoutId);
      }
    };

    try {
      switch (provider) {
        case 'gemini':
          return await this.streamGemini(prunedMessages, settings, combinedSignal, markFirstToken, onChunk, modelOverride);
        case 'openai':
          return await this.streamOpenAI(prunedMessages, settings, combinedSignal, markFirstToken, onChunk);
        case 'claude':
          return await this.streamClaude(prunedMessages, settings, combinedSignal, markFirstToken, onChunk);
        case 'ollama':
          return await this.streamOllama(prunedMessages, settings, combinedSignal, markFirstToken, onChunk);
        case 'baseten':
          return await this.streamBaseten(prunedMessages, settings, combinedSignal, markFirstToken, onChunk);
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // --- GEMINI PROVIDER ---
  private static async streamGemini(
    messages: ChatMessage[],
    settings: AppSettings,
    signal: AbortSignal,
    onFirstToken: () => void,
    onChunk: (chunk: string, accumulated: string) => void,
    modelOverride?: string
  ): Promise<string> {
    const rawModel = modelOverride || this.getGeminiModels(settings)[0];
    const model = rawModel.replace(/^models\//, '').trim();
    const apiKey = settings.geminiApiKey.trim();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;

    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Disable hidden thinking for 2.5 and 3.x models to ensure immediate (<300ms) first token response
    const isThinkingModel = model.includes('2.5') || model.includes('3.') || model.includes('thinking');
    const generationConfig: any = {
      maxOutputTokens: this.MAX_OUTPUT_TOKENS,
      temperature: 0.7,
    };

    if (isThinkingModel) {
      generationConfig.thinkingConfig = {
        thinkingBudget: 0,
      };
    }

    const requestBody: any = {
      contents,
      generationConfig,
    };

    // Live web research via Google Search Grounding (opt-in only to preserve strict RPM quota)
    if (settings.webSearch === true) {
      requestBody.tools = [{ google_search: {} }];
    }

    if (settings.systemPrompt?.trim()) {
      requestBody.system_instruction = {
        parts: [{ text: settings.systemPrompt.trim() }],
      };
    }

    let response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
      signal,
    });

    // If transient 429 rate limit is hit, wait 1.5s backoff and retry once
    if (response.status === 429 && !signal.aborted) {
      console.warn(`[LLMRouter] Gemini 429 rate limit hit on ${model}. Retrying after 1.5s backoff...`);
      await new Promise((r) => setTimeout(r, 1500));
      if (!signal.aborted) {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(requestBody),
          signal,
        });
      }
    }

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Gemini HTTP ${response.status} (${model}): ${errBody.slice(0, 300)}`);
    }

    if (!response.body) throw new Error('Gemini response body is null');

    let accumulated = '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;
          try {
            const data = JSON.parse(jsonStr);
            const textChunk = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textChunk) {
              onFirstToken();
              accumulated += textChunk;
              onChunk(textChunk, accumulated);
            }
          } catch {
            // Ignore partial SSE chunk parse error
          }
        }
      }
    }

    if (!accumulated) throw new Error('Empty response from Gemini');
    return accumulated;
  }

  // --- OPENAI PROVIDER ---
  private static async streamOpenAI(
    messages: ChatMessage[],
    settings: AppSettings,
    signal: AbortSignal,
    onFirstToken: () => void,
    onChunk: (chunk: string, accumulated: string) => void
  ): Promise<string> {
    const model = settings.openaiModel || 'gpt-4o-mini';
    const apiKey = settings.openaiApiKey.trim();
    const url = 'https://api.openai.com/v1/chat/completions';

    const formattedMessages = [
      ...(settings.systemPrompt ? [{ role: 'system', content: settings.systemPrompt }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        max_tokens: this.MAX_OUTPUT_TOKENS,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`OpenAI HTTP ${response.status}: ${errBody.slice(0, 200)}`);
    }

    if (!response.body) throw new Error('OpenAI response body is null');

    let accumulated = '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const data = JSON.parse(jsonStr);
            const textChunk = data.choices?.[0]?.delta?.content;
            if (textChunk) {
              onFirstToken();
              accumulated += textChunk;
              onChunk(textChunk, accumulated);
            }
          } catch {
            // Ignore incomplete JSON
          }
        }
      }
    }

    if (!accumulated) throw new Error('Empty response from OpenAI');
    return accumulated;
  }

  // --- CLAUDE PROVIDER ---
  private static async streamClaude(
    messages: ChatMessage[],
    settings: AppSettings,
    signal: AbortSignal,
    onFirstToken: () => void,
    onChunk: (chunk: string, accumulated: string) => void
  ): Promise<string> {
    const model = settings.claudeModel || 'claude-3-5-sonnet-20241022';
    const apiKey = settings.claudeApiKey.trim();
    const url = 'https://api.anthropic.com/v1/messages';

    const formattedMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        system: settings.systemPrompt,
        messages: formattedMessages,
        max_tokens: this.MAX_OUTPUT_TOKENS,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Claude HTTP ${response.status}: ${errBody.slice(0, 200)}`);
    }

    if (!response.body) throw new Error('Claude response body is null');

    let accumulated = '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6).trim();
          try {
            const data = JSON.parse(jsonStr);
            if (data.type === 'content_block_delta' && data.delta?.text) {
              onFirstToken();
              accumulated += data.delta.text;
              onChunk(data.delta.text, accumulated);
            }
          } catch {
            // Ignore incomplete SSE
          }
        }
      }
    }

    if (!accumulated) throw new Error('Empty response from Claude');
    return accumulated;
  }

  // --- OLLAMA LOCAL PROVIDER ---
  private static async streamOllama(
    messages: ChatMessage[],
    settings: AppSettings,
    signal: AbortSignal,
    onFirstToken: () => void,
    onChunk: (chunk: string, accumulated: string) => void
  ): Promise<string> {
    const endpoint = (settings.ollamaEndpoint || 'http://localhost:11434').replace(/\/$/, '');
    const model = settings.ollamaModel || 'llama3.2';
    const url = `${endpoint}/api/chat`;

    const formattedMessages = [
      ...(settings.systemPrompt ? [{ role: 'system', content: settings.systemPrompt }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        options: {
          num_predict: this.MAX_OUTPUT_TOKENS,
        },
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Ollama HTTP ${response.status}: ${errBody.slice(0, 200)}`);
    }

    if (!response.body) throw new Error('Ollama response body is null');

    let accumulated = '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const data = JSON.parse(trimmed);
          const textChunk = data.message?.content;
          if (textChunk) {
            onFirstToken();
            accumulated += textChunk;
            onChunk(textChunk, accumulated);
          }
        } catch {
          // Incomplete json chunk
        }
      }
    }

    if (!accumulated) throw new Error('Empty response from Ollama');
    return accumulated;
  }

  // --- BASETEN PROVIDER ---
  private static async streamBaseten(
    messages: ChatMessage[],
    settings: AppSettings,
    signal: AbortSignal,
    onFirstToken: () => void,
    onChunk: (chunk: string, accumulated: string) => void
  ): Promise<string> {
    const modelId = settings.basetenModelId.trim();
    const apiKey = settings.basetenApiKey.trim();
    // Baseten OpenAI-compatible route
    const url = `https://model-${modelId}.api.baseten.co/v1/chat/completions`;

    const formattedMessages = [
      ...(settings.systemPrompt ? [{ role: 'system', content: settings.systemPrompt }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Api-Key ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: formattedMessages,
        max_tokens: this.MAX_OUTPUT_TOKENS,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Baseten HTTP ${response.status}: ${errBody.slice(0, 200)}`);
    }

    if (!response.body) throw new Error('Baseten response body is null');

    let accumulated = '';
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const data = JSON.parse(jsonStr);
            const textChunk = data.choices?.[0]?.delta?.content;
            if (textChunk) {
              onFirstToken();
              accumulated += textChunk;
              onChunk(textChunk, accumulated);
            }
          } catch {
            // Ignore incomplete SSE
          }
        }
      }
    }

    if (!accumulated) throw new Error('Empty response from Baseten');
    return accumulated;
  }

  // --- TEST CONNECTION DIAGNOSTIC ---
  public static async testProvider(
    provider: ProviderType,
    settings: AppSettings
  ): Promise<{ ok: boolean; message: string; status?: number }> {
    try {
      switch (provider) {
        case 'gemini': {
          const models = this.getGeminiModels(settings);
          const model = models[0];
          const apiKey = settings.geminiApiKey?.trim();
          if (!apiKey) {
            return { ok: false, message: 'Falta ingresar la API Key de Gemini' };
          }

          // Use both header and query param for maximum compatibility across environments
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: 'hola' }] }],
            }),
          });

          const bodyText = await response.text();
          if (!response.ok) {
            let errorMsg = bodyText;
            try {
              const json = JSON.parse(bodyText);
              errorMsg = json.error?.message || json.error?.status || bodyText;
            } catch {
              // Non-JSON error body
            }
            return {
              ok: false,
              status: response.status,
              message: `HTTP ${response.status} (${model}): ${errorMsg.slice(0, 250)}`,
            };
          }

          const fallbackInfo = models.length > 1
            ? ` | ${models.length - 1} de respaldo: ${models.slice(1).join(', ')}`
            : '';

          return {
            ok: true,
            status: response.status,
            message: `¡Conexión exitosa con Google (${model})! (HTTP ${response.status})${fallbackInfo}`,
          };
        }

        case 'baseten': {
          const modelId = settings.basetenModelId?.trim();
          const apiKey = settings.basetenApiKey?.trim();
          if (!apiKey || !modelId) {
            return { ok: false, message: 'Falta ingresar la API Key o Model ID de Baseten' };
          }

          const url = `https://model-${modelId}.api.baseten.co/v1/chat/completions`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Api-Key ${apiKey}`,
            },
            body: JSON.stringify({
              model: modelId,
              messages: [{ role: 'user', content: 'hola' }],
              max_tokens: 4,
            }),
          });

          const bodyText = await response.text();
          if (!response.ok) {
            return {
              ok: false,
              status: response.status,
              message: `HTTP ${response.status}: ${bodyText.slice(0, 250)}`,
            };
          }

          return {
            ok: true,
            status: response.status,
            message: `¡Conexión exitosa con Baseten! (HTTP ${response.status})`,
          };
        }

        case 'openai': {
          const apiKey = settings.openaiApiKey?.trim();
          if (!apiKey) return { ok: false, message: 'Falta ingresar la API Key de OpenAI' };
          const model = settings.openaiModel?.trim() || 'gpt-4o-mini';

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [{ role: 'user', content: 'hola' }],
              max_tokens: 4,
            }),
          });

          const bodyText = await response.text();
          if (!response.ok) {
            let errorMsg = bodyText;
            try {
              const json = JSON.parse(bodyText);
              errorMsg = json.error?.message || bodyText;
            } catch {}
            return {
              ok: false,
              status: response.status,
              message: `HTTP ${response.status} (${model}): ${errorMsg.slice(0, 250)}`,
            };
          }

          return {
            ok: true,
            status: response.status,
            message: `¡Conexión exitosa con OpenAI (${model})! (HTTP ${response.status})`,
          };
        }

        case 'claude': {
          const apiKey = settings.claudeApiKey?.trim();
          if (!apiKey) return { ok: false, message: 'Falta ingresar la API Key de Anthropic' };
          const model = settings.claudeModel?.trim() || 'claude-3-5-sonnet-20241022';

          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true',
            },
            body: JSON.stringify({
              model,
              messages: [{ role: 'user', content: 'hola' }],
              max_tokens: 4,
            }),
          });

          const bodyText = await response.text();
          if (!response.ok) {
            let errorMsg = bodyText;
            try {
              const json = JSON.parse(bodyText);
              errorMsg = json.error?.message || bodyText;
            } catch {}
            return {
              ok: false,
              status: response.status,
              message: `HTTP ${response.status} (${model}): ${errorMsg.slice(0, 250)}`,
            };
          }

          return {
            ok: true,
            status: response.status,
            message: `¡Conexión exitosa con Claude (${model})! (HTTP ${response.status})`,
          };
        }

        case 'ollama': {
          const endpoint = (settings.ollamaEndpoint || 'http://localhost:11434').replace(/\/$/, '');
          const response = await fetch(`${endpoint}/api/tags`);
          if (!response.ok) {
            return {
              ok: false,
              status: response.status,
              message: `HTTP ${response.status} al conectar con Ollama en ${endpoint}`,
            };
          }

          return {
            ok: true,
            status: response.status,
            message: `¡Ollama local respondiendo correctamente en ${endpoint}!`,
          };
        }

        default:
          return { ok: false, message: `Proveedor ${provider} no soportado para pruebas` };
      }
    } catch (err: any) {
      return {
        ok: false,
        message: `Fallo de red: ${err?.message || String(err)}`,
      };
    }
  }

  // Built-in offline fallback message when no provider is connected
  private static generateOfflineFallback(messages: ChatMessage[], errors: { provider: ProviderType; error: string }[]): string {
    const lastUserMsg = messages[messages.length - 1]?.content || 'Hello';
    const errorDetails = errors.length > 0 
      ? `\n\nDetalles del intento:\n${errors.map((e) => `• ${e.provider}: ${e.error}`).join('\n')}`
      : '';
    
    return `¡Hola! (◕‿◕) Recibí tu mensaje: "${lastUserMsg}".\n\nEstoy lista en tu escritorio, pero actualmente ninguna API pudo responder.${errorDetails}\n\nPara activar mi inteligencia completa con tolerancia a fallos:\n1. Hacé clic en el engranaje ⚙️ de Configuración.\n2. Ingresá tu API Key de Gemini, OpenAI o Claude (o levantá Ollama en localhost:11434).\n\n¡Estoy esperando tus instrucciones! ✨`;
  }
}

// Polyfill helper for combining AbortSignals if AbortSignal.any is not supported
function anySignal(signals: AbortSignal[]): AbortSignal {
  if (typeof (AbortSignal as any).any === 'function') {
    return (AbortSignal as any).any(signals);
  }
  const controller = new AbortController();
  for (const sig of signals) {
    if (sig.aborted) {
      controller.abort(sig.reason);
      return controller.signal;
    }
    sig.addEventListener('abort', () => controller.abort(sig.reason), { once: true });
  }
  return controller.signal;
}
