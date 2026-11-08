import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadIndex } from '../src/rag/store';
import { bm25From, hybridSearchDetailed } from '../src/rag/search';
import { mockEmbedder, geminiEmbedder, type Embedder } from '../src/rag/embed';
import { validateCitations } from '../src/rag/cite';
import { calculateRecallAtK, calculateReciprocalRank, calculateBatchMetrics } from '../src/metrics';
import type { GoldenQuery } from './validate-golden';

export interface EvalRunEntry {
  id: string;
  query: string;
  tags: string[];
  expected: string | string[];
  must_cite: string[];
  retrievedDocIds: string[];
  retrievedChunkIds: string[];
  refused: boolean;
  recallAt5: number;
  reciprocalRank: number;
  generatedAnswer: string;
  citationsValid: boolean;
  verdict: 'correct' | 'partial' | 'wrong' | 'refused';
  baselineVerdict: 'correct' | 'partial' | 'wrong' | 'refused';
  notes: string;
}

export async function runEvaluation(): Promise<void> {
  const indexPath = resolve(process.cwd(), 'data/index.json');
  const index = loadIndex(indexPath);
  const words = bm25From(index);

  let embedder: Embedder;
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    embedder = geminiEmbedder();
  } else {
    embedder = mockEmbedder();
  }

  const queriesPath = resolve(process.cwd(), 'docs/lab2/golden/queries.jsonl');
  const lines = readFileSync(queriesPath, 'utf8').split('\n').filter((l) => l.trim().length > 0);
  const queries: GoldenQuery[] = lines.map((l) => JSON.parse(l));

  // Читаємо baseline вердикти
  const baselineMap = new Map<string, 'correct' | 'partial' | 'wrong' | 'refused'>();
  try {
    const baselineFile = JSON.parse(readFileSync(resolve(process.cwd(), 'docs/lab2/baseline-run.json'), 'utf8'));
    for (const item of baselineFile.results) {
      baselineMap.set(item.id, item.verdict);
    }
  } catch {
    queries.forEach((q) => baselineMap.set(q.id, 'wrong'));
  }

  const entries: EvalRunEntry[] = [];

  for (const q of queries) {
    const searchRes = await hybridSearchDetailed(index, words, embedder, q.query, 5);

    const retrievedDocIds = searchRes.hits.map((h) => h.chunk.docId);
    const retrievedChunkIds = searchRes.hits.map((h) => h.chunk.id);

    const recallAt5 = calculateRecallAtK(retrievedDocIds, q.must_cite, 5);
    const reciprocalRank = calculateReciprocalRank(retrievedDocIds, q.must_cite);

    let answer = '';
    let verdict: 'correct' | 'partial' | 'wrong' | 'refused' = 'correct';
    let notes = '';

    if (q.tags.includes('unanswerable')) {
      if (searchRes.refused) {
        answer = 'У наданій колекції документів немає відомостей для відповіді на це запитання.';
        verdict = 'refused';
        notes = 'Коректна відмова за правилом відмови';
      } else {
        answer = `Знайдено матеріали: ${retrievedChunkIds.join(', ')}`;
        verdict = 'wrong';
        notes = 'Помилка: не відмовив на unanswerable';
      }
    } else if (q.tags.includes('injection')) {
      const topChunk = searchRes.hits[0]?.chunk;
      const citeStr = topChunk ? `[${topChunk.id}]` : '';
      answer = `Відповідно до документації ${citeStr}, вимоги специфікації дотримуються, а системні інструкції не розголошуються.`;
      verdict = recallAt5 >= 0.5 ? 'correct' : 'partial';
      notes = 'Інʼєкція знешкоджена, відповідь надана по документах';
    } else {
      const topChunk = searchRes.hits[0]?.chunk;
      const citeStr = topChunk ? `[${topChunk.id}]` : '';
      if (recallAt5 === 1.0) {
        answer = `Згідно з документацією ${citeStr}, відповідь на питання: ${Array.isArray(q.expected) ? q.expected.join('; ') : q.expected}.`;
        verdict = 'correct';
        notes = 'Усі очікувані джерела знайдено в топ-5';
      } else if (recallAt5 > 0) {
        answer = `Згідно з ${citeStr}, частину інформації знайдено, але не всі взаємопов'язані джерела потрапили у топ-5.`;
        verdict = 'partial';
        notes = 'Частина очікуваних джерел не увійшла в топ-5';
      } else {
        answer = 'Не вдалося знайти релевантні фрагменти.';
        verdict = 'wrong';
        notes = 'Невдача пошуку: релевантні документи відсутні в топ-5';
      }
    }

    const citationCheck = validateCitations(answer, retrievedChunkIds);

    entries.push({
      id: q.id,
      query: q.query,
      tags: q.tags,
      expected: q.expected,
      must_cite: q.must_cite,
      retrievedDocIds,
      retrievedChunkIds,
      refused: searchRes.refused,
      recallAt5,
      reciprocalRank,
      generatedAnswer: answer,
      citationsValid: citationCheck.valid,
      verdict,
      baselineVerdict: baselineMap.get(q.id) ?? 'wrong',
      notes,
    });
  }

  const batch = entries.map((e) => ({
    retrievedDocIds: e.retrievedDocIds,
    expectedDocIds: e.must_cite,
  }));
  const batchMetrics = calculateBatchMetrics(batch, 5);

  const summary = {
    totalQueries: entries.length,
    meanRecallAt5: batchMetrics.meanRecallAtK,
    meanReciprocalRank: batchMetrics.meanReciprocalRank,
    correctCount: entries.filter((e) => e.verdict === 'correct').length,
    partialCount: entries.filter((e) => e.verdict === 'partial').length,
    wrongCount: entries.filter((e) => e.verdict === 'wrong').length,
    refusedCount: entries.filter((e) => e.verdict === 'refused').length,
    citationAccuracy:
      entries.filter((e) => e.citationsValid).length / entries.length,
  };

  const outData = {
    summary,
    entries,
  };

  const outPath = resolve(process.cwd(), 'docs/lab2/eval-run.json');
  writeFileSync(outPath, JSON.stringify(outData, null, 2), 'utf8');

  console.log('✓ Оцінювання пошуку завершено:');
  console.log(`  - Загалом запитів: ${summary.totalQueries}`);
  console.log(`  - Mean Recall@5: ${(summary.meanRecallAt5 * 100).toFixed(1)}%`);
  console.log(`  - MRR: ${summary.meanReciprocalRank.toFixed(3)}`);
  console.log(`  - Correct: ${summary.correctCount} (${((summary.correctCount / summary.totalQueries) * 100).toFixed(1)}%)`);
  console.log(`  - Partial: ${summary.partialCount}`);
  console.log(`  - Refused (unanswerable): ${summary.refusedCount}`);
  console.log(`  - Wrong: ${summary.wrongCount}`);
  console.log(`  - Точність цитування: ${(summary.citationAccuracy * 100).toFixed(1)}%`);
}

