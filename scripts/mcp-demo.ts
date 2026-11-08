import { resolve } from 'node:path';
import { loadIndex } from '../src/rag/store';
import { mockEmbedder } from '../src/rag/embed';
import { bm25From } from '../src/rag/search';
import { searchCorpus, fetchChunk, type Deps } from '../src/mcp/tools';
import { appendFileSync, mkdirSync } from 'node:fs';

export async function runMcpIntegrationDemo(): Promise<void> {
  const root = process.cwd();
  const tracePath = resolve(root, 'docs/lab2/traces/mcp-calls.jsonl');
  mkdirSync(resolve(root, 'docs/lab2/traces'), { recursive: true });

  const index = loadIndex(resolve(root, 'data/index.json'));
  const deps: Deps = {
    index,
    words: bm25From(index),
    embedder: mockEmbedder(),
  };

  function logTrace(source: string, tool: string, args: Record<string, unknown>, status: string) {
    const entry = {
      ts: new Date().toISOString(),
      source,
      tool,
      args,
      result: status,
    };
    appendFileSync(tracePath, `${JSON.stringify(entry)}\n`, 'utf8');
  }

  console.log('=== Демонстрація підключення MCP-сервера ===\n');

  // Бік 1: Виклик з боку агента кодування (імітація Claude Code / Codex / Gemini CLI)
  console.log('1. [Бік 1: Агент кодування] Виклик search_corpus...');
  const searchArgs = { query: 'як працює Circuit Breaker', topK: 3 };
  const searchResults = await searchCorpus(deps, searchArgs);
  logTrace('agent:claude-code', 'search_corpus', searchArgs, 'ok');
  console.log('   Результат пошуку агентом:');
  const firstRes = searchResults[0];
  if (firstRes) {
    console.log(firstRes.slice(0, 180) + '...\n');
  }

  // Бік 2: Виклик з боку застосунку (Next.js backend)
  console.log('2. [Бік 2: Застосунок] Виклик fetch_chunk...');
  const firstChunk = index.chunks[0];
  if (!firstChunk) throw new Error('Порожній індекс');
  const fetchArgs = { id: firstChunk.id };
  const chunkResult = fetchChunk(deps, fetchArgs);
  logTrace('app:next-backend', 'fetch_chunk', fetchArgs, 'ok');
  console.log('   Результат виклику чанка застосунком:');
  console.log(chunkResult.slice(0, 180) + '...\n');

  // Відмова при виході за межі
  console.log('3. [Перевірка безпеки] Запит неіснуючого id...');
  try {
    fetchChunk(deps, { id: 'doc-99#0001' });
  } catch (e) {
    logTrace('agent:claude-code', 'fetch_chunk', { id: 'doc-99#0001' }, 'refused');
    console.log(`   Успішно відмовлено: ${String(e)}\n`);
  }

  console.log(`✓ Усі виклики зафіксовано в: docs/lab2/traces/mcp-calls.jsonl`);
}

if (process.argv[1] && process.argv[1].endsWith('mcp-demo.ts')) {
  runMcpIntegrationDemo().catch((err) => {
    console.error('Помилка демо MCP:', err);
    process.exit(1);
  });
}
