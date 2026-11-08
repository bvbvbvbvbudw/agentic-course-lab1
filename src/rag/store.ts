import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Chunk } from './chunk';

export interface IndexChunk extends Chunk {
  embedding: number[];
}

export interface IndexFile {
  version: '1.0';
  createdAt: string;
  dimension: number;
  totalChunks: number;
  docIds: string[];
  chunks: IndexChunk[];
}

export function saveIndex(filePath: string, index: IndexFile): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(index, null, 2), 'utf8');
}

export function loadIndex(filePath: string): IndexFile {
  const content = readFileSync(filePath, 'utf8');
  return JSON.parse(content) as IndexFile;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const valA = a[i] ?? 0;
    const valB = b[i] ?? 0;
    dot += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
