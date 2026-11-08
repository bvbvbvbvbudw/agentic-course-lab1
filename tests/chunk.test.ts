import { describe, it, expect } from 'vitest';
import { chunkDocument } from '../src/rag/chunk';

describe('chunkDocument', () => {
  it('creates chunks with valid IDs and start/end bounds', () => {
    const text = `# Заголовок 1
Це перший розділ навчального документа. Він описує архітектуру та методику.

## Заголовок 2
Це другий розділ з деталями алгоритмів RAG та константами k=60.`;

    const chunks = chunkDocument('doc-01', text, { maxChars: 100, minChars: 20 });
    expect(chunks.length).toBeGreaterThan(0);

    for (const chunk of chunks) {
      expect(chunk.id).toMatch(/^doc-01#\d{4}$/);
      expect(chunk.docId).toBe('doc-01');
      expect(chunk.text.length).toBeGreaterThan(0);
      expect(chunk.start).toBeGreaterThanOrEqual(0);
      expect(chunk.end).toBeGreaterThan(chunk.start);
      // Підрядок у вихідному тексті має збігатися з текстом чанка
      const extracted = text.slice(chunk.start, chunk.end);
      expect(extracted).toBe(chunk.text);
    }
  });

  it('preserves headings accurately', () => {
    const text = `# Перший блок
Текст першого блоку.

## Другий блок
Текст другого блоку.`;

    const chunks = chunkDocument('doc-test', text);
    expect(chunks.some((c) => c.heading === 'Перший блок' || c.heading === 'Другий блок')).toBe(true);
  });
});

