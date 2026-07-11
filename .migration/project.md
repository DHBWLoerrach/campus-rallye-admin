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

## shadcn config switched to Base UI (resolved)

`components.json` `style` was flipped from the legacy `"default"` to
`"base-nova"` (there is no `base` field; the base is encoded in the style
prefix — valid Base UI styles are `base-{vega,nova,maia,lyra,mira,luma,sera,
rhea}`). `shadcn info` now resolves `base: base`, `style: nova`, and the
registry URLs point at `bases/base/ui/`; `shadcn view` returns `@base-ui/react`
components. Future `shadcn add` therefore delivers Base UI variants. Our own
DHBW classes are still re-applied per component as during this migration. The
named style only affects the defaults of newly added components; the existing
globals.css theme is untouched.

## Verify by hand (cross-cutting)

Run the app and exercise: link-buttons navigate; every dialog and the mobile
nav sheet open/close/dismiss with animation and focus return; the theme
dropdown opens/selects; every Select shows the option LABEL (not id) after
selection and applies the change. Per-component checklists in each
`.migration/<component>.md`.
