# Підключення MCP-сервера до агента кодування та застосунку

- Специфікація сервера: [`docs/lab2/mcp-spec.md`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab2/mcp-spec.md)
- Код сервера: [`src/mcp/server.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/src/mcp/server.ts)
- Інструменти та схеми: [`src/mcp/tools.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/src/mcp/tools.ts)
- Конфігурація агента: [`.mcp.json`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/.mcp.json)
- Демо підключення: [`scripts/mcp-demo.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/scripts/mcp-demo.ts)
- Траса викликів: [`docs/lab2/traces/mcp-calls.jsonl`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab2/traces/mcp-calls.jsonl)

## 1. Бік 1 — Агент кодування
Сервер `lab2-corpus` підключено до агента кодування (Claude Code / Gemini CLI) через стандартний транспорт `stdio` та файл конфігурації `.mcp.json` у корені проєкту:

```json
{
  "mcpServers": {
    "lab2-corpus": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "src/mcp/server.ts"],
      "env": {
        "MCP_CLIENT_LABEL": "claude-code"
      }
    }
  }
}
```

Агент автономно виявляє зареєстровані інструменти `search_corpus` та `fetch_chunk`, викликаючи їх під час сесії дослідження кодової бази та цитування джерел.

## 2. Бік 2 — Застосунок (Application Layer)
У внутрішній логіці бекенду (Next.js маршрути або фонові скрипти) ті самі інструменти викликаються через модуль `src/mcp/tools.ts` та підключення клієнта MCP:
```typescript
import { searchCorpus, fetchChunk } from '@/mcp/tools';

// Виклик пошуку з боку бекенду застосунку
const hits = await searchCorpus(deps, { query: 'як працює Circuit Breaker', topK: 3 });
```
Це гарантує, що і зовнішні AI-агенти, і внутрішній код застосунку використовують єдине джерело істини з однаковими правилами валідації та безпеки.

## 3. Що зламалося з першого разу
1. **Забруднення stdout:** При першій спробі виклику налагоджувальний вивід `console.log` вивів повідомлення в `stdout`. Оскільки transport `stdio` використовує `stdout` як бінарно-текстовий канал для JSON-RPC повідомлень, клієнт MCP зазнав збою `JSONRPCParseError`. 
   - *Виправлення:* Усі діагностичні повідомлення перенесено виключно у `console.error` (потік `stderr`), а системний аудит винесено у файл `docs/lab2/traces/mcp-calls.jsonl`.
2. **Відносні шляхи до індексу:** Запуск з підкаталогів ламав відносний шлях `data/index.json`.
   - *Виправлення:* Шляхи обчислюються абсолютно через `import.meta.url` та `resolve(HERE, '../..')`.

## 4. Чим відрізняються два боки
- **З боку агента:** Виклик відбувається через семантичний Tool Use механізм моделі: LLM сама інтерпретує системну інструкцію інструмента та генерує JSON-аргументи.
- **З боку застосунку:** Виклик є детермінованим викликом функції з суворою типізацією TypeScript та синхронним перехопленням винятків.

## 5. Секрети
Конфігурація `.mcp.json` не містить жодного пароля, токена чи секретного ключа. Сервер спирається на локальний індекс `data/index.json` та системні змінні оточення хоста.

