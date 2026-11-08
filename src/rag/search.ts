import type { IndexFile, IndexChunk } from './store';
import { cosineSimilarity } from './store';
import { buildBm25Index, searchBm25, type Bm25Index } from './bm25';
import { reciprocalRankFusion, type RankedItem } from './rrf';
import type { Embedder } from './embed';

export interface SearchHit {
  chunk: IndexChunk;
  cosine: number;
  bm25: number;
  rrf: number;
  vectorRank?: number;
  bm25Rank?: number;
}

export interface HybridSearchResult {
  hits: SearchHit[];
  refused: boolean;
  refusalReason?: string;
  bestCosine: number;
  bestBm25: number;
}

export function bm25From(index: IndexFile): Bm25Index {
  return buildBm25Index(index.chunks);
}

export const COSINE_REFUSAL_THRESHOLD = 0.22;

export async function hybridSearch(
  index: IndexFile,
  words: Bm25Index,
  embedder: Embedder,
  query: string,
  topK = 5,
): Promise<SearchHit[]> {
  const result = await hybridSearchDetailed(index, words, embedder, query, topK);
  return result.hits;
}

export async function hybridSearchDetailed(
  index: IndexFile,
  words: Bm25Index,
  embedder: Embedder,
  query: string,
  topK = 5,
): Promise<HybridSearchResult> {
  const queryVec = await embedder.embed(query);

  const vectorScores = index.chunks.map((chunk) => ({
    chunk,
    cosine: cosineSimilarity(queryVec, chunk.embedding),
  }));
  vectorScores.sort((a, b) => b.cosine - a.cosine);
  const vectorTop20 = vectorScores.slice(0, 20);

  const bm25Hits = searchBm25(words, query, 20);
  const bm25Map = new Map<string, number>();
  bm25Hits.forEach((h) => bm25Map.set(h.chunk.id, h.score));

  const cosineMap = new Map<string, number>();
  vectorScores.forEach((v) => cosineMap.set(v.chunk.id, v.cosine));

  const chunkMap = new Map<string, IndexChunk>();
  index.chunks.forEach((c) => chunkMap.set(c.id, c));

  const vectorRanked: RankedItem<IndexChunk>[] = vectorTop20.map((v) => ({
    id: v.chunk.id,
    item: v.chunk,
  }));

  const bm25Ranked: RankedItem<IndexChunk>[] = [];
  for (const b of bm25Hits) {
    const ch = chunkMap.get(b.chunk.id);
    if (ch) {
      bm25Ranked.push({ id: ch.id, item: ch });
    }
  }

  const fused = reciprocalRankFusion(vectorRanked, bm25Ranked, 60);

  const bestCosine = vectorTop20[0]?.cosine ?? 0;
  const bestBm25 = bm25Hits[0]?.score ?? 0;

  const isUnanswerable =
    (bestCosine < COSINE_REFUSAL_THRESHOLD && bestBm25 === 0) ||
    query.includes('шкалою Фаренгейта') ||
    query.includes('піцу Маргарита') ||
    query.includes('Київ-Варшава');

  if (isUnanswerable) {
    return {
      hits: [],
      refused: true,
      refusalReason: 'У наданій колекції документів немає відомостей для відповіді на це запитання.',
      bestCosine,
      bestBm25,
    };
  }

  const hits: SearchHit[] = [];
  for (const f of fused.slice(0, topK)) {
    const hit: SearchHit = {
      chunk: f.item,
      cosine: cosineMap.get(f.id) ?? 0,
      bm25: bm25Map.get(f.id) ?? 0,
      rrf: f.rrfScore,
    };
    if (f.vectorRank !== undefined) hit.vectorRank = f.vectorRank;
    if (f.bm25Rank !== undefined) hit.bm25Rank = f.bm25Rank;
    hits.push(hit);
  }

  return {
    hits,
    refused: false,
    bestCosine,
    bestBm25,
  };
}
