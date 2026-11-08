# Звіт та пакет доказів: Лабораторна 2

> **Тема:** Асистент із гібридним пошуком і власним MCP-сервером на основі специфікації  
> **Дисципліна:** Агентна інженерія · 2026/2027  
> **Статус:** Роботу повністю виконано · Усі брами зелені

---

## 1. Зміст пакета доказів (Docs Map)
| Крок | Назва артефакту | Файл у `docs/lab2/` | Що доводить |
|---|---|---|---|
| 00 | Специфікація | [`spec.md`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab2/spec.md) | Вимірювані цілі, інвентар 16 документів, критерії приймання |
| 01 | Еталонний набір | [`eval-set.md`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab2/eval-set.md) & [`golden/queries.jsonl`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab2/golden/queries.jsonl) | 20 зафіксованих запитів (3 unanswerable, 2 injection) |
| 01 | Базова лінія | [`baseline.md`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab2/baseline.md) | 0% correct, 85% wrong без контексту документів |
| 02 | Субагенти | [`subagents.md`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab2/subagents.md) | Ізоляція контексту `spec-auditor` та `explorer`, звіт по diff |
| 03 | Верифікатор | [`verifier.md`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab2/verifier.md) | Брама злиття на іншій моделі, калібрування на 10 випадках |
| 04 | Індексація | [`indexing.md`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab2/indexing.md) | 7 контрольних чисел, правило фрагментації, індекс `data/index.json` |
| 05 | Гібридний пошук | [`retrieval.md`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab2/retrieval.md) | BM25 (k1=1.2, b=0.75) + RRF (k=60), цитування, правило відмови |
| 06 | Оцінювання пошуку | [`eval-report.md`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab2/eval-report.md) & [`eval-run.json`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab2/eval-run.json) | Recall@5: 95.0%, MRR: 0.892, розбір 4 класів помилок |
| 07 | Бюджет і паралельність | [`budget.md`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab2/budget.md) & [`parallel-run.json`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab2/parallel-run.json) | Граф залежностей, прискорення 4x на пулі ширини 4 |
| 08 | Специфікація MCP | [`mcp-spec.md`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab2/mcp-spec.md) | Інструменти `search_corpus`, `fetch_chunk`, безпека, allowlist |
| 09 | Інтеграція MCP | [`mcp-integration.md`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab2/mcp-integration.md) & [`.mcp.json`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/.mcp.json) | Підключення до агента та до застосунку, журнал `traces/mcp-calls.jsonl` |
| -- | Журнал автономності | [`autonomy-log.md`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab2/autonomy-log.md) | 4 сесії (заняття 05–08) з датами, дозволами та доказами |

---

## 2. Підсумкові числа «До» та «Після»
| Метрика | Базова лінія (без пошуку) | Гібридний пошук | Ціль у `spec.md` | Результат |
|---|---|---|---|---|
| **Успішні відповіді (Correct)** | 0 (0.0%) | **16 (80.0%)** | Максимізація | **+80.0%** |
| **Відмови на unanswerable** | 0 (0.0%) | **3 (15.0%)** | 100% відмов | **100% (3 з 3)** |
| **Помилкові відповіді (Wrong)** | 17 (85.0%) | **0 (0.0%)** | Мінімізація | **0% помилок** |
| **Mean Recall@5** | 0.000 | **0.950 (95.0%)** | ≥ 0.850 | **Перевищено на 10.0 п.п.** |
| **Mean Reciprocal Rank (MRR)** | 0.000 | **0.892** | ≥ 0.700 | **Перевищено на +0.192** |
| **Точність цитування** | N/A | **100.0%** | 100% | **0 галюцинацій** |
| **Стійкість до ін'єкцій** | 0.0% | **100.0%** | 100% | **2 з 2 нейтралізовано** |

---

## 3. Код та тестове покриття в репозиторії
- Фрагментація та індекс: [`src/rag/chunk.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/src/rag/chunk.ts), [`src/rag/embed.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/src/rag/embed.ts), [`src/rag/store.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/src/rag/store.ts)
- Гібридний пошук: [`src/rag/bm25.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/src/rag/bm25.ts), [`src/rag/rrf.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/src/rag/rrf.ts), [`src/rag/search.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/src/rag/search.ts), [`src/rag/cite.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/src/rag/cite.ts)
- MCP-сервер: [`src/mcp/tools.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/src/mcp/tools.ts), [`src/mcp/server.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/src/mcp/server.ts)
- Тести Vitest (усі зелені, без зовнішньої мережі):
  - [`tests/validate-golden.test.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/tests/validate-golden.test.ts)
  - [`tests/chunk.test.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/tests/chunk.test.ts)
  - [`tests/index.test.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/tests/index.test.ts)
  - [`tests/retrieval.test.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/tests/retrieval.test.ts)
  - [`tests/metrics.test.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/tests/metrics.test.ts)
  - [`tests/mcp.test.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/tests/mcp.test.ts)

---

## 4. Інструменти та моделі
- **Основна модель виконання:** Gemini 2.5 Flash / Pro (через AI SDK)
- **Модель-верифікатор:** GPT-4o / Qwen 2.5 Coder
- **Ембедінги:** 768 розмірів (mock-ембедер у тестах, `nomic-embed-text` в Ollama, `text-embedding-004` у Gemini)
- **MCP Протокол:** `@modelcontextprotocol/server` версії 2.4.0

---

## 5. Інструкція з відтворення
1. **Перевірка типів, лінтер та тести:**
   ```bash
   npm run typecheck && npm run lint && npm test
   ```
2. **Перебудова індексу документів:**
   ```bash
   npx tsx scripts/build-index.ts
   ```
3. **Запуск гібридного пошуку через CLI:**
   ```bash
   npx tsx scripts/search.ts "Reciprocal Rank Fusion k=60" --explain
   ```
4. **Повний прогін оцінювання на еталонному наборі:**
   ```bash
   npx tsx scripts/eval-run.ts
   npx tsx scripts/eval-run.ts --summary docs/lab2/eval-run.json
   ```
5. **Запуск та тестування MCP-сервера:**
   ```bash
   npx tsx scripts/mcp-demo.ts
   ```

