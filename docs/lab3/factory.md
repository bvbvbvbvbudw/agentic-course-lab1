# Фабрика задач: черга, виконавець та артефакти

- Черга задач: [`docs/lab3/tasks.jsonl`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab3/tasks.jsonl) (24 задачі)
- Виконавець задач: [`scripts/harness/run-task.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/scripts/harness/run-task.ts)
- Раннер черги: [`scripts/harness/run-queue.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/scripts/harness/run-queue.ts)
- Артефакти прогонів: [`docs/lab3/runs/`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab3/runs/)
- Тести виконавця (без мережі): [`tests/harness/run-task.test.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/tests/harness/run-task.test.ts)

## 1. Форма задачі
Усі задачі в черзі `tasks.jsonl` мають фіксовану типізовану форму:
```json
{
  "id": "t-01",
  "input": "Додати перевірку валідності JSON-файлів у скрипт doctor.ts",
  "acceptance": ["npm run doctor"],
  "budget": { "max_turns": 10, "max_usd": 0.05, "timeout_s": 60 },
  "files": ["scripts/doctor.ts"],
  "label": "pass",
  "source": "run-2026-10-14-doctor",
  "bucket": "regression",
  "frozen_at": "2026-10-18"
}
```
Поле `acceptance` складається виключно з детермінованих команд терміналу, що повертають числовий код виходу (exit code 0 = успіх).

## 2. Виклик агента та ізоляція середовища
- **Обраний шлях:** Автономний TypeScript-раннер із контрольованими дозволами та підтримкою моделей через AI SDK (Gemini 2.5 Flash на безкоштовному рівні або локальна Ollama).
- **Ізоляція:** Робоче дерево `runs/<task-id>-<timestamp>` ізолює файлові маніпуляції агента від основного робочого дерева розробника.
- **Обмеження:** Кожна задача запускається з жорсткими лімітами ходів `max_turns`, таймаутом у секундах `timeout_s` та бюджетом `max_usd`.

## 3. Де лежать артефакти
Кожен прогін породжує ізольовану теку у `runs/` (а відібрані докази — у `docs/lab3/runs/<task-id>-<timestamp>/`), що містить 4 обов'язкові файли:
1. `run.json`: повні метадані прогону (тривалість у мілісекундах, кількість ходів, статус виходу, вердикти команд).
2. `output.txt`: консольний вивід виконаних команд `acceptance`.
3. `agent.log`: журнал дій, спостережень та рішень агента.
4. `patch.diff`: знімок внесених змін у робочому дереві.

## 4. Журнал прогону (`run.json`)
Приклад згенерованого метафайлу для задачі `t-01`:
```json
{
  "taskId": "t-01",
  "runId": "t-01-1760000000000",
  "startedAt": "2026-10-18T10:00:00.000Z",
  "completedAt": "2026-10-18T10:00:00.356Z",
  "durationMs": 356,
  "turns": 1,
  "costUsd": 0.0012,
  "exitStatus": "success",
  "acceptancePassed": true,
  "commandsExecuted": [
    { "command": "npm run doctor", "exitCode": 0 }
  ]
}
```

## 5. Як перезапустити одну задачу
Для відтворення та повторного запуску конкретної задачі за її ID:
```bash
npx tsx scripts/harness/run-task.ts t-01
```

## 6. Що перевірено без мережі
Тестовий набір `tests/harness/run-task.test.ts` перевіряє:
- Створення всіх чотирьох артефактів (`run.json`, `output.txt`, `agent.log`, `patch.diff`) для успішних прогонів;
- Коректне фіксування аварійних ситуацій (exitStatus: failed) при падінні команд `acceptance`;
- Негайне переривання виконання (exitStatus: circuit_broken) при розімкненому Circuit Breaker.

