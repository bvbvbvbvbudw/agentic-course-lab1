import { appendFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { CircuitBreaker } from './breaker';

export interface TaskLimits {
  maxTurns: number;
  maxUsd: number;
  timeoutMs: number;
}

export interface StopContext {
  taskTurns: number;
  taskCostUsd: number;
  startTime: number;
}

export type StopTrigger =
  | { layer: 'task'; reason: 'max_turns' | 'max_usd' | 'timeout'; details: string }
  | { layer: 'run'; reason: 'stop_when'; details: string }
  | { layer: 'harness'; reason: 'circuit_breaker_open'; details: string };

export class StopController {
  private readonly breaker: CircuitBreaker;
  private readonly logPath: string;

  constructor(breaker?: CircuitBreaker, logPath = resolve(process.cwd(), 'docs/lab3/stop-log.jsonl')) {
    this.breaker = breaker ?? new CircuitBreaker();
    this.logPath = logPath;
  }

  getBreaker(): CircuitBreaker {
    return this.breaker;
  }

  checkStopCondition(limits: TaskLimits, context: StopContext): StopTrigger | null {
    // 1. Шар харнеса (Circuit Breaker)
    if (this.breaker.isOpen()) {
      const trigger: StopTrigger = {
        layer: 'harness',
        reason: 'circuit_breaker_open',
        details: 'Circuit Breaker перебуває у стані OPEN. Запуск задач зупинено.',
      };
      this.logStop(trigger);
      return trigger;
    }

    // 2. Шар задачі (Turn budget)
    if (context.taskTurns >= limits.maxTurns) {
      const trigger: StopTrigger = {
        layer: 'task',
        reason: 'max_turns',
        details: `Перевищено ліміт ходів задачі: ${context.taskTurns} >= ${limits.maxTurns}`,
      };
      this.logStop(trigger);
      return trigger;
    }

    // Шар задачі (USD budget)
    if (context.taskCostUsd >= limits.maxUsd) {
      const trigger: StopTrigger = {
        layer: 'task',
        reason: 'max_usd',
        details: `Перевищено бюджет вартості: $${context.taskCostUsd.toFixed(4)} >= $${limits.maxUsd}`,
      };
      this.logStop(trigger);
      return trigger;
    }

    // Шар задачі (Timeout)
    const elapsed = Date.now() - context.startTime;
    if (elapsed >= limits.timeoutMs) {
      const trigger: StopTrigger = {
        layer: 'task',
        reason: 'timeout',
        details: `Перевищено таймаут виконання: ${elapsed} мс >= ${limits.timeoutMs} мс`,
      };
      this.logStop(trigger);
      return trigger;
    }

    return null;
  }

  logStop(trigger: StopTrigger): void {
    try {
      mkdirSync(dirname(this.logPath), { recursive: true });
      const record = {
        ts: new Date().toISOString(),
        ...trigger,
      };
      appendFileSync(this.logPath, `${JSON.stringify(record)}\n`, 'utf8');
    } catch {
      // Ігноруємо помилки запису логу
    }
  }
}

