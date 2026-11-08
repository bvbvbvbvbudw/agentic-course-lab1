import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadIndex } from '../src/rag/store';
import { bm25From, hybridSearchDetailed } from '../src/rag/search';
import { mockEmbedder } from '../src/rag/embed';
import type { GoldenQuery } from './validate-golden';

export interface ParallelRunStats {
  width: number;
  totalTasks: number;
  wallMs: number;
  sumBranchMs: number;
  concurrencySpeedup: number;
  totalTokensEstimated: number;
  costUsdEstimated: number;
}

export async function runWorkerPool(
  queries: GoldenQuery[],
  width: number,
): Promise<ParallelRunStats> {
  const indexPath = resolve(process.cwd(), 'data/index.json');
  const index = loadIndex(indexPath);
  const words = bm25From(index);
  const embedder = mockEmbedder();

  const startWall = Date.now();
  let sumBranchMs = 0;
  let totalTokens = 0;

  // Черга з обмеженням пулу конкурентності (width)
  const queue = [...queries];
  const workers: Promise<void>[] = [];

  async function worker() {
    while (queue.length > 0) {
      const q = queue.shift();
      if (!q) break;

      const t0 = Date.now();
      // Імітація обчислювального блоку пошуку та генерації
      await hybridSearchDetailed(index, words, embedder, q.query, 5);
      // Розрахунок орієнтовних токенів (промпт + контекст + вивід)
      const queryTokens = Math.ceil(q.query.length / 4);
      const contextTokens = 5 * 200; // 5 чанків по ~200 токенів
      const completionTokens = 120;
      totalTokens += queryTokens + contextTokens + completionTokens;

      const elapsed = Date.now() - t0;
      sumBranchMs += elapsed;
    }
  }

  for (let i = 0; i < width; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  const wallMs = Math.max(Date.now() - startWall, 1);
  const concurrencySpeedup = sumBranchMs > 0 ? Number((sumBranchMs / wallMs).toFixed(2)) : 1;

  // Оцінка вартості за тарифами Gemini 2.5 Flash ($0.10/1M вхід, $0.40/1M вихід)
  const costUsd = Number(((totalTokens / 1_000_000) * 0.15).toFixed(6));

  return {
    width,
    totalTasks: queries.length,
    wallMs,
    sumBranchMs,
    concurrencySpeedup,
    totalTokensEstimated: totalTokens,
    costUsdEstimated: costUsd,
  };
}

export async function runParallelBenchmark(): Promise<void> {
  const queriesPath = resolve(process.cwd(), 'docs/lab2/golden/queries.jsonl');
  const lines = readFileSync(queriesPath, 'utf8').split('\n').filter((l) => l.trim().length > 0);
  const queries: GoldenQuery[] = lines.map((l) => JSON.parse(l));

  console.log('1. Запуск послідовного прогону (width = 1)...');
  const seqStats = await runWorkerPool(queries, 1);

  console.log('2. Запуск паралельного пулу (width = 2)...');
  const par2Stats = await runWorkerPool(queries, 2);

  console.log('3. Запуск паралельного пулу (width = 4)...');
  const par4Stats = await runWorkerPool(queries, 4);

  const output = {
    timestamp: new Date().toISOString(),
    runs: [seqStats, par2Stats, par4Stats],
  };

  const outPath = resolve(process.cwd(), 'docs/lab2/parallel-run.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');

  console.log('\n--- Результати порівняння паралельності ---');
  console.table(
    output.runs.map((r) => ({
      Ширина: r.width,
      'Час стіни (wallMs)': `${r.wallMs} ms`,
      'Сума гілок (sumMs)': `${r.sumBranchMs} ms`,
      Прискорення: `${r.concurrencySpeedup}x`,
      Токени: r.totalTokensEstimated,
      'Вартість ($)': `$${r.costUsdEstimated}`,
    })),
  );
}

if (process.argv[1] && process.argv[1].endsWith('parallel-eval.ts')) {
  runParallelBenchmark().catch((err) => {
    console.error('Помилка паралельного тесту:', err);
    process.exit(1);
  });
}

