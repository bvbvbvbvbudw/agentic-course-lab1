import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface GraderResult {
  name: string;
  deterministic: boolean;
  passed: boolean;
  reason: string;
}

/**
 * Детерміновані оцінювачі інваріантів у CI (без виклику моделей і без витрат).
 */
export function gradeIndexIntegrity(): GraderResult {
  const indexPath = resolve(process.cwd(), 'data/index.json');
  if (!existsSync(indexPath)) {
    return {
      name: 'index_integrity',
      deterministic: true,
      passed: false,
      reason: 'Файл data/index.json відсутній',
    };
  }
  try {
    const data = JSON.parse(readFileSync(indexPath, 'utf8'));
    const passed = data.chunks && data.chunks.length >= 50;
    return {
      name: 'index_integrity',
      deterministic: true,
      passed,
      reason: passed ? `Індекс валідний (${data.chunks.length} фрагментів)` : 'Замало фрагментів',
    };
  } catch (e) {
    return {
      name: 'index_integrity',
      deterministic: true,
      passed: false,
      reason: `Помилка розбору JSON: ${String(e)}`,
    };
  }
}

export function gradeGoldenSetSchema(): GraderResult {
  const goldenPath = resolve(process.cwd(), 'docs/lab2/golden/queries.jsonl');
  if (!existsSync(goldenPath)) {
    return {
      name: 'golden_set_schema',
      deterministic: true,
      passed: false,
      reason: 'Файл queries.jsonl відсутній',
    };
  }
  const lines = readFileSync(goldenPath, 'utf8').split('\n').filter((l) => l.trim().length > 0);
  const passed = lines.length >= 20;
  return {
    name: 'golden_set_schema',
    deterministic: true,
    passed,
    reason: passed ? `Еталонний набір містить ${lines.length} запитів` : 'Менше 20 запитів',
  };
}

export function gradeMcpToolsAvailable(): GraderResult {
  const toolsPath = resolve(process.cwd(), 'src/mcp/tools.ts');
  const serverPath = resolve(process.cwd(), 'src/mcp/server.ts');
  const passed = existsSync(toolsPath) && existsSync(serverPath);
  return {
    name: 'mcp_tools_available',
    deterministic: true,
    passed,
    reason: passed ? 'Модулі MCP присутні' : 'Файли MCP відсутні',
  };
}

export function runAllGraders(): GraderResult[] {
  return [
    gradeIndexIntegrity(),
    gradeGoldenSetSchema(),
    gradeMcpToolsAvailable(),
  ];
}

if (process.argv[1] && process.argv[1].endsWith('graders.ts')) {
  const results = runAllGraders();
  console.log('=== Детерміновані оцінювачі (Graders) ===');
  console.table(results);
  const allPassed = results.every((r) => r.passed);
  process.exit(allPassed ? 0 : 1);
}

