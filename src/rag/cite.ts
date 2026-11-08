import type { Chunk } from './chunk';

export interface Citation {
  chunkId: string;
  docId: string;
  heading: string;
  start: number;
  end: number;
  excerpt: string;
}

export function toCitation(chunk: Chunk, excerpt = chunk.text): Citation {
  return {
    chunkId: chunk.id,
    docId: chunk.docId,
    heading: chunk.heading,
    start: chunk.start,
    end: chunk.end,
    excerpt,
  };
}

export function renderCitation(citation: Citation): string {
  return `[${citation.chunkId}] (${citation.docId} > ${citation.heading})`;
}

export interface CitationValidationResult {
  valid: boolean;
  citedIds: string[];
  hallucinatedIds: string[];
  error?: string;
}

export function validateCitations(
  responseText: string,
  allowedChunkIds: string[],
): CitationValidationResult {
  const matches = responseText.match(/\[([a-z0-9-]+(?:#\d{4})?)\]/g) ?? [];
  const citedIds = Array.from(new Set(matches.map((m) => m.slice(1, -1))));

  const allowedSet = new Set(allowedChunkIds);
  const allowedDocIds = new Set(allowedChunkIds.map((id) => id.split('#')[0]));

  const hallucinatedIds: string[] = [];

  for (const id of citedIds) {
    if (!allowedSet.has(id) && !allowedDocIds.has(id)) {
      hallucinatedIds.push(id);
    }
  }

  const valid = hallucinatedIds.length === 0;
  const res: CitationValidationResult = {
    valid,
    citedIds,
    hallucinatedIds,
  };
  if (!valid) {
    res.error = `Виявлено галюциновані цитати: ${hallucinatedIds.join(', ')}`;
  }
  return res;
}
