# CLAUDE.md — engineering rules

## 1. Principles

- Clean architecture, SOLID, TDD (red → green → refactor). Domain logic is written test-first.
- Security lives in Postgres (RLS, grants, triggers, RPC). The UI only hides actions; it never enforces.
- No secrets in the repo. `service_role` is never imported by `src/`.
- No git commits until the user says so.

## 2. Layout

```
src/
  domain/          pure TS: entities, value objects, TaskStatusMachine. Imports nothing.
  application/
    ports/         repository interfaces
    usecases/      one class/function per use case; depends on domain + ports
  infrastructure/
    supabase/      client, repositories, mappers, generated database.types.ts
    testing/       in-memory repositories
  presentation/
    app/           composition root (only place that may import infrastructure)
    pages/ components/ hooks/
supabase/          migrations, seed.sql, config.toml, tests
```

Dependency rule is enforced by `eslint-plugin-boundaries`.

## 3. Code rules

- TypeScript strict (+ `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`).
- Validate with zod only at the edges (forms, DB rows); the domain trusts its types.
- `@supabase/*` only inside `src/infrastructure`.
- Errors cross layers as `DomainError` with a stable `code`.

## 4. Lint

ESLint flat config, `strictTypeChecked` + `stylisticTypeChecked`, `--max-warnings 0`. Disabling a rule requires a comment explaining why. Only `src/presentation/components/ui/**` (shadcn) has relaxed rules.

## 5. Database

1. Helper functions live in the `private` schema (not exposed by PostgREST), `SECURITY DEFINER`, `set search_path = ''`. Exception: `authenticated` needs EXECUTE because policies run as the invoker.
2. RLS enabled and forced on every table; `anon` has no privileges.
3. Status changes only via RPC `change_task_status`; a trigger re-validates.
4. History is append-only: no INSERT/UPDATE/DELETE grants for API roles.
5. Mandatory integration checks (see `docs/SECURITY-CHECKS.md`): (1) executor cannot read foreign tasks, (2) forbidden transition rejected, (3) history cannot be inserted/updated/deleted via API, (4) anon sees nothing, (5) executor cannot edit task fields, (6) rework without comment rejected.

## 6. Commands

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:db` (needs local Supabase), `pnpm e2e`.
