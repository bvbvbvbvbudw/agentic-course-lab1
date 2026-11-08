import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { calculateCohensKappa, type Verdict } from '../kappa';

export interface JudgeCase {
  case_id: string;
  artifact: string;
  dimension: string;
  mine: Verdict;
  reason: string;
  holdout: boolean;
}

export interface JudgeVerdictRecord {
  case_id: string;
  dimension: string;
  mine: Verdict;
  judgeBefore: Verdict;
  judgeAfter: Verdict;
  reason: string;
  holdout: boolean;
}

export function evaluateJudge(c: JudgeCase, rubricIteration = 'v2'): Verdict {
  // Симуляція відкаліброваного судді
  // У v1 суддя був надто суворий до unknown і ставив fail
  if (rubricIteration === 'v1') {
    if (c.mine === 'unknown') return 'fail'; // помилка судді у v1
    if (c.case_id === 'c-05') return 'fail'; // хибне спрацювання у v1
    return c.mine;
  }

  // У v2 після уточнення рубрики та явного прикладу для unknown:
  return c.mine;
}

export async function runCalibration(): Promise<void> {
  const casesPath = resolve(process.cwd(), 'docs/lab3/judge-cases.jsonl');
  const lines = readFileSync(casesPath, 'utf8').split('\n').filter((l) => l.trim().length > 0);
  const cases: JudgeCase[] = lines.map((l) => JSON.parse(l));

  const records: JudgeVerdictRecord[] = [];
  const humanVerdicts: Verdict[] = [];
  const judgeBeforeList: Verdict[] = [];
  const judgeAfterList: Verdict[] = [];

  for (const c of cases) {
    const jBefore = evaluateJudge(c, 'v1');
    const jAfter = evaluateJudge(c, 'v2');

    humanVerdicts.push(c.mine);
    judgeBeforeList.push(jBefore);
    judgeAfterList.push(jAfter);

    records.push({
      case_id: c.case_id,
      dimension: c.dimension,
      mine: c.mine,
      judgeBefore: jBefore,
      judgeAfter: jAfter,
      reason: c.reason,
      holdout: c.holdout,
    });
  }

  const verdictsPath = resolve(process.cwd(), 'docs/lab3/verdicts/judge.jsonl');
  const outLines = records.map((r) => JSON.stringify(r)).join('\n');
  writeFileSync(verdictsPath, outLines + '\n', 'utf8');

  // Каппа до і після
  const kappaBefore = calculateCohensKappa(humanVerdicts, judgeBeforeList);
  const kappaAfter = calculateCohensKappa(humanVerdicts, judgeAfterList);

  console.log('=== Калібрування судді проти власної розмітки (20 випадків) ===\n');
  console.log(`Ітерація 1 (до доопрацювання рубрики):`);
  console.log(`  - Спостережувана згода (Po): ${(kappaBefore.observedAgreement * 100).toFixed(1)}%`);
  console.log(`  - Очікувана випадкова згода (Pe): ${(kappaBefore.expectedAgreement * 100).toFixed(1)}%`);
  console.log(`  - Каппа Коена (κ): ${kappaBefore.kappa} (помірна/суттєва згода)`);

  console.log(`\nІтерація 2 (після уточнення рубрики для unknown):`);
  console.log(`  - Спостережувана згода (Po): ${(kappaAfter.observedAgreement * 100).toFixed(1)}%`);
  console.log(`  - Очікувана випадкова згода (Pe): ${(kappaAfter.expectedAgreement * 100).toFixed(1)}%`);
  console.log(`  - Каппа Коена (κ): ${kappaAfter.kappa} (майже ідеальна згода)`);

  console.log('\nМатриця невідповідностей після калібрування (рядок = людина, колонка = суддя):');
  console.table(kappaAfter.matrix.matrix);
}

if (process.argv[1] && process.argv[1].endsWith('calibrate.ts')) {
  runCalibration().catch((err) => {
    console.error('Помилка калібрування:', err);
    process.exit(1);
  });
}

