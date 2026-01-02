# Repository Guidelines

## Project Structure & Module Organization

- `app/`: Next.js App Router pages/layouts (protected routes live under `app/(protected)/`).
- `middleware.ts`: Auth/authorization gate; expects `x-forwarded-access-token` and enforces the `staff` role for `/questions`, `/rallyes`, and `/api`.
- `actions/`: Server actions for data mutations/queries (Supabase + app logic).
- `components/`: Shared React components; `components/ui/` contains shadcn/ui primitives.
- `lib/`: Shared utilities (Supabase client in `lib/supabase.ts`, SQLite helpers in `lib/db/`).
- `public/`: Static assets.
- `supabase/`: Database schema and docs (`supabase/schema.sql`, `supabase/bucket_anleitung.md`).

## Build, Test, and Development Commands

```sh
npm install        # install dependencies
npm run dev        # start dev server (Next.js + Turbopack) on :3000
npm run lint       # ESLint (Next.js rules)
npm run build      # production build
npm run start      # run the built app
npx tsc --noEmit   # compile TypeScript files
```

Deployment via Docker is documented in `deployment.md`.

## Working on features

Work in small, meaningful, atomic steps. Each step must address exactly one concern (no mixed commits, no “incidental” refactors/formatting without purpose).

For each step:

1. List the files changed.
2. Propose a clear, compact commit message (imperative mood, precisely describing the change).
3. Provide a brief summary: what/why.
4. Tests: Evaluate whether unit/component/e2e tests are needed.
   - If behavior changes / bugfix: implement tests in the same step (ideally write the test first, then the fix).
   - If it’s a pure refactor: no new tests required, but all existing tests must pass.
   - If test setup is needed: do a separate setup-only step first, then a following step for tests + code.
5. After each step, run `npm run lint`, `npx tsc` --noEmit and `npm test`.

Hard rule: If `npm run lint`, `npx tsc --noEmit` or `npm test` FAIL, do not commit and do not proceed to the next step until they pass.

IMPORTANT: Stop after each step and wait for my “OK” before committing or moving on to the next step. Make any assumptions/uncertainties explicit and ask me to clarify when needed.

## Configuration, Secrets, and Data

- Copy `env.example` → `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`, and `SQLITE_DB_PATH` (default: `.data/local-users.db`). Optionally set `SUPABASE_URL` as a server-side override.
- Never commit `.env*.local` or `*.db` (both are gitignored).
- Database changes should be reflected in `supabase/schema.sql` and applied via the Supabase SQL editor (see `README.md`).

## Coding Style & Naming Conventions

- TypeScript + React (Next.js 15); Tailwind styles live in `app/globals.css`.
- Formatting follows `.prettierrc` (2-space indent, single quotes, semicolons).
- Naming: `PascalCase.tsx` for components (e.g., `components/RallyeForm.tsx`); `kebab-case` for utilities and shadcn files (e.g., `lib/user-context.ts`, `components/ui/datetime-picker.tsx`). Keep folder conventions consistent.
- Prefer path aliases like `@/components` and `@/lib/utils`.
- Code comments always in English

## Testing Guidelines

Automated tests use Vitest + React Testing Library. Run `npm test` (jsdom by default). Test files follow `*.test.ts` / `*.test.tsx` alongside the code (e.g., `lib/supabase-public.test.ts`).

## Commit & Pull Request Guidelines

- Commits are typically short, imperative summaries (English or German) and often reference issues (e.g., `Fix #17`). Keep the subject concise (≈72 chars) and include `#<issue>` when relevant.
- PRs should explain what/why, include screenshots for UI changes, and call out schema/env changes (update `supabase/schema.sql` and `env.example` when applicable).
