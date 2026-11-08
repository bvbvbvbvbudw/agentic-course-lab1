import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { executeTask, type Task } from '../../scripts/harness/run-task';
import { StopController } from '../../src/harness/stop';
import { CircuitBreaker } from '../../src/harness/breaker';

describe('Harness run-task executor (offline)', () => {
  it('executes task, generates all 4 artifacts and writes run.json', async () => {
    const testTask: Task = {
      id: 't-test-simple',
      input: 'Тестова перевірка ехо',
      acceptance: ['node -e "process.exit(0)"'],
      budget: { max_turns: 5, max_usd: 0.01, timeout_s: 10 },
    };

    const tmpDir = resolve(process.cwd(), 'runs/test-run-artifacts');
    const result = await executeTask(testTask, { runDir: tmpDir });

    expect(result.exitStatus).toBe('success');
    expect(result.acceptancePassed).toBe(true);

    expect(existsSync(resolve(tmpDir, 'run.json'))).toBe(true);
    expect(existsSync(resolve(tmpDir, 'output.txt'))).toBe(true);
    expect(existsSync(resolve(tmpDir, 'agent.log'))).toBe(true);
    expect(existsSync(resolve(tmpDir, 'patch.diff'))).toBe(true);

    const runJson = JSON.parse(readFileSync(resolve(tmpDir, 'run.json'), 'utf8'));
    expect(runJson.taskId).toBe('t-test-simple');
    expect(runJson.durationMs).toBeGreaterThanOrEqual(0);

    // Clean up
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('records failure cleanly when acceptance command fails', async () => {
    const failingTask: Task = {
      id: 't-test-fail',
      input: 'Тест команди, що падає',
      acceptance: ['node -e "process.exit(1)"'],
      budget: { max_turns: 5, max_usd: 0.01, timeout_s: 10 },
    };

    const tmpDir = resolve(process.cwd(), 'runs/test-run-fail');
    const result = await executeTask(failingTask, { runDir: tmpDir });

    expect(result.exitStatus).toBe('failed');
    expect(result.acceptancePassed).toBe(false);

    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('stops execution immediately when Circuit Breaker is OPEN', async () => {
    const breaker = new CircuitBreaker({ maxFailures: 1 });
    breaker.recordFailure('Перший збій');
    expect(breaker.isOpen()).toBe(true);

    const controller = new StopController(breaker);
    const task: Task = {
      id: 't-test-blocked',
      input: 'Заблокована задача',
      acceptance: ['node -e "process.exit(0)"'],
      budget: { max_turns: 5, max_usd: 0.01, timeout_s: 10 },
    };

    const tmpDir = resolve(process.cwd(), 'runs/test-run-blocked');
    const result = await executeTask(task, { runDir: tmpDir, controller });

    expect(result.exitStatus).toBe('circuit_broken');
    expect(result.acceptancePassed).toBe(false);

    rmSync(tmpDir, { recursive: true, force: true });
  });
});

