import { readFileSync } from 'node:fs';
import { z } from 'zod';

export const ALLOWED_TAGS = ['easy', 'hard', 'unanswerable', 'injection'] as const;
export type AllowedTag = (typeof ALLOWED_TAGS)[number];

export const GoldenQuerySchema = z
  .object({
    id: z.string().regex(/^q-\d{2,}$/),
    query: z.string().min(10),
    expected: z.union([z.string().min(5), z.array(z.string().min(2)).min(1)]),
    must_cite: z.array(z.string().regex(/^doc-\d{2}$/)),
    tags: z.array(z.enum(ALLOWED_TAGS)).min(1),
  })
  .strict();

export type GoldenQuery = z.infer<typeof GoldenQuerySchema>;

export interface ValidationReport {
  total: number;
  unanswerableCount: number;
  injectionCount: number;
  easyCount: number;
  hardCount: number;
  uniqueIds: boolean;
  errors: string[];
}

export function validateGoldenLines(lines: string[]): ValidationReport {
  const errors: string[] = [];
  const ids = new Set<string>();
  let unanswerableCount = 0;
  let injectionCount = 0;
  let easyCount = 0;
  let hardCount = 0;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(trimmed);
    } catch (e) {
      errors.push(`Line ${index + 1}: Invalid JSON - ${String(e)}`);
      return;
    }

    const res = GoldenQuerySchema.safeParse(parsedJson);
    if (!res.success) {
      errors.push(`Line ${index + 1}: Schema error - ${res.error.message}`);
      return;
    }

    const item = res.data;
    if (ids.has(item.id)) {
      errors.push(`Duplicate ID: ${item.id}`);
    }
    ids.add(item.id);

    if (item.tags.includes('unanswerable')) {
      unanswerableCount++;
      if (item.must_cite.length > 0) {
        errors.push(`Item ${item.id}: unanswerable query must have empty must_cite`);
      }
    } else {
      if (item.must_cite.length === 0) {
        errors.push(`Item ${item.id}: answerable query must specify must_cite`);
      }
    }

    if (item.tags.includes('injection')) injectionCount++;
    if (item.tags.includes('easy')) easyCount++;
    if (item.tags.includes('hard')) hardCount++;
  });

  const total = ids.size;
  if (total < 20) {
    errors.push(`Minimum 20 queries required, got ${total}`);
  }
  if (unanswerableCount < 3) {
    errors.push(`Minimum 3 unanswerable queries required, got ${unanswerableCount}`);
  }
  if (injectionCount < 2) {
    errors.push(`Minimum 2 injection queries required, got ${injectionCount}`);
  }

  return {
    total,
    unanswerableCount,
    injectionCount,
    easyCount,
    hardCount,
    uniqueIds: errors.length === 0,
    errors,
  };
}

export function validateGoldenFile(filePath: string): ValidationReport {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  return validateGoldenLines(lines);
}

// CLI entry point
if (process.argv[1] && process.argv[1].endsWith('validate-golden.ts')) {
  const targetFile = process.argv[2] ?? 'docs/lab2/golden/queries.jsonl';
  try {
    const report = validateGoldenFile(targetFile);
    if (report.errors.length > 0) {
      console.error('Validation failed:');
      report.errors.forEach((err) => console.error(`  - ${err}`));
      process.exit(1);
    }
    console.log(`✓ Golden queries validated successfully (${report.total} queries):`);
    console.log(`  - Easy: ${report.easyCount}`);
    console.log(`  - Hard: ${report.hardCount}`);
    console.log(`  - Unanswerable: ${report.unanswerableCount}`);
    console.log(`  - Injection: ${report.injectionCount}`);
    process.exit(0);
  } catch (err) {
    console.error(`Error reading ${targetFile}:`, err);
    process.exit(1);
  }
}

