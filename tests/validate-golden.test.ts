import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { validateGoldenFile, validateGoldenLines } from '../scripts/validate-golden';

describe('validate-golden validator', () => {
  it('validates the production golden queries file without errors', () => {
    const filePath = resolve(process.cwd(), 'docs/lab2/golden/queries.jsonl');
    const report = validateGoldenFile(filePath);

    expect(report.errors).toEqual([]);
    expect(report.total).toBeGreaterThanOrEqual(20);
    expect(report.unanswerableCount).toBeGreaterThanOrEqual(3);
    expect(report.injectionCount).toBeGreaterThanOrEqual(2);
  });

  it('detects duplicate ids', () => {
    const raw = [
      JSON.stringify({
        id: 'q-01',
        query: 'Query 1 text here is long enough',
        expected: 'Expected 1',
        must_cite: ['doc-01'],
        tags: ['easy'],
      }),
      JSON.stringify({
        id: 'q-01',
        query: 'Query 2 text here is long enough',
        expected: 'Expected 2',
        must_cite: ['doc-01'],
        tags: ['easy'],
      }),
    ];
    const report = validateGoldenLines(raw);
    expect(report.errors.some((e) => e.includes('Duplicate ID: q-01'))).toBe(true);
  });

  it('rejects unanswerable query with non-empty must_cite', () => {
    const raw = [
      JSON.stringify({
        id: 'q-99',
        query: 'Query text here is long enough for schema',
        expected: 'Expected refusal here',
        must_cite: ['doc-01'],
        tags: ['unanswerable'],
      }),
    ];
    const report = validateGoldenLines(raw);
    expect(report.errors.some((e) => e.includes('unanswerable query must have empty must_cite'))).toBe(true);
  });
});

