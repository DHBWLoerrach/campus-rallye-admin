# Plan 001: Add geocaching question create and edit administration

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. This repository has an additional hard workflow rule: after each
> numbered step, report the changed files, proposed commit message, summary,
> and test result, then STOP. Wait for the operator's explicit `OK` before
> committing or beginning the next step. Never combine steps or make incidental
> refactors. If anything in “STOP conditions” occurs, stop and report it; do not
> improvise.
>
> **Execution prerequisite**: Before Step 1 begins, this plan and
> `plans/README.md` must already be tracked and committed as the approved plan
> baseline. Verify with:
>
> ```sh
> git ls-files --error-unmatch plans/README.md plans/001-add-geocaching-question-admin-ui.md
> git status --short -- plans/README.md plans/001-add-geocaching-question-admin-ui.md
> ```
>
> The first command must exit 0 and the second must produce no output. If the
> `plans/` directory is absent, untracked, or locally modified, STOP before
> implementation and have the operator approve/commit the plan artifacts.
> Step 6 intentionally modifies these tracked baseline files later.
>
> **Drift and worktree-baseline check (run and record before Step 1)**:
>
> ```sh
> git diff --stat 603221c..HEAD -- package.json package-lock.json env.example app/globals.css helpers/questionTypes.ts helpers/questions.ts helpers/questions.test.ts lib/validation.ts lib/validation.test.ts actions/question.ts actions/question.test.ts components/questions components/ui app/'(protected)'/questions/'[id]'/page.tsx
> git diff --stat -- package.json package-lock.json env.example app/globals.css helpers/questionTypes.ts helpers/questions.ts helpers/questions.test.ts lib/validation.ts lib/validation.test.ts actions/question.ts actions/question.test.ts components/questions components/ui app/'(protected)'/questions/'[id]'/page.tsx
> git status --short -- package.json package-lock.json env.example app/globals.css helpers/questionTypes.ts helpers/questions.ts helpers/questions.test.ts lib/validation.ts lib/validation.test.ts actions/question.ts actions/question.test.ts components/questions components/ui app/'(protected)'/questions/'[id]'/page.tsx
> git status --short
> ```
>
> Save the complete output in the Step 1 report as the comparison baseline,
> including pre-existing unrelated files such as `--full-page` or
> `new-empty.png` if they are present at execution time. Do not modify, remove,
> or claim ownership of baseline changes. If an in-scope file changed since
> this plan was written, compare the “Current state” facts against the live code
> before proceeding. A material mismatch is a STOP condition.

## Status

- **Status**: DONE
- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `603221c`, 2026-07-13

## Why this matters

The database already models `geocaching` questions, but the admin application
cannot create or edit them. A geocaching question combines an ordinary question
and one correct `solution_option` with a target coordinate, proximity radius,
and either text or QR input. This plan adds its complete create, edit, copy, and
catalog administration path:
typed data, validation, Supabase reads/writes, copying, catalog representation,
an accessible map picker, and the dynamic form UI.

The participant app already owns runtime navigation and grading. The admin UI
must configure that behavior without reimplementing it or suggesting stronger
server-side guarantees than exist.

## Product behavior that must remain true

These facts came from the participant-app implementation and are requirements
for the wording and data produced by this feature:

- During navigation, GPS and compass show direction and distance to the target.
- The answer unlocks client-side when distance is less than or equal to
  `proximity_radius`; no separate “target reached” record is stored.
- The effective default radius is 10 metres.
- The effective default `input_type` is `text`.
- `input_type = 'text'` presents free-text entry.
- `input_type = 'qr'` presents a QR scanner.
- Input is trimmed and compared case-insensitively with the correct
  `solution_option`.
- A correct answer awards `point_value`. In a team rallye it is submitted with
  the team answer; without a team the participant app adds it to local tour
  state.
- In a team rallye, a wrong text answer is stored with no points and advances
  to the next question. In a Campus-Tour the answer is evaluated client-side
  and then advances; no evaluation result or team-answer row is stored. Only
  the point total changes when an answer is correct.
- A wrong QR scan is rejected while the question remains open for another scan.
- At the end of a Campus-Tour, the participant app displays the locally
  accumulated points. Changing that behavior requires a separate Mobile-App
  change and is not part of this admin plan.

## Current state

### Database

- `supabase/schema.sql:21-28` includes `geocaching` in `question_type`.
- `supabase/schema.sql:257-266` defines the common `questions` fields.
- `supabase/schema.sql:272-279` defines `geocaching_questions` with:
  - `question_id bigint NOT NULL`
  - `target_latitude double precision NOT NULL`
  - `target_longitude double precision NOT NULL`
  - `proximity_radius integer DEFAULT 10 NOT NULL`
  - `input_type text DEFAULT 'text' NOT NULL`, checked to `text | qr`
- `supabase/schema.sql:451-452` makes `question_id` the table's primary key, so
  this is a one-to-one extension of a question.
- `supabase/schema.sql:513-514` references `questions(id) ON DELETE CASCADE`.
- No schema migration is required for this feature.

### Domain and validation

- `helpers/questions.ts` currently models common question fields and
  `solutionOptions`, but has no geocaching configuration.
- `QuestionFormData` is currently derived from `Question`. Geocaching requires
  separate persisted and draft types because persisted coordinates are
  mandatory while a new form temporarily has no selected target.
- `copyQuestionForCreation()` deliberately removes IDs, assignments, and image
  references. A geocaching copy should retain its target, radius, input type,
  and solution while receiving new database IDs.
- `lib/validation.ts` derives valid question types from the editor-facing
  `questionTypes` array and requires at least one non-empty solution for every
  non-upload question. It has no coordinate or geocaching-specific validation.
- Validation and user-facing errors are German. Code comments remain English.

### Server actions

- `actions/question.ts:42-66` loads a question and nested solution options, but
  not `geocaching_questions`.
- `actions/question.ts:168-272` creates `questions`, then
  `solution_options`, then rallye assignments. When a post-insert step fails,
  deleting the new question is the established rollback pattern.
- `actions/question.ts:274-418` updates the common question and solution
  options sequentially.
- `deleteQuestion()` can rely on `ON DELETE CASCADE` for
  `geocaching_questions`; do not add a redundant explicit delete.
- Action results use `ok(...)` / `fail(...)` from `lib/action-result.ts` and
  call `requireProfile()` before accessing Supabase. Preserve this pattern.

### Editor and catalog

- `components/questions/id/QuestionForm.tsx` is a controlled client-side form
  with type-specific sections. Existing question types are locked during edit.
- The form contains its own immediate validation in addition to server-side
  Zod validation. New rules must exist in both layers.
- `QuestionPage.handleSubmit()` currently keeps only `result.error` when an
  action fails and drops `result.issues`; server field paths therefore do not
  reach `QuestionForm` without explicit state/prop plumbing.
- `QuestionQRCode.tsx` already generates a preview and downloadable QR PNG from
  a solution string. Reuse it for geocaching QR input.
- `helpers/questionTypes.ts` contains the editor/catalog metadata for the five
  existing types.
- `components/questions/question-type-icons.ts` maps metadata icon names to
  Lucide icons.
- `QuestionsTable.tsx` and `SearchFilters.tsx` derive their type labels and
  icons from the same metadata.
- The project has shadcn/Base UI components and Tailwind v4. Use semantic
  tokens and existing primitives; do not introduce a separate visual system.

### Next.js and map constraints

