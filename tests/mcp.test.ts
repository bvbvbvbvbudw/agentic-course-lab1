import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadIndex } from '../src/rag/store';
import { mockEmbedder } from '../src/rag/embed';
import { bm25From } from '../src/rag/search';
import {
  searchCorpus,
  fetchChunk,
  Refusal,
  searchInput,
  fetchInput,
  type Deps,
} from '../src/mcp/tools';

describe('MCP tools implementation (offline)', () => {
  const index = loadIndex(resolve(process.cwd(), 'data/index.json'));
  const deps: Deps = {
    index,
    words: bm25From(index),
    embedder: mockEmbedder(),
  };

  it('normal call: search_corpus and fetch_chunk execute cleanly', async () => {
    const hits = await searchCorpus(deps, { query: 'BM25 константи k1 b', topK: 3 });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]).toContain('[doc-06#');

    const firstChunk = index.chunks[0];
    expect(firstChunk).toBeDefined();
    const existingId = firstChunk!.id;
    const text = fetchChunk(deps, { id: existingId });
    expect(text).toContain(existingId);
    expect(text).toContain(firstChunk!.heading);
  });

  it('schema violation: rejects query exceeding character limits or invalid id format', () => {
    const longQuery = 'A'.repeat(501);
    expect(() => searchInput.parse({ query: longQuery })).toThrow();
    expect(() => searchInput.parse({ query: 'test', unknownField: true })).toThrow();
    expect(() => fetchInput.parse({ id: '../../etc/passwd' })).toThrow();
    expect(() => fetchInput.parse({ id: 'invalid_id_without_hash' })).toThrow();
  });

  it('refusal test: gracefully refuses nonexistent chunk ID from allowlist', () => {
    const fakeId = 'doc-99#0001';
    expect(() => fetchChunk(deps, { id: fakeId })).toThrowError(Refusal);
    expect(() => fetchChunk(deps, { id: fakeId })).toThrowError(/немає в індексі/);
  });
});
