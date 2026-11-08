export type Verdict = 'pass' | 'fail' | 'unknown';

export interface ConfusionMatrix {
  classes: Verdict[];
  matrix: Record<Verdict, Record<Verdict, number>>; // [human][judge]
  total: number;
}

export function buildConfusionMatrix(human: Verdict[], judge: Verdict[]): ConfusionMatrix {
  const classes: Verdict[] = ['pass', 'fail', 'unknown'];
  const matrix: Record<Verdict, Record<Verdict, number>> = {
    pass: { pass: 0, fail: 0, unknown: 0 },
    fail: { pass: 0, fail: 0, unknown: 0 },
    unknown: { pass: 0, fail: 0, unknown: 0 },
  };

  const len = Math.min(human.length, judge.length);
  for (let i = 0; i < len; i++) {
    const h = human[i];
    const j = judge[i];
    if (h && j) {
      matrix[h][j] = (matrix[h][j] ?? 0) + 1;
    }
  }

  return { classes, matrix, total: len };
}

export function calculateCohensKappa(human: Verdict[], judge: Verdict[]): {
  observedAgreement: number;
  expectedAgreement: number;
  kappa: number;
  matrix: ConfusionMatrix;
} {
  const cm = buildConfusionMatrix(human, judge);
  const n = cm.total;
  if (n === 0) {
    return { observedAgreement: 0, expectedAgreement: 0, kappa: 0, matrix: cm };
  }

  // 1. Спостережувана згода (Po) = діагональні елементи / N
  let agreeCount = 0;
  for (const c of cm.classes) {
    agreeCount += cm.matrix[c][c];
  }
  const observedAgreement = agreeCount / n;

  // 2. Очікувана випадкова згода (Pe) = Σ (p_human_c * p_judge_c)
  let expectedAgreement = 0;
  for (const c of cm.classes) {
    const rowSum = cm.matrix[c].pass + cm.matrix[c].fail + cm.matrix[c].unknown;
    const colSum = cm.matrix.pass[c] + cm.matrix.fail[c] + cm.matrix.unknown[c];
    const pHuman = rowSum / n;
    const pJudge = colSum / n;
    expectedAgreement += pHuman * pJudge;
  }

  // 3. Каппа Коена = (Po - Pe) / (1 - Pe)
  const kappa = expectedAgreement < 1 ? (observedAgreement - expectedAgreement) / (1 - expectedAgreement) : 1;

  return {
    observedAgreement: Number(observedAgreement.toFixed(4)),
    expectedAgreement: Number(expectedAgreement.toFixed(4)),
    kappa: Number(kappa.toFixed(4)),
    matrix: cm,
  };
}

if (process.argv[1] && process.argv[1].endsWith('kappa.ts')) {
  // Тестовий приклад розрахунку
  const humanExample: Verdict[] = ['pass', 'pass', 'pass', 'fail', 'fail', 'unknown'];
  const judgeExample: Verdict[] = ['pass', 'pass', 'fail', 'fail', 'fail', 'unknown'];
  const res = calculateCohensKappa(humanExample, judgeExample);
  console.log('=== Розрахунок каппи Коена (тестовий приклад) ===');
  console.log(`Спостережувана згода (Po): ${(res.observedAgreement * 100).toFixed(1)}%`);
  console.log(`Очікувана випадкова згода (Pe): ${(res.expectedAgreement * 100).toFixed(1)}%`);
  console.log(`Каппа Коена (κ): ${res.kappa}`);
}

