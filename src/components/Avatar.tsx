import React, { useEffect, useState } from 'react';
import { AvatarState } from '../types';

interface AvatarProps {
  state: AvatarState;
  onToggleChat: () => void;
  isChatOpen: boolean;
  variant?: 'neko' | 'cyber' | 'chibi';
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export const Avatar: React.FC<AvatarProps> = ({
  state,
  onToggleChat,
  isChatOpen,
  variant: _variant = 'neko',
  onDragStart,
  onDragEnd,
}) => {
  const [blink, setBlink] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Periodic blinking during idle or speaking
  useEffect(() => {
    if (state === 'error' || state === 'thinking') return;

    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 160);
    }, 3500 + Math.random() * 2000);

    return () => clearInterval(interval);
  }, [state]);

  // Mouth flapping animation when state is 'speaking'
  useEffect(() => {
    if (state !== 'speaking') {
      setMouthOpen(false);
      return;
    }

    const interval = setInterval(() => {
      setMouthOpen((prev) => !prev);
    }, 130);

    return () => clearInterval(interval);
  }, [state]);

  // Drag listeners
  const handleMouseDown = () => {
    onDragStart?.();
  };

  const handleMouseUp = () => {
    onDragEnd?.();
  };

  return (
    <div
      data-tauri-drag-region
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onToggleChat}
      className={`relative select-none cursor-grab active:cursor-grabbing transition-transform duration-300 filter drop-shadow-xl ${
        state === 'dragging' ? 'scale-105 -translate-y-2' : ''
      } ${isHovered ? 'scale-105' : 'scale-100'}`}
      title="Click to toggle chat, drag to move"
    >
      {/* State Bubble / Indicator */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 pointer-events-none z-20">
        {state === 'thinking' && (
          <div className="bg-amber-500/90 text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold shadow-lg animate-pulse flex items-center gap-1 border border-amber-300/50">
            <span>Thinking</span>
            <span className="flex gap-0.5">
              <span className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1 h-1 bg-white rounded-full animate-bounce"></span>
            </span>
          </div>
        )}

        {state === 'speaking' && (
          <div className="bg-purple-600/90 text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold shadow-lg animate-bounce flex items-center gap-1 border border-purple-300/50">
            <span>Speaking...</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          </div>
        )}

        {state === 'error' && (
          <div className="bg-rose-600/90 text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold shadow-lg flex items-center gap-1 border border-rose-300/50">
            <span>(＞﹏＜) Oops!</span>
          </div>
        )}

        {state === 'dragging' && (
          <div className="bg-cyan-600/90 text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold shadow-lg flex items-center gap-1 border border-cyan-300/50">
            <span>(°o°) Wheee!</span>
          </div>
        )}
      </div>

      {/* Halo / Glow Effect depending on state */}
      <div
        className={`absolute inset-0 rounded-full blur-xl transition-opacity duration-500 pointer-events-none ${
          state === 'thinking'
            ? 'bg-amber-400/40 opacity-100 animate-pulse'
            : state === 'speaking'
            ? 'bg-purple-500/50 opacity-100 animate-pulse-glow'
            : state === 'error'
            ? 'bg-rose-500/40 opacity-100'
            : 'bg-indigo-500/20 opacity-60'
        }`}
      />

      {/* SVG Avatar Character */}
      <div className="relative w-36 h-36 mx-auto">
        <svg
          viewBox="0 0 200 200"
          className={`w-full h-full transform transition-all duration-300 ${
            state === 'idle' ? 'animate-bounce-subtle' : ''
          }`}
        >
          <defs>
            {/* Linear gradients */}
            <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#7e22ce" />
            </linearGradient>
            <linearGradient id="earInnerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#fb7185" />
            </linearGradient>
            <linearGradient id="eyeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>

          {/* Ears */}
          {/* Left Ear */}
          <path
            d="M 50 85 L 35 25 L 85 55 Z"
            fill="url(#bodyGrad)"
            stroke="#581c87"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M 52 75 L 42 35 L 75 57 Z" fill="url(#earInnerGrad)" />

          {/* Right Ear */}
          <path
            d="M 150 85 L 165 25 L 115 55 Z"
            fill="url(#bodyGrad)"
            stroke="#581c87"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M 148 75 L 158 35 L 125 57 Z" fill="url(#earInnerGrad)" />

          {/* Head & Body Base */}
          <ellipse
            cx="100"
            cy="115"
            rx="68"
            ry="60"
            fill="url(#bodyGrad)"
            stroke="#581c87"
            strokeWidth="4"
          />

          {/* Cheeks blush */}
          <ellipse cx="62" cy="125" rx="10" ry="6" fill="#f472b6" opacity="0.6" />
          <ellipse cx="138" cy="125" rx="10" ry="6" fill="#f472b6" opacity="0.6" />

          {/* EYES */}
          {state === 'error' ? (
            // Dizzy 'X X' eyes
            <g stroke="#ffffff" strokeWidth="4" strokeLinecap="round">
              <line x1="68" y1="98" x2="84" y2="114" />
              <line x1="84" y1="98" x2="68" y2="114" />
              <line x1="116" y1="98" x2="132" y2="114" />
              <line x1="132" y1="98" x2="116" y2="114" />
            </g>
          ) : blink ? (
            // Closed/Blinking eyes '^ ^'
            <g stroke="#ffffff" strokeWidth="4" strokeLinecap="round" fill="none">
              <path d="M 66 108 Q 76 96 86 108" />
              <path d="M 114 108 Q 124 96 134 108" />
            </g>
          ) : (
            // Open Expressive Eyes
            <g>
              {/* Left Eye */}
              <ellipse cx="76" cy="106" rx="12" ry="16" fill="#0f172a" />
              <ellipse cx="76" cy="108" rx="10" ry="13" fill="url(#eyeGrad)" />
              <circle cx="73" cy="101" r="5" fill="#ffffff" />
              <circle cx="80" cy="112" r="2.5" fill="#ffffff" />

              {/* Right Eye */}
              <ellipse cx="124" cy="106" rx="12" ry="16" fill="#0f172a" />
              <ellipse cx="124" cy="108" rx="10" ry="13" fill="url(#eyeGrad)" />
              <circle cx="121" cy="101" r="5" fill="#ffffff" />
              <circle cx="128" cy="112" r="2.5" fill="#ffffff" />
            </g>
          )}

          {/* Tiny Nose */}
          <polygon points="100,118 97,122 103,122" fill="#f472b6" />

          {/* MOUTH */}
          {state === 'speaking' ? (
            mouthOpen ? (
              // Open mouth talking
              <ellipse cx="100" cy="132" rx="7" ry="9" fill="#be185d" stroke="#581c87" strokeWidth="2" />
            ) : (
              // Slightly open mouth
              <ellipse cx="100" cy="130" rx="5" ry="3" fill="#be185d" />
            )
          ) : state === 'error' ? (
            // Wavy mouth
            <path
              d="M 92 133 Q 96 137 100 133 Q 104 130 108 133"
              stroke="#4c0519"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          ) : state === 'thinking' ? (
            // Small curious mouth 'o'
            <circle cx="100" cy="131" r="3.5" fill="#4c0519" />
          ) : (
            // Cute cat smile ':3'
            <path
              d="M 92 128 Q 96 133 100 129 Q 104 133 108 128"
              stroke="#581c87"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          )}

          {/* Cute Paws at bottom */}
          <ellipse
            cx="75"
            cy="165"
            rx="14"
            ry="9"
            fill="#e9d5ff"
            stroke="#581c87"
            strokeWidth="3"
            className={state === 'dragging' ? 'translate-y-2 transition-transform' : ''}
          />
          <ellipse
            cx="125"
            cy="165"
            rx="14"
            ry="9"
            fill="#e9d5ff"
            stroke="#581c87"
            strokeWidth="3"
            className={state === 'dragging' ? 'translate-y-2 transition-transform' : ''}
          />
        </svg>
      </div>

      {/* Floating Chat Toggle Badge */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleChat();
        }}
        className="absolute -bottom-1 right-2 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white p-1.5 rounded-full shadow-lg border border-purple-400 transition-all flex items-center justify-center cursor-pointer z-30"
        title={isChatOpen ? 'Collapse Chat' : 'Open Chat'}
      >
        <span className="text-xs">{isChatOpen ? '✕' : '💬'}</span>
      </button>
    </div>
  );
};
