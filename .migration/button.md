# button

2026-07-11, transformation engine (legacy `default` style — no base-<style>
golden pair exists), migrated in place. Verdict: migrated cleanly; wrapper on
the real Base UI Button primitive, 14 consumers moved from `asChild` to
`render`. tsc + lint + prettier + 283 tests + production build all green.

## Changed

- `components/ui/button.tsx` — swapped `Slot` (`@radix-ui/react-slot`) for the
  real Base UI `Button` primitive (`@base-ui/react/button`), per SKILL hard
  rule (never a hand-rolled useRender wrapper). Dropped the `asChild` prop and
  the `Comp = asChild ? Slot : 'button'` branch; the primitive supports
  polymorphism via `render`. Props type is now `ButtonPrimitive.Props &
  VariantProps<...>`. cva class list unchanged (DHBW styling preserved).
  Leftover scan clean: `grep -n "radix-ui\|@radix-ui"` → none.
- 14 consumers rewritten `<Button asChild><El …>inner</El></Button>` →
  `<Button render={<El … />}>inner</Button>` (child element's inner content
  becomes the Button's children, which Base UI merges into the render target):
  - `app/page.tsx`, `app/not-found.tsx`, `app/access-denied.tsx`
    (`a href={signOutUrl}`), `app/(protected)/rallyes/page.tsx`,
    `app/(protected)/rallyes/new/page.tsx`,
    `app/(protected)/rallyes/[id]/(tabs)/layout.tsx`,
    `app/(protected)/admin/locations/page.tsx`
  - `components/Navigation.tsx` (anchor with span + LogOut icon),
    `components/DepartmentsClient.tsx`, `components/UsersClient.tsx`,
    `components/questions/QuestionsManagement.tsx`,
    `components/questions/QuestionsTable.tsx`,
    `components/questions/id/QuestionImage.tsx` (render target is a `Label`),
    `components/rallyes/RallyeQuestionsManager.tsx`

## Left alone

- `@radix-ui/react-slot` stays in package.json for now — no other wrapper uses
  it, but it is removed with the rest of the Radix deps after the last
  component migrates (per SKILL: deps removed only at the end).
- Non-Radix wrappers (badge, card, input, table) untouched.

## Behavior changes

- None functional. `render` merges the wrapper's `className`/`data-slot`/
  children onto the target element the same way `asChild` (Slot) did. Base UI
  Button renders a native `<button>` by default, so the cva `disabled:*`
  variants keep working via the native `disabled` attribute.

## Verify by hand

- Click each migrated link-button and confirm it navigates (they render as
  `<a>`/Next `Link`, not `<button>`): home "Anmelden", not-found "Zur
  Übersicht", access-denied "Abmelden", rallyes "+ Neue Rallye" and the
  "← Zurück" back-links, questions create/edit icon buttons.
- Confirm the "Bild hochladen" button (renders as a `<label htmlFor>`) still
  opens the file picker.
- Confirm focus ring + disabled opacity look unchanged (DHBW rounded-full
  styling intact).
