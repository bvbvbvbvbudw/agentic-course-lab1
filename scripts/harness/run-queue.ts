import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { executeTask, type Task } from './run-task';
import { StopController } from '../../src/harness/stop';

export async function runTaskQueue(limit = 5): Promise<void> {
  const tasksPath = resolve(process.cwd(), 'docs/lab3/tasks.jsonl');
  const tasks: Task[] = readFileSync(tasksPath, 'utf8')
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l));

  const controller = new StopController();
  const selected = tasks.slice(0, limit);

  console.log(`=== Запуск черги задач харнеса (${selected.length} задач) ===\n`);

  for (const task of selected) {
    const evidenceDir = resolve(process.cwd(), 'docs/lab3/runs', `${task.id}-1760000000000`);
    mkdirSync(evidenceDir, { recursive: true });

    console.log(`-> Виконання задачі ${task.id}: "${task.input}"...`);
    const meta = await executeTask(task, { runDir: evidenceDir, controller });
    console.log(`   Результат: ${meta.exitStatus} (${meta.durationMs} мс)`);

    if (controller.getBreaker().isOpen()) {
      console.log('⛔ Circuit Breaker OPEN! Чергу зупинено.');
      break;
    }
  }

  console.log('\n✓ Виконання черги завершено. Артефакти збережено у docs/lab3/runs/');
}

if (process.argv[1] && process.argv[1].endsWith('run-queue.ts')) {
  runTaskQueue().catch((err) => {
    console.error('Помилка черги:', err);
    process.exit(1);
  });
}

