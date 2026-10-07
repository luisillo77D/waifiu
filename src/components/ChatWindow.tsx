import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ProviderType } from '../types';
import { Send, Square, Trash2, Settings as SettingsIcon, Sparkles } from 'lucide-react';

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

  // Auto-scroll to bottom on streaming or new message
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
      case 'baseten':
        return `🚀 Baseten (${model || 'Custom'})`;
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
    <div className="flex flex-col w-[420px] h-[215px] backdrop-blur-xl bg-slate-950/90 border border-purple-500/40 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
      {/* Visual Novel Name Badge & Action Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900/70 border-b border-purple-500/25">
        <div className="flex items-center gap-2">
          {/* Character Name Ribbon */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-md shadow-sm flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Waifiu</span>
          </div>

          {activeProvider && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60 font-mono truncate max-w-[170px]">
              {formatProviderLabel(activeProvider.provider, activeProvider.model)}
            </span>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={onClearHistory}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Limpiar diálogo"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-purple-300 rounded-lg transition-colors cursor-pointer"
            title="Configuración"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dialogue Area (Visual novel dialogue text) */}
      <div className="flex-1 overflow-y-auto px-3.5 py-2 space-y-2 text-xs leading-relaxed">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center text-slate-400 text-[11px]">
            <span>¡Hola! Escribime acá abajo para charlar o pedirme cualquier tarea.</span>
          </div>
        ) : (
          messages.slice(-8).map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[92%] rounded-xl px-3 py-1.5 selectable-text break-words ${
                  msg.role === 'user'
                    ? 'bg-purple-600/90 text-white font-medium self-end rounded-br-xs'
                    : 'bg-slate-900/85 text-slate-100 border border-purple-500/20 rounded-bl-xs'
                }`}
              >
                <div className="text-[9px] opacity-75 font-mono mb-0.5">
                  {msg.role === 'user' ? 'Vos' : 'Waifiu'}
                </div>
                <div className="whitespace-pre-wrap">
                  {msg.content}
                  {msg.isStreaming && (
                    <span className="inline-block w-1.5 h-3 bg-pink-400 ml-1 animate-pulse align-middle" />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Compact Input Row */}
      <div className="p-2 bg-slate-900/80 border-t border-purple-500/20">
        <div className="flex items-center gap-1.5 bg-slate-950/90 rounded-xl border border-purple-500/30 px-2 py-1 focus-within:border-purple-400">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribí un mensaje... (Enter)"
            rows={1}
            className="flex-1 bg-transparent border-0 outline-none resize-none text-xs text-slate-100 placeholder-slate-500 py-0.5 selectable-text focus:ring-0 max-h-16"
          />

          {isStreaming ? (
            <button
              onClick={onStopStreaming}
              className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer flex-shrink-0"
              title="Detener"
            >
              <Square className="w-3 h-3 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!inputText.trim()}
              className="p-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white rounded-lg transition-colors cursor-pointer flex-shrink-0"
              title="Enviar"
            >
              <Send className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
