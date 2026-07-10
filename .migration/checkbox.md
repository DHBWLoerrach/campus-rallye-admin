# checkbox

2026-07-11, transformation engine (legacy `default` style), migrated in place.
Verdict: cleanest 1:1 primitive swap; wrapper-only, no consumer sweep. tsc +
lint + prettier + 283 tests green (2 stable runs).

## Changed

- `components/ui/checkbox.tsx` — swapped `@radix-ui/react-checkbox` for
  `@base-ui/react/checkbox` (`CheckboxPrimitive.Root` / `.Indicator`, same
  anatomy). Dropped `forwardRef` for a function component (ref is a normal
  prop in React 19). Class rewrites per class-mapping.md:
  - `data-[state=checked]:` → `data-checked:` (border/bg/text).
  - `disabled:cursor-not-allowed disabled:opacity-50` →
    `data-disabled:...` — REQUIRED: Base UI Root renders a `<span>`, so the
    `:disabled` pseudo-class no longer matches (the base registry's leftover
    `disabled:*` is a documented upstream quirk, not copied here).
  DHBW colors (`border-primary`/`bg-primary`) preserved. Leftover scan clean.

## Left alone

- All 5 consumers unchanged (DepartmentDialog, DepartmentForm,
  SearchFilters, RallyeQuestionsManager, RallyeCreateWizard). Each passes
  `checked={boolean}` and a single-arg `onCheckedChange={(checked) => …
  checked === true …}`. Base UI's `checked` is always boolean and the extra
  `eventDetails` second arg is ignored — type-safe and behavior-identical.
  The `checked === true` guards are now redundant but still correct.
- `@radix-ui/react-checkbox` removed in the final dep sweep.

## Behavior changes

- None. Indeterminate state is unused here, so the Radix
  `checked="indeterminate"` → Base UI `indeterminate` split does not apply.

## Verify by hand

- Toggle a rallye/question checkbox in Department create/edit dialogs, the
  Rallye create wizard, and the question search filter — confirm check state
  and the associated label click-target still work.
- Confirm the disabled voting checkbox (RallyeQuestionsManager, while pending)
  dims and blocks interaction (`data-disabled:opacity-50`).
- Confirm keyboard focus ring appears (`focus-visible:ring`).
