import { describe, it, expect } from 'vitest';
import {
  calculateRecallAtK,
  calculateReciprocalRank,
  calculateBatchMetrics,
} from '../src/metrics';

describe('Search Metrics (offline)', () => {
  it('calculates Recall@K correctly', () => {
    const retrieved = ['doc-01', 'doc-02', 'doc-03', 'doc-04', 'doc-05'];
    const expected = ['doc-02', 'doc-05'];

    // Обидва є в топ-5
    expect(calculateRecallAtK(retrieved, expected, 5)).toBe(1.0);
    // Лише doc-02 є в топ-2
    expect(calculateRecallAtK(retrieved, expected, 2)).toBe(0.5);
    // Жодного немає в топ-1 (там doc-01)
    expect(calculateRecallAtK(retrieved, ['doc-09'], 5)).toBe(0.0);
  });

  it('calculates Reciprocal Rank (RR) accurately', () => {
    expect(calculateReciprocalRank(['doc-01', 'doc-02'], ['doc-01'])).toBe(1.0);
    expect(calculateReciprocalRank(['doc-01', 'doc-02'], ['doc-02'])).toBe(0.5);
    expect(calculateReciprocalRank(['doc-01', 'doc-02', 'doc-03'], ['doc-03'])).toBeCloseTo(0.3333, 4);
    expect(calculateReciprocalRank(['doc-01'], ['doc-99'])).toBe(0.0);
  });

  it('handles empty expected set for unanswerable queries', () => {
    expect(calculateRecallAtK([], [], 5)).toBe(1.0);
    expect(calculateRecallAtK(['doc-01'], [], 5)).toBe(0.0);
    expect(calculateReciprocalRank([], [])).toBe(1.0);
  });

  it('calculates batch MRR and mean Recall@k', () => {
    const batch = [
      { retrievedDocIds: ['doc-01', 'doc-02'], expectedDocIds: ['doc-01'] }, // R=1, RR=1
      { retrievedDocIds: ['doc-02', 'doc-01'], expectedDocIds: ['doc-01'] }, // R=1, RR=0.5
    ];
    const metrics = calculateBatchMetrics(batch, 2);
    expect(metrics.meanRecallAtK).toBe(1.0);
    expect(metrics.meanReciprocalRank).toBe(0.75);
    expect(metrics.totalQueries).toBe(2);
  });
});

