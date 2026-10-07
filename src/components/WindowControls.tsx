import React, { useState } from 'react';
import { Minus, X, Pin, PinOff } from 'lucide-react';

interface WindowControlsProps {
  alwaysOnTop: boolean;
  onToggleAlwaysOnTop: (enabled: boolean) => void;
}

export const WindowControls: React.FC<WindowControlsProps> = ({
  alwaysOnTop,
  onToggleAlwaysOnTop,
}) => {
  const [pinned, setPinned] = useState(alwaysOnTop);

  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().minimize();
    } catch {
      console.log('Minimize window (browser fallback)');
    }
  };

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch {
      console.log('Close window (browser fallback)');
    }
  };

  const handleTogglePin = async () => {
    const next = !pinned;
    setPinned(next);
    onToggleAlwaysOnTop(next);
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().setAlwaysOnTop(next);
    } catch {
      console.log('Toggle always on top (browser fallback):', next);
    }
  };

  return (
    <div className="flex items-center gap-1 bg-slate-950/70 backdrop-blur-md px-2 py-1 rounded-full border border-purple-500/20 text-slate-400">
      <button
        onClick={handleTogglePin}
        className={`p-1 hover:text-purple-300 rounded-full transition-colors cursor-pointer ${
          pinned ? 'text-purple-400' : 'text-slate-500'
        }`}
        title={pinned ? 'Always on Top (Enabled)' : 'Always on Top (Disabled)'}
      >
        {pinned ? <Pin className="w-3 h-3 fill-current" /> : <PinOff className="w-3 h-3" />}
      </button>

      <button
        onClick={handleMinimize}
        className="p-1 hover:text-slate-200 rounded-full transition-colors cursor-pointer"
        title="Minimize"
      >
        <Minus className="w-3 h-3" />
      </button>

      <button
        onClick={handleClose}
        className="p-1 hover:text-rose-400 rounded-full transition-colors cursor-pointer"
        title="Quit"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};
