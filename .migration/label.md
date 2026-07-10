# label

2026-07-11, transformation engine (Base UI has NO Label primitive → native
`<label>`, per SKILL mapping). Verdict: migrated cleanly; wrapper API and DHBW
classes unchanged, no consumer sweep needed. tsc + lint + prettier + 283 tests
green.

## Changed

- `components/ui/label.tsx` — dropped `@radix-ui/react-label` and the
  `forwardRef`; now a plain function component rendering a native `<label>`
  with the same `labelVariants` cva classes. Removed `'use client'` (native
  label needs no client boundary). Props widened to
  `React.ComponentProps<'label'> & VariantProps<...>` (ref is a normal prop in
  React 19 and forwards via `...props`). Leftover scan clean.

## Left alone

- `@radix-ui/react-label` stays in package.json until the final dep sweep
  (removed with the other Radix packages after the last component).
- All 11 `Label` consumers: unchanged. The wrapper name and its props
  (`htmlFor`, `className`, children) are identical, and Radix Label already
  rendered a `<label>` element, so the DOM output is the same. This includes
  the button-migrated `render={<Label htmlFor="image-upload" />}` site, where
  Base UI Button merges its className/children onto the native label.

## Behavior changes

- Micro-delta: Radix Label suppressed text selection on double-click
  (mousedown preventDefault when `detail > 1`); a native `<label>` does not.
  Flagged, not patched — no visual/functional impact on the forms here.

## Verify by hand

- Click a field's label and confirm it still focuses/toggles the associated
  control (label ↔ input association via `htmlFor`).
- Confirm the "Bild hochladen" label-button (Button `render={<Label/>}`) opens
  the file picker.
- Confirm disabled-peer styling still dims labels (`peer-disabled:opacity-70`).
