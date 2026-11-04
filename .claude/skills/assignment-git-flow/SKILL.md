---
name: assignment-git-flow
description: Git flow and commit rules for the mini-CRM test assignment. Use whenever the user asks to commit, branch, push, prepare the repo for submission, or "clean up history". Enforces explicit-permission commits, Conventional Commits, small logical commits in architecture order, pre-commit checks, and a hard ban on committing secrets.
---

# Assignment git flow

The repo is reviewed by the hiring team (migrations, README, history). The history should read like a clear story of the work, and nothing sensitive may ever enter it.

## Hard rules (never break)

1. **No commit, push, tag, or branch deletion without the user explicitly asking in this conversation.** "Implement X" is not permission to commit. A prior approval does not carry over to later work. If unsure, ask.
2. **Never push** unless the user says "push". Never force-push. Never rewrite history that was already pushed. No `--no-verify`, no `--amend` of a commit the user has already seen unless they ask.
3. **Stage explicit paths only.** Never `git add -A` / `git add .`. Always review `git status` and `git diff --cached --stat` before committing.
4. **No secrets, ever.** Before every commit run the secret scan below and abort on any hit. Never stage: `.env`, `.env.*` (except `.env.example`), `*.local`, anything containing `service_role` keys, `sb_secret_*`, JWTs (`eyJhbGci...`), database passwords, or cloud test-user passwords. `supabase/seed.sql` passwords are local-only demo values and are fine; cloud passwords must never appear in the repo.
5. **Do not commit third-party/agent tooling by default**: `.agents/`, `.claude/skills/*` symlinks, `skills-lock.json`, `test-results/`, `playwright-report/`, `dist/`, `node_modules/`. Ask the user once whether `plan.md`, `ASSIGNMENT.md`, `.mcp.json` and this skill should be included, then remember the answer for the session.

## Branches (enterprise git flow)

| Branch | Purpose | Cut from | Merges into |
|---|---|---|---|
| `main` | Released, tagged, always deployable. Only `release/*` and `hotfix/*` land here. | - | - |
| `develop` | Integration branch. Always green. | `main` | - |
| `feature/<kebab>` | One feature / one layer (e.g. `feature/domain-status-machine`) | `develop` | `develop` |
| `bugfix/<kebab>` | Fix for a defect found on `develop` | `develop` | `develop` |
| `docs/<kebab>`, `chore/<kebab>` | Documentation / tooling-only changes | `develop` | `develop` |
| `release/<x.y.z>` | Stabilisation: version, final verification, docs. No new features. | `develop` | `main` and back into `develop` |
| `hotfix/<kebab>` | Urgent fix of something already released | `main` | `main` and `develop` |

Rules:
- Never commit directly to `main` or `develop` (except the very first root commit on `main`).
- Merge with `git merge --no-ff <branch>` so each feature is visible as a unit; merge message `Merge branch '<branch>' into <target>`. Delete merged local branches only after the user agrees.
- Releases are tagged on `main` with an annotated tag `vX.Y.Z` after the release branch is merged. Then merge `main` back into `develop`.
- A bug found after the feature was merged gets its **own** `bugfix/*` branch and commit, not an amend of the feature.
- Do not invent remotes. If `git remote -v` is empty, say so and ask for the GitHub URL before any push.

## Commit messages (Conventional Commits)

```
<type>(<scope>): <imperative summary, <= 72 chars, no period>

<optional body: WHY, not what. Wrap at 100.>

<attribution trailer from the session's system reminder, if present>
```

- Types: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `build`, `ci`, `perf`.
- Scopes: `domain`, `app` (application layer), `infra`, `ui`, `db`, `e2e`, `docs`, `tooling`, `deploy`.
- Security-relevant DB changes always say what is enforced: `feat(db): forbid direct UPDATE of tasks.status; add change_task_status RPC`.
- One logical change per commit. Tests go **with** the code they cover (same commit), per TDD in CLAUDE.md.
- Never mix formatting-only changes with logic changes.

## Pre-commit checklist (run, don't assume)

Run only what matches the staged change, one heavy command at a time (the dev machine has low RAM; do not run lint, Playwright, and Docker-heavy work in parallel):

| Staged area | Must pass |
|---|---|
| `src/**` | `pnpm typecheck`, `pnpm lint`, `pnpm test` |
| `supabase/migrations/**`, `seed.sql` | `pnpm supabase db reset` then `pnpm test:db` |
| `e2e/**`, UI behavior | `pnpm e2e` |
| docs only | `pnpm exec prettier --check <files>` |

Report failures honestly and do not commit red code.

Secret scan (must print nothing; this skill file is excluded because it documents the patterns themselves):

```bash
git diff --cached -U0 -- . ':(exclude).claude/skills/assignment-git-flow/SKILL.md' | grep -nEi 'eyJhbGci|sb_secret_|service_role_key\s*[=:]\s*[A-Za-z0-9._-]{20,}|password\s*[=:]\s*[^ ]{8,}.*(cloud|prod)' || true
git diff --cached --name-only | grep -E '(^|/)\.env($|\.)|\.local$' | grep -v '\.env\.example' || true
```

## Suggested initial history (repo has no commits yet)

Group by architecture layer so each commit builds and tests on its own. Adjust to what exists; skip empty groups.

1. `chore(tooling): add Vite, TypeScript strict, Tailwind, ESLint flat config, Vitest, Prettier` (package.json, lockfile, configs, `.gitignore`, `.env.example`, `index.html`)
2. `docs: add CLAUDE.md rules, SPEC, ASSUMPTIONS skeleton`
3. `feat(domain): add task status machine and task factory with full transition matrix tests`
4. `feat(db): add schema, RLS, grants, triggers and change_task_status RPC` (migrations + `config.toml` with signup disabled)
5. `feat(db): add local seed with manager, two executors, objects and tasks in all statuses`
6. `test(db): add security integration suite (RLS, forbidden transitions, immutable history)`
7. `feat(app): add ports, in-memory repositories and use cases with tests`
8. `feat(infra): add Supabase repositories, mappers and error mapping`
9. `feat(ui): add login, objects, object card, task card and my-tasks pages`
10. `test(e2e): add Playwright role-visibility, full-cycle and direct-API-attack specs`
11. `docs: add README, manager explanation, security checks and assumptions`
12. `chore(deploy): add vercel.json and cloud seed script` (never real keys)

## Workflow when the user says "commit"

1. `git status --short` and `git diff --stat`; summarize what will be committed and what is intentionally left out.
2. Propose the commit split (use the table above) and the messages; if the user already approved a split, follow it.
3. Run the matching checks; stop on failure.
4. Stage explicit paths, run the secret scan, commit with a HEREDOC message.
5. Show `git log --oneline -n <count>` and `git status --short`. Do not push.

## Workflow when the user says "push"

1. Confirm `git remote -v` exists and the branch to push.
2. `git log origin/<branch>..HEAD --oneline` to show exactly what leaves the machine.
3. Re-run the secret scan over the whole outgoing range: `git log -p origin/<branch>..HEAD | grep -nEi 'eyJhbGci|sb_secret_'`.
4. Push (no force). Report the result.

## If a secret was committed

Stop. Do not push. Tell the user, rotate the key (Supabase dashboard / Vercel), and only then rewrite the **unpushed** history with the user's explicit go-ahead. If it was already pushed, rotation is mandatory and history rewriting is the user's decision.
