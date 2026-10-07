import React, { useEffect, useState, useRef } from 'react';
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
  const [isInsideWindow, setIsInsideWindow] = useState(true);
  const [eyeOffset, setEyeOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [useFallbackSvg, setUseFallbackSvg] = useState(false);

  const avatarContainerRef = useRef<HTMLDivElement>(null);
  const isInsideWindowRef = useRef<boolean>(true);
  const lastOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Periodic blinking during idle, speaking, or dragging
  useEffect(() => {
    if (state === 'error' || state === 'thinking') return;

    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 3200 + Math.random() * 2000);

    return () => clearInterval(interval);
  }, [state]);

  // Mouth flapping animation during 'speaking'
  useEffect(() => {
    if (state !== 'speaking') {
      setMouthOpen(false);
      return;
    }

    const interval = setInterval(() => {
      setMouthOpen((prev) => !prev);
    }, 120);

    return () => clearInterval(interval);
  }, [state]);

  // State-based gaze overrides
  useEffect(() => {
    if (state === 'error') {
      setEyeOffset({ x: 0, y: 0 });
    } else if (state === 'thinking') {
      setEyeOffset({ x: -2.5, y: -4 });
    } else if (state === 'dragging') {
      setEyeOffset({ x: 0, y: -3.5 });
    }
  }, [state]);

  // 1. Local real-time cursor tracking (when cursor is inside window)
  useEffect(() => {
    if (state === 'error' || state === 'thinking' || state === 'dragging') return;

    const handleMouseMove = (e: MouseEvent) => {
      isInsideWindowRef.current = true;
      setIsInsideWindow(true);
      if (!avatarContainerRef.current) return;

      const rect = avatarContainerRef.current.getBoundingClientRect();
      const eyeCenterClientX = rect.left + rect.width * 0.5;
      const eyeCenterClientY = rect.top + rect.height * (158 / 320);

      const dx = e.clientX - eyeCenterClientX;
      const dy = e.clientY - eyeCenterClientY;
      const angle = Math.atan2(dy, dx);
      const dist = Math.hypot(dx, dy);

      // Max offset range of 5.5px with gentle falloff
      const clampedDist = Math.min(5.5, dist / 28);
      const offset = {
        x: Math.cos(angle) * clampedDist,
        y: Math.sin(angle) * clampedDist,
      };
      lastOffsetRef.current = offset;
      setEyeOffset(offset);
    };

    const handleMouseLeave = () => {
      isInsideWindowRef.current = false;
      setIsInsideWindow(false);

      // Follow-through: look in the direction the cursor exited for ~1.8s
      const exitDirection = {
        x: Math.max(-5.5, Math.min(5.5, lastOffsetRef.current.x * 1.15)),
        y: Math.max(-5.5, Math.min(5.5, lastOffsetRef.current.y * 1.15)),
      };
      setEyeOffset(exitDirection);
    };

    const handleMouseEnter = () => {
      isInsideWindowRef.current = true;
      setIsInsideWindow(true);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [state]);

  // 2. Autonomous organic gaze (when cursor is outside the window)
  useEffect(() => {
    if (isInsideWindow || state === 'error' || state === 'thinking' || state === 'dragging') return;

    let timeoutId: any = null;

    const organicWander = () => {
      if (isInsideWindowRef.current) return;

      // Natural micro-saccades (looking forward, soft side glance, attentive posture)
      const naturalGazePoints = [
        { x: 0, y: 0 },         // Looking forward attentively
        { x: 2.8, y: -1.2 },    // Soft glance top-right
        { x: -2.8, y: -1.2 },   // Soft glance top-left
        { x: 3.2, y: 1.0 },     // Soft glance bottom-right
        { x: -3.2, y: 1.0 },    // Soft glance bottom-left
        { x: 0, y: -2.0 },      // Looking slightly up
        { x: 1.8, y: 0 },       // Slight right
        { x: -1.8, y: 0 },      // Slight left
      ];

      const chosenGaze = naturalGazePoints[Math.floor(Math.random() * naturalGazePoints.length)];
      setEyeOffset(chosenGaze);

      // Random delay between glances (2.5s to 4.2s)
      const nextDelay = 2500 + Math.random() * 1700;
      timeoutId = setTimeout(organicWander, nextDelay);
    };

    // First wander trigger after the initial exit follow-through (1.8s)
    timeoutId = setTimeout(organicWander, 1800);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isInsideWindow, state]);

  return (
    <div
      ref={avatarContainerRef}
      data-tauri-drag-region
      onMouseDown={() => onDragStart?.()}
      onMouseUp={() => onDragEnd?.()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onToggleChat}
      className={`relative select-none cursor-grab active:cursor-grabbing transition-transform duration-300 filter drop-shadow-2xl ${
        state === 'dragging' ? 'scale-105 -translate-y-2' : ''
      } ${isHovered ? 'scale-102' : 'scale-100'}`}
      title="Hacé clic para alternar diálogo, arrastrá para mover"
    >
      {/* Floating State Badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 pointer-events-none z-30">
        {state === 'thinking' && (
          <div className="bg-purple-900/90 text-purple-200 text-[11px] px-3 py-1 rounded-full font-bold shadow-lg animate-pulse flex items-center gap-1.5 border border-purple-400/50 backdrop-blur-md">
            <span>Pensando</span>
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-purple-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-purple-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-purple-300 rounded-full animate-bounce"></span>
            </span>
          </div>
        )}

        {state === 'speaking' && (
          <div className="bg-pink-600/90 text-white text-[11px] px-3 py-1 rounded-full font-bold shadow-lg animate-bounce flex items-center gap-1.5 border border-pink-300/50 backdrop-blur-md">
            <span>Hablando...</span>
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping"></span>
          </div>
        )}

        {state === 'error' && (
          <div className="bg-rose-700/90 text-white text-[11px] px-3 py-1 rounded-full font-bold shadow-lg flex items-center gap-1.5 border border-rose-300/50 backdrop-blur-md">
            <span>(＞﹏＜) ¡Ups!</span>
          </div>
        )}

        {state === 'dragging' && (
          <div className="bg-indigo-600/90 text-white text-[11px] px-3 py-1 rounded-full font-bold shadow-lg flex items-center gap-1.5 border border-indigo-300/50 backdrop-blur-md">
            <span>(⁄ ⁄&gt;⁄ ▽ ⁄&lt;⁄ ⁄) ¡Soltame!</span>
          </div>
        )}
      </div>

      {/* Magical Aura Glow */}
      <div
        className={`absolute inset-4 rounded-full blur-2xl transition-opacity duration-500 pointer-events-none ${
          state === 'thinking'
            ? 'bg-purple-500/35 opacity-100 animate-pulse'
            : state === 'speaking'
            ? 'bg-pink-500/40 opacity-100 animate-pulse-glow'
            : state === 'error'
            ? 'bg-rose-500/40 opacity-100'
            : 'bg-indigo-500/25 opacity-70'
        }`}
      />

      {/* ANIME WAIFU CHARACTER (ILLUSTRATION OR SVG FALLBACK) */}
      {!useFallbackSvg ? (
        <div className="relative w-64 h-72 sm:w-72 sm:h-80 mx-auto flex items-end justify-center">
          <img
            src="/avatar.png"
            alt="Waifiu"
            className={`max-h-full max-w-full object-contain pointer-events-none select-none transition-all duration-300 drop-shadow-[0_10px_25px_rgba(0,0,0,0.65)] ${
              state === 'speaking'
                ? 'animate-pulse scale-[1.03]'
                : state === 'idle'
                ? 'animate-bounce-subtle'
                : state === 'dragging'
                ? 'scale-105'
                : ''
            }`}
            onError={() => setUseFallbackSvg(true)}
          />
        </div>
      ) : (
        <div className="relative w-64 h-64 mx-auto">
          <svg
            viewBox="0 0 320 320"
            className={`w-full h-full transform transition-all duration-300 ${
              state === 'idle' ? 'animate-bounce-subtle' : ''
            }`}
          >
          <defs>
            {/* Hair Gradients */}
            <linearGradient id="hairMain" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="60%" stopColor="#7e22ce" />
              <stop offset="100%" stopColor="#581c87" />
            </linearGradient>

            <linearGradient id="hairHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e9d5ff" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>

            {/* Skin Gradient */}
            <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fff1f2" />
              <stop offset="100%" stopColor="#ffe4e6" />
            </linearGradient>

            {/* Eye Gradient */}
            <linearGradient id="animeEyeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#3b0764" />
            </linearGradient>

            {/* Outfit Gradient */}
            <linearGradient id="outfitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Ribbon Gradient */}
            <linearGradient id="ribbonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#be123c" />
            </linearGradient>
          </defs>

          {/* 1. BACK HAIR (Long twintails / locks) */}
          <path
            d="M 85 140 C 40 180, 25 240, 50 300 C 65 310, 85 270, 95 230 C 105 190, 100 160, 95 140 Z"
            fill="url(#hairMain)"
          />
          <path
            d="M 235 140 C 280 180, 295 240, 270 300 C 255 310, 235 270, 225 230 C 215 190, 220 160, 225 140 Z"
            fill="url(#hairMain)"
          />

          {/* 2. CAT EARS / ACCESSORIES */}
          {/* Left Cat Ear */}
          <path
            d="M 90 95 L 60 25 L 130 65 Z"
            fill="url(#hairMain)"
            stroke="#3b0764"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M 85 85 L 70 40 L 115 65 Z" fill="#fda4af" />

          {/* Right Cat Ear */}
          <path
            d="M 230 95 L 260 25 L 190 65 Z"
            fill="url(#hairMain)"
            stroke="#3b0764"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M 235 85 L 250 40 L 205 65 Z" fill="#fda4af" />

          {/* 3. BODY & OUTFIT (Collar + Ribbon) */}
          <path
            d="M 120 230 L 90 310 L 230 310 L 200 230 Z"
            fill="url(#outfitGrad)"
            stroke="#3b0764"
            strokeWidth="2"
          />
          {/* Sailor collar flap */}
          <path
            d="M 115 230 L 160 265 L 205 230 L 160 242 Z"
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />
          {/* Red Ribbon */}
          <path
            d="M 148 245 L 135 275 L 155 260 L 160 278 L 165 260 L 185 275 L 172 245 Z"
            fill="url(#ribbonGrad)"
          />
          <circle cx="160" cy="250" r="5" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />

          {/* 4. NECK & FACE BASE */}
          <rect x="148" y="200" width="24" height="35" fill="url(#skinGrad)" rx="6" />
          <path
            d="M 105 130 C 105 75, 215 75, 215 130 C 215 185, 175 225, 160 225 C 145 225, 105 185, 105 130 Z"
            fill="url(#skinGrad)"
            stroke="#fecdd3"
            strokeWidth="1.5"
          />

          {/* 5. CHEEKS BLUSH */}
          <ellipse
            cx="128"
            cy="172"
            rx="12"
            ry="6"
            fill="#fb7185"
            opacity={state === 'dragging' ? '0.85' : '0.55'}
          />
          <ellipse
            cx="192"
            cy="172"
            rx="12"
            ry="6"
            fill="#fb7185"
            opacity={state === 'dragging' ? '0.85' : '0.55'}
          />

          {/* 6. ANIME EYES WITH ORGANIC GAZE */}
          {state === 'error' ? (
            // Dizzy spiral eyes (@_@)
            <g stroke="#9333ea" strokeWidth="3" fill="none" strokeLinecap="round">
              <path d="M 125 155 Q 135 145 140 155 T 130 165 T 145 160" />
              <path d="M 175 155 Q 185 145 190 155 T 180 165 T 195 160" />
            </g>
          ) : blink ? (
            // Cute closed anime eyes ( > < )
            <g stroke="#3b0764" strokeWidth="3.5" strokeLinecap="round" fill="none">
              <path d="M 120 158 Q 135 148 146 158" />
              <path d="M 174 158 Q 185 148 200 158" />
            </g>
          ) : (
            // Full anime big glossy eyes with smooth organic gaze
            <g>
              {/* Eyelashes / Upper lid (fixed frame) */}
              <path
                d="M 118 152 Q 135 138 148 150"
                stroke="#2e1065"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 172 150 Q 185 138 202 152"
                stroke="#2e1065"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />

              {/* Dynamic Left Eye Iris & Pupil with CSS transition for organic gliding */}
              <g
                style={{
                  transform: `translate(${eyeOffset.x}px, ${eyeOffset.y}px)`,
                  transition: isInsideWindow
                    ? 'none'
                    : 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
                }}
              >
                <ellipse cx="134" cy="158" rx="11" ry="15" fill="url(#animeEyeGrad)" />
                <ellipse cx="134" cy="160" rx="6" ry="8" fill="#1e1b4b" />
                <circle cx="130" cy="152" r="4.5" fill="#ffffff" />
                <circle cx="137" cy="164" r="2.5" fill="#ffffff" />
                <circle cx="132" cy="167" r="1.5" fill="#ffffff" />
              </g>

              {/* Dynamic Right Eye Iris & Pupil with CSS transition */}
              <g
                style={{
                  transform: `translate(${eyeOffset.x}px, ${eyeOffset.y}px)`,
                  transition: isInsideWindow
                    ? 'none'
                    : 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
                }}
              >
                <ellipse cx="186" cy="158" rx="11" ry="15" fill="url(#animeEyeGrad)" />
                <ellipse cx="186" cy="160" rx="6" ry="8" fill="#1e1b4b" />
                <circle cx="182" cy="152" r="4.5" fill="#ffffff" />
                <circle cx="189" cy="164" r="2.5" fill="#ffffff" />
                <circle cx="184" cy="167" r="1.5" fill="#ffffff" />
              </g>
            </g>
          )}

          {/* Eyebrows */}
          <path
            d="M 122 140 Q 134 133 145 140"
            stroke="#581c87"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 175 140 Q 186 133 198 140"
            stroke="#581c87"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Tiny Nose */}
          <circle cx="160" cy="170" r="1.5" fill="#fb7185" />

          {/* 7. MOUTH */}
          {state === 'speaking' ? (
            mouthOpen ? (
              // Open cheerful talking anime mouth
              <path
                d="M 152 182 Q 160 198 168 182 Z"
                fill="#f43f5e"
                stroke="#881337"
                strokeWidth="1.5"
              />
            ) : (
              // Open subtle anime mouth
              <ellipse cx="160" cy="182" rx="4" ry="2.5" fill="#f43f5e" />
            )
          ) : state === 'error' ? (
            // Wavy / troubled mouth
            <path
              d="M 153 184 Q 157 188 160 184 Q 163 181 167 184"
              stroke="#881337"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          ) : state === 'thinking' ? (
            // Cute small 'o' mouth
            <circle cx="160" cy="183" r="3" fill="#be123c" />
          ) : (
            // Sweet gentle smile
            <path
              d="M 154 182 Q 160 187 166 182"
              stroke="#881337"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          )}

          {/* 8. FRONT HAIR / BANGS */}
          {/* Left Hair lock */}
          <path
            d="M 100 120 C 100 70, 160 60, 160 60 C 160 60, 130 95, 120 145 C 115 170, 110 200, 105 210 C 95 180, 95 140, 100 120 Z"
            fill="url(#hairMain)"
          />
          {/* Right Hair lock */}
          <path
            d="M 220 120 C 220 70, 160 60, 160 60 C 160 60, 190 95, 200 145 C 205 170, 210 200, 215 210 C 225 180, 225 140, 220 120 Z"
            fill="url(#hairMain)"
          />
          {/* Center Bangs */}
          <path
            d="M 125 78 C 140 100, 145 125, 145 125 C 150 115, 160 115, 165 128 C 170 110, 185 100, 195 78 C 160 65, 140 68, 125 78 Z"
            fill="url(#hairMain)"
          />
          {/* Hair shine band (Anime gloss) */}
          <ellipse
            cx="160"
            cy="90"
            rx="38"
            ry="6"
            fill="url(#hairHighlight)"
            opacity="0.6"
            transform="rotate(-5 160 90)"
          />

          {/* Cute Ahoge (hair strand antenna on top) */}
          <path
            d="M 160 60 Q 155 25 175 18 Q 185 15 175 32 Q 165 45 160 60"
            fill="url(#hairMain)"
            stroke="#581c87"
            strokeWidth="1.5"
            className={state === 'thinking' ? 'animate-wiggle' : ''}
          />
        </svg>
      </div>
      )}

      {/* Floating Chat Toggle Icon */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleChat();
        }}
        className="absolute bottom-2 right-4 bg-purple-600 hover:bg-purple-500 active:scale-95 text-white p-2 rounded-full shadow-lg border border-purple-400 transition-all flex items-center justify-center cursor-pointer z-30"
        title={isChatOpen ? 'Ocultar Diálogo' : 'Mostrar Diálogo'}
      >
        <span className="text-xs">{isChatOpen ? '✕' : '💬'}</span>
      </button>
    </div>
  );
};
