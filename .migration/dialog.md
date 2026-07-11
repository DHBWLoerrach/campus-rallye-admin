# dialog

2026-07-11, transformation engine (legacy `default` style), migrated in place.
Verdict: structural overlay migration (Overlay→Backdrop, Content→Popup, no
Positioner for the centered modal); wrapper + 9 trigger call sites. tsc + lint
+ prettier + 312 tests + production build green.

## Changed

- `components/ui/dialog.tsx` — swapped `@radix-ui/react-dialog` for
  `@base-ui/react/dialog`. Part remap: `Overlay` → `Backdrop` (via
  `DialogOverlay`), `Content` → `Popup` (via `DialogContent`, still
  `Portal > Backdrop + Popup`, NO Positioner — centered modal). Root/Trigger/
  Portal/Close/Title/Description are re-exports/thin wrappers. Dropped all
  `forwardRef` → function components. DHBW styling preserved (bg-card/95,
  border-border/60, custom shadow, rounded-2xl, backdrop-blur).
  - Animation idiom rewritten from Radix `data-[state=open]:animate-in …
    zoom/slide/fade` to Base UI transitions: Backdrop
    `transition-opacity data-[starting-style]:opacity-0
    data-[ending-style]:opacity-0`; Popup `transition-all duration-200
    data-[starting-style]:opacity-0 data-[starting-style]:scale-95
    data-[ending-style]:opacity-0 data-[ending-style]:scale-95`. Bracket
    variant form used because globals.css defines no Base UI custom variants.
  - Close: dropped two dead `data-[state=open]:` classes (DialogClose never had
    an open state; they were inert under Radix too).
- 9 consumers: `<DialogTrigger asChild><El/></DialogTrigger>` →
  `<DialogTrigger render={<El/>} />`:
  DepartmentDialog, LocationDialog, DepartmentForm, LocationForm,
  RallyeSettingsForm, RallyePhaseControls, RallyeQuestionsManager,
  UploadPhotoSlideshow, UploadPhotoTile (native `<button>` trigger).

## Left alone

- `onOpenChange` handlers unchanged: `setShowDeleteDialog` / `setOpen`
  (`Dispatch<SetStateAction<boolean>>`) and custom `handleOpenChange`
  (`(open: boolean) => void`) all stay assignable to Base UI's
  `(open, eventDetails) => void`.
- `@radix-ui/react-dialog` stays until the final dep sweep — still used by
  `sheet.tsx` (next to migrate).

## Behavior changes

- Enter/exit animation restated: the centered modal now fades + scales (95%)
  instead of Radix's fade + zoom + slight slide-from-top. Visual intent
  preserved; the subtle vertical slide is gone (base-registry behavior).
- Radix per-interaction dismiss callbacks are not used here, so no
  onOpenChange `eventDetails.cancel()` rewiring was needed.

## Verify by hand

- Open/close each dialog (create Department/Location, delete confirmations,
  add-questions, phase-control confirm, photo slideshow, photo tile zoom) and
  confirm the fade+scale animation, backdrop blur, Escape + outside-click
  dismissal, and the X close button all work.
- Confirm focus moves into the dialog on open and returns to the trigger on
  close; confirm the trigger buttons still look/behave unchanged.
- Confirm the full-screen slideshow dialog (custom max-w/rounded overrides via
  className) still lays out correctly.
