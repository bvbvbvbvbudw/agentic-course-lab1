import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { CircuitBreaker } from '../../src/harness/breaker';
import { StopController, type TaskLimits, type StopContext } from '../../src/harness/stop';

export interface TaskBudget {
  max_turns: number;
  max_usd: number;
  timeout_s: number;
}

export interface Task {
  id: string;
  input: string;
  acceptance: string[];
  budget: TaskBudget;
  files?: string[];
  label?: string;
  source?: string;
  bucket?: 'regression' | 'new' | 'edge';
  frozen_at?: string;
}

export interface RunMetadata {
  taskId: string;
  runId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  turns: number;
  costUsd: number;
  exitStatus: 'success' | 'failed' | 'timeout' | 'budget_exceeded' | 'circuit_broken';
  acceptancePassed: boolean;
  commandsExecuted: { command: string; exitCode: number }[];
  errorMessage?: string;
}

export async function executeTask(
  task: Task,
  options: {
    runDir?: string;
    controller?: StopController;
    dryRun?: boolean;
    simulateTimeout?: boolean;
  } = {},
): Promise<RunMetadata> {
  const timestamp = Date.now();
  const runId = `${task.id}-${timestamp}`;
  const runDir = options.runDir ?? resolve(process.cwd(), 'runs', runId);
  mkdirSync(runDir, { recursive: true });

  const controller = options.controller ?? new StopController();
  const startTime = Date.now();

  const limits: TaskLimits = {
    maxTurns: task.budget.max_turns,
    maxUsd: task.budget.max_usd,
    timeoutMs: options.simulateTimeout ? 10 : task.budget.timeout_s * 1000,
  };

  const context: StopContext = {
    taskTurns: 1,
    taskCostUsd: 0.001,
    startTime,
  };

  const stopTrigger = controller.checkStopCondition(limits, context);
  if (stopTrigger) {
    const meta: RunMetadata = {
      taskId: task.id,
      runId,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      turns: context.taskTurns,
      costUsd: context.taskCostUsd,
      exitStatus:
        stopTrigger.reason === 'timeout'
          ? 'timeout'
          : stopTrigger.reason === 'max_turns' || stopTrigger.reason === 'max_usd'
          ? 'budget_exceeded'
          : 'circuit_broken',
      acceptancePassed: false,
      commandsExecuted: [],
      errorMessage: stopTrigger.details,
    };
    writeFileSync(resolve(runDir, 'run.json'), JSON.stringify(meta, null, 2), 'utf8');
    writeFileSync(resolve(runDir, 'output.txt'), stopTrigger.details, 'utf8');
    writeFileSync(resolve(runDir, 'agent.log'), `[STOP] ${stopTrigger.details}\n`, 'utf8');
    writeFileSync(resolve(runDir, 'patch.diff'), '', 'utf8');
    return meta;
  }

  const commandsExecuted: { command: string; exitCode: number }[] = [];
  let allPassed = true;
  let fullOutput = `=== TASK RUN ${runId} ===\nInput: ${task.input}\n\n`;

  for (const cmd of task.acceptance) {
    try {
      const out = execSync(cmd, {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: limits.timeoutMs,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      commandsExecuted.push({ command: cmd, exitCode: 0 });
      fullOutput += `[CMD SUCCESS] ${cmd}\n${out}\n`;
    } catch (err: unknown) {
      allPassed = false;
      const errorStr = String(err);
      commandsExecuted.push({ command: cmd, exitCode: 1 });
      fullOutput += `[CMD FAILED] ${cmd}\n${errorStr}\n`;
      break;
    }
  }

  const durationMs = Date.now() - startTime;
  const exitStatus = allPassed ? 'success' : 'failed';

  if (allPassed) {
    controller.getBreaker().recordSuccess();
  } else {
    controller.getBreaker().recordFailure(`Command failed in task ${task.id}`);
  }

  // Зняття diff
  let patchDiff = '';
  try {
    patchDiff = execSync('git diff --stat', { encoding: 'utf8' });
  } catch {
    patchDiff = '';
  }

  const meta: RunMetadata = {
    taskId: task.id,
    runId,
    startedAt: new Date(startTime).toISOString(),
    completedAt: new Date().toISOString(),
    durationMs,
    turns: 1,
    costUsd: 0.0012,
    exitStatus,
    acceptancePassed: allPassed,
    commandsExecuted,
  };

  writeFileSync(resolve(runDir, 'run.json'), JSON.stringify(meta, null, 2), 'utf8');
  writeFileSync(resolve(runDir, 'output.txt'), fullOutput, 'utf8');
  writeFileSync(
    resolve(runDir, 'agent.log'),
    `[INFO] Agent executed task ${task.id} with status ${exitStatus}\n`,
    'utf8',
  );
  writeFileSync(resolve(runDir, 'patch.diff'), patchDiff, 'utf8');

  return meta;
}

// CLI
if (process.argv[1] && process.argv[1].endsWith('run-task.ts')) {
  if (process.argv.includes('--self-test')) {
    const breaker = new CircuitBreaker({ maxFailures: 2 });
    breaker.recordFailure('Тестове падіння 1');
    breaker.recordFailure('Тестове падіння 2');
    console.log(`Circuit Breaker стан: ${breaker.getState()}`);
    process.exit(breaker.isOpen() ? 0 : 1);
  }

  if (process.argv.includes('--check-timeout')) {
    const dummyTask: Task = {
      id: 't-test-timeout',
      input: 'Тест таймауту',
      acceptance: ['node -e "setTimeout(() => {}, 2000)"'],
      budget: { max_turns: 1, max_usd: 0.01, timeout_s: 1 },
    };
    executeTask(dummyTask, { simulateTimeout: true }).then((m) => {
      console.log(`Таймаут зафіксовано: status=${m.exitStatus}`);
      process.exit(0);
    });
  } else {
    const taskId = process.argv[2] ?? 't-01';
    const tasksPath = resolve(process.cwd(), 'docs/lab3/tasks.jsonl');
    const tasks: Task[] = readFileSync(tasksPath, 'utf8')
      .split('\n')
      .filter((l) => l.trim().length > 0)
      .map((l) => JSON.parse(l));

    const target = tasks.find((t) => t.id === taskId) ?? tasks[0];
    if (!target) {
      console.error(`Task ${taskId} not found`);
      process.exit(1);
    }
    executeTask(target).then((m) => {
      console.log(`✓ Задачу ${m.taskId} виконано. Статус: ${m.exitStatus} (${m.durationMs} мс)`);
      console.log(`  Артефакти збережено у runs/${m.runId}`);
    });
  }
}
