import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Trash2, Settings as SettingsIcon, Sparkles, X, MessageSquareQuote } from 'lucide-react';
import { ChatMessage, ProviderType } from '../types';

interface SpeechBubbleProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  isStreaming: boolean;
  activeProvider?: { provider: ProviderType; model: string };
  onSendMessage: (text: string) => void;
  onStopStreaming: () => void;
  onClearHistory: () => void;
  onOpenSettings: () => void;
  lastContextActivity?: string;
  onTriggerProactive?: () => void;
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  isOpen,
  onClose,
  messages,
  isStreaming,
  activeProvider,
  onSendMessage,
  onStopStreaming,
  onClearHistory,
  onOpenSettings,
  lastContextActivity,
  onTriggerProactive,
}) => {
  const [inputText, setInputText] = useState('');
  const [showFullHistory, setShowFullHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll inside dialogue
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

  // Get the most recent assistant message for the speech bubble
  const recentAssistantMessage = [...messages].reverse().find((m) => m.role === 'assistant');
  const recentUserMessage = [...messages].reverse().find((m) => m.role === 'user');

  if (!isOpen) {
    return null;
  }

  return (
    <div className="relative w-full max-w-[390px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-200 z-40 select-none">
      {/* Speech bubble pointer / tail pointing toward avatar above */}
      <div className="w-0 h-0 mx-auto -mb-1 border-x-8 border-x-transparent border-b-8 border-b-purple-500/40 z-50 drop-shadow-sm" />

      {/* Main Glass Bubble Card */}
      <div className="flex flex-col bg-slate-950/80 backdrop-blur-xl border border-purple-400/40 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/60 border-b border-purple-500/20">
          <div className="flex items-center gap-1.5">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Yuzuki Nanase</span>
            </div>

            {lastContextActivity && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-950/70 text-cyan-300 border border-cyan-800/40 font-sans truncate max-w-[120px]"
                title={`Viendo: ${lastContextActivity}`}
              >
                👀 {lastContextActivity}
              </span>
            )}

            {activeProvider && (
              <span
                className="text-[8px] px-1.5 py-0.5 rounded-full bg-purple-950/70 text-purple-300 border border-purple-800/40 font-mono truncate max-w-[85px]"
                title={`${activeProvider.provider}: ${activeProvider.model}`}
              >
                {activeProvider.model.split('-').slice(0, 2).join('-')}
              </span>
            )}
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-1">
            {onTriggerProactive && (
              <button
                onClick={onTriggerProactive}
                disabled={isStreaming}
                className="p-1 hover:bg-slate-800/80 text-purple-300/80 hover:text-purple-200 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
                title="Pedirle un comentario espontáneo ahora"
              >
                <MessageSquareQuote className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setShowFullHistory((prev) => !prev)}
              className="text-[10px] px-1.5 py-0.5 hover:bg-slate-800/80 text-slate-400 hover:text-purple-300 rounded-lg transition-colors cursor-pointer"
              title="Alternar ver últimos mensajes o diálogo actual"
            >
              {showFullHistory ? 'Compacto' : 'Historial'}
            </button>
            <button
              onClick={onClearHistory}
              className="p-1 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Limpiar diálogo"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            <button
              onClick={onOpenSettings}
              className="p-1 hover:bg-slate-800/80 text-slate-400 hover:text-purple-300 rounded-lg transition-colors cursor-pointer"
              title="Configuración"
            >
              <SettingsIcon className="w-3 h-3" />
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 rounded-lg transition-colors cursor-pointer ml-0.5"
              title="Cerrar diálogo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dialogue Content */}
        <div className="max-h-[160px] overflow-y-auto px-3 py-2 space-y-2 text-xs leading-relaxed">
          {showFullHistory ? (
            // Full recent chat history
            messages.length === 0 ? (
              <div className="py-4 text-center text-slate-400 text-[11px]">
                <span>No hay mensajes anteriores. ¡Escríbeme algo abajo!</span>
              </div>
            ) : (
              messages.slice(-6).map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[92%] rounded-xl px-2.5 py-1.5 selectable-text break-words ${
                      msg.role === 'user'
                        ? 'bg-purple-600/80 text-white font-medium self-end rounded-br-xs'
                        : 'bg-slate-900/80 text-slate-100 border border-purple-500/25 rounded-bl-xs'
                    }`}
                  >
                    <div className="text-[9px] opacity-75 font-mono mb-0.5">
                      {msg.role === 'user' ? 'Tú' : 'Nanase'}
                    </div>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))
            )
          ) : (
            // Compact Visual Novel dialogue focus
            <div className="space-y-1.5">
              {recentUserMessage && (
                <div className="text-[10px] text-purple-300/80 font-mono truncate px-1">
                  ↳ Tú: {recentUserMessage.content}
                </div>
              )}

              <div className="selectable-text text-slate-100 text-xs font-normal leading-relaxed break-words px-1 py-0.5">
                {recentAssistantMessage ? (
                  <>
                    <span>{recentAssistantMessage.content}</span>
                    {recentAssistantMessage.isStreaming && (
                      <span className="inline-block w-1.5 h-3 bg-pink-400 ml-1 animate-pulse align-middle" />
                    )}
                  </>
                ) : (
                  <span className="text-slate-400 italic text-[11px]">
                    (Yuzuki está a tu lado observando... ¡Háblale o dale una tarea!)
                  </span>
                )}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-2 bg-slate-900/70 border-t border-purple-500/20">
          <div className="flex items-center gap-1.5 bg-slate-950/80 rounded-xl border border-purple-500/30 px-2.5 py-1 focus-within:border-purple-400 transition-colors">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribile a Nanase... (Enter)"
              rows={1}
              className="flex-1 bg-transparent border-0 outline-none resize-none text-xs text-slate-100 placeholder-slate-500 py-0.5 selectable-text focus:ring-0 max-h-16"
            />

            {isStreaming ? (
              <button
                onClick={onStopStreaming}
                className="p-1.5 bg-rose-600/90 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer flex-shrink-0"
                title="Detener respuesta"
              >
                <Square className="w-3 h-3 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!inputText.trim()}
                className="p-1.5 bg-purple-600/90 hover:bg-purple-500 disabled:opacity-30 text-white rounded-lg transition-colors cursor-pointer flex-shrink-0"
                title="Enviar mensaje"
              >
                <Send className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
