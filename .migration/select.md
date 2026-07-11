# select

2026-07-11, transformation engine (legacy `default` style), migrated in place.
Verdict: the most involved migration — Content split into Portal>Positioner>
Popup>List, and Base UI's raw-value Value forced `items` on every id/label
select. Wrapper + 9 consumers + 1 test. tsc + lint + prettier + 312 tests +
production build green; label display verified.

## Changed

- `components/ui/select.tsx` — swapped `@radix-ui/react-select` for
  `@base-ui/react/select`. Part remap: `Content` → `Portal > Positioner >
  Popup` with `List` replacing `Viewport`; `ScrollUpButton`/`ScrollDownButton`
  → `ScrollUpArrow`/`ScrollDownArrow`; `Label` → `GroupLabel`; `Icon` asChild →
  `render`. Dropped the radix `position` prop; the Positioner uses
  `alignItemWithTrigger={false}` + `sideOffset={4}` to keep the popper-style
  dropdown, `min-w-[var(--anchor-width)]` to match the trigger width. Class
  rewrites: item highlight `focus:` → `data-highlighted:`; animations →
  `transition-[opacity,transform] data-[starting-style]/data-[ending-style]`
  with `origin-[var(--transform-origin)]`; vars →
  `--available-height`/`--anchor-width`. `data-[disabled]:` kept (bracket
  selector matches Base UI's presence attr; upstream-compatibility test still
  asserts it). Dropped `forwardRef`. DHBW styling preserved.
- 9 consumers updated (SearchFilters ×3, DepartmentDialog, DepartmentForm,
  DepartmentsClient, LocationForm, RallyeCreateWizard, RallyeSettingsForm ×2,
  UsersClient, QuestionForm category). Two edits each where applicable:
  - `items` on `Select` (Root): Base UI `Select.Value` renders the RAW value,
    not the selected item's text (Radix rendered the text). Every select whose
    item value differs from its label (ids→names, sentinels like `all`/`none`/
    `new`/`NO_DEPARTMENT`) now passes `items={[{ value, label }, …]}` so the
    trigger shows the label. Verified by a throwaway render test (trigger shows
    the name, never the id).
  - null-safe `onValueChange`: Base UI widens the callback to
    `(value: string | null, …)`. Bare `Dispatch<SetStateAction<string>>`
    setters and string-only handlers were wrapped (`value ?? ''`,
    `value ?? NO_DEPARTMENT`, `value ?? undefined`). The three uncontrolled
    SearchFilters selects also needed an explicit `(value: string | null)`
    param annotation (no `value` prop left the generic un-inferable).
- `components/questions/SearchFilters.test.tsx` — the "passes rallyeId" test
  now opens via `click(trigger)` and commits the option with a full pointer
  tap (`pointerDown`+`mouseDown`+`pointerUp`+`mouseUp`+`click`, button 0). Base
  UI Select ignores a bare `click` on an option (Radix accepted it).

## Left alone

- SearchFilters category select keeps value===label, but still got `items`
  (with the `all` sentinel) so its Value renders correctly and its generic
  infers `string`.
- `@radix-ui/react-select` removed in the final dep sweep (last remaining
  Radix package).

## Behavior changes

- Enter/exit animation restated as fade+scale from the transform origin (the
  per-side slide nudge is dropped).
- FLAG: option commit now requires a real pointer/keyboard interaction; a
  synthetic bare `click()` no longer selects (only relevant to tests/automation).
- Scroll arrows keep the original centered styling; if a very long option list
  needs sticky top/bottom arrows, revisit their positioning (not exercised by
  the current short lists).

## Verify by hand

- In each form with a Select (Department create/edit → Standort; Users →
  Bereich; Rallye settings → Bereich + Status; Rallye wizard → Bereich;
  Location form → Campus-Tour; question search filters; question category):
  open the dropdown, pick an option, and confirm the TRIGGER shows the option's
  LABEL (name), not its id/sentinel value, and that the change takes effect.
- Confirm keyboard: open with Enter/Space/ArrowDown, type-ahead, Enter to
  select, Escape to close.
- Confirm the popup width matches the trigger and it fades+scales in below the
  trigger.
