# AGENTS.md

Навчальний репозиторій курсу «Агентна інженерія»: Next.js App Router сервіс із власним агентним циклом та верифікацією інструментів.

## Стек
- Node.js >= 22, npm.
- TypeScript (strict mode), Next.js App Router (тека `app/`, маршрути API лише в `app/api/*/route.ts`).
- Валідація схем — Zod, тести — Vitest (тека `tests/`).

## Команди
- `npm test` — юніт-тести (Vitest, без мережі).
- `npm run typecheck` — сувора перевірка типів (`tsc --noEmit`).
- `npm run lint` — лінтер ESLint.
- `npm run build` — збірка production-бандла Next.js.
- **Критерій «готово»:** агент зобов'язаний запустити `npm run typecheck && npm run lint && npm test && npm run build` перед здачею задачі. Усі перевірки мають бути зеленими.

## Межі та безпека
- Заборонено читати чи редагувати `.env*` файли (крім `.env.example`). Секрети налаштовує виключно людина.
- Не змінювати `package-lock.json`, `tsconfig.json`, `vitest.config.ts` без прямої вказівки.
- Тести ізольовані: заборонено ходити в мережу чи викликати платні API.
- Деструктивні дії (видалення файлів, `git push`, заміна залежностей) вимагають явного схвалення людини.

## Домовленості
- Моделі обираються ролями з `src/models.ts` (`MODELS.cheap`, `MODELS.primary`), а не захардкодcolumnженими назвами.
- Формат повідомлень комітів: Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- Новий маршрут API завжди супроводжується схемою Zod у `src/` та тестом контракту в `tests/`.
