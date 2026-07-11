# Project migration: Radix UI → Base UI

2026-07-11, whole-project migration on branch `migrate-radix-to-base`.
Strategy: transformation engine on the project's OWN wrapper files (legacy
`default` style has no `base-<style>` golden pair), keeping the exact DHBW
classes and rewiring primitives. Baseline before start: tsc clean, 284 tests.
Final: tsc clean, lint clean, prettier clean, 312 tests, production build — all
green.

## Dependency swap

- Added `@base-ui/react@^1.6.0`.
- Removed all Radix packages after the last wrapper: `@radix-ui/react-checkbox`,
  `-dialog`, `-dropdown-menu`, `-label`, `-radio-group`, `-select`, `-slot`.
- Earlier cleanup (step 0) also removed `@radix-ui/react-popover`, `-toggle`,
  `-tooltip`, plus `react-day-picker` and `date-fns`, along with four dead
  wrappers (calendar, popover, toggle, tooltip).
- No `@radix-ui`/`radix-ui` imports remain anywhere in app/components/lib/actions.

## Components migrated (8 wrappers, one commit each)

button, label (→ native `<label>`), checkbox, radio-group, dialog, sheet,
dropdown-menu (→ Base UI `Menu`), select. See `.migration/<component>.md` for
each. Non-Radix wrappers left untouched: badge, card, input, table.

## App-code sweep summary

- `asChild` → `render` on every trigger/polymorphic call site: Button (14),
  DialogTrigger (9), SheetTrigger (1), DropdownMenuTrigger (1). Child element
  moves into `render={…}`; its content becomes the wrapper's children.
- Select: `items={{value,label}}` added to 9 consumers (Base UI `Select.Value`
  renders the raw value, not the item text); `onValueChange` made null-safe
  (`value ?? …`) for the widened `(value|null)` signature.
- Tests: radio-group `data-state="checked"` → `data-checked`; select option
  commit driven by a full pointer tap; tooltip case dropped in step 0.

## Behavior deltas flagged (not patched)

- Overlay/menu/select enter-exit animations restated as fade+scale (and
  per-side translate for sheet) via `data-[starting-style]`/
  `data-[ending-style]`; the subtle Radix slide nudges are gone.
- Menu/select items highlight via `data-highlighted` instead of `:focus`.
- Base UI `CheckboxItem`/`RadioItem` in menus default `closeOnClick={false}`
  (unused here).
- Native `<label>` no longer suppresses double-click text selection.

## Open item for the user (FLAG, not changed)

`components.json` still uses the legacy schema (`"style": "default"`, no `base`
field), so the shadcn CLI will still resolve **Radix** variants for future
`shadcn add`. The code is fully on Base UI. Decide whether to switch the
config to a Base UI base/style or to add future components manually. This was
intentionally left untouched.

## Verify by hand (cross-cutting)

Run the app and exercise: link-buttons navigate; every dialog and the mobile
nav sheet open/close/dismiss with animation and focus return; the theme
dropdown opens/selects; every Select shows the option LABEL (not id) after
selection and applies the change. Per-component checklists in each
`.migration/<component>.md`.
