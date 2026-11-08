import type { Chunk } from './chunk';

export interface Bm25Doc {
  id: string;
  chunk: Chunk;
  terms: string[];
}

export interface Bm25Index {
  k1: number;
  b: number;
  docCount: number;
  avgDocLen: number;
  docs: Bm25Doc[];
  termIdf: Map<string, number>;
  termPostings: Map<string, Map<number, number>>; // term -> (docIndex -> termFrequency)
}

export function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(/\p{L}+|\d+(?:-\d+)?/gu);
  return matches ?? [];
}

export function buildBm25Index(chunks: Chunk[], k1 = 1.2, b = 0.75): Bm25Index {
  const docs: Bm25Doc[] = chunks.map((chunk) => ({
    id: chunk.id,
    chunk,
    terms: tokenize(chunk.text),
  }));

  const docCount = docs.length;
  const totalTerms = docs.reduce((acc, d) => acc + d.terms.length, 0);
  const avgDocLen = docCount > 0 ? totalTerms / docCount : 1;

  const termDocsCount = new Map<string, number>();
  const termPostings = new Map<string, Map<number, number>>();

  docs.forEach((doc, docIdx) => {
    const counts = new Map<string, number>();
    for (const term of doc.terms) {
      counts.set(term, (counts.get(term) ?? 0) + 1);
    }

    for (const [term, freq] of counts.entries()) {
      termDocsCount.set(term, (termDocsCount.get(term) ?? 0) + 1);

      let postings = termPostings.get(term);
      if (!postings) {
        postings = new Map<number, number>();
        termPostings.set(term, postings);
      }
      postings.set(docIdx, freq);
    }
  });

  const termIdf = new Map<string, number>();
  for (const [term, n] of termDocsCount.entries()) {
    const idf = Math.log((docCount - n + 0.5) / (n + 0.5) + 1);
    termIdf.set(term, idf);
  }

  return {
    k1,
    b,
    docCount,
    avgDocLen,
    docs,
    termIdf,
    termPostings,
  };
}

export interface Bm25Hit {
  chunk: Chunk;
  score: number;
}

export function searchBm25(index: Bm25Index, query: string, topK = 20): Bm25Hit[] {
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0 || index.docCount === 0) return [];

  const scores = new Float64Array(index.docCount);

  for (const term of queryTerms) {
    const idf = index.termIdf.get(term);
    if (idf === undefined || idf <= 0) continue;

    const postings = index.termPostings.get(term);
    if (!postings) continue;

    for (const [docIdx, tf] of postings.entries()) {
      const doc = index.docs[docIdx];
      if (!doc) continue;
      const docLen = doc.terms.length;
      const numerator = tf * (index.k1 + 1);
      const denominator = tf + index.k1 * (1 - index.b + index.b * (docLen / index.avgDocLen));
      const current = scores[docIdx] ?? 0;
      scores[docIdx] = current + idf * (numerator / denominator);
    }
  }

  const results: Bm25Hit[] = [];
  for (let i = 0; i < scores.length; i++) {
    const s = scores[i];
    const doc = index.docs[i];
    if (s !== undefined && s > 0 && doc) {
      results.push({ chunk: doc.chunk, score: s });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}
