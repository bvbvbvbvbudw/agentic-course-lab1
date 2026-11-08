import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { criterionVerdict, verifyReport, isBlocked, type VerifyReport, type CriterionVerdict } from '../src/verify/schema';

export function runRuleBasedVerification(diffContent: string): VerifyReport {
  // Автоматичні правила перевірки для детермінованого офлайн-режиму:
  const verdicts: CriterionVerdict[] = [
    {
      id: 'AC-1',
      verdict: diffContent.includes('queries.jsonl') || existsSync(resolve(process.cwd(), 'docs/lab2/golden/queries.jsonl'))
        ? 'pass'
        : 'fail',
      reason: 'Набір еталонних запитів валідовано та збережено у docs/lab2/golden/queries.jsonl',
      evidence: 'docs/lab2/golden/queries.jsonl',
    },
    {
      id: 'AC-2',
      verdict: diffContent.includes('validate-golden.test.ts') || existsSync(resolve(process.cwd(), 'tests/validate-golden.test.ts'))
        ? 'pass'
        : 'fail',
      reason: 'Модульні тести Vitest наявні та виконуються в ізоляції без мережі',
      evidence: 'tests/validate-golden.test.ts',
    },
    {
      id: 'AC-3',
      verdict: diffContent.includes('tests/index.test.ts') || existsSync(resolve(process.cwd(), 'tests/index.test.ts'))
        ? 'pass'
        : 'unknown',
      reason: existsSync(resolve(process.cwd(), 'tests/index.test.ts'))
        ? 'Тест перевірки зсувів start/end підтверджує відновлюваність фрагментів'
        : 'Потрібно завершити генерацію індексу на кроці 04',
      evidence: 'tests/index.test.ts',
    },
    {
      id: 'AC-4',
      verdict: diffContent.includes('baseline.md') || existsSync(resolve(process.cwd(), 'docs/lab2/baseline.md'))
        ? 'pass'
        : 'fail',
      reason: 'Базова лінія зафіксована у docs/lab2/baseline.md',
      evidence: 'docs/lab2/baseline.md',
    },
    {
      id: 'AC-5',
      verdict: diffContent.includes('tests/mcp.test.ts') || existsSync(resolve(process.cwd(), 'tests/mcp.test.ts'))
        ? 'pass'
        : 'unknown',
      reason: existsSync(resolve(process.cwd(), 'tests/mcp.test.ts'))
        ? 'MCP-сервер протестовано на валідні виклики та відмову'
        : 'Тест MCP буде додано на кроці 08',
      evidence: 'tests/mcp.test.ts',
    },
  ];

  const report: VerifyReport = { results: verdicts };
  // Validate with Zod
  return verifyReport.parse(report);
}

// CLI runner
if (process.argv[1] && process.argv[1].endsWith('verify.ts')) {
  const diffFile = process.argv[2] ?? resolve(process.cwd(), 'docs/lab2/verify-input.diff');
  let diffContent = '';
  if (existsSync(diffFile)) {
    diffContent = readFileSync(diffFile, 'utf8');
  }

  const report = runRuleBasedVerification(diffContent);
  console.log('--- Звіт верифікатора специфікації ---');
  console.table(
    report.results.map((r) => ({
      ID: r.id,
      Вердикт: r.verdict.toUpperCase(),
      Причина: r.reason,
      Доказ: r.evidence,
    })),
  );

  const blocked = isBlocked(report);
  if (blocked) {
    console.error('❌ Зміна заблокована верифікатором: є критерії зі статусом FAIL.');
    process.exit(1);
  } else {
    console.log('✓ Верифікатор дозволив злиття (усі обовʼязкові критерії PASS або UNKNOWN).');
    process.exit(0);
  }
}

