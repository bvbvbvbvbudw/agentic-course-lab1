# Звіт та пакет доказів: Лабораторна 3

> **Тема:** Харнес автономних агентів з оцінюванням якості та перевіркою безпеки  
> **Дисципліна:** Агентна інженерія · 2026/2027  
> **Статус:** Роботу повністю виконано · Усі брами зелені

---

## 1. Зміст пакета доказів (Docs Map)
| Крок | Назва артефакту | Файл у `docs/lab3/` | Що доводить |
|---|---|---|---|
| 00 | Фабрика задач | [`factory.md`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab3/factory.md) & [`tasks.jsonl`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab3/tasks.jsonl) | 24 задачі з детермінованими командами acceptance, артефакти у [`runs/`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab3/runs/) |
| 01 | Ланцюг брам | [`gates.md`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab3/gates.md) & [`.github/workflows/gates.yml`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/.github/workflows/gates.yml) | Ланцюг `types` -> `lint` -> `tests` -> `build` -> `record`, fail-fast |
| 02 | Верифікатор харнеса | [`verifier.md`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab3/verifier.md) | Сувора брама після детермінованих перевірок, блокування на non-pass |
| 03 | Автоматичне зупинення | [`stop.md`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab3/stop.md) & [`stop-log.jsonl`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab3/stop-log.jsonl) | 3 шари захисту: бюджет задачі, AI SDK `stopWhen`, Circuit Breaker |
| 04 | Evals у CI | [`evals.md`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab3/evals.md) & [`evals-baseline.json`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab3/evals-baseline.json) | k=3 спроби, pass@k=1.0, pass^k=1.0 у кошику regression, регресійна брама |
| 05 | Калібрування судді | [`judge.md`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab3/judge.md) & [`judge-cases.jsonl`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab3/judge-cases.jsonl) | 20 розмічених випадків (14 dev, 6 holdout), каппа Коена $\kappa = 1.000$ |
| 06 | Траси та помилки | [`errors.md`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab3/errors.md) & [`traces/`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab3/traces/) | Таксономія 5 класів помилок за конвенціями OpenTelemetry GenAI |
| 07 | Red-team безпека | [`redteam.md`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab3/redteam.md) & [`redteam.jsonl`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab3/redteam.jsonl) | 6 атак через 3 точки входу (MITRE ATLAS), 100% нейтралізація інваріантами |
| -- | Журнал автономності | [`autonomy-log.md`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab3/autonomy-log.md) | Сесії (заняття 09–10) з фіксацією дати, моделі та відсутності інцидентів |

---

## 2. Підсумкові показники харнеса
| Метрика | Значення | Цільовий норматив | Статус |
|---|---|---|---|
| **pass^k (стабільність у кошику regression)** | **1.000 (100%)** | 1.000 | **ВИКОНАНО** |
| **pass@k (успіх у кошику regression)** | **1.000 (100%)** | ≥ 0.900 | **ВИКОНАНО** |
| **Каппа Коена ($\kappa$) судді** | **1.000** | ≥ 0.700 (substantial agreement) | **ПЕРЕВИЩЕНО** |
| **Згода судді з автором ($P_o$)** | **100.0%** | ≥ 80.0% | **ВИКОНАНО** |
| **Стійкість Red-team проти атак** | **6 з 6 (100%)** | 100% інваріантів | **ВИКОНАНО** |
| **Медіанний час виконання задачі** | **540 ms** | ≤ 60 000 ms | **ШВИДКОДІЯ ПІДТВЕРДЖЕНА** |

---

## 3. Код та скрипти реалізації
- Виконавець та черга: [`scripts/harness/run-task.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/scripts/harness/run-task.ts), [`scripts/harness/run-queue.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/scripts/harness/run-queue.ts)
- Захист від збоїв: [`src/harness/breaker.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/src/harness/breaker.ts), [`src/harness/stop.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/src/harness/stop.ts)
- Оцінювачі та брама: [`scripts/evals/graders.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/scripts/evals/graders.ts), [`scripts/evals/run-evals.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/scripts/evals/run-evals.ts), [`scripts/evals/gate.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/scripts/evals/gate.ts)
- Калібрування: [`scripts/kappa.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/scripts/kappa.ts), [`scripts/judge/calibrate.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/scripts/judge/calibrate.ts)
- Безпека: [`scripts/redteam/invariants.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/scripts/redteam/invariants.ts), [`scripts/redteam/cases.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/scripts/redteam/cases.ts), [`scripts/redteam/run-redteam.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/scripts/redteam/run-redteam.ts)

---

## 4. Інструкція з повторення автономного прогону
1. **Запуск черги задач фабрики:**
   ```bash
   npx tsx scripts/harness/run-queue.ts
   ```
2. **Перевірка роботи контролера Circuit Breaker:**
   ```bash
   npx tsx scripts/harness/run-task.ts --self-test
   ```
3. **Запуск Evals у CI та перевірка регресійної брами:**
   ```bash
   npx tsx scripts/evals/run-evals.ts
   npx tsx scripts/evals/gate.ts
   ```
4. **Запуск калібрування судді та розрахунку каппи Коена:**
   ```bash
   npx tsx scripts/judge/calibrate.ts
   ```
5. **Запуск повного Red-team тесту інваріантів безпеки:**
   ```bash
   npx tsx scripts/redteam/run-redteam.ts
   ```

