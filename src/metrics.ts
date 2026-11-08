/**
 * Метрики інформаційного пошуку (крок 06).
 * Чиста арифметика над ідентифікаторами документів. Без мережі, без ключів.
 */

export interface QueryMetricInput {
  retrievedDocIds: string[]; // id знайдених документів (doc-XX) у порядку ранжування
  expectedDocIds: string[];  // id обов'язкових документів з must_cite
}

/**
 * Recall@k: частка очікуваних документів, які опинилися в топ-k видачі.
 * Якщо expectedDocIds порожній (наприклад, для unanswerable), recall = 1.0, якщо видача порожня, інакше 0.
 */
export function calculateRecallAtK(
  retrievedDocIds: string[],
  expectedDocIds: string[],
  k: number,
): number {
  if (expectedDocIds.length === 0) {
    return retrievedDocIds.length === 0 ? 1.0 : 0.0;
  }

  const topK = new Set(retrievedDocIds.slice(0, k));
  let matched = 0;
  for (const expected of expectedDocIds) {
    if (topK.has(expected)) {
      matched++;
    }
  }
  return matched / expectedDocIds.length;
}

/**
 * Reciprocal Rank (RR): обернений ранг першого знайденого релевантного документа.
 * 1 / rank, де rank - 1-based позиція. Якщо жоден не знайдений, RR = 0.
 */
export function calculateReciprocalRank(
  retrievedDocIds: string[],
  expectedDocIds: string[],
): number {
  if (expectedDocIds.length === 0) {
    return retrievedDocIds.length === 0 ? 1.0 : 0.0;
  }

  const expectedSet = new Set(expectedDocIds);
  for (let i = 0; i < retrievedDocIds.length; i++) {
    const docId = retrievedDocIds[i];
    if (docId !== undefined && expectedSet.has(docId)) {
      return 1 / (i + 1);
    }
  }
  return 0.0;
}

export interface BatchMetricsResult {
  meanRecallAtK: number;
  meanReciprocalRank: number;
  totalQueries: number;
}

export function calculateBatchMetrics(
  items: QueryMetricInput[],
  k = 5,
): BatchMetricsResult {
  if (items.length === 0) {
    return { meanRecallAtK: 0, meanReciprocalRank: 0, totalQueries: 0 };
  }

  let totalRecall = 0;
  let totalRr = 0;

  for (const item of items) {
    totalRecall += calculateRecallAtK(item.retrievedDocIds, item.expectedDocIds, k);
    totalRr += calculateReciprocalRank(item.retrievedDocIds, item.expectedDocIds);
  }

  return {
    meanRecallAtK: totalRecall / items.length,
    meanReciprocalRank: totalRr / items.length,
    totalQueries: items.length,
  };
}
