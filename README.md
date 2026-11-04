# Мини-CRM «Объекты и задачи»

React + TypeScript + Supabase. Постановщик ставит задачи по объектам, исполнители берут их в работу и отдают на проверку. Права и переходы статусов проверяет база данных (Postgres), а не интерфейс.

## Запуск локально

Нужны Node 22+, pnpm, Docker.

```bash
pnpm install                # pnpm 10+; скрипт сборки esbuild отключён осознанно (pnpm-workspace.yaml)
pnpm supabase start        # поднимает локальный Supabase, применяет миграции и seed
cp .env.example .env.local # впишите URL и anon key из `pnpm supabase status`
pnpm dev                   # http://127.0.0.1:5173
```

Сброс базы: `pnpm supabase db reset`.

### Тестовые пользователи (только локальная база)

| Роль        | Email               | Пароль      |
| ----------- | ------------------- | ----------- |
| Постановщик | manager@example.com | password123 |
| Исполнитель | ivan@example.com    | password123 |
| Исполнитель | petr@example.com    | password123 |

## Проверки

```bash
pnpm lint && pnpm typecheck && pnpm test   # юнит-тесты и линтер
pnpm test:db                               # тесты безопасности БД (нужен запущенный локальный Supabase)
pnpm e2e                                   # Playwright (локальный Supabase + seed)
pnpm e2e:prod                              # те же e2e на production-сборке с CSP и заголовками безопасности
```

## Структура

- `supabase/migrations/` — схема, RLS и права, триггеры, RPC `change_task_status`.
- `supabase/seed.sql` — демо-данные (3 объекта, 7 задач во всех статусах).
- `supabase/tests/` — интеграционные тесты безопасности.
- `src/domain`, `src/application`, `src/infrastructure`, `src/presentation` — чистая архитектура (границы проверяет ESLint).
- `docs/` — ТЗ, допущения, результаты проверок безопасности, OWASP / гонки / производительность (`OWASP-AND-PERFORMANCE.md`), объяснение для руководителя.

## Безопасность в двух словах

Смена статуса — только через функцию БД; прямой UPDATE статуса запрещён. История только читается через API. Регистрация отключена. В браузере используется только anon-ключ; **`service_role` — только для ручного администрирования и скрипта `scripts/seed-cloud.ts`, ключ берётся из переменной окружения и никогда не хранится в репозитории.**

## Демо

Приложение: https://mini-crm-objects-tasks.vercel.app (Vercel, база — облачный Supabase). Логины демо-пользователей (1 постановщик, 2 исполнителя: `manager@example.com`, `ivan@example.com`, `petr@example.com`) и пароли указаны в сопроводительном сообщении, в репозитории паролей нет.

## Облако и деплой

1. Создайте проект на supabase.com, в Authentication отключите _Allow new users to sign up_.
2. `pnpm supabase link --project-ref <ref>` и `pnpm supabase db push`.
3. Создайте пользователей: `SUPABASE_URL=… SUPABASE_ANON_KEY=… SUPABASE_SERVICE_ROLE_KEY=… SEED_PASSWORD=… pnpm tsx scripts/seed-cloud.ts`.
4. Vercel: переменные `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; `vercel.json` уже содержит SPA-rewrite.
