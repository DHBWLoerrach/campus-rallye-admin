<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Repository Guidelines

## Project Structure & Module Organization

- `app/`: Next.js App Router pages/layouts (protected routes live under `app/(protected)/`).
- `proxy.ts`: Next.js **Proxy** (replaces the old root `middleware.ts` in this stack); auth/authorization gate. Expects `x-forwarded-access-token` (Traefik/oauth2-proxy), verifies Keycloak (or dev bypass), and applies `lib/auth.ts` (`staff` role or `ALLOWED_EMAILS`). Matcher covers essentially all routes except `/`, `/sign-out`, legal pages, `/access-denied`, static assets, and `assets` — see `config.matcher` in that file.
- `actions/`: Server actions for data mutations/queries (Supabase + app logic).
- `components/`: Shared React components; `components/ui/` contains shadcn/ui primitives.
- `lib/`: Shared utilities (Supabase client in `lib/supabase.ts`, SQLite helpers in `lib/db/`).
- `public/`: Static assets.
- `supabase/`: Database schemas/migrations and bucket docs (`supabase/schema_v*.sql`, `supabase/migration_*.sql`, `supabase/buckets.md`).
- `docs/`: Deployment notes and project plans/specs.

## Build, Test, and Development Commands

```sh
npm install        # install dependencies
npm run dev        # start Next.js dev server on :3000
npm run lint       # ESLint (Next.js rules)
npm run check:format # check Prettier formatting
npm run format     # apply Prettier formatting
npm run build      # production build
npm run start      # run the built app
npx tsc --noEmit   # compile TypeScript files
npm test           # run Vitest tests once
```

`next.config.mjs` uses `output: 'standalone'` for Docker deployment and allows Supabase Storage images from the configured Supabase URL. Deployment via Docker is documented in `docs/deployment/deployment.md`.

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
5. After each step, run `npm run lint`, `npm run check:format`, `npx tsc --noEmit`, and `npm test`.

Hard rule: If `npm run lint`, `npm run check:format`, `npx tsc --noEmit`, or `npm test` FAIL, do not commit and do not proceed to the next step until they pass.

IMPORTANT: Stop after each step and wait for my “OK” before committing or moving on to the next step. Make any assumptions/uncertainties explicit and ask me to clarify when needed.

## Configuration, Secrets, and Data

- Never commit `.env*.local` or `*.db` (both are gitignored).
- Keep `env.example` in sync when adding or changing required environment variables. Local development can use `DEV_AUTH_BYPASS=true`; real auth uses `KEYCLOAK_ISSUER`, `KEYCLOAK_AUDIENCE`, oauth2-proxy, and optional `ALLOWED_EMAILS`.
- Database changes should be reflected in the newest `supabase/schema_v*.sql` file and, when applicable, a `supabase/migration_*.sql` file. Apply SQL through the Supabase SQL editor (see `README.md`).

## Coding Style & Naming Conventions

- TypeScript + React (Next.js 16); Tailwind styles live in `app/globals.css`.
- Formatting follows `.prettierrc` (2-space indent, single quotes, semicolons).
- Naming: `PascalCase.tsx` for components (e.g., `components/RallyeForm.tsx`); `kebab-case` for utilities and shadcn files (e.g., `lib/user-context.ts`, `components/ui/datetime-picker.tsx`). Keep folder conventions consistent.
- Prefer path aliases like `@/components` and `@/lib/utils`.
- Code comments always in English

## Testing Guidelines

Automated tests use Vitest + React Testing Library with jsdom and `vitest.setup.ts`. Run `npm test`. Test files follow `*.test.ts` / `*.test.tsx` alongside the code or at the repo root for cross-cutting entry points (e.g., `proxy.test.ts`).

## Commit & Pull Request Guidelines

- Commits are typically short, imperative summaries (English or German) and often reference issues (e.g., `Fix #17`). Keep the subject concise (≈72 chars) and include `#<issue>` when relevant.
- PRs should explain what/why, include screenshots for UI changes, and call out schema/env changes (update the newest `supabase/schema_v*.sql` and `env.example` when applicable).
