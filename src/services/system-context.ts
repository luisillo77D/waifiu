import { invoke } from '@tauri-apps/api/core';

export interface ActiveWindowInfo {
  class: string;
  title: string;
  initial_title?: string;
}

export async function getActiveWindow(): Promise<ActiveWindowInfo | null> {
  try {
    const info = await invoke<ActiveWindowInfo | null>('get_active_window');
    if (!info || !info.class) return null;
    return info;
  } catch (err) {
    console.debug('[SystemContext] Unable to get active window (browser fallback or error):', err);
    return null;
  }
}

export function describeWindowActivity(info: ActiveWindowInfo): string {
  const cls = info.class.toLowerCase();
  const title = info.title.toLowerCase();

  if (cls.includes('code') || cls.includes('nvim') || cls.includes('neovim') || cls.includes('helix') || cls.includes('vim')) {
    return `programando en el editor de código (${info.title || 'editor'})`;
  }
  if (cls.includes('ghostty') || cls.includes('kitty') || cls.includes('alacritty') || cls.includes('foot') || cls.includes('terminal')) {
    return `usando la terminal (${info.title || 'consola'})`;
  }
  if (cls.includes('firefox') || cls.includes('chrome') || cls.includes('brave') || cls.includes('zen') || cls.includes('edge')) {
    if (title.includes('youtube')) return `mirando videos en YouTube (${info.title})`;
    if (title.includes('github')) return `revisando GitHub (${info.title})`;
    if (title.includes('reddit')) return `leyendo Reddit`;
    return `navegando por la web (${info.title || 'navegador'})`;
  }
  if (cls.includes('spotify') || title.includes('spotify') || cls.includes('music')) {
    return `escuchando música (${info.title})`;
  }
  if (cls.includes('discord') || cls.includes('telegram') || cls.includes('slack')) {
    return `comunicándose en ${info.initial_title || info.class}`;
  }

  return `usando ${info.initial_title || info.class}${info.title ? ` - "${info.title}"` : ''}`;
}
