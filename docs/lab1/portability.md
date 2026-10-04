# Переносність між інструментами

Інструмент A: Claude Code 2.1.289 · Інструмент B: OpenCode 1.18.34
Значення: «працює без змін» / «потрібна адаптація: яка» / «не підтримується: чим замінили».
Колонка «Доказ» необов'язкова: посилання на коміт, конфіг або рядок журналу.

| Артефакт | Інструмент A (Claude Code) | Інструмент B (OpenCode) | Доказ |
|---|---|---|---|
| AGENTS.md | потрібна адаптація: рядок `@AGENTS.md` у `CLAUDE.md` | працює без змін: читає `AGENTS.md` із кореня | [CLAUDE.md](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/CLAUDE.md), [AGENTS.md](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/AGENTS.md) |
| Режим плану | працює без змін: вбудований режим планування (plan mode) | потрібна адаптація: запуск в ізольованому режимі без дозволів на запис | гілки `lab1/health-*` |
| Журнал дій (формат із 6 полів) | потрібна адаптація: подія `PostToolUse` у `.claude/settings.json` | потрібна адаптація: плагін `.opencode/plugins/agent-log.js` (`tool.execute.after`) | `.agent-log/*.jsonl` |
| Навичка | читає з `.claude/skills/` | читає з `.agents/skills/` (після `sync-skills`) | крок 04 |
| Заборона запису в .env | pre-hook у `.claude/settings.json` з кодом виходу `deny` | перехоплення виклику інструменту у плагіні / permissions | крок 05 |
| MCP-конектор документації | конфіг `.claude/mcp.json` / `settings.json` | блок `mcp` у `opencode.json` | крок 05 |
| Скріншот-тест | спільний Playwright тест у `tests/e2e/` | спільний Playwright тест у `tests/e2e/` | крок 06 |

## Що довелося писати двічі
- Конфігурації перехоплювачів журналювання: Claude Code використовує CLI-команду з фільтрацією через `jq`, а OpenCode — модуль JavaScript із колбеком `tool.execute.after`.
- Розташування навичок: джерело в `.claude/skills/`, дзеркало для сумісності в `.agents/skills/` через `npm run sync-skills`.
