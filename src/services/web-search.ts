import { invoke } from '@tauri-apps/api/core';

export async function searchWeb(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const snippets = await invoke<string[]>('search_duckduckgo', { query: trimmed });
    return Array.isArray(snippets) ? snippets : [];
  } catch (err) {
    console.warn('[WebSearch] DuckDuckGo search failed or offline:', err);
    return [];
  }
}

export function formatWebSearchContext(snippets: string[]): string {
  if (!snippets || snippets.length === 0) return '';
  return `\n\n[Información web reciente obtenida en vivo (DuckDuckGo)]:\n${snippets
    .map((s, i) => `${i + 1}. ${s}`)
    .join('\n')}\n(Utilizá estos datos para responder con precisión si la consulta del usuario lo requiere).`;
}
