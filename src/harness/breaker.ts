import { appendFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

export type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface BreakerConfig {
  maxFailures: number;
  resetTimeoutMs?: number;
  stopLogPath?: string;
}

export const DEFAULT_BREAKER_CONFIG: Required<BreakerConfig> = {
  maxFailures: 3,
  resetTimeoutMs: 30_000,
  stopLogPath: resolve(process.cwd(), 'docs/lab3/stop-log.jsonl'),
};

export class CircuitBreaker {
  private state: BreakerState = 'CLOSED';
  private failureCount = 0;
  private lastStateChange: number = Date.now();
  private readonly config: Required<BreakerConfig>;

  constructor(config: Partial<BreakerConfig> = {}) {
    this.config = { ...DEFAULT_BREAKER_CONFIG, ...config };
  }

  getState(): BreakerState {
    if (
      this.state === 'OPEN' &&
      Date.now() - this.lastStateChange > this.config.resetTimeoutMs
    ) {
      this.transitionTo('HALF_OPEN', 'Час очікування скидання вичерпано');
    }
    return this.state;
  }

  isOpen(): boolean {
    return this.getState() === 'OPEN';
  }

  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.transitionTo('CLOSED', 'Успішний пробний прогін у стані HALF_OPEN');
    }
    this.failureCount = 0;
  }

  recordFailure(reason: string): void {
    this.failureCount++;
    if (this.state === 'HALF_OPEN') {
      this.transitionTo('OPEN', `Падіння під час пробного прогону: ${reason}`);
    } else if (this.failureCount >= this.config.maxFailures) {
      this.transitionTo('OPEN', `Досягнуто ліміт ${this.failureCount} послідовних збоїв: ${reason}`);
    }
  }

  private transitionTo(newState: BreakerState, reason: string): void {
    this.state = newState;
    this.lastStateChange = Date.now();
    this.logEvent(newState, reason);
  }

  private logEvent(state: BreakerState, reason: string): void {
    try {
      mkdirSync(dirname(this.config.stopLogPath), { recursive: true });
      const entry = {
        ts: new Date().toISOString(),
        layer: 'harness:circuit-breaker',
        state,
        failures: this.failureCount,
        reason,
      };
      appendFileSync(this.config.stopLogPath, `${JSON.stringify(entry)}\n`, 'utf8');
    } catch {
      // Ігноруємо помилки запису логу
    }
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
  }
}

