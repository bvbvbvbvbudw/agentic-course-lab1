# Пакет доказів · Лабораторна 1

Автор: Богдан, група: комп'ютерні науки / програмна інженерія (2026-2027)

## Інструменти
| Роль | Інструмент | Версія (`<інструмент> --version`) | План або модель |
|---|---|---|---|
| Агент кодування A | Claude Code | 2.1.289 | Claude 3.7 Sonnet |
| Агент кодування B | OpenCode | 1.18.34 | Ollama `qwen2.5-coder:14b` |

## Як запустити у двох інструментах
### Інструмент A (Claude Code)
1. **Встановлення та автентифікація:** `npm install -g @anthropic-ai/claude-code`, налаштувати `ANTHROPIC_API_KEY` або виконати `claude login`.
2. **Запуск у репозиторії:** Виконати команду `claude` у корені проєкту. Claude Code автоматично зчитує системні інструкції з `CLAUDE.md`, який через директиву `@AGENTS.md` підвантажує кореневі правила репозиторію.
3. **Режим плану:** Перед внесенням деструктивних змін скористайтеся вбудованим режимом планування `/plan` для аналізу структури проєкту без передчасного редагування файлів.
4. **Журналювання дій:** Перехоплювач `PostToolUse` у `.claude/settings.json` транслює всі виклики інструментів у файл `.agent-log/claude-code.jsonl` за 6-польовою схемою курсу.

### Інструмент B (OpenCode)
1. **Встановлення:** `npm install -g opencode-ai` (або запуск через `npx opencode-ai`).
2. **Запуск та конфігурація:** Виконати команду `opencode` у корені репозиторію. Інструмент автоматично розпізнає та завантажує правила з `AGENTS.md`.
3. **Використання локальної моделі:** Запустити локальний сервер `ollama serve`. У `.env.local` вказати `OLLAMA_MODEL=qwen2.5-coder:14b` та `OLLAMA_BASE_URL=http://localhost:11434`.
4. **Плагін журналювання:** Плагін `.opencode/plugins/agent-log.js` автоматично фіксує події виконання інструментів у `.agent-log/opencode.jsonl`.

## Прогони CI
- **Зелений прогін на main:** https://github.com/bvbvbvbvbudw/agentic-course-lab1/actions/runs/37201415859 (коміт `d69a070`)
- **Зелений job «Playwright (не блокує)»:** https://github.com/bvbvbvbvbudw/agentic-course-lab1/actions/runs/37201415859/job/111433850807 · копія скріншота головної сторінки: [docs/lab1/e2e-home.png](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab1/e2e-home.png)
- **Червоний прогін «поганого патча»:** https://github.com/bvbvbvbvbudw/agentic-course-lab1/actions/runs/37201598178 (гілка `lab1/bad-patch`, коміт `8bad51c`) · **яка перевірка спрацювала:** Сходинка «Перевірка типів» (`tsc --noEmit`) та юніт-тести у job «Типи, лінт, тести, збірка» (виявлено невідповідність типу контракту `HealthResponse`).

## Та сама задача в двох інструментах (/api/health)
- **lab1/health-claude:** https://github.com/bvbvbvbvbudw/agentic-course-lab1/tree/lab1/health-claude · порівняння з базовим комітом `51e3e52`: https://github.com/bvbvbvbvbudw/agentic-course-lab1/compare/51e3e52...lab1/health-claude
- **lab1/health-opencode:** https://github.com/bvbvbvbvbudw/agentic-course-lab1/tree/lab1/health-opencode · порівняння з базовим комітом `51e3e52`: https://github.com/bvbvbvbvbudw/agentic-course-lab1/compare/51e3e52...lab1/health-opencode
- **lab1/health-loop (власний цикл):** https://github.com/bvbvbvbvbudw/agentic-course-lab1/tree/lab1/health-loop · порівняння з базовим комітом `51e3e52`: https://github.com/bvbvbvbvbudw/agentic-course-lab1/compare/51e3e52...lab1/health-loop
- **У main злито:** реалізацію ендпоінта за контрактом (базовий коміт `51e3e52`, контрактний тест `tests/health.test.ts`)

## Деплой і траси
- **Ендпоінт:** `https://agentic-course-lab1.vercel.app/api/agent` (локально: `http://localhost:3000/api/agent`) · **рантайм:** Vercel Serverless Function (Node.js 24)
- **Команда виклику:**
  ```bash
  curl -X POST https://agentic-course-lab1.vercel.app/api/agent \
    -H "Content-Type: application/json; charset=utf-8" \
    -d '{"prompt":"Котра зараз година?"}'
  ```
- **Система трасування:** Langfuse Cloud (EU Region: `https://cloud.langfuse.com`, проєкт `agentic-course-lab1`)
- **Скріншоти трас:** [docs/lab1/traces/](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab1/traces/)
  - `trace-1.png`: траса запиту з викликом інструмента `getTime` (480 токенів, 1.24 с, $0.000072)
  - `trace-2.png`: траса повторного запиту дати з викликом `getTime` (487 токенів, 1.18 с, $0.000075)
  - `trace-3.png`: траса текстового запиту без інструментів (525 токенів, 2.05 с, $0.000185)
  - `traces-list.png`: загальний список трас у кабінеті Langfuse із переліком викликів функції `lab01-agent`
- **Публічне посилання на проєкт/траси:** https://cloud.langfuse.com/project/agentic-course-lab1/traces

## Докази за критеріями
| Критерій | Файл або посилання |
|---|---|
| AGENTS.md ≤ 200 рядків, тест 40% | [AGENTS.md](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/AGENTS.md) · [docs/lab1/agents-md-40.md](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab1/agents-md-40.md) |
| Журнал із двох інструментів | [.agent-log/claude-code.jsonl](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/.agent-log/claude-code.jsonl), [.agent-log/opencode.jsonl](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/.agent-log/opencode.jsonl) |
| Впевнені помилки | [docs/lab1/confident-errors.md](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab1/confident-errors.md) |
| Навичка, обидва розташування, спрацювання | [.claude/skills/add-api-route/](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/.claude/skills/add-api-route/) · [.agents/skills/add-api-route/](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/.agents/skills/add-api-route/) · [docs/lab1/skill-trigger.md](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab1/skill-trigger.md) |
| Заборона: рядок denied | https://github.com/bvbvbvbvbudw/agentic-course-lab1/blob/main/.agent-log/claude-code.jsonl#L11 |
| MCP і ціна контексту | [docs/lab1/context-cost.md](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab1/context-cost.md) |
| Оцінка токенів, кеш, ua/en, три прогони | [docs/lab1/cost.md](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab1/cost.md) |
| Власний цикл і тести | [src/agent/agent-loop.ts](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/src/agent/agent-loop.ts) · [tests/agent-loop.test.ts](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/tests/agent-loop.test.ts) |
| Порівняння «та сама задача» | [docs/lab1/comparison.md](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab1/comparison.md) |
| SDK і підтвердження дій | [src/agent/agent-aisdk.ts](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/src/agent/agent-aisdk.ts) · [tests/agent-aisdk.test.ts](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/tests/agent-aisdk.test.ts) |
| Рішення про модель | [docs/lab1/model-decision.md](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab1/model-decision.md) |
| Переносність | [docs/lab1/portability.md](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab1/portability.md) |
| Журнал автономності | [docs/lab1/autonomy-log.md](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab1/autonomy-log.md) |
| Чернетка «Вступу» | [docs/lab1/intro-draft.md](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab1/intro-draft.md) |
