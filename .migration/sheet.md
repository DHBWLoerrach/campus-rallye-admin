# sheet

2026-07-11, transformation engine (legacy `default` style), migrated in place.
Verdict: side-anchored dialog migration; slide animations restated per side,
wrapper + 1 trigger call site. tsc + lint + prettier + 312 tests + production
build green.

## Changed

- `components/ui/sheet.tsx` — swapped `@radix-ui/react-dialog` for
  `@base-ui/react/dialog` (sheet is a dialog anchored to a screen edge).
  `Overlay` → `Backdrop`, `Content` → `Popup` (`Portal > Backdrop + Popup`,
  no Positioner). Dropped `forwardRef` → function components. DHBW styling
  preserved.
  - Slide animations rewritten from Radix
    `data-[state=open]:slide-in-from-<side>` /
    `data-[state=closed]:slide-out-to-<side>` to Base UI translate transitions
    on `data-[starting-style]` / `data-[ending-style]` per side (e.g. right:
    `translate-x-full`, top: `-translate-y-full`). Base keeps `transition
    ease-in-out duration-500 data-[ending-style]:duration-300` (open 500ms /
    close 300ms, matching the original per-state durations). Backdrop fades via
    `transition-opacity data-[starting-style]:opacity-0
    data-[ending-style]:opacity-0`.
  - Close: dropped the dead `data-[state=open]:bg-secondary` class (Close has
    no open state).
- `components/Navigation.tsx` — `<SheetTrigger asChild><Button/></SheetTrigger>`
  → `<SheetTrigger render={<Button/>} />` (the mobile-nav hamburger, `side="left"`).

## Left alone

- Only consumer is Navigation; no `onOpenChange`/dismiss-callback usage on the
  sheet.
- `@radix-ui/react-dialog` is now unused by both dialog and sheet — removed in
  the final dep sweep after the last component.

## Behavior changes

- Slide feel restated with transforms instead of tw-animate keyframes; visually
  equivalent (enter from edge, exit to edge). Open/close durations preserved.

## Verify by hand

- On a narrow viewport, tap the hamburger in the top bar: the nav sheet should
  slide in from the LEFT, backdrop blur behind it, and slide back out on close
  / Escape / outside-click / X button.
- Confirm focus enters the sheet and returns to the hamburger on close.
