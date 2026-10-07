import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ProviderType } from '../types';
import { Send, Square, Trash2, Settings as SettingsIcon, Bot, User, Sparkles } from 'lucide-react';

interface ChatWindowProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  activeProvider?: { provider: ProviderType; model: string };
  onSendMessage: (text: string) => void;
  onStopStreaming: () => void;
  onClearHistory: () => void;
  onOpenSettings: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isStreaming,
  activeProvider,
  onSendMessage,
  onStopStreaming,
  onClearHistory,
  onOpenSettings,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages or streaming chunks
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = inputText.trim();
    if (!trimmed || isStreaming) return;
    onSendMessage(trimmed);
    setInputText('');
  };

  const formatProviderLabel = (provider?: ProviderType, model?: string) => {
    if (!provider) return null;
    switch (provider) {
      case 'gemini':
        return `✨ Gemini (${model || 'Flash'})`;
      case 'openai':
        return `⚡ OpenAI (${model || 'GPT-4o'})`;
      case 'claude':
        return `🧠 Claude (${model || 'Sonnet'})`;
      case 'ollama':
        return `💻 Ollama (${model || 'Local'})`;
      default:
        return provider;
    }
  };

  return (
    <div className="flex flex-col h-[460px] w-[390px] backdrop-blur-xl bg-slate-950/85 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in zoom-in-95">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/60 border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="font-semibold text-xs tracking-wide text-purple-200 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Waifiu Chat
          </span>
        </div>

        {/* Header tools */}
        <div className="flex items-center gap-1.5">
          {activeProvider && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60 font-mono">
              {formatProviderLabel(activeProvider.provider, activeProvider.model)}
            </span>
          )}

          <button
            onClick={onClearHistory}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onOpenSettings}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-purple-300 rounded-lg transition-colors cursor-pointer"
            title="Settings & API Keys"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Message history log */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 text-slate-400">
            <Bot className="w-10 h-10 text-purple-400/60 mb-2 animate-bounce-subtle" />
            <p className="text-sm font-medium text-slate-200">¡Hola! Soy tu asistente de escritorio.</p>
            <p className="text-xs text-slate-400 mt-1">
              Escribime cualquier consulta, idea o tarea. Estoy lista para responderte.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed selectable-text break-words shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-purple-600 text-white rounded-br-xs'
                    : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-bl-xs'
                }`}
              >
                {/* Role badge */}
                <div className="flex items-center gap-1 mb-1 text-[10px] opacity-75 font-medium">
                  {msg.role === 'user' ? (
                    <>
                      <User className="w-3 h-3" />
                      <span>Vos</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-3 h-3 text-purple-400" />
                      <span>Waifiu</span>
                      {msg.providerUsed && (
                        <span className="font-mono text-[9px] text-purple-300/80 ml-1">
                          • {msg.providerUsed}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Message body */}
                <div className="whitespace-pre-wrap font-sans">
                  {msg.content}
                  {msg.isStreaming && (
                    <span className="inline-block w-1.5 h-3.5 bg-purple-400 ml-1 animate-pulse align-middle" />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-2.5 bg-slate-900/70 border-t border-purple-500/20">
        <div className="flex items-end gap-1.5 bg-slate-950/80 rounded-xl border border-purple-500/30 p-1.5 focus-within:border-purple-400/70 transition-colors">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Preguntale algo a Waifiu... (Enter para enviar)"
            rows={2}
            className="flex-1 bg-transparent border-0 outline-none resize-none text-xs text-slate-100 placeholder-slate-500 px-2 py-1 selectable-text focus:ring-0 max-h-24"
          />

          {isStreaming ? (
            <button
              onClick={onStopStreaming}
              className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer flex-shrink-0"
              title="Stop Generating"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!inputText.trim()}
              className="p-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 text-white rounded-lg transition-colors cursor-pointer flex-shrink-0"
              title="Send Message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
