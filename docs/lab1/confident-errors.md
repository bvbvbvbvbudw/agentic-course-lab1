# Впевнені помилки · Лабораторна 1

Впевнена помилка: агент упевнено запропонував або заявив неправильне.
«Спіймали» означає, що є доказ (тест, типи, лінтер, журнал), а не відчуття.

| # | Інструмент | Режим | Що запропоновано / заявлено | Що насправді (executed) | Чому це помилка | Як спіймали | Рядок журналу |
|---|---|---|---|---|---|---|---|
| 1 | Claude Code | plan / acceptEdits | «Використовуємо аліас `@/src/health` для імпорту схеми, типи без помилок» | `npm run typecheck` пройшов, але `npm test` впав: `Cannot find package '@/src/health'` | У `vitest.config.ts` не налаштовано резолвер аліасів TypeScript; потрібен відносний імпорт `../../../src/health` | Запуск `npm test` після пропозиції агента | [48121e1 #L3](https://github.com/bvbvbvbvbudw/agentic-course-lab1/blob/48121e1/.agent-log/claude-code.jsonl#L3) · ts 2026-10-04T11:36:21.000Z · tool Write |
| 2 | OpenCode | plan | «Створити обробник маршруту в `pages/api/health.ts`» | Проєкт використовує App Router (`app/`), контрактний тест імпортує `../app/api/health/route` | Застарілий API (Pages Router); тест не бачить маршрут і падає з помилкою модуля | Аудит плану до схвалення та порівняння з `tests/health.test.ts` | [a1cdc63 #L3](https://github.com/bvbvbvbvbudw/agentic-course-lab1/blob/a1cdc63/.agent-log/opencode.jsonl#L3) · ts 2026-10-04T11:36:33.890Z · tool write |
| 3 | Claude Code | acceptEdits | «Ендпоінт динамічний за замовчуванням, додаткові директиви не потрібні» | `npm run build` згенерував статичну сторінку `○ /api/health`, зафіксувавши константний час збірки | `timestamp` не оновлюється під час запиту клієнта; обов'язково потрібен `export const dynamic = 'force-dynamic'` для `ƒ /api/health` | Аналіз таблиці маршрутів у виводі `next build` | [48121e1 #L5](https://github.com/bvbvbvbvbudw/agentic-course-lab1/blob/48121e1/.agent-log/claude-code.jsonl#L5) · ts 2026-10-04T11:36:21.000Z · tool Bash |

## Плани: задача /api/health (крок 03)

| Інструмент | Режим | Файли, які збирався чіпати | Чим збирався довести | Збігається з контрактом? |
|---|---|---|---|---|
| Claude Code | Plan mode | `app/api/health/route.ts` | `npm run typecheck`, `npm test`, `npm run build` | Так, після виправлення аліаса `@/` на відносний шлях та додавання `dynamic = 'force-dynamic'` |
| OpenCode | Plan mode | Спочатку `pages/api/health.ts`, після зауваження — `app/api/health/route.ts` | `npm test` | Так, після коригування розташування файлу за стандартом App Router |
