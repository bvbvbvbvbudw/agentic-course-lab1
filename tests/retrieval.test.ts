import { describe, it, expect } from 'vitest';
import { buildBm25Index, searchBm25 } from '../src/rag/bm25';
import { reciprocalRankFusion } from '../src/rag/rrf';
import { validateCitations, toCitation, renderCitation } from '../src/rag/cite';
import { hybridSearchDetailed } from '../src/rag/search';
import { mockEmbedder } from '../src/rag/embed';
import type { Chunk } from '../src/rag/chunk';
import type { IndexFile, IndexChunk } from '../src/rag/store';

describe('Retrieval components (offline)', () => {
  const miniChunks: Chunk[] = [
    {
      id: 'doc-01#0001',
      docId: 'doc-01',
      heading: 'Брами',
      start: 0,
      end: 50,
      text: 'Детерміновані брами: типи, лінт, тести, збірка.',
    },
    {
      id: 'doc-02#0001',
      docId: 'doc-02',
      heading: 'BM25',
      start: 0,
      end: 60,
      text: 'Константи BM25 становлять k1 = 1.2 та b = 0.75.',
    },
    {
      id: 'doc-03#0001',
      docId: 'doc-03',
      heading: 'RRF',
      start: 0,
      end: 55,
      text: 'Reciprocal Rank Fusion використовує k = 60 для злиття.',
    },
  ];

  it('calculates BM25 scores accurately', () => {
    const bm25 = buildBm25Index(miniChunks);
    const hits = searchBm25(bm25, 'константи BM25 k1 1.2');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.chunk.id).toBe('doc-02#0001');
  });

  it('performs Reciprocal Rank Fusion with exact mathematics (k=60)', () => {
    const listA = [{ id: 'doc-A', item: 'A' }, { id: 'doc-B', item: 'B' }];
    const listB = [{ id: 'doc-B', item: 'B' }, { id: 'doc-A', item: 'A' }];

    const fused = reciprocalRankFusion(listA, listB, 60);

    expect(fused.length).toBe(2);
    expect(fused[0]?.rrfScore).toBeCloseTo(0.032522, 5);
    expect(fused[1]?.rrfScore).toBeCloseTo(0.032522, 5);
  });

  it('validates citations and detects hallucinations', () => {
    const validText = 'Згідно з [doc-01#0001] брами перевіряють типи.';
    const res1 = validateCitations(validText, ['doc-01#0001']);
    expect(res1.valid).toBe(true);
    expect(res1.citedIds).toEqual(['doc-01#0001']);

    const hallucinatedText = 'Факти з [doc-99#0001] не були видані системою.';
    const res2 = validateCitations(hallucinatedText, ['doc-01#0001']);
    expect(res2.valid).toBe(false);
    expect(res2.hallucinatedIds).toContain('doc-99#0001');
  });

  it('formats citations cleanly', () => {
    const chunk0 = miniChunks[0];
    expect(chunk0).toBeDefined();
    const citation = toCitation(chunk0!);
    const rendered = renderCitation(citation);
    expect(rendered).toBe('[doc-01#0001] (doc-01 > Брами)');
  });

  it('refuses unanswerable queries in hybrid search', async () => {
    const embedder = mockEmbedder();
    const indexChunks: IndexChunk[] = await Promise.all(
      miniChunks.map(async (c) => ({
        ...c,
        embedding: await embedder.embed(c.text),
      })),
    );

    const miniIndex: IndexFile = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      dimension: 768,
      totalChunks: indexChunks.length,
      docIds: ['doc-01', 'doc-02', 'doc-03'],
      chunks: indexChunks,
    };
    const words = buildBm25Index(miniChunks);

    const result = await hybridSearchDetailed(
      miniIndex,
      words,
      embedder,
      'Як приготувати піцу Маргарита згідно з інструкціями асоціації',
      3,
    );
    expect(result.refused).toBe(true);
    expect(result.hits.length).toBe(0);
  });
});
