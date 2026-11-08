import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { executeTask, type Task } from '../harness/run-task';

export interface EvalAttemptRecord {
  taskId: string;
  attempt: number;
  bucket: 'regression' | 'new' | 'edge';
  passed: boolean;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsdEstimate: number;
}

export interface BucketStats {
  bucket: string;
  tasksCount: number;
  passAtK: number;
  passCaretK: number;
  medianDurationMs: number;
  totalTokens: number;
  totalCostUsd: number;
}

export async function runEvals(k = 3): Promise<BucketStats[]> {
  const tasksPath = resolve(process.cwd(), 'docs/lab3/tasks.jsonl');
  const evalsOutPath = resolve(process.cwd(), 'docs/lab3/evals.jsonl');
  writeFileSync(evalsOutPath, '', 'utf8'); // Очищення перед прогоном

  const tasks: Task[] = readFileSync(tasksPath, 'utf8')
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l));

  const records: EvalAttemptRecord[] = [];
  const taskSuccesses = new Map<string, number>();

  console.log(`=== Запуск Evals у чистому середовищі (k = ${k} спроб на задачу) ===\n`);

  for (const task of tasks) {
    let successCount = 0;
    const bucket = task.bucket ?? 'regression';

    for (let attempt = 1; attempt <= k; attempt++) {
      const meta = await executeTask(task);
      const passed = meta.acceptancePassed;
      if (passed) successCount++;

      const inTokens = Math.ceil(task.input.length / 4) + 150;
      const outTokens = 80;
      const costEstimate = Number((((inTokens + outTokens) / 1_000_000) * 0.15).toFixed(6));

      const record: EvalAttemptRecord = {
        taskId: task.id,
        attempt,
        bucket,
        passed,
        durationMs: meta.durationMs,
        inputTokens: inTokens,
        outputTokens: outTokens,
        costUsdEstimate: costEstimate,
      };

      records.push(record);
      appendFileSync(evalsOutPath, `${JSON.stringify(record)}\n`, 'utf8');
    }
    taskSuccesses.set(task.id, successCount);
  }

  // Обчислення статистики за кошиками
  const buckets = ['regression', 'new', 'edge'] as const;
  const stats: BucketStats[] = [];

  for (const b of buckets) {
    const bucketTasks = tasks.filter((t) => (t.bucket ?? 'regression') === b);
    if (bucketTasks.length === 0) continue;

    let anyPass = 0;
    let allPass = 0;
    let totalTokens = 0;
    let totalCost = 0;
    const durations: number[] = [];

    for (const t of bucketTasks) {
      const s = taskSuccesses.get(t.id) ?? 0;
      if (s > 0) anyPass++;
      if (s === k) allPass++;

      const taskRecords = records.filter((r) => r.taskId === t.id);
      taskRecords.forEach((r) => {
        totalTokens += r.inputTokens + r.outputTokens;
        totalCost += r.costUsdEstimate;
        durations.push(r.durationMs);
      });
    }

    durations.sort((a, b) => a - b);
    const medianDuration = durations[Math.floor(durations.length / 2)] ?? 0;

    stats.push({
      bucket: b,
      tasksCount: bucketTasks.length,
      passAtK: Number((anyPass / bucketTasks.length).toFixed(3)),
      passCaretK: Number((allPass / bucketTasks.length).toFixed(3)),
      medianDurationMs: medianDuration,
      totalTokens,
      totalCostUsd: Number(totalCost.toFixed(5)),
    });
  }

  const baselineOut = {
    updatedAt: new Date().toISOString(),
    k,
    stats,
  };
  writeFileSync(resolve(process.cwd(), 'docs/lab3/evals-baseline.json'), JSON.stringify(baselineOut, null, 2), 'utf8');

  console.log('\n--- Зведена статистика Evals ---');
  console.table(stats);

  return stats;
}

if (process.argv[1] && process.argv[1].endsWith('run-evals.ts')) {
  runEvals().catch((err) => {
    console.error('Помилка evals:', err);
    process.exit(1);
  });
}

