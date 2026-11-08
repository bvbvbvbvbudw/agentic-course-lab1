export interface Chunk {
  id: string;
  docId: string;
  heading: string;
  start: number;
  end: number;
  text: string;
}

export interface ChunkingOptions {
  maxChars?: number;
  minChars?: number;
  overlapChars?: number;
}

export const DEFAULT_CHUNKING: Required<ChunkingOptions> = {
  maxChars: 800,
  minChars: 80,
  overlapChars: 100,
};

export function chunkDocument(
  docId: string,
  content: string,
  options: ChunkingOptions = {},
): Chunk[] {
  const opts = { ...DEFAULT_CHUNKING, ...options };
  const lines = content.split('\n');
  const chunks: Chunk[] = [];

  let currentHeading = 'Вступ';
  let currentStart = 0;
  let currentBuffer = '';
  let lineOffset = 0;
  let chunkIdx = 1;

  for (const line of lines) {
    const isHeading = /^#{1,4}\s+(.+)$/.test(line);

    if (isHeading) {
      if (currentBuffer.trim().length >= opts.minChars) {
        const trimmed = currentBuffer.trim();
        const start = content.indexOf(trimmed, currentStart);
        const end = start + trimmed.length;
        chunks.push({
          id: `${docId}#${String(chunkIdx++).padStart(4, '0')}`,
          docId,
          heading: currentHeading,
          start: start >= 0 ? start : currentStart,
          end: end >= 0 ? end : currentStart + currentBuffer.length,
          text: trimmed,
        });
        currentBuffer = '';
      }
      currentHeading = line.replace(/^#{1,4}\s+/, '').trim();
      currentStart = lineOffset;
    }

    currentBuffer += (currentBuffer.length > 0 ? '\n' : '') + line;

    if (currentBuffer.length >= opts.maxChars) {
      const trimmed = currentBuffer.trim();
      const start = content.indexOf(trimmed, currentStart);
      const end = start + trimmed.length;
      chunks.push({
        id: `${docId}#${String(chunkIdx++).padStart(4, '0')}`,
        docId,
        heading: currentHeading,
        start: start >= 0 ? start : currentStart,
        end: end >= 0 ? end : currentStart + currentBuffer.length,
        text: trimmed,
      });

      const overlapText = trimmed.slice(Math.max(0, trimmed.length - opts.overlapChars));
      currentBuffer = overlapText;
      currentStart = lineOffset + line.length - overlapText.length;
    }

    lineOffset += line.length + 1;
  }

  if (currentBuffer.trim().length > 0) {
    const trimmed = currentBuffer.trim();
    const start = content.indexOf(trimmed, currentStart);
    const end = start + trimmed.length;
    chunks.push({
      id: `${docId}#${String(chunkIdx++).padStart(4, '0')}`,
      docId,
      heading: currentHeading,
      start: start >= 0 ? start : currentStart,
      end: end >= 0 ? end : currentStart + currentBuffer.length,
      text: trimmed,
    });
  }

  return chunks;
}
