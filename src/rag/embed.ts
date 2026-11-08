export interface Embedder {
  readonly dimension: number;
  embed(text: string): Promise<number[]>;
  embedMany(texts: string[]): Promise<number[][]>;
}

export const EMBEDDING_DIMENSION = 768;

export function mockEmbedder(dim = EMBEDDING_DIMENSION): Embedder {
  function textToVector(text: string): number[] {
    const vec = new Array<number>(dim).fill(0);
    const words = text.toLowerCase().match(/\p{L}+|\d+/gu) ?? [];
    if (words.length === 0) {
      vec[0] = 1;
      return vec;
    }

    for (const word of words) {
      let hash = 0;
      for (let j = 0; j < word.length; j++) {
        hash = (hash * 31 + word.charCodeAt(j)) | 0;
      }
      const idx = Math.abs(hash) % dim;
      vec[idx] = (vec[idx] ?? 0) + 1;
    }

    let norm = 0;
    for (let i = 0; i < dim; i++) {
      const val = vec[i] ?? 0;
      norm += val * val;
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < dim; i++) {
        vec[i] = (vec[i] ?? 0) / norm;
      }
    }
    return vec;
  }

  return {
    dimension: dim,
    async embed(text: string): Promise<number[]> {
      return textToVector(text);
    },
    async embedMany(texts: string[]): Promise<number[][]> {
      return texts.map(textToVector);
    },
  };
}

export function ollamaEmbedder(
  model = 'nomic-embed-text',
  baseUrl = 'http://localhost:11434',
  dim = EMBEDDING_DIMENSION,
): Embedder {
  async function fetchEmbedding(prompt: string): Promise<number[]> {
    try {
      const res = await fetch(`${baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt }),
      });
      if (!res.ok) {
        throw new Error(`Ollama embedding error: ${res.statusText}`);
      }
      const data = (await res.json()) as { embedding: number[] };
      return data.embedding;
    } catch {
      return mockEmbedder(dim).embed(prompt);
    }
  }

  return {
    dimension: dim,
    async embed(text: string): Promise<number[]> {
      return fetchEmbedding(text);
    },
    async embedMany(texts: string[]): Promise<number[][]> {
      return Promise.all(texts.map(fetchEmbedding));
    },
  };
}

export function geminiEmbedder(
  apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  dim = EMBEDDING_DIMENSION,
): Embedder {
  return {
    dimension: dim,
    async embed(text: string): Promise<number[]> {
      if (!apiKey) return mockEmbedder(dim).embed(text);
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'models/text-embedding-004',
            content: { parts: [{ text }] },
          }),
        });
        const data = (await res.json()) as { embedding?: { values: number[] } };
        return data.embedding?.values ?? (await mockEmbedder(dim).embed(text));
      } catch {
        return mockEmbedder(dim).embed(text);
      }
    },
    async embedMany(texts: string[]): Promise<number[][]> {
      return Promise.all(texts.map((t) => this.embed(t)));
    },
  };
}
