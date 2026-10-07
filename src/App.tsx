import React, { useState, useEffect, useRef } from 'react';
import { Avatar } from './components/Avatar';
import { ChatWindow } from './components/ChatWindow';
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

export const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [messages, setMessages] = useState<ChatMessage[]>(loadChatHistory);
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeProvider, setActiveProvider] = useState<
    { provider: ProviderType; model: string } | undefined
  >();

  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync state to local storage
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveChatHistory(messages);
  }, [messages]);

  // Handle user sending a prompt
  const handleSendMessage = async (text: string) => {
    if (isStreaming) return;

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
    <div className="relative w-full h-full flex flex-col items-center justify-between p-3 select-none overflow-hidden bg-transparent">
      {/* Top Bar with window controls */}
      <div className="w-full flex items-center justify-between px-2 pt-1 pb-1 z-40">
        <div data-tauri-drag-region className="flex-1 h-6 cursor-move" />
        <WindowControls
          alwaysOnTop={settings.alwaysOnTop}
          onToggleAlwaysOnTop={(val) => setSettings({ ...settings, alwaysOnTop: val })}
        />
      </div>

      {/* Prominent Waifu Avatar in Center/Top */}
      <div className="flex-1 w-full flex items-center justify-center my-1 z-30">
        <Avatar
          state={avatarState}
          isChatOpen={isChatOpen}
          variant={settings.avatarVariant}
          onToggleChat={() => setIsChatOpen((prev) => !prev)}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
      </div>

      {/* Visual Novel Dialogue Box at Bottom */}
      <div className="w-full flex flex-col items-center justify-end pb-1 z-40">
        {isChatOpen ? (
          <ChatWindow
            messages={messages}
            isStreaming={isStreaming}
            activeProvider={activeProvider}
            onSendMessage={handleSendMessage}
            onStopStreaming={handleStopStreaming}
            onClearHistory={handleClearHistory}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        ) : (
          <button
            onClick={() => setIsChatOpen(true)}
            className="text-[11px] text-purple-200 hover:text-white bg-slate-950/80 hover:bg-slate-900 px-4 py-1.5 rounded-full border border-purple-500/40 backdrop-blur-md animate-pulse cursor-pointer shadow-lg transition-colors"
          >
            💬 Abrir diálogo
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

      {/* Visual Resize Handle (Bottom-Right Corner) */}
      <div
        onMouseDown={handleResizeMouseDown}
        className="absolute bottom-1 right-1 w-4 h-4 flex items-end justify-end p-0.5 cursor-se-resize z-50 opacity-40 hover:opacity-100 transition-opacity select-none"
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
