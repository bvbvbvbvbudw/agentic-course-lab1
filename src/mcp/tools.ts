import { z } from 'zod';
import type { Embedder } from '../rag/embed';
import type { Bm25Index } from '../rag/bm25';
import type { IndexFile } from '../rag/store';
import { hybridSearch } from '../rag/search';
import { toCitation, renderCitation } from '../rag/cite';

export const LIMITS = {
  queryChars: 500,
  topKMax: 10,
  chunkChars: 1200,
  timeoutMs: 10_000,
} as const;

export const CHUNK_ID = /^[a-z0-9][a-z0-9-]{0,63}#\d{4}$/;

export const searchInput = z
  .object({
    query: z.string().min(1).max(LIMITS.queryChars),
    topK: z.number().int().min(1).max(LIMITS.topKMax).default(5),
  })
  .strict();

export const fetchInput = z
  .object({
    id: z.string().regex(CHUNK_ID),
  })
  .strict();

export interface Deps {
  readonly index: IndexFile;
  readonly words: Bm25Index;
  readonly embedder: Embedder;
}

export class Refusal extends Error {}

export async function withTimeout<T>(p: Promise<T>, ms = LIMITS.timeoutMs): Promise<T> {
  let t: NodeJS.Timeout;
  const guard = new Promise<never>((_, reject) => {
    t = setTimeout(() => reject(new Refusal(`перевищено таймаут ${ms} мс`)), ms);
  });
  try {
    return await Promise.race([p, guard]);
  } finally {
    clearTimeout(t!);
  }
}

const clip = (s: string): string =>
  s.length <= LIMITS.chunkChars ? s : `${s.slice(0, LIMITS.chunkChars)}…`;

export async function searchCorpus(deps: Deps, raw: unknown): Promise<string[]> {
  const { query, topK } = searchInput.parse(raw);
  const hits = await withTimeout(hybridSearch(deps.index, deps.words, deps.embedder, query, topK));
  if (hits.length === 0) return ['нічого не знайдено за цим запитом'];
  return hits.map((h) => {
    const c = toCitation(h.chunk, clip(h.chunk.text));
    return `${renderCitation(c)}\ncosine=${h.cosine.toFixed(4)} rrf=${h.rrf.toFixed(5)}\n${clip(h.chunk.text)}`;
  });
}

export function fetchChunk(deps: Deps, raw: unknown): string {
  const { id } = fetchInput.parse(raw);
  // Allowlist перевірка прямо в індексі
  const chunk = deps.index.chunks.find((c) => c.id === id);
  if (!chunk) {
    throw new Refusal(`фрагмента ${id} немає в індексі`);
  }
  const c = toCitation(chunk, clip(chunk.text));
  return `${renderCitation(c)}\n${clip(chunk.text)}`;
}