- The repository uses Next.js `16.2.6`, React `19.2.4`, and App Router.
- Before writing Next.js code, read:
  - `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`
  - `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- Leaflet touches browser DOM. The actual map module must be loaded from an
  explicit Client Component with `next/dynamic({ ssr: false })`; Next.js 16
  permits `ssr: false` only within a Client Component.
- Leaflet `Circle` radius is measured in metres. Do not use `CircleMarker`,
  whose radius is measured in pixels.
- Exact coordinate inputs are the accessible fallback and primary alternative
  to mouse/touch map interaction.

### Documented domain language

Use these terms from `CONTEXT.md:135-136` and `CONTEXT.md:388-390`:

- **Geocaching-Frage**: geographically bound question, reached inside a
  proximity area and answered by free text or QR code.
- Use **Teilnehmende** in geocaching copy because Campus-Touren do not have
  teams.
- A geocaching question is automatically graded and may occur in Campus-Touren
  and Bereichs-Rallyes.
- A point value remains a general question attribute. The current participant
  app also accumulates and displays it locally in the exploration mode.

ADR constraints:

- `docs/adr/0003-model-campus-tours-separately-from-team-rallyes.md`: Campus-
  Touren have no teams or stored team answers. Do not add team-specific
  configuration to the geocaching editor.
- `docs/adr/0004-use-question-origin-to-control-question-reuse.md`: question
  reuse will eventually be governed by origin. Do not add origin or assignment
  behavior as part of this plan.

## Decisions fixed by this plan

1. Use Leaflet directly, not React-Leaflet or MapLibre.
2. Use separate `GeocachingConfig` (complete persisted data) and
   `GeocachingFormConfig` (draft coordinates and radius optional) types. Every
   invalid numeric draft clears its parent numeric value; only validated
   complete data crosses into persistence.
3. Treat coordinates as required; initialize radius to `10` and input type to
   `text` when the geocaching type is selected.
4. Require exactly one non-empty, correct solution option.
5. Retain geocaching configuration when copying a question.
6. Do not request the administrator's browser location.
7. Allow target placement by map click, marker drag, and exact inputs.
8. Use `L.circle` for the metre radius and a custom `L.divIcon` for the marker,
   avoiding Leaflet PNG asset-path problems.
9. Use OpenStreetMap raster tiles by default with visible attribution, but keep
   tile URL and attribution configurable through public environment variables.
10. Do not add address search, server-side distance checks, a target-reached
    record, scoring logic, or schema changes.
11. Render the type name as the type-card title and the action as supporting
    text for all question types, rather than special-casing geocaching.
12. Keep the existing broad assignment-impact notice. Running-rallye detection
    is an explicit cross-type follow-up; geocaching QR-content invalidation
    warnings remain in this plan.

## Commands you will need

| Purpose                      | Command                                     | Expected on success                                            |
| ---------------------------- | ------------------------------------------- | -------------------------------------------------------------- |
| Install JS dependency        | `npm install leaflet@1.9.4`                 | exit 0; lockfile updated                                       |
| Install Leaflet types        | `npm install --save-dev @types/leaflet`     | exit 0; lockfile updated                                       |
| Inspect shadcn project       | `npx shadcn@latest info --json`             | exit 0; reports Base UI / `base-nova`                          |
| Read component API           | `npx shadcn@latest docs toggle-group input` | exit 0; documentation URLs printed                             |
| Add shadcn primitive         | `npx shadcn@latest add toggle-group`        | exit 0; component added without overwriting unrelated UI files |
| Focused tests                | `npm test -- <test-file...>`                | exit 0; selected tests pass                                    |
| Lint                         | `npm run lint`                              | exit 0, no errors                                              |
| Format check                 | `npm run check:format`                      | exit 0, no differences                                         |
| Typecheck                    | `npx tsc --noEmit`                          | exit 0, no errors                                              |
| Full tests                   | `npm test`                                  | exit 0, all tests pass                                         |
| Production build, final step | `npm run build`                             | exit 0; production build succeeds                              |

Network-backed install commands may require operator approval in the execution
environment. Request approval rather than substituting packages or vendoring
source.

## Suggested executor toolkit

- Use the `shadcn` skill when adding and composing `ToggleGroup`; run its info
  and docs commands before adding the component.
- Use `vercel-react-best-practices` for the dynamic client boundary and effect
  lifecycle.
- Use `frontend-design` only to preserve the agreed map/marker/radius hierarchy;
  do not redesign the surrounding editor.
- Official references:
  - Leaflet quick start: <https://leafletjs.com/examples/quick-start/>
  - Leaflet API: <https://leafletjs.com/reference>
  - OSM tile policy: <https://operations.osmfoundation.org/policies/tiles/>
  - OSMF attribution guidelines:
    <https://osmfoundation.org/wiki/Licence/Attribution_Guidelines>

## Scope

The aggregate list below covers all six steps. Each step has its own narrower
file list; do not touch later-step files early.

**In scope**:

- `package.json`
- `package-lock.json`
- `env.example`
- `app/globals.css`
- `helpers/questionTypes.ts`
- `helpers/questions.ts`
- `helpers/questions.test.ts`
- `lib/validation.ts`
- `lib/validation.test.ts`
- `lib/map-config.ts` (create)
- `lib/map-config.test.ts` (create)
- `actions/question.ts`
- `actions/question.test.ts`
- `components/ui/toggle-group.tsx` (generated by shadcn; exact generated support
  files must be reported before accepting them)
- `components/questions/question-type-icons.ts`
- `components/questions/QuestionSummary.tsx`
- `components/questions/QuestionSummary.test.tsx` (create)
- `components/questions/QuestionDetailsRows.tsx`
- `components/questions/QuestionDetailsRows.test.tsx` (create)
- `components/questions/QuestionsTable.tsx`
- `components/questions/SearchFilters.test.tsx`
- Tests adjacent to the three catalog components if assertions need extending
- `components/questions/id/GeocachingMap.tsx` (create)
- `components/questions/id/GeocachingMap.test.tsx` (create)
- `components/questions/id/GeocachingLocationField.tsx` (create)
- `components/questions/id/GeocachingLocationField.test.tsx` (create)
- `components/questions/id/QuestionForm.tsx`
- `components/questions/id/QuestionForm.test.tsx`
- `components/questions/id/QuestionPage.tsx`
- `components/questions/id/QuestionPage.test.tsx`
- `app/(protected)/questions/[id]/page.tsx` only if loading/copy integration
  requires a type-safe adjustment not already covered by `Question`.
- `plans/README.md` and this plan, only in Step 6.

**Out of scope**:

- Participant/mobile-app code.
- `supabase/schema.sql` and new Supabase migrations.
- Runtime navigation, compass, GPS distance calculation, answer grading, point
  awarding, surrender behavior, or QR retry behavior.
- Rallye/Campus-Tour data-model changes.
- Extending `RallyeOption`/`getRallyeOptions()` with lifecycle status and adding
  running-rallye edit warnings. This is a separate cross-type follow-up.
- Address search/geocoding.
- Browser geolocation for administrators.
- A general rewrite of `QuestionForm` to new shadcn `Field` primitives.
- General transactional refactoring of all question writes.
- Unrelated formatting, Base UI migrations, or catalog redesign.

## Git workflow

- Suggested branch: `feature/geocaching-question-admin-ui`.
- One commit per numbered step, only after the operator reviews the step report
  and responds `OK`.
- Commit messages use concise imperative English, matching recent history.
- Never push or open a PR unless the operator explicitly requests it.
- At each pause report:
  1. exact changed files,
  2. proposed commit message,
  3. what and why,
  4. tests added/not needed,
  5. results of lint, format, typecheck, and full tests.

## Step 1: Establish map and input-control dependencies

This is setup-only. Do not add geocaching behavior yet.

### Files allowed in this step

- `package.json`
- `package-lock.json`
- `components/ui/toggle-group.tsx`
- Any additional file the shadcn CLI says it must generate; STOP and report
  before accepting it if it would overwrite an existing component or global
  stylesheet.

### Work

1. Run `npx shadcn@latest info --json` and confirm:
   - package manager is npm,
   - RSC is enabled,
   - style is `base-nova`,
   - base library is Base UI,
   - aliases resolve under `@/components` and `@/lib`.
2. Run `npx shadcn@latest docs toggle-group input` and inspect the current API.
3. Preview the addition with `npx shadcn@latest add toggle-group --dry-run` and
   `--diff` for every existing file it proposes to touch.
4. Add the official `toggle-group` component. Read the generated source and
   verify that it uses the project's Base UI conventions and existing alias.
5. Install `leaflet@1.9.4` and `@types/leaflet` with npm.
6. Do not install React-Leaflet, MapLibre, a geocoder, or a tile-provider SDK.

### Test assessment

No new test is required for dependency setup. Existing tests must remain green.

### Verification gate

Run, in this order:

```sh
npm run lint
npm run check:format
npx tsc --noEmit
npm test
```

Expected: every command exits 0. Confirm `npm ls leaflet @types/leaflet`
exits 0 and `rg -n 'react-leaflet|maplibre|geocoder' package.json` has no
matches.

### Step report and pause

- **Proposed commit**: `Add geocaching map dependencies`
- Include the complete pre-Step-1 committed-drift, local-diff, scoped-status,
  and full-worktree status outputs as the immutable comparison baseline for all
  later scope checks.
- List every generated or modified file and explain any transitive package
  addition.
- STOP and wait for `OK` before committing or continuing.

## Step 2: Define and validate the geocaching question data contract

This step creates the shared types, copy behavior, and server validation while
keeping the type unavailable in the editor until Step 5. It must not touch
Supabase actions or UI components.

### Files allowed in this step

- `helpers/questionTypes.ts`
- `helpers/questions.ts`
- `helpers/questions.test.ts`
- `lib/validation.ts`
- `lib/validation.test.ts`

### Work

1. In `helpers/questionTypes.ts`, define a canonical tuple containing every
   database question type, including `geocaching`, separately from the
   editor-facing `questionTypes` definitions. Target shape:

   ```ts
   export const QUESTION_TYPE_IDS = [
     'multiple_choice',
     'knowledge',
     'picture',
     'qr_code',
     'upload',
     'geocaching',
   ] as const;

   export type QuestionTypeId = (typeof QUESTION_TYPE_IDS)[number];
   export type GeocachingInputType = 'text' | 'qr';
   ```

   Type `QuestionTypeDefinition.id` as `QuestionTypeId`. Explicitly widen the
   editor metadata collection so consumers accept the full ID union even while
   this step deliberately retains only its five existing cards:

   ```ts
   export const questionTypes: readonly QuestionTypeDefinition[] = [
     // the existing five editor definitions; geocaching is added in Step 5
   ];
   ```

   Do **not** add the geocaching card to `questionTypes` in this step; that
   prevents exposing an incomplete editor while keeping downstream typing
   compatible with every `QuestionTypeId`.

2. In `helpers/questions.ts`, add two deliberately different types:

   ```ts
   export interface GeocachingConfig {
     target_latitude: number;
     target_longitude: number;
     proximity_radius: number;
     input_type: GeocachingInputType;
   }

   export interface GeocachingFormConfig {
     target_latitude?: number;
     target_longitude?: number;
     proximity_radius?: number;
     input_type: GeocachingInputType;
   }
   ```

   Type persisted questions and draft form data explicitly:

   ```ts
   interface Question {
     type: QuestionTypeId;
     geocaching?: GeocachingConfig | null;
     // existing fields remain unchanged
   }

   type QuestionFormData = Omit<Question, 'id' | 'type' | 'geocaching'> & {
     type: QuestionTypeId | '';
     geocaching?: GeocachingFormConfig;
   };
   ```

   Keep database field names in snake_case, matching every other persisted
   field. Do not weaken the persisted type with optional coordinates or radius;
   only the form draft permits those values to be absent.

3. Give copied data a narrower type than an arbitrary incomplete form draft:

   ```ts
   export type CopiedQuestionFormData = Omit<
     QuestionFormData,
     'type' | 'geocaching'
   > & {
     type: QuestionTypeId;
     geocaching?: GeocachingConfig;
   };

   export function copyQuestionForCreation(
     question: Question
   ): CopiedQuestionFormData;
   ```

   Update `copyQuestionForCreation()` accordingly: deep-copy the complete
   configuration without a `question_id`, preserve target coordinates, radius,
   and input type, and never return `type: ''` or incomplete geocaching data.
   This keeps its use as `Partial<Question>` initial data in
   `app/(protected)/questions/[id]/page.tsx` assignable and makes the Step 2
   typecheck pass without changing that page.

4. In `lib/validation.ts`, build `questionTypeSchema` from
   `QUESTION_TYPE_IDS`, not from the editor metadata array.
5. Define a required, persisted-output `geocachingConfigSchema` with these rules
   and German messages:
   - latitude is finite and between -90 and 90,
   - longitude is finite and between -180 and 180,
   - radius is a positive integer and defaults to 10,
   - input type is `text | qr` and defaults to `text`.
6. Structure create and update validation as discriminated question-type
   schemas, or an equivalently type-safe Zod composition, so successful output
   narrows as follows:
   - `type === 'geocaching'` has required `geocaching: GeocachingConfig`,
   - every other type has no geocaching configuration.
     The action must not use a cast or non-null assertion to make incomplete form
     data look persistable. Reject stale geocaching configuration on other types
     rather than silently persisting irrelevant data.
7. For geocaching, require exactly one non-empty solution option and require
   that option to have `correct: true`. Do not change the semantics of other
   question types.
8. Ensure `formatZodError()` produces stable field paths for later forwarding,
   for example `geocaching.target_latitude` and
   `geocaching.proximity_radius`.

### Tests to add

In `helpers/questions.test.ts`:

- Copying a geocaching question retains an independent value-equal geocaching
  configuration, returns `CopiedQuestionFormData`, and strips database
  IDs/assignments.
- `Question` requires a `QuestionTypeId` and complete coordinates/radius, while
  `QuestionFormData` accepts `type: ''` and a draft geocaching object with
  absent coordinates or radius.
- `CopiedQuestionFormData` remains assignable to the existing
  `Partial<Question>` initial-data contract, while general `QuestionFormData`
  is intentionally not used for that boundary.
- The deliberately five-entry `questionTypes` collection is typed as readonly
  `QuestionTypeDefinition[]`, so consumers compile against every
  `QuestionTypeId` before the sixth card is exposed.

In `lib/validation.test.ts`:

- Accept a valid text geocaching question.
- Accept a valid QR geocaching question.
- Apply radius `10` and input type `text` defaults when those two fields are
  omitted from an otherwise present geocaching object.
- Reject missing geocaching configuration.
- Reject latitude below -90 and above 90.
- Reject longitude below -180 and above 180.
- Reject zero, negative, fractional, and non-finite radius.
- Reject an unknown input type.
- Reject zero or multiple non-empty solution options.
- Reject a sole solution that is not marked correct.
- Reject geocaching configuration attached to a non-geocaching type.
- Prove at the type/schema boundary that a successful parsed geocaching result
  exposes complete numeric coordinates without casting.

Model test style after the existing table-free `safeParse` assertions in
`lib/validation.test.ts`; use parameterized `it.each` where it makes failures
clearer.

### Verification gate

```sh
npm test -- helpers/questions.test.ts lib/validation.test.ts
npm run lint
npm run check:format
npx tsc --noEmit
npm test
```

Expected: all commands exit 0 and every new validation case passes.

### Step report and pause

- **Proposed commit**: `Define geocaching question data contract`
- Explain that the backend type is recognized but the editor option remains
  intentionally hidden until Step 5.
- STOP and wait for `OK` before committing or continuing.

## Step 3: Load and persist geocaching question configuration

This step extends only the server-side question data path and its tests. Follow
the existing authorization, `ActionResult`, logging, and create rollback
patterns.

### Files allowed in this step

- `actions/question.ts`
- `actions/question.test.ts`

### Work

1. Introduce one shared select constant for question fields to prevent the
   detail and catalog queries drifting. Include:

   ```text
   id, content, type, point_value, hint, category, bucket_path,
   solutionOptions:solution_options(id, correct, text),
   geocaching:geocaching_questions(
     target_latitude,
     target_longitude,
     proximity_radius,
     input_type
   )
   ```

   Keep the actual Supabase select string syntactically valid on one line or as
   concatenated literals. Use it in both `getQuestionById()` and
   `getQuestions()` so catalog details can show geocaching metadata.

2. Normalize the nested one-to-one response rather than relying on an unsafe
   cast. Supabase/PostgREST may type or mock it as an object, one-element array,
   empty array, or null. Add a small local mapper that returns
   `GeocachingConfig | null` and maps every question row consistently.
3. Validate every database `type` with an explicit
   `isQuestionTypeId(value): value is QuestionTypeId` guard based on
   `QUESTION_TYPE_IDS` before constructing a `Question`. Do not cast a raw
   PostgREST string to `QuestionTypeId`. Log and return the existing read-error
   result if an unknown database value is encountered rather than leaking an
   invalid `Question` into the UI.
4. Accept draft `GeocachingFormConfig` through the action input type. After
   `safeParse`, narrow on `parsed.data.type`; only the complete
   `GeocachingConfig` produced by the successful Zod branch may be passed to
   Supabase. Never persist directly from the unvalidated action argument.
5. During `createQuestion()`:
   - insert the common question,
   - insert the filtered solution option,
   - if the type is geocaching, insert one `geocaching_questions` row using the
     new question ID and parsed configuration,
   - then assign rallyes.
6. If the geocaching insert fails, log the database error, execute the existing
   `rollbackCreatedQuestion`, and return
   `fail('Geocaching-Daten konnten nicht gespeichert werden')`. The cascade
   must remove solution options already written for the new question.
7. During `updateQuestion()`, preserve this explicit write order: update the
   common question, replace/update solution options, upsert the single
   geocaching row by `question_id` with `onConflict: 'question_id'`, then update
   rallye assignments. Do not attempt assignment writes if the geocaching
   upsert fails. Return the same geocaching-specific failure message when it
   fails.
8. Because question type is locked in the existing editor, do not add type
   conversion behavior. Still fetch `type` in the existing-question check and
   reject a request that tries to change it, returning a clear failure such as
   `Die Aufgabenart kann nicht geändert werden`. Add this defensive guard so a
   crafted request cannot leave subtype rows inconsistent.
9. Do not explicitly delete geocaching rows in `deleteQuestion()`; the schema's
   cascade owns that operation.
10. Preserve the current sequential-update behavior. Do not turn this feature
    into a transaction/RPC rewrite.

### Tests to add or update

In `actions/question.test.ts`:

- `getQuestionById` selects and returns geocaching configuration.
- Normalize object, one-element-array, empty-array, and null relationship
  shapes.
- Valid database question types map to `QuestionTypeId`; an unknown type is
  rejected through the read-error path rather than cast.
- `getQuestions` uses the shared select including geocaching data.
- Creating a text geocaching question inserts the expected row with defaults
  already supplied by Zod.
- Creating a QR geocaching question inserts `input_type: 'qr'`.
- Geocaching insert failure deletes the newly created question and does not
  attempt rallye assignment.
- Rallye assignment happens after the geocaching insert.
- Updating a geocaching question upserts on `question_id`.
- Upsert failure returns a failure result.
- Update-time rallye assignment occurs only after the solution writes and a
  successful geocaching upsert; an upsert failure performs no assignment call.
- A crafted update that changes `type` is rejected before question mutation.
- Existing non-geocaching create/update tests still do not access
  `geocaching_questions`.
- Deletion still relies on deleting the question; do not assert an explicit
  geocaching delete.

Update mock query builders deliberately. Do not loosen them to accept arbitrary
tables or calls; strict unexpected-table failures are useful regression guards.

### Verification gate

```sh
npm test -- actions/question.test.ts
npm run lint
npm run check:format
npx tsc --noEmit
npm test
```

Expected: all commands exit 0. The action tests prove both successful
persistence and create rollback on subtype failure.

### Step report and pause

- **Proposed commit**: `Persist geocaching question configuration`
- Explicitly report the write order and the remaining non-transactional update
  characteristic.
- STOP and wait for `OK` before committing or continuing.

## Step 4: Build the controlled Leaflet target picker

This step builds a reusable, accessible field and low-level map but does not
yet expose geocaching in `QuestionForm`.

### Files allowed in this step

- `env.example`
- `app/globals.css`
- `lib/map-config.ts` (create)
- `lib/map-config.test.ts` (create)
- `components/questions/id/GeocachingMap.tsx` (create)
- `components/questions/id/GeocachingMap.test.tsx` (create)
- `components/questions/id/GeocachingLocationField.tsx` (create)
- `components/questions/id/GeocachingLocationField.test.tsx` (create)

### Public component contract

Use the draft `GeocachingFormConfig` shape and limit the field to location
properties:

```ts
interface GeocachingLocationValue {
  target_latitude?: number;
  target_longitude?: number;
  proximity_radius?: number;
}

