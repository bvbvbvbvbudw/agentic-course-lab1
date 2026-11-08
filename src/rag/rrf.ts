export interface RankedItem<T> {
  item: T;
  id: string;
}

export interface FusedItem<T> {
  item: T;
  id: string;
  rrfScore: number;
  vectorRank?: number;
  bm25Rank?: number;
}

export const DEFAULT_RRF_K = 60;

export function reciprocalRankFusion<T>(
  vectorList: RankedItem<T>[],
  bm25List: RankedItem<T>[],
  k = DEFAULT_RRF_K,
): FusedItem<T>[] {
  const scoreMap = new Map<
    string,
    { item: T; rrfScore: number; vectorRank?: number; bm25Rank?: number }
  >();

  vectorList.forEach((entry, idx) => {
    const rank = idx + 1;
    const contribution = 1 / (k + rank);
    const existing = scoreMap.get(entry.id);
    if (existing) {
      existing.rrfScore += contribution;
      existing.vectorRank = rank;
    } else {
      scoreMap.set(entry.id, {
        item: entry.item,
        rrfScore: contribution,
        vectorRank: rank,
      });
    }
  });

  bm25List.forEach((entry, idx) => {
    const rank = idx + 1;
    const contribution = 1 / (k + rank);
    const existing = scoreMap.get(entry.id);
    if (existing) {
      existing.rrfScore += contribution;
      existing.bm25Rank = rank;
    } else {
      scoreMap.set(entry.id, {
        item: entry.item,
        rrfScore: contribution,
        bm25Rank: rank,
      });
    }
  });

  const fused: FusedItem<T>[] = Array.from(scoreMap.entries()).map(([id, data]) => {
    const item: FusedItem<T> = {
      id,
      item: data.item,
      rrfScore: data.rrfScore,
    };
    if (data.vectorRank !== undefined) item.vectorRank = data.vectorRank;
    if (data.bm25Rank !== undefined) item.bm25Rank = data.bm25Rank;
    return item;
  });

  fused.sort((a, b) => b.rrfScore - a.rrfScore);
  return fused;
}
