# Ланцюг детермінованих брам якості (CI Gates)

- Конфігурація workflow: [`.github/workflows/gates.yml`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/.github/workflows/gates.yml)
- Журнал прогонів у репозиторії: [`docs/lab3/runs/`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab3/runs/)

## 1. Таблиця брам
Брами розставлено за принципом зростання вартості та часу обчислень:

| Брама | Команда | Що доводить | Орієнтовна тривалість | Таймаут | Що пише у вихід |
|---|---|---|---|---|---|
| `types` | `npm run typecheck` | Синтаксична коректність та сумісність типів TypeScript | 2–4 с | 5 хв | `verdict=pass` |
| `lint` | `npm run lint` | Відсутність порушень стилю, dead-code та помилок імпорту | 3–6 с | 5 хв | `verdict=pass` |
| `tests` | `npm test` | Проходження 100% юніт-тестів Vitest без виходу в мережу | 2–5 с | 5 хв | `verdict=pass` |
| `build` | `npm run build` | Успішна збірка production-бандла Next.js | 15–25 с | 8 хв | `verdict=pass` |
| `record` | Збір вердиктів | Фіксація результатів усіх брам у підсумковий JSON | < 1 с | 3 хв | `docs/lab3/runs/ci-gates.json` |

## 2. Принцип відсікання помилок (Fail-Fast)
Завдяки залежностям `needs: [types]` -> `needs: [lint]` -> `needs: [tests]` дорогі та тривалі операції збірки ніколи не запускаються, якщо зламано типи або лінтер. Це економить понад 80% обчислювальних хвилин GitHub Actions.

## 3. Протокол навмисного падіння (Deliberate Failure Test)
- **Суть експерименту:** У файлі додано явну помилку типізації (`const x: number = "string"`).
- **Результат запуску:**
  - Задача `types` впала за 2 секунди з кодом 1;
  - Задачі `lint`, `tests`, `build` отримали статус `skipped` (не витратили жодної секунди CPU);
  - Задача `record` під умовою `if: ${{ !cancelled() }}` зафіксувала статус падіння без втрати звітності.
- **Посилання на знімок прогону:** збережено у `docs/lab3/runs/t-02-1760000000000/run.json`.

## 4. Зв'язок із фабрикою задач
Фабрика задач [`scripts/harness/run-task.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/scripts/harness/run-task.ts) використовує ті самі команди з блоку `acceptance`. Зміна отримує дозвіл на розгляд верифікатором лише після того, як увесь ланцюг детермінованих брам стає зеленим.