interface GeocachingLocationFieldProps {
  value: GeocachingLocationValue;
  errors?: Partial<Record<keyof GeocachingLocationValue, string>>;
  disabled?: boolean;
  onChange: (value: GeocachingLocationValue) => void;
}
```

Keep `input_type` in the parent form; it is not map state.

### Work: configuration and styling

1. Add optional documented variables to `env.example`:

   ```dotenv
   # optional browser-side map tile configuration
   # NEXT_PUBLIC_MAP_TILE_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
   # NEXT_PUBLIC_MAP_TILE_ATTRIBUTION=&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors
   ```

   These are public browser values, never secrets.

2. Create `lib/map-config.ts` with:
   - the exact HTTPS OSM standard tile URL as fallback,
   - the linked, visible OSM attribution above as fallback,
   - atomic provider configuration: use the custom URL and attribution only
     when both variables are non-empty; if exactly one is configured, use the
     complete OSM fallback pair and expose a clear non-blocking configuration
     warning rather than mixing providers and attribution,
   - maximum zoom 19,
   - an approximate DHBW Lörrach initial center used only when no target has
     been selected,
   - an initial overview zoom and a target zoom around 18.
3. Keep tile settings centralized. Never concatenate user input into tile URLs
   or attribution. Treat attribution as trusted deployment configuration, not
   question/user content, and preserve its accessible copyright/licence link.
4. Keep the standard OSM browser integration policy-compliant: do not add a
   restrictive `Referrer-Policy`, custom `no-cache`/`Pragma` headers, a tile
   proxy that strips the normal browser referer, offline download, bulk fetch,
   or tile-prefetch behavior. Let the browser honor OSM HTTP caching headers;
   modern browsers satisfy the normal caching requirement by default.
5. Import Leaflet's official CSS once from `app/globals.css`. Add only the
   minimal global classes required for fixed map height, rounded clipping, and
   the custom target `divIcon`. Preserve visible attribution and keyboard focus.
6. Use semantic design tokens where CSS is under application control. Leaflet
   geometry may use resolved DHBW primary color with a restrained translucent
   fill.

### Work: `GeocachingMap`

1. Mark it `'use client'` and import Leaflet normally inside this module. It
   will only be loaded by a dynamic client-only boundary.
2. Accept optional numeric latitude, longitude, and radius props plus one
   `onTargetChange(lat, lng)` callback. The map must represent the controlled
   parent state, including its incomplete state.
3. Initialize the Leaflet map exactly once using a container ref and effect.
   Store map, marker, and circle instances in refs.
4. Add the configured raster tile layer with attribution and maximum zoom. If
   `map-config` reports a partial-provider configuration warning, render it
   visibly and non-blockingly inside the map while using the complete OSM
   fallback pair.
5. On map click, create or move the marker and radius circle, then emit exact
   numeric latitude/longitude.
6. Create a draggable `L.marker` with:
   - a static custom `L.divIcon`,
   - meaningful `alt` text,
   - no user-provided HTML.
7. On marker `dragend`, read `marker.getLatLng()` and emit it.
8. Create marker geometry only when both controlled coordinates are present,
   finite, and in range. Draw the proximity area with
   `L.circle(position, { radius })` only when the radius is also a valid
   positive integer; radius is in metres. Update center and radius when
   controlled props change.
9. When either controlled coordinate becomes absent or invalid, remove the
   existing marker and circle and clear their refs. When only the radius becomes
   absent or invalid, retain a valid-coordinate marker but remove the circle.
   Recreate geometry when the controlled value becomes complete again.
10. Recenter only when appropriate:

- initial existing target: center at target,
- first newly selected target: zoom to target,
- routine radius or coordinate-field edits: keep the user's current viewport
  unless the marker leaves it.

11. Call `invalidateSize()` after the container becomes visible/resizes. Prefer
    `ResizeObserver` with cleanup; do not poll.
12. On unmount, unregister handlers, disconnect observers, and call
    `map.remove()` exactly once.
13. Own tile-load status entirely inside `GeocachingMap`: listen for tile-layer
    errors and render a compact German status message inside the map component.
    Do not add `onTileError` to the field contract. Coordinate inputs live
    outside the map and remain usable; tile failure must never block form
    submission.

### Work: `GeocachingLocationField`

1. Mark the file `'use client'`.
2. Load `GeocachingMap` at module top level using `next/dynamic` with
   `{ ssr: false }` and a fixed-height, non-jumping skeleton/placeholder.
3. Render the map as an enhancement above three labeled text inputs with
   explicit mobile keyboard hints:
   - `Breitengrad*`: `type="text"`, `inputMode="decimal"`,
   - `Längengrad*`: `type="text"`, `inputMode="decimal"`,
   - `Näherungsradius*`: `type="text"`, `inputMode="numeric"`, plus a visible
     `Meter` suffix/description.
     Do not use `type="number"`; browsers may normalize or erase intermediate
     drafts that this controlled field promises to preserve.
4. Maintain all three numeric input drafts as strings so empty and intermediate
   values such as `48.` remain visibly editable. On every coordinate edit, emit
   the parsed finite in-range number or `undefined` for an empty, partial,
   non-finite, or out-of-range draft. On every radius edit, likewise emit a
   positive integer or `undefined`. Preserve the local draft string exactly;
   never leave the last valid parent value in place behind visibly invalid
   text.
5. Implement dedicated strict parsers rather than `Number(value)` coercion:
   - preserve the original draft string for display but trim its edges for
     parsing,
   - accept coordinate decimals with either one `.` or one `,` separator and
     normalize a valid comma internally,
   - require digits on both sides when a decimal separator is present, so
     `47.` remains a visible incomplete draft and emits `undefined`,
   - allow a leading sign for coordinates, but reject a sign without digits,
     exponent notation, hexadecimal, `Infinity`, and multiple/mixed separators,
   - accept radius only as trimmed ASCII digits representing an integer greater
     than zero; reject signs and decimal separators,
   - after grammar parsing, enforce finite values and the coordinate ranges.
6. Format map-originated coordinates to six decimal places in the inputs while
   retaining numeric values in parent state.
7. Radius uses integer metres, minimum 1, and starts at 10 for a newly
   initialized form. Do not add a slider; exact numeric entry is more
   predictable for small radii. The form blocks an `undefined` radius, while
   server validation still applies database-compatible default 10 when a
   crafted action payload genuinely omits it.
8. Keep `1` metre technically valid, but show non-blocking warnings:
   - below 10 metres: GPS accuracy may prevent reliable unlocking,
   - above 1000 metres: the radius is unusually large for a campus target,
   - always note that GPS reception can be worse inside buildings.
     Warnings are guidance, not validation errors.
9. Show validation with `aria-invalid`, linked error descriptions, and the
   project's destructive semantic token.
10. Add concise instruction text: click the map or drag the target marker; the
    circle shows where the answer unlocks.
11. Do not request browser geolocation and do not add “use my location”.

### Tests to add

`GeocachingMap.test.tsx`, using a strict mocked `leaflet` module:

- Initializes one map and tile layer with visible attribution.
- The OSM fallback attribution contains an accessible copyright/licence link.
- Partial custom provider configuration displays the map-config warning while
  using the complete OSM fallback pair.
- Existing target creates marker and metre circle.
- Map click emits coordinates and creates/moves geometry.
- Marker drag emits coordinates.
- Controlled radius changes call `setRadius` with metres.
- Controlled coordinates move marker and circle.
- Clearing or invalidating either controlled coordinate removes the existing
  marker and circle; restoring both valid coordinates recreates them.
- An absent/invalid controlled radius removes the circle without retaining a
  stale radius, while a valid coordinate marker may remain.
- Resize observer invalidates size.
- Unmount removes listeners, observer, and map once.
- Tile error renders non-blocking fallback/status.

`GeocachingLocationField.test.tsx`, mocking the low-level map:

- Shows all three accessible inputs and default radius.
- Coordinates use text/decimal inputs and radius uses a text/numeric input.
- Manual valid coordinates emit numeric changes.
- `47,615123` parses as `47.615123`; leading/trailing whitespace is accepted
  for parsing without rewriting the visible draft.
- `47.`, `-`, exponent/Infinity syntax, and repeated or mixed decimal separators
  remain visible but emit `undefined`.
- Partial, empty, non-finite, and out-of-range coordinate drafts remain visible
  and emit `undefined` for the edited parent field.
- After a valid coordinate has been emitted, replacing it with an invalid draft
  clears the parent value instead of retaining the old coordinate.
- A simulated map change updates inputs to six decimals.
- Radius emits positive integers; empty, partial, non-finite, zero, negative,
  fractional, or otherwise invalid drafts emit `undefined` while remaining
  visible.
- After a valid radius has been emitted, replacing it with invalid text clears
  the parent radius so the old value cannot be submitted.
- Error messages are connected with `aria-describedby`/`aria-invalid`.
- When the mocked map renders its own tile-error status, the independently
  rendered coordinate inputs remain usable. Do not expect an error callback.
- Radius warnings appear below 10 and above 1000 metres without setting
  `aria-invalid` or blocking submission; the indoor-GPS note is present.

`lib/map-config.test.ts`:

- Neither environment variable uses the exact OSM URL and linked attribution
  fallback.
- Both environment variables use the custom pair unchanged.
- URL-only and attribution-only configuration never mix providers: both cases
  return the OSM pair plus the clear configuration warning.

Do not assert Leaflet's own projection, distance, or rendering internals.

### Verification gate

```sh
npm test -- components/questions/id/GeocachingMap.test.tsx components/questions/id/GeocachingLocationField.test.tsx lib/map-config.test.ts
npm run lint
npm run check:format
npx tsc --noEmit
npm test
```

Expected: all commands exit 0 and jsdom logs no unhandled map errors.

### Step report and pause

- **Proposed commit**: `Add geocaching target map picker`
- Include the tile-provider fallback and attribution behavior in the summary.
- State explicitly that the component is not yet wired into the editor.
- STOP and wait for `OK` before committing or continuing.

## Step 5: Integrate geocaching into the question editor and catalog

This step makes the completed backend and map field user-visible. It includes
component tests and final production verification.

### Files allowed in this step

- `helpers/questionTypes.ts`
- `components/questions/question-type-icons.ts`
- `components/questions/QuestionSummary.tsx`
- `components/questions/QuestionSummary.test.tsx` (create)
- `components/questions/QuestionDetailsRows.tsx`
- `components/questions/QuestionDetailsRows.test.tsx` (create)
- `components/questions/QuestionsTable.tsx`
- `components/questions/SearchFilters.test.tsx`
- Adjacent tests for those catalog components where behavior changes
- `components/questions/id/QuestionForm.tsx`
- `components/questions/id/QuestionForm.test.tsx`
- `components/questions/id/QuestionPage.tsx`
- `components/questions/id/QuestionPage.test.tsx`
- `app/(protected)/questions/[id]/page.tsx` only if required by TypeScript

### Work: type metadata and catalog

1. Add `map-pin` to `QuestionTypeIconName` and map it to Lucide's `MapPin` in
   `question-type-icons.ts`.
2. Add the geocaching definition to `questionTypes`:
   - `name`: `Geocaching-Frage`
   - `action`: `Zielort finden`
   - description: `Teilnehmende navigieren zu einem Zielort und lösen dort eine Aufgabe.`
   - example: `Zum Beispiel: Finde den Haupteingang und scanne den QR-Code.`
3. Update the shared type-card markup in `QuestionForm` so `type.name` is the
   visible card title and `type.action` is a distinct supporting line. Apply
   this consistently to every type card and update existing tests; do not make
   geocaching the only card with a different hierarchy.
4. The existing search filter and table should pick the new type up from the
   metadata automatically. Change the table header `Was Teams tun` to
   `Was Teilnehmende tun` so it is correct for Campus-Touren.
5. In `QuestionSummary`, label a geocaching QR solution `QR-Code-Inhalt` and a
   text solution `Lösung`, based on `question.geocaching?.input_type`.
6. In expanded `QuestionDetailsRows`, add a compact geocaching block showing:
   - coordinates to six decimals,
   - radius in metres,
   - `Texteingabe` or `QR-Code scannen`.
     Do not put raw coordinates into the primary table columns.
7. Add `hasGeocaching` to `QuestionDetailsRows`' early-return condition so
   geocaching metadata still renders for incomplete legacy rows without a hint,
   assignment, solution, or action.

### Work: form state and validation

1. Extend `FormErrors` with errors for latitude, longitude, radius, and input
   type, using stable dotted keys matching server issues.
2. `buildInitialFormData()` behavior:
   - existing geocaching question with configuration: preserve it,
   - existing `type === 'geocaching'` with a missing side-table row: initialize
     a repairable draft with undefined coordinates, radius 10, and text input,
   - newly selected geocaching type: initialize configuration with undefined
     coordinates, radius 10, input type `text`,
   - other types: no geocaching object.
3. Canonicalize solution options whenever `buildInitialFormData()` receives a
   geocaching question, including copied questions and malformed legacy data:
   - prefer the first correct, non-empty solution,
   - otherwise use the first non-empty solution,
   - otherwise use the first existing solution,
   - otherwise create one empty solution,
   - remove every other option and mark the retained/created option
     `correct: true`.
     This makes existing invalid rows visibly repairable instead of hiding stale
     options that would block validation.
4. Include geocaching configuration in `normalizeFormData()` so dirty-state
   tracking detects map, coordinate, radius, and input-type changes.
5. When a new form switches away from geocaching, remove the stale geocaching
   object. Existing forms cannot change type.
6. When a new form switches from multiple choice to geocaching:
   - retain only the first existing solution option, or create one empty option
     when none exists,
   - mark the retained/created option `correct: true`,
   - discard all additional options from form state,
   - render exactly one solution field for geocaching regardless of malformed
     incoming state.
7. Add client-side validation mirroring Step 2 exactly:
   - required valid coordinates,
   - positive integer radius,
   - input type text/QR,
   - exactly one non-empty correct solution.
8. Because `GeocachingLocationField` clears the corresponding parent number on
   every invalid numeric draft, client validation must block submission rather
   than allowing the last valid coordinate/radius to be saved.
9. If geocaching validation fails, keep the always-visible target section in
   view and expose field-level messages. Do not open “Weitere Angaben” for
   target errors.
10. Add `serverErrors?: Record<string, string>` and
    `onServerErrorClear?: (field: string) => void` props to `QuestionForm`.
    Merge server and client messages at their matching fields. Clear a server
    error when its field changes; clear all stale server errors before a new
    submit attempt.

### Work: form layout

1. Add the sixth type card through the existing metadata loop; do not create a
   one-off card.
2. When `isGeocaching`, insert a new section between “Aufgabe formulieren” and
   “Lösung festlegen”:
   - heading `Zielort festlegen`,
   - description explaining map click/marker drag,
   - `GeocachingLocationField`.
3. In “Lösung festlegen”, render a single-choice `ToggleGroup` before the
   expected answer:
   - `Text eingeben`
   - `QR-Code scannen`
     Require one selection and prevent deselection to an empty value.
4. Preserve the same solution option when switching text/QR; do not clear what
   the administrator typed.
5. Use labels and help text:
   - Text: `Groß-/Kleinschreibung sowie Leerzeichen am Anfang und Ende werden bei der Prüfung ignoriert. Eine falsche Antwort beendet die Aufgabe.`
   - QR: `Ein falscher QR-Code wird abgelehnt und kann erneut gescannt werden.`
6. Reuse `QuestionQRCode` when `isGeocaching && input_type === 'qr'`, passing
   the single correct solution. Do not duplicate QR generation logic.
7. Under the existing point input, show for geocaching:
   `Der Punktwert wird bei einer richtigen Antwort vergeben. In Campus-Touren wird er lokal gezählt und am Ende angezeigt.`
   Do not clear or disable `point_value`.
8. Add a concise configuration summary before the form actions when all target
   fields are valid, for example:
   `Ziel bei 47.123456, 7.123456 · freigeschaltet innerhalb von 10 m · Antwort per QR-Code`.
9. Update generic editor copy from “Teams” to “Teilnehmende” where the text also
   applies to Campus-Touren. Do not perform a repository-wide language rewrite.
10. Preserve responsive layout, keyboard focus, dark mode, and reduced motion.
11. When editing a geocaching question, compare current QR-relevant values with
    `initialData` and show non-blocking operational warnings:
    - changing `input_type` from `qr` to `text`: previously printed QR codes no
      longer solve the question,
    - changing `input_type` from `text` to `qr`: create, print, and place the
      newly required QR code before the question is used,
    - changing the expected solution while QR mode was/is involved: regenerate
      and reprint the QR code before the question is used.
      Do not show these warnings for a brand-new unsaved question.

### Work: page and copy behavior

1. `QuestionPage.handleSubmit()` already spreads `QuestionFormData`; verify the
   geocaching object reaches both create and update actions without bespoke
   reshaping.
2. Add `serverErrors` state in `QuestionPage`. On either create/update failure,
   retain `result.error` as the form-level message and forward
   `result.issues ?? {}` into `QuestionForm`. Provide the field-clear callback
   from the preceding section and clear all issues before retrying submission.
3. Add or update a copied-geocaching banner to state that target and solution
   were copied and changes do not affect the original.
4. Confirm `app/(protected)/questions/[id]/page.tsx` uses
   `copyQuestionForCreation()` and therefore needs no duplicate geocaching
   logic. Change it only if TypeScript requires a narrow adjustment.
5. Retain the existing assigned-rallye impact notice. Do not extend
   `RallyeOption` in this plan. Record status-aware warnings for currently
   running rallyes as the explicit follow-up listed in `plans/README.md`.

### Tests to add or update

`components/questions/id/QuestionForm.test.tsx`:

- Geocaching appears as a selectable sixth task type.
- Every type card shows its type name as title and action as supporting text.
- Selecting it creates radius 10 and text input defaults.
- Switching from multiple choice retains/renders exactly one solution and marks
  it correct; switching with no solution creates one correct empty option.
- The target section is visible only for geocaching.
- Submission is blocked until both coordinates and one correct solution exist.
- Latitude, longitude, and radius validation messages appear at their fields.
- After a valid coordinate or radius is replaced with an invalid draft, submit
  remains blocked and cannot send the preceding valid value.
- Map-driven location changes are included in submitted data.
- Text/QR toggle changes only `input_type`, not solution text.
- QR mode shows the reused QR generator; text mode does not.
- Correct text and QR explanatory copy is displayed.
- Point copy accurately says Campus-Tour points are counted locally and shown
  at the end.
- Existing geocaching configuration loads unchanged during edit.
- Existing geocaching data with multiple/mis-marked solutions is canonicalized
  to the preferred single correct solution and can be repaired visibly.
- A copied malformed geocaching question is canonicalized by the same initial
  form path, including the empty-solution fallback.
- An existing geocaching question without a side-table row opens with a
  repairable empty target state and can submit after completing it.
- Server `issues` appear at matching geocaching fields and clear when edited.
- Changing QR to text, changing text to QR, or changing QR-relevant content
  shows the appropriate create/replace printed-code warning; brand-new
  questions do not show it.
- Dirty state changes for marker/coordinates, radius, and input type.
- Configuration summary uses six decimal coordinates, radius, and answer mode.

Mock `GeocachingLocationField` at the form-test boundary. Its detailed input/map
behavior is already covered in Step 4.

`components/questions/id/QuestionPage.test.tsx`:

Mock `GeocachingLocationField` here as well as in `QuestionForm.test.tsx` so
page tests exercise submission/error plumbing without loading dynamic Leaflet
code or depending on jsdom map lifecycle.

- A valid new geocaching form submits the full configuration to
  `createQuestion`.
- Editing submits the configuration to `updateQuestion`.
- Failed create/update forwards `result.issues` to the form and retry clears
  stale issues.
- Copy notice mentions copied target and solution.

Catalog tests:

- Type filter includes `Zielort finden`.
- Table renders the map-pin type and participant-neutral header.
- Expanded geocaching details show coordinates, radius, and input mode.
- Geocaching details render even when an incomplete legacy row has no solution,
  hint, rallye, or action.
- QR geocaching summary uses `QR-Code-Inhalt`; text uses `Lösung`.

Do not snapshot the entire form or map. Prefer role/label assertions and exact
submitted objects.

### Verification gate

Run focused tests first, naming every catalog test changed or created:

```sh
npm test -- components/questions/id/QuestionForm.test.tsx components/questions/id/QuestionPage.test.tsx components/questions/QuestionsTable.test.tsx components/questions/SearchFilters.test.tsx components/questions/QuestionSummary.test.tsx components/questions/QuestionDetailsRows.test.tsx
npm run lint
npm run check:format
npx tsc --noEmit
npm test
npm run build
```

Expected: every command exits 0. Do not commit if any gate fails.

### Manual browser verification

After automated gates pass, STOP before any manual persistence test. Ask the
operator to identify and explicitly approve a local or disposable Supabase
project. Do not print credentials. Do not proceed when the configured endpoint
could be production, is ambiguous, or the operator has not authorized creating
and deleting test rows. Record the approved environment name/type in the step
report.

Once approved, use a unique, recognizable prefix such as
`[MANUAL GEOCACHING TEST <timestamp>]` for every created question. Verify both
light and dark themes at desktop and narrow widths:

1. Create a text geocaching question by clicking the map, dragging the marker,
   editing exact coordinates, and setting a radius.
2. Reopen it and confirm marker, circle, values, solution, point value, hint,
   and category round-trip.
3. Change the radius and verify the circle updates without moving the target.
4. Create a QR geocaching question, generate/download its QR PNG, save, and
   reopen it.
5. Copy a geocaching question and confirm target/configuration/solution are
   retained but IDs and rallye assignments are not.
6. Filter the catalog by `Zielort finden` and inspect expanded details.
7. Temporarily block the tile host in browser devtools and confirm coordinate
   inputs still work and the form remains saveable.
8. Confirm no browser geolocation permission prompt occurs.
9. Confirm keyboard users can complete every field without interacting with
   the map.
10. Delete every question created by the manual verification through the admin
    UI. Verify its `questions`, `solution_options`, and
    `geocaching_questions` rows are gone before declaring cleanup complete.

Document the observed results in the step report. If the environment cannot
reach Supabase or the tile host, report that limitation; do not claim the
manual path passed. If cleanup fails, STOP, report the IDs of the test rows
(never credentials), and do not mark the plan done.

### Step report and pause

- **Proposed commit**: `Add geocaching question editor`
- List every changed file, automated gate, and manual scenario result.
- STOP and wait for `OK` before committing or beginning Step 6. Do not update
  either plan status as part of the Step 5 commit.

## Step 6: Mark the implementation plan complete

Begin this documentation-only step only after the operator approved and the
executor created the Step 5 commit. This is a separate work unit so status
changes never bypass the repository's report-and-pause rule.

### Files allowed in this step

- `plans/001-add-geocaching-question-admin-ui.md`
- `plans/README.md`

### Work

1. Re-evaluate every substantive done criterion below against the committed
   implementation, automated results, manual-verification record, and cleanup
   evidence. The two plan-status criteria are fulfilled by item 3 after all
   other criteria pass.
2. Compare `git status --short` with the full worktree baseline recorded before
   Step 1. Confirm there are no **new** changes outside the cumulative files
   approved by Steps 1–6; at this point the only expected uncommitted changes
   beyond the committed Step 1–5 implementation are the two Step 6 plan files.
   Preserve all pre-existing baseline changes, including `--full-page` or
   `new-empty.png` if they existed at execution time.
3. Only when every criterion is genuinely satisfied, change this plan's status
   to `DONE` and change Plan 001 in `plans/README.md` to `DONE`. If any criterion
   is unmet, leave both statuses unchanged and STOP with the exact blocker.

### Verification gate

Run all four repository-required gates even though this step changes only
Markdown:

```sh
npm run lint
npm run check:format
npx tsc --noEmit
npm test
```

Expected: every command exits 0. Do not commit when any gate fails.

### Step report and pause

- **Proposed commit**: `Mark geocaching administration plan complete`
- List the two changed plan files, the evidence used for completion, the
  baseline comparison, and all four gate results.
- STOP and wait for `OK` before committing. Do not push or open a PR without a
  separate explicit request.

## Test plan summary

The feature is covered at four boundaries:

1. Pure contract tests: copying, defaults, coordinate/radius/input validation.
2. Server action tests: nested read normalization, create/update persistence,
   rollback, type-lock defense.
3. Map/field tests: Leaflet lifecycle, click/drag, controlled synchronization,
   accessible coordinate fallback.
4. Editor/catalog tests: conditional UI, submission payload, QR reuse, scoring
   explanation, copied data, catalog visibility.

The final full suite and production build guard against Next.js dynamic-import,
Tailwind CSS, and package-integration failures not visible in focused jsdom
tests.

## Done criteria

All conditions must hold:

- [ ] `leaflet@1.9.4` and compatible TypeScript definitions are installed; no
      React-Leaflet, MapLibre, or geocoder dependency was added.
- [ ] `geocaching` is represented by typed configuration throughout form data,
      copy behavior, validation, reads, and writes.
- [ ] `CopiedQuestionFormData` preserves complete question type/geocaching data
      and remains assignable to the existing `Partial<Question>` initial-data
      boundary after Step 2.
- [ ] Persisted `Question.type` is a validated `QuestionTypeId`; only the form
      draft permits `type: ''`, and raw database strings are never blindly cast.
- [ ] Persisted `GeocachingConfig` requires coordinates while draft
      `GeocachingFormConfig` permits an unselected target or radius; no cast
      bypasses this boundary.
- [ ] Server validation rejects missing/invalid coordinates, non-positive or
      fractional radius, invalid input type, and invalid solution cardinality.
- [ ] Creation rollback deletes a newly inserted question if subtype
      persistence fails.
- [ ] Crafted updates cannot change question type.
- [ ] Existing geocaching questions load and edit successfully.
- [ ] Update writes run in the order common question, solutions, geocaching
      upsert, rallye assignments; failed subtype upserts never write assignments.
- [ ] Existing geocaching questions missing their side-table row open in a
      repairable draft state.
- [ ] Malformed existing or copied geocaching solution sets are canonicalized
      to one visible correct solution and remain repairable.
- [ ] New geocaching questions default to 10 metres and text input.
- [ ] Map click, marker drag, and coordinate inputs stay synchronized.
- [ ] Invalid numeric drafts clear their parent numeric value, block submit,
      and can never silently persist the preceding valid coordinate or radius.
- [ ] Numeric fields use text inputs with explicit input modes and strict,
      locale-aware parsers; comma decimals are accepted without sacrificing exact
      partial-draft display.
- [ ] Removing/invalidating a controlled coordinate removes stale map marker
      and circle geometry; an invalid radius cannot leave a stale circle.
- [ ] Radius uses Leaflet's metre-based `Circle` and updates live.
- [ ] Tile attribution is visible and tile configuration is centralized.
- [ ] Tile URL and attribution are selected atomically; OSM fallback attribution
      links to origin/licence information, and partial custom configuration reports
      a warning without mixing providers.
- [ ] The OSM integration adds no restrictive referrer policy, cache-bypass
      headers, offline/bulk download, or tile-prefetch behavior.
- [ ] Coordinate inputs remain usable if tiles fail.
- [ ] Text and QR modes preserve one correct solution and show accurate retry/
      failure explanations.
- [ ] Multiple-choice to geocaching conversion retains or creates exactly one
      correct solution and never renders multiple geocaching solution fields.
- [ ] QR mode reuses `QuestionQRCode`.
- [ ] Point value remains editable and the UI accurately states that the
      current participant app counts it locally in Campus-Touren.
- [ ] Server action `issues` reach matching form fields and clear when edited or
      retried.
- [ ] QR mode/content edits warn when codes must first be created or existing
      printed codes may require replacement.
- [ ] Catalog filter, icon, labels, summary, and expanded details support
      geocaching.
- [ ] Copying retains target/configuration/solution without IDs or assignments.
- [ ] No browser geolocation request or target-reached persistence was added.
- [ ] `npm run lint` exits 0.
- [ ] `npm run check:format` exits 0.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `npm test` exits 0 with all new tests passing.
- [ ] `npm run build` exits 0.
- [ ] Compared with the full worktree baseline recorded before Step 1,
      `git status --short` shows no **new** changes outside the files allowed by
      the approved steps. Pre-existing unrelated entries such as `--full-page` or
      `new-empty.png` remain untouched and are not treated as feature changes.
- [ ] Before Step 1, both plan files were tracked, committed, and clean; they
      were not captured as uncommitted implementation-baseline files.
- [ ] Manual verification results are recorded honestly.
- [ ] Manual writes ran only after explicit approval against a local/disposable
      Supabase environment, and all identifiable test rows were removed and
      verified absent.
- [ ] This plan's status and the Plan 001 row in `plans/README.md` are changed
      to `DONE` only in Step 6 after all substantive criteria pass.
- [ ] The Step 6 status-only changes are committed only after its separate
      report receives operator approval.

## STOP conditions

Stop and report back instead of improvising if:

- An in-scope file materially differs from the current-state description after
  the drift check.
- The actual participant app expects a different database shape, solution
  cardinality, normalization rule, or input-type value than documented here.
- The operator cannot explicitly confirm that manual CRUD testing targets a
  local/disposable Supabase project, or test-data cleanup cannot be verified.
- Supabase returns a relationship shape that the normalization cases do not
  cover.
- Saving geocaching configuration would require a service-role client or wider
  RLS permissions than existing authenticated question writes.
- The shadcn CLI proposes overwriting locally modified UI components or global
  styles.
- Leaflet 1.9.4 is incompatible with the installed Next.js/React build after a
  reasonable direct client-only integration attempt.
- The Leaflet CSS import cannot be made to pass the production build without
  moving or globally restructuring unrelated styles.
- A tile provider requires a secret server-side credential or prohibits the
  intended interactive use.
- Implementing a step requires changing `supabase/schema.sql`, participant-app
  code, rallye lifecycle behavior, or any other out-of-scope file.
- Any required quality gate fails twice after a reasonable scoped correction.
- Manual testing reveals that the participant app cannot consume a question
  created by this admin implementation.

## Maintenance notes

- The public OSM tile service has no SLA. If map usage grows, switch the
  centralized tile configuration to a contracted provider or self-hosted tiles
  while preserving visible attribution and provider terms.
- If `locations` later gains coordinates, replace the approximate default map
  center with the question/rallye location context. Do not infer coordinates
  from a location name in the browser.
- If question writes are later moved into Postgres RPCs, include common fields,
  solution options, geocaching subtype data, and rallye assignments in one
  transaction; remove compensating create rollback only after that migration.
- Reviewers should scrutinize controlled-state synchronization, Leaflet cleanup,
  the type-lock guard, create rollback ordering, and whether the correct
  solution remains exactly one after mode switches/copies.
- Database-level coordinate/radius constraints remain a possible defense-in-
  depth follow-up, not part of this feature.
- Status-aware warnings for edits affecting currently running rallyes require
  extending `RallyeOption` and are tracked as a separate cross-type follow-up in
  `plans/README.md`.
- The participant app's client-only target-reached check is an intentional
  current behavior. The admin UI must not imply that presence at the target is
  server-verified.
