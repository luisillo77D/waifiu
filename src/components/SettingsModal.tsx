import React, { useState } from 'react';
import { AppSettings, ProviderType } from '../types';
import { ALL_AVAILABLE_PROVIDERS } from '../services/storage';
import { LLMRouter } from '../services/llm-router';
import {
  X,
  Key,
  Cpu,
  Sparkles,
  Check,
  ArrowDown,
  ArrowUp,
  Loader2,
  CheckCircle2,
  XCircle,
  Globe,
  Image as ImageIcon,
  RotateCcw,
  Upload,
  Trash2,
} from 'lucide-react';

interface SettingsModalProps {
  settings: AppSettings;
  onSave: (updated: AppSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onSave, onClose }) => {
  const [current, setCurrent] = useState<AppSettings>(() => {
    const chain = [...(settings.fallbackChain || [])];
    for (const p of ALL_AVAILABLE_PROVIDERS) {
      if (!chain.includes(p)) {
        chain.push(p);
      }
    }
    return {
      ...settings,
      fallbackChain: chain.filter((p) => ALL_AVAILABLE_PROVIDERS.includes(p)),
    };
  });
  const [activeTab, setActiveTab] = useState<'providers' | 'fallback' | 'persona' | 'avatar'>('providers');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testingProvider, setTestingProvider] = useState<ProviderType | null>(null);
  const [testResults, setTestResults] = useState<Partial<Record<ProviderType, { ok: boolean; message: string; status?: number }>>>({});

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'customAvatarIdle' | 'customAvatarDragging' | 'customAvatarThinking'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2.5 * 1024 * 1024) {
      alert('La imagen seleccionada supera los 2.5 MB. Te recomendamos usar imágenes más ligeras para optimizar memoria.');
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCurrent((prev) => ({ ...prev, [field]: reader.result }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleClearImage = (field: 'customAvatarIdle' | 'customAvatarDragging' | 'customAvatarThinking') => {
    setCurrent((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleResetAvatars = () => {
    setCurrent((prev) => ({
      ...prev,
      customAvatarIdle: undefined,
      customAvatarDragging: undefined,
      customAvatarThinking: undefined,
      enableLipFlap: true,
    }));
  };

  const handleTestProvider = async (provider: ProviderType) => {
    setTestingProvider(provider);
    try {
      const res = await LLMRouter.testProvider(provider, current);
      setTestResults((prev) => ({ ...prev, [provider]: res }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [provider]: { ok: false, message: err?.message || String(err) },
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  const renderTestButtonAndResult = (provider: ProviderType) => {
    const isTesting = testingProvider === provider;
    const result = testResults[provider];

    return (
      <div className="pt-2 border-t border-slate-800/80 mt-2 space-y-1.5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleTestProvider(provider)}
            disabled={isTesting}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 hover:text-white rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                <span>Probando conexión...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>Probar conexión</span>
              </>
            )}
          </button>
        </div>

        {result && (
          <div
            className={`p-2 rounded-lg text-[11px] flex items-start gap-2 border selectable-text ${
              result.ok
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}
          >
            {result.ok ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <span className="leading-tight break-words flex-1">{result.message}</span>
          </div>
        )}
      </div>
    );
  };

  const handleSave = () => {
    onSave(current);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const moveFallback = (index: number, direction: 'up' | 'down') => {
    const list = [...current.fallbackChain];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= list.length) return;
    const temp = list[index];
    list[index] = list[target];
    list[target] = temp;
    setCurrent({ ...current, fallbackChain: list });
  };

  const providerNames: Record<ProviderType, { label: string; desc: string }> = {
    gemini: { label: 'Google Gemini', desc: 'Tier 1 recomendado (Rápido y económico)' },
    baseten: { label: 'Baseten', desc: 'Modelo dedicado / compatible con OpenAI' },
    openai: { label: 'OpenAI GPT', desc: 'Tier 2 (GPT-4o / GPT-4o-mini)' },
    claude: { label: 'Anthropic Claude', desc: 'Tier 2 (Claude 3.5 Sonnet)' },
    ollama: { label: 'Ollama Local', desc: 'Tier 3 (Offline / Respaldo local)' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="w-[410px] max-h-[580px] bg-slate-950 border border-purple-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-purple-500/20">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h3 className="font-semibold text-sm text-purple-200">Configuración de Waifiu</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-purple-500/20 bg-slate-900/40 px-2 pt-2 gap-1 text-xs">
          <button
            onClick={() => setActiveTab('providers')}
            className={`px-3 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'providers'
                ? 'bg-slate-950 text-purple-300 border-t border-x border-purple-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            API Keys
          </button>
          <button
            onClick={() => setActiveTab('fallback')}
            className={`px-3 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'fallback'
                ? 'bg-slate-950 text-purple-300 border-t border-x border-purple-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Fallback Chain
          </button>
          <button
            onClick={() => setActiveTab('persona')}
            className={`px-3 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'persona'
                ? 'bg-slate-950 text-purple-300 border-t border-x border-purple-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Personalidad
          </button>
          <button
            onClick={() => setActiveTab('avatar')}
            className={`px-3 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'avatar'
                ? 'bg-slate-950 text-purple-300 border-t border-x border-purple-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Avatar
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {activeTab === 'providers' && (
            <div className="space-y-3.5">
              {/* Google Gemini */}
              <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-purple-300">Google Gemini</span>
                  <span className="text-[10px] text-emerald-400">Recomendado</span>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">API Key</label>
                  <input
                    type="password"
                    value={current.geminiApiKey}
                    onChange={(e) => setCurrent({ ...current, geminiApiKey: e.target.value })}
                    placeholder="AIzaSy..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-purple-400 selectable-text"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">
                    Modelos (orden de prioridad separados por coma)
                  </label>
                  <input
                    type="text"
                    value={current.geminiModel}
                    onChange={(e) => setCurrent({ ...current, geminiModel: e.target.value })}
                    placeholder="gemini-3.1-flash-lite, gemini-3.8-flash"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 outline-none selectable-text"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Reintento automático: si el primero da error o timeout (&gt;6s), intenta con el siguiente.
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60 mt-1">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <div>
                      <span className="text-[11px] font-medium text-slate-200 block leading-tight">Búsqueda web en vivo</span>
                      <span className="text-[9px] text-slate-500 block leading-tight">DuckDuckGo RAG para datos recientes (100% Gratis)</span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={current.webSearch === true}
                      onChange={(e) => setCurrent({ ...current, webSearch: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-3 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>
                {renderTestButtonAndResult('gemini')}
              </div>

              {/* Baseten */}
              <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-purple-300">Baseten</span>
                  <span className="text-[10px] text-indigo-400">Custom Deploy</span>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">API Key</label>
                  <input
                    type="password"
                    value={current.basetenApiKey}
                    onChange={(e) => setCurrent({ ...current, basetenApiKey: e.target.value })}
                    placeholder="Baseten API Key..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-purple-400 selectable-text"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Model ID (ej: qv0467w o nombre de deploy)</label>
                  <input
                    type="text"
                    value={current.basetenModelId}
                    onChange={(e) => setCurrent({ ...current, basetenModelId: e.target.value })}
                    placeholder="Model ID..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 outline-none selectable-text"
                  />
                </div>
                {renderTestButtonAndResult('baseten')}
              </div>

              {/* OpenAI */}
              <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 space-y-2">
                <span className="font-semibold text-purple-300">OpenAI</span>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">API Key</label>
                  <input
                    type="password"
                    value={current.openaiApiKey}
                    onChange={(e) => setCurrent({ ...current, openaiApiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-purple-400 selectable-text"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Modelo</label>
                  <input
                    type="text"
                    value={current.openaiModel}
                    onChange={(e) => setCurrent({ ...current, openaiModel: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 outline-none selectable-text"
                  />
                </div>
                {renderTestButtonAndResult('openai')}
              </div>

              {/* Anthropic Claude */}
              <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 space-y-2">
                <span className="font-semibold text-purple-300">Anthropic Claude</span>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">API Key</label>
                  <input
                    type="password"
                    value={current.claudeApiKey}
                    onChange={(e) => setCurrent({ ...current, claudeApiKey: e.target.value })}
                    placeholder="sk-ant-..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-purple-400 selectable-text"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Modelo</label>
                  <input
                    type="text"
                    value={current.claudeModel}
                    onChange={(e) => setCurrent({ ...current, claudeModel: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 outline-none selectable-text"
                  />
                </div>
                {renderTestButtonAndResult('claude')}
              </div>

              {/* Ollama Local */}
              <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-purple-300">Ollama Local</span>
                  <span className="text-[10px] text-cyan-400">Offline / Privado</span>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Endpoint</label>
                  <input
                    type="text"
                    value={current.ollamaEndpoint}
                    onChange={(e) => setCurrent({ ...current, ollamaEndpoint: e.target.value })}
                    placeholder="http://localhost:11434"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 outline-none selectable-text"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Modelo (ej: llama3.2, phi4)</label>
                  <input
                    type="text"
                    value={current.ollamaModel}
                    onChange={(e) => setCurrent({ ...current, ollamaModel: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100 outline-none selectable-text"
                  />
                </div>
                {renderTestButtonAndResult('ollama')}
              </div>
            </div>
          )}

          {activeTab === 'fallback' && (
            <div className="space-y-3">
              <p className="text-slate-400 leading-relaxed">
                Orden de prioridad para la cadena de reintentos automáticos (fallback). Si el primer proveedor falla por rate limit, timeout (&gt;6s) o error de servidor, se intentará el siguiente:
              </p>

              <div className="space-y-2">
                {current.fallbackChain.map((p, idx) => (
                  <div
                    key={p}
                    className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-purple-900/80 text-purple-300 font-bold flex items-center justify-center text-[10px] border border-purple-700">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-medium text-slate-200">{providerNames[p]?.label}</div>
                        <div className="text-[10px] text-slate-500">{providerNames[p]?.desc}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveFallback(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 hover:bg-slate-800 disabled:opacity-20 text-slate-300 rounded cursor-pointer"
                        title="Mover arriba"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveFallback(idx, 'down')}
                        disabled={idx === current.fallbackChain.length - 1}
                        className="p-1 hover:bg-slate-800 disabled:opacity-20 text-slate-300 rounded cursor-pointer"
                        title="Mover abajo"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'persona' && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Nombre del Asistente</label>
                <input
                  type="text"
                  value={current.companionName}
                  onChange={(e) => setCurrent({ ...current, companionName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none selectable-text"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Prompt de Sistema (Comportamiento)</label>
                <textarea
                  value={current.systemPrompt}
                  onChange={(e) => setCurrent({ ...current, systemPrompt: e.target.value })}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none resize-none selectable-text leading-relaxed"
                />
              </div>

              {/* Proactive Idle Companion Chatter */}
              <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-purple-300 block">Comentarios Espontáneos</span>
                    <span className="text-[10px] text-slate-400 block">Comenta de vez en cuando sobre lo que estás haciendo en pantalla</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={current.proactiveChatter !== false}
                      onChange={(e) => setCurrent({ ...current, proactiveChatter: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-3 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-500"></div>
                  </label>
                </div>

                {current.proactiveChatter !== false && (
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Frecuencia aproximada</span>
                      <span className="text-purple-300 font-mono font-medium">Cada {current.proactiveIntervalMinutes || 8} min</span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="20"
                      step="1"
                      value={current.proactiveIntervalMinutes || 8}
                      onChange={(e) => setCurrent({ ...current, proactiveIntervalMinutes: Number(e.target.value) })}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'avatar' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl space-y-1">
                <span className="text-[11px] font-semibold text-purple-300 block">Personaliza tu Waifu / Avatar</span>
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  Sube tus propias imágenes en formato PNG o WebP con fondo transparente. Se recomienda relación de aspecto vertical (~3:4) o cuadrada.
                </p>
              </div>

              {/* State 1: Idle (Reposo) */}
              <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-purple-300 block">1. Estado Normal / Reposo</span>
                    <span className="text-[10px] text-slate-400">Postura principal en el escritorio</span>
                  </div>
                  {current.customAvatarIdle && (
                    <span className="text-[10px] text-emerald-400 font-medium">Personalizado activo</span>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <div className="w-16 h-16 rounded-lg bg-slate-950 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                    <img
                      src={current.customAvatarIdle || '/avatar.png'}
                      alt="Idle preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 rounded-lg text-xs font-medium cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir Imagen</span>
                      <input
                        type="file"
                        accept="image/png,image/webp,image/jpeg"
                        onChange={(e) => handleImageUpload(e, 'customAvatarIdle')}
                        className="hidden"
                      />
                    </label>
                    {current.customAvatarIdle && (
                      <button
                        type="button"
                        onClick={() => handleClearImage('customAvatarIdle')}
                        className="inline-flex items-center justify-center gap-1 text-[10px] text-rose-400 hover:text-rose-300 py-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Volver al sprite por defecto</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* State 2: Dragging (Arrastrada / Enojada) */}
              <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-purple-300 block">2. Al Mover / Arrastrar</span>
                    <span className="text-[10px] text-slate-400">Reacción al levantarla por la pantalla</span>
                  </div>
                  {current.customAvatarDragging && (
                    <span className="text-[10px] text-emerald-400 font-medium">Personalizado activo</span>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <div className="w-16 h-16 rounded-lg bg-slate-950 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                    <img
                      src={current.customAvatarDragging || '/avatar-dragging.png'}
                      alt="Dragging preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 rounded-lg text-xs font-medium cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir Imagen</span>
                      <input
                        type="file"
                        accept="image/png,image/webp,image/jpeg"
                        onChange={(e) => handleImageUpload(e, 'customAvatarDragging')}
                        className="hidden"
                      />
                    </label>
                    {current.customAvatarDragging && (
                      <button
                        type="button"
                        onClick={() => handleClearImage('customAvatarDragging')}
                        className="inline-flex items-center justify-center gap-1 text-[10px] text-rose-400 hover:text-rose-300 py-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Volver al sprite por defecto</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* State 3: Thinking (Pensando / Procesando) */}
              <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-purple-300 block">3. Pensando / Generando</span>
                    <span className="text-[10px] text-slate-400">Pose reflexiva mientras el modelo responde</span>
                  </div>
                  {current.customAvatarThinking && (
                    <span className="text-[10px] text-emerald-400 font-medium">Personalizado activo</span>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <div className="w-16 h-16 rounded-lg bg-slate-950 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                    <img
                      src={current.customAvatarThinking || '/avatar-thinking.png'}
                      alt="Thinking preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 rounded-lg text-xs font-medium cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir Imagen</span>
                      <input
                        type="file"
                        accept="image/png,image/webp,image/jpeg"
                        onChange={(e) => handleImageUpload(e, 'customAvatarThinking')}
                        className="hidden"
                      />
                    </label>
                    {current.customAvatarThinking && (
                      <button
                        type="button"
                        onClick={() => handleClearImage('customAvatarThinking')}
                        className="inline-flex items-center justify-center gap-1 text-[10px] text-rose-400 hover:text-rose-300 py-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Volver al sprite por defecto</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Lip Flap Toggle */}
              <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-purple-300 block">Sincronización Labial (Boca Animada)</span>
                  <span className="text-[10px] text-slate-400 block leading-tight">
                    Animación de boca al hablar (recomendado solo para Nanase)
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={current.enableLipFlap !== false}
                    onChange={(e) => setCurrent({ ...current, enableLipFlap: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-3 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
              </div>

              {/* Reset to defaults button */}
              {(current.customAvatarIdle || current.customAvatarDragging || current.customAvatarThinking) && (
                <div className="pt-1 flex justify-center">
                  <button
                    type="button"
                    onClick={handleResetAvatars}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                    <span>Restablecer todo a Nanase por defecto</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900/80 border-t border-purple-500/20 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer text-xs"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1.5 shadow-md shadow-purple-900/30"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Guardado
              </>
            ) : (
              'Guardar Cambios'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
