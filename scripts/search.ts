import { resolve } from 'node:path';
import { loadIndex } from '../src/rag/store';
import { mockEmbedder, ollamaEmbedder, geminiEmbedder, type Embedder } from '../src/rag/embed';
import { bm25From, hybridSearchDetailed } from '../src/rag/search';
import { renderCitation, toCitation } from '../src/rag/cite';

export async function runCliSearch(query: string, explain = false, topK = 5): Promise<void> {
  const indexPath = resolve(process.cwd(), 'data/index.json');
  const index = loadIndex(indexPath);
  const words = bm25From(index);

  let embedder: Embedder;
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    embedder = geminiEmbedder();
  } else {
    embedder = mockEmbedder();
  }

  const result = await hybridSearchDetailed(index, words, embedder, query, topK);

  console.log(`\n=== Результати пошуку за запитом: "${query}" ===\n`);
  if (result.refused) {
    console.log(`⛔ ВІДМОВА: ${result.refusalReason}`);
    console.log(`(найкращий косинус: ${result.bestCosine.toFixed(4)}, найкращий BM25: ${result.bestBm25.toFixed(4)})`);
    return;
  }

  result.hits.forEach((hit, idx) => {
    const citation = toCitation(hit.chunk);
    console.log(`${idx + 1}. ${renderCitation(citation)}`);
    if (explain) {
      console.log(
        `   [Пояснення] RRF: ${hit.rrf.toFixed(5)} | Векторний ранг: ${hit.vectorRank ?? '-'} (cos=${hit.cosine.toFixed(4)}) | BM25 ранг: ${hit.bm25Rank ?? '-'} (score=${hit.bm25.toFixed(3)})`,
      );
    }
    console.log(`   Уривок: ${hit.chunk.text.slice(0, 160).replace(/\n/g, ' ')}...\n`);
  });
}

if (process.argv[1] && process.argv[1].endsWith('search.ts')) {
  const query = process.argv[2] ?? 'Reciprocal Rank Fusion k=60';
  const explain = process.argv.includes('--explain');
  runCliSearch(query, explain).catch((err) => {
    console.error('Помилка пошуку:', err);
    process.exit(1);
  });
}

