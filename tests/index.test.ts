import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadIndex } from '../src/rag/store';

describe('Corpus Index integrity', () => {
  it('resolves 100% of chunk texts back to source documents using start and end offsets', () => {
    const indexPath = resolve(process.cwd(), 'data/index.json');
    expect(existsSync(indexPath)).toBe(true);

    const index = loadIndex(indexPath);
    expect(index.chunks.length).toBeGreaterThan(0);

    for (const chunk of index.chunks) {
      const docPath = resolve(process.cwd(), `corpus/${chunk.docId}.md`);
      expect(existsSync(docPath), `Document file ${docPath} must exist`).toBe(true);

      const docContent = readFileSync(docPath, 'utf8');
      expect(chunk.start).toBeGreaterThanOrEqual(0);
      expect(chunk.end).toBeLessThanOrEqual(docContent.length);

      const extracted = docContent.slice(chunk.start, chunk.end);
      expect(extracted).toBe(chunk.text);
    }
  });

  it('ensures each chunk has non-empty embedding with correct dimension', () => {
    const indexPath = resolve(process.cwd(), 'data/index.json');
    const index = loadIndex(indexPath);

    for (const chunk of index.chunks) {
      expect(chunk.embedding).toBeDefined();
      expect(chunk.embedding.length).toBe(index.dimension);
    }
  });
});

