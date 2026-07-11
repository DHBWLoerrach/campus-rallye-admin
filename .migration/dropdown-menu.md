# dropdown-menu

2026-07-11, transformation engine (legacy `default` style), migrated in place.
Verdict: full menu-family restructure (Radix `DropdownMenu` → Base UI `Menu`);
wrapper rebuilt + 1 trigger call site. tsc + lint + prettier + 312 tests
(incl. upstream-compatibility) + production build green.

## Changed

- `components/ui/dropdown-menu.tsx` — swapped `@radix-ui/react-dropdown-menu`
  for `@base-ui/react/menu` (renamed primitive). Part remap:
  - `Content` → `Portal > Positioner > Popup`. `DropdownMenuContent` now
    forwards `sideOffset` (default 4) + `align`/`alignOffset`/`side` (Pick from
    Positioner.Props) to the Positioner; the rest spreads onto the Popup. This
    is the "declare→destructure→forward" rule — the consumer's `align="end"`
    must land on the Positioner, not the Popup.
  - `SubContent` rebuilt as `Portal > Positioner > Popup` with dropdown submenu
    defaults (`align="start" alignOffset={-3} side="right" sideOffset={0}`).
  - `Sub` → `SubmenuRoot`, `SubTrigger` → `SubmenuTrigger`,
    `Label` → `GroupLabel`, `ItemIndicator` → `CheckboxItemIndicator` /
    `RadioItemIndicator`. `Separator` is Base UI's standalone separator
    re-exported by the Menu namespace.
  - Class rewrites: item highlight `focus:bg-accent focus:text-accent-foreground`
    → `data-highlighted:bg-accent data-highlighted:text-accent-foreground`
    (Base UI menus highlight via `data-highlighted`, not `:focus`);
    SubTrigger open `data-[state=open]:bg-accent` → `data-popup-open:bg-accent`;
    animations `data-[state=…]:animate-in/out … zoom/slide` →
    `transition-[opacity,transform] data-[starting-style]:opacity-0/scale-95
    data-[ending-style]:opacity-0/scale-95` with `origin-[var(--transform-origin)]`;
    CSS vars `--radix-dropdown-menu-content-*` → `--transform-origin` /
    `--available-height`. `data-[disabled]:pointer-events-none/opacity-50` KEPT
    (the bracket selector matches Base UI's `data-disabled` presence attr — no
    rewrite needed; the upstream-compatibility test still asserts it).
  - Dropped `forwardRef` → function components. DHBW styling (rounded-xl,
    bg-card/95, border-border/60, custom shadow) preserved.
- `components/DarkModeToggle.tsx` — `<DropdownMenuTrigger asChild><Button/></…>`
  → `<DropdownMenuTrigger render={<Button/>} />`.

## Left alone

- Sub/Checkbox/Radio/Label/Separator/Shortcut wrappers are exported but unused
  in app code; migrated faithfully so they compile and stay correct, but not
  exercised by consumers.
- `@radix-ui/react-dropdown-menu` removed in the final dep sweep.

## Behavior changes

- Menu items highlight on hover/keyboard via `data-highlighted` (was `:focus`).
- Enter/exit animation restated as fade+scale from the transform origin; the
  per-side `slide-in-from-*` nudge is dropped (base-registry behavior).
- FLAG: Base UI `CheckboxItem`/`RadioItem` default `closeOnClick={false}`
  (Radix closed the menu on select). Not currently used; if these wrappers are
  adopted and Radix's close-on-select is wanted, pass `closeOnClick` explicitly.

## Verify by hand

- Click the theme toggle (sun/moon) in the top bar: the menu should open
  anchored to the button's end edge (`align="end"`), fade+scale in, highlight
  Light/Dark/System on hover and arrow-key nav, apply the theme on click and
  close, and dismiss on Escape / outside-click.
- Confirm keyboard: open with Enter/Space, navigate with arrows, select with
  Enter.
