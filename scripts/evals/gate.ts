import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function checkRegressionGate(): boolean {
  const baselinePath = resolve(process.cwd(), 'docs/lab3/evals-baseline.json');
  if (!existsSync(baselinePath)) {
    console.error('Базовий рівень evals-baseline.json відсутній!');
    return false;
  }

  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
  const regressionStats = baseline.stats.find((s: { bucket: string }) => s.bucket === 'regression');

  if (!regressionStats) {
    console.error('Кошик regression не знайдено у статистиці!');
    return false;
  }

  console.log(`Регресійна брама evals: pass^k для кошика regression = ${regressionStats.passCaretK}`);

  // Регресійна брама: у кошику regression pass^k має дорівнювати 1.0 (100% стабільність)
  if (regressionStats.passCaretK < 1.0) {
    console.error(`❌ Брама заблокована: виявлено регресію в regression bucket (${regressionStats.passCaretK} < 1.0)`);
    return false;
  }

  console.log('✓ Регресійна брама зелена: жодна задача з regression кошика не зазнала деградації.');
  return true;
}

if (process.argv[1] && process.argv[1].endsWith('gate.ts')) {
  const ok = checkRegressionGate();
  process.exit(ok ? 0 : 100);
}

