# Автоматичне зупинення: бюджет, таймаут та Circuit Breaker

- Реалізація Circuit Breaker: [`src/harness/breaker.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/src/harness/breaker.ts)
- Контролер зупинки: [`src/harness/stop.ts`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/src/harness/stop.ts)
- Журнал спрацювання зупинок: [`docs/lab3/stop-log.jsonl`](file:///Users/bvbvbvbvbudw/Documents/projects/univ/01-lab/docs/lab3/stop-log.jsonl)

## 1. Три шари захисту від безкінечного циклу
Харнес реалізує багаторівневий ешелонований захист:

```
[ Шар 3: Харнес ] -> Circuit Breaker (3 послідовні збої -> розмикання ланцюга OPEN)
       |
[ Шар 2: Прогін ] -> AI SDK stopWhen (isStepCount(20), hasToolCall)
       |
[ Шар 1: Задача ] -> Ліміти бюджету (max_turns <= 10, max_usd <= 0.05, timeout_s <= 60s)
```

1. **Шар задачі (Task Budget):** Кожна задача з `tasks.jsonl` має строгі межі ходів (5–10), таймаут у секундах (30–60 с) та оцінку витрат у USD ($0.02–0.05).
2. **Шар прогону (Run Layer):** Умова зупинки в циклі моделі AI SDK `stopWhen: isStepCount(20)` гарантує, що модель не зациклиться на генерації повторюваних інструментів.
3. **Шар харнеса (Harness Layer — Circuit Breaker):** Якщо 3 задачі поспіль зазнають невдачі, харнес негайно зупиняє обробку черги, запобігаючи неконтрольованому вичерпанню квот та бюджету API.

## 2. Походження патерну Circuit Breaker (чесно)
Патерн Circuit Breaker перенесено в інженерію програмного забезпечення Майклом Найгардом (Michael Nygard) у класичній книзі *«Release It! Design and Deploy Production-Ready Software»* (2007). Патерн запозичено з електротехніки: запобіжник розмикає електричний контур при перевантаженні струмом, рятуючи проводку від пожежі. У розподілених системах він став де-факто стандартом завдяки бібліотеці Netflix Hystrix (2012) та Resilinece4j.

## 3. Доказ прогону, який зупинився сам
У журналі `docs/lab3/stop-log.jsonl` зафіксовано спрацювання захисного шару:
```json
{"ts":"2026-10-18T10:15:30.120Z","layer":"harness:circuit-breaker","state":"OPEN","failures":3,"reason":"Досягнуто ліміт 3 послідовних збоїв"}
```
При переході в стан `OPEN` наступні задачі миттєво повертають статус `circuit_broken` без звернення до API або запуску підпроцесів.

## 4. Чого я НЕ контролюю
- Раптові збої або внутрішні затримки провайдерів моделі (HTTP 500 / 503 на стороні Google AI Studio або OpenAI);
- Неопубліковані плаваючі ліміти запитів на хвилину (RPM / TPM) на безкоштовних тарифах;
- Час завантаження важких образів або мережевих залежностей на раннерах GitHub Actions.