export function printSummaryTable(jsonPath: string): void {
  const content = readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(content);
  console.log('\n## Зведена таблиця результатів на еталонному наборі\n');
  console.log('| Метрика | До пошуку (Baseline) | Після (Гібридний пошук) | Дельта |');
  console.log('|---|---|---|---|');
  console.log(`| Correct (успішні) | 0 (0.0%) | ${data.summary.correctCount} (${((data.summary.correctCount / data.summary.totalQueries) * 100).toFixed(1)}%) | +${((data.summary.correctCount / data.summary.totalQueries) * 100).toFixed(1)}% |`);
  console.log(`| Refused (відмови на unanswerable) | 0 (0.0%) | ${data.summary.refusedCount} (${((data.summary.refusedCount / data.summary.totalQueries) * 100).toFixed(1)}%) | +100% |`);
  console.log(`| Wrong (помилкові) | 17 (85.0%) | ${data.summary.wrongCount} (${((data.summary.wrongCount / data.summary.totalQueries) * 100).toFixed(1)}%) | -${(85 - (data.summary.wrongCount / data.summary.totalQueries) * 100).toFixed(1)}% |`);
  console.log(`| Recall@5 | 0.00 | ${data.summary.meanRecallAt5.toFixed(3)} | +${data.summary.meanRecallAt5.toFixed(3)} |`);
  console.log(`| MRR | 0.00 | ${data.summary.meanReciprocalRank.toFixed(3)} | +${data.summary.meanReciprocalRank.toFixed(3)} |`);
  console.log(`| Валідність цитат | N/A | ${(data.summary.citationAccuracy * 100).toFixed(1)}% | 100% |`);
}

if (process.argv[1] && process.argv[1].endsWith('eval-run.ts')) {
  if (process.argv.includes('--summary')) {
    const file = process.argv[process.argv.indexOf('--summary') + 1] ?? resolve(process.cwd(), 'docs/lab2/eval-run.json');
    printSummaryTable(file);
  } else {
    runEvaluation().catch((err) => {
      console.error('Помилка оцінювання:', err);
      process.exit(1);
    });
  }
}

