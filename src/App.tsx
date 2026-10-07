import React, { useState, useEffect, useRef } from 'react';
import { Avatar } from './components/Avatar';
import { SpeechBubble } from './components/SpeechBubble';
import { SettingsModal } from './components/SettingsModal';
import { WindowControls } from './components/WindowControls';
import { AvatarState, ChatMessage, AppSettings, ProviderType } from './types';
import {
  loadSettings,
  saveSettings,
  loadChatHistory,
  saveChatHistory,
} from './services/storage';
import { LLMRouter } from './services/llm-router';
import { ProactiveCompanionEngine } from './services/proactive-companion';

export const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [messages, setMessages] = useState<ChatMessage[]>(loadChatHistory);
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastContextActivity, setLastContextActivity] = useState<string | undefined>();
  const [activeProvider, setActiveProvider] = useState<
    { provider: ProviderType; model: string } | undefined
  >();

  const abortControllerRef = useRef<AbortController | null>(null);
  const proactiveEngineRef = useRef<ProactiveCompanionEngine | null>(null);

  // Sync state to local storage
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveChatHistory(messages);
  }, [messages]);

  // Initialize and run proactive idle engine
  useEffect(() => {
    const engine = new ProactiveCompanionEngine(
      () => settings,
      () => isStreaming,
      {
        onStart: (contextDesc) => {
          setLastContextActivity(contextDesc);
          setAvatarState('thinking');
          setIsChatOpen(true);
          setIsStreaming(true);
        },
        onChunk: (_chunk, accumulated) => {
          setAvatarState('speaking');
          setMessages((prev) => {
            const hasStreaming = prev.some((m) => m.isStreaming);
            if (hasStreaming) {
              return prev.map((m) =>
                m.isStreaming ? { ...m, content: accumulated } : m
              );
            }
            return [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: accumulated,
                timestamp: Date.now(),
                isStreaming: true,
              },
            ];
          });
        },
        onComplete: (fullText, contextDesc) => {
          setLastContextActivity(contextDesc);
          setAvatarState('speaking');
          setIsStreaming(false);
          setMessages((prev) => {
            const hasStreaming = prev.some((m) => m.isStreaming);
            if (hasStreaming) {
              return prev.map((m) =>
                m.isStreaming ? { ...m, content: fullText, isStreaming: false } : m
              );
            }
            return [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: fullText,
                timestamp: Date.now(),
                isStreaming: false,
              },
            ];
          });

          // Soft transition back to idle after 4 seconds
          setTimeout(() => {
            setAvatarState((curr) => (curr === 'speaking' ? 'idle' : curr));
          }, 4000);
        },
        onError: (err) => {
          console.warn('[ProactiveEngine] Error:', err);
          setIsStreaming(false);
          setAvatarState('idle');
        },
      }
    );

    proactiveEngineRef.current = engine;
    engine.start();

    return () => {
      engine.stop();
    };
  }, [settings, isStreaming]);

  // Handle user sending a prompt
  const handleSendMessage = async (text: string) => {
    if (isStreaming) return;
    proactiveEngineRef.current?.recordUserInteraction();
    setIsChatOpen(true);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const assistantPlaceholderId = crypto.randomUUID();
    const assistantPlaceholder: ChatMessage = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages([...updatedMessages, assistantPlaceholder]);
    setIsStreaming(true);
    setAvatarState('thinking');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const result = await LLMRouter.streamWithFallback({
        messages: updatedMessages,
        settings,
        signal: abortController.signal,
        onProviderSelected: (provider, model) => {
          setActiveProvider({ provider, model });
        },
        onChunk: (_chunk, accumulated) => {
          // As soon as tokens arrive, ensure avatar transitions to speaking
          setAvatarState('speaking');
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantPlaceholderId
                ? { ...msg, content: accumulated }
                : msg
            )
          );
        },
      });

      // Finalize assistant message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantPlaceholderId
            ? {
                ...msg,
                content: result.text,
                isStreaming: false,
                providerUsed: result.provider,
                modelUsed: result.model,
              }
            : msg
        )
      );

      setAvatarState('idle');
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.log('Stream cancelled by user');
        setAvatarState('idle');
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantPlaceholderId
              ? { ...msg, isStreaming: false, content: msg.content || '(Cancelled)' }
              : msg
          )
        );
      } else {
        console.error('Chat error:', err);
        setAvatarState('error');
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantPlaceholderId
              ? {
                  ...msg,
                  isStreaming: false,
                  content: `Error al procesar: ${err?.message || 'Fallo de conexión'}`,
                }
              : msg
          )
        );

        // Reset error state after 4 seconds back to idle
        setTimeout(() => {
          setAvatarState((current) => (current === 'error' ? 'idle' : current));
        }, 4000);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setAvatarState('idle');
  };

  const handleClearHistory = () => {
    setMessages([]);
  };

  const handleTriggerProactive = () => {
    proactiveEngineRef.current?.triggerNow();
  };

  const handleDragStart = () => {
    if (avatarState === 'idle') {
      setAvatarState('dragging');
    }
  };

  const handleDragEnd = () => {
    if (avatarState === 'dragging') {
      setAvatarState('idle');
    }
  };

  const handleResizeMouseDown = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().startResizeDragging('SouthEast');
    } catch (err) {
      console.warn('Resize dragging fallback:', err);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between p-2 select-none overflow-hidden bg-transparent">
      {/* Top Bar with subtle window controls on hover */}
      <div className="w-full flex items-center justify-between px-2 pt-0.5 pb-0.5 z-40 opacity-20 hover:opacity-100 transition-opacity duration-200">
        <div data-tauri-drag-region className="flex-1 h-6 cursor-move" />
        <WindowControls
          alwaysOnTop={settings.alwaysOnTop}
          onToggleAlwaysOnTop={(val) => setSettings({ ...settings, alwaysOnTop: val })}
        />
      </div>

      {/* Prominent Waifu Avatar in Center/Top */}
      <div className="flex-1 w-full flex items-center justify-center my-0.5 z-30">
        <Avatar
          state={avatarState}
          isChatOpen={isChatOpen}
          variant={settings.avatarVariant}
          onToggleChat={() => setIsChatOpen((prev) => !prev)}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          customAvatars={{
            idle: settings.customAvatarIdle,
            dragging: settings.customAvatarDragging,
            thinking: settings.customAvatarThinking,
          }}
          enableLipFlap={settings.enableLipFlap}
        />
      </div>

      {/* Visual Novel Speech Bubble Dialogue at Bottom */}
      <div className="w-full flex flex-col items-center justify-end pb-1 z-40">
        <SpeechBubble
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          messages={messages}
          isStreaming={isStreaming}
          activeProvider={activeProvider}
          onSendMessage={handleSendMessage}
          onStopStreaming={handleStopStreaming}
          onClearHistory={handleClearHistory}
          onOpenSettings={() => setIsSettingsOpen(true)}
          lastContextActivity={lastContextActivity}
          onTriggerProactive={handleTriggerProactive}
        />

        {!isChatOpen && (
          <button
            onClick={() => setIsChatOpen(true)}
            className="text-[11px] text-purple-200/90 hover:text-white bg-slate-950/60 hover:bg-slate-900/80 px-3.5 py-1 rounded-full border border-purple-500/30 backdrop-blur-md cursor-pointer shadow-lg transition-all flex items-center gap-1.5 opacity-40 hover:opacity-100"
            title="Hacé clic para hablar con Nanase"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>💬 Hablar</span>
          </button>
        )}
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={(updated) => setSettings(updated)}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Subtle Resize Handle (Bottom-Right Corner) */}
      <div
        onMouseDown={handleResizeMouseDown}
        className="absolute bottom-1 right-1 w-4 h-4 flex items-end justify-end p-0.5 cursor-se-resize z-50 opacity-20 hover:opacity-80 transition-opacity select-none"
        title="Arrastrá para redimensionar la ventana"
      >
        <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-purple-400 fill-current">
          <circle cx="8" cy="8" r="1.2" />
          <circle cx="4" cy="8" r="1.2" />
          <circle cx="8" cy="4" r="1.2" />
        </svg>
      </div>
    </div>
  );
};

export default App;

