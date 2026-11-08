import { readdirSync, readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { chunkDocument, type Chunk } from '../src/rag/chunk';
import { mockEmbedder, ollamaEmbedder, geminiEmbedder, type Embedder } from '../src/rag/embed';
import { saveIndex, type IndexFile, type IndexChunk } from '../src/rag/store';

export async function buildCorpusIndex(
  corpusDir = resolve(process.cwd(), 'corpus'),
  outputPath = resolve(process.cwd(), 'data/index.json'),
  provider: 'mock' | 'ollama' | 'google' = 'mock',
): Promise<IndexFile> {
  const files = readdirSync(corpusDir)
    .filter((f) => f.endsWith('.md') || f.endsWith('.txt'))
    .sort();

  let embedder: Embedder;
  if (provider === 'ollama') {
    embedder = ollamaEmbedder();
  } else if (provider === 'google') {
    embedder = geminiEmbedder();
  } else {
    embedder = mockEmbedder();
  }

  const allChunks: Chunk[] = [];
  const docIds: string[] = [];

  for (const file of files) {
    const docId = basename(file, file.includes('.') ? file.slice(file.lastIndexOf('.')) : '');
    docIds.push(docId);
    const content = readFileSync(resolve(corpusDir, file), 'utf8');
    const chunks = chunkDocument(docId, content);
    allChunks.push(...chunks);
  }

  const texts = allChunks.map((c) => c.text);
  const embeddings = await embedder.embedMany(texts);

  const indexChunks: IndexChunk[] = allChunks.map((c, i) => {
    const emb = embeddings[i];
    if (!emb) {
      throw new Error(`Відсутній ембедінг для чанка ${i}`);
    }
    return {
      ...c,
      embedding: emb,
    };
  });

  const indexFile: IndexFile = {
    version: '1.0',
    createdAt: new Date().toISOString(),
    dimension: embedder.dimension,
    totalChunks: indexChunks.length,
    docIds,
    chunks: indexChunks,
  };

  saveIndex(outputPath, indexFile);
  return indexFile;
}

if (process.argv[1] && process.argv[1].endsWith('build-index.ts')) {
  const providerArg = process.argv.includes('--provider')
    ? (process.argv[process.argv.indexOf('--provider') + 1] as 'mock' | 'ollama' | 'google')
    : 'mock';

  buildCorpusIndex(undefined, undefined, providerArg)
    .then((idx) => {
      console.log(`✓ Індекс побудовано успішно (${idx.totalChunks} фрагментів з ${idx.docIds.length} документів).`);
      console.log(`  Збережено у: data/index.json`);
    })
    .catch((err) => {
      console.error('Помилка побудови індексу:', err);
      process.exit(1);
    });
}
