# radio-group

2026-07-11, transformation engine (legacy `default` style), migrated in place.
Verdict: split into two Base UI subpaths; wrapper + one test attribute updated,
no consumer sweep. tsc + lint + prettier + 283 tests green (2 stable runs).

## Changed

- `components/ui/radio-group.tsx` — Radix `RadioGroup` namespace split into two
  Base UI primitives: group from `@base-ui/react/radio-group` (callable
  `RadioGroupPrimitive`, no `.Root`), items from `@base-ui/react/radio`
  (`Radio.Root` + `Radio.Indicator`). Dropped `forwardRef` → function
  components. Class rewrites: `data-[state=checked]:` → `data-checked:`
  (border/text), `disabled:` → `data-disabled:` (Radio.Root renders a
  `<span>`). DHBW `data-checked:text-primary/80` preserved.
  - Type note: the group is generic (`RadioGroupProps<Value = any>`).
    `React.ComponentProps<typeof RadioGroupPrimitive>` resolves `Value` to
    `unknown` and breaks the single-arg `onValueChange` handler; typed the
    wrapper as `RadioGroupPrimitive.Props` (default `Value = any`) instead.
  - Leftover scan clean.
- `components/questions/id/QuestionForm.test.tsx` — two assertions updated
  from `toHaveAttribute('data-state', 'checked')` to
  `toHaveAttribute('data-checked')` (Base UI presence attribute replaces the
  Radix `data-state` token). Migration-driven contract change.

## Left alone

- The single consumer `components/questions/id/QuestionForm.tsx` is unchanged:
  `value` is a string and `onValueChange={handleCorrectAnswerSelect}` is a
  `(string) => void` handler, both assignable under `Value = any`.
- `RadioGroupItem`'s `value={index.toString()}` sites unchanged.
- `@radix-ui/react-radio-group` removed in the final dep sweep.

## Behavior changes

- None functional. The checked radio now exposes `data-checked` (presence)
  instead of `data-state="checked"`; only the test relied on the old token.

## Verify by hand

- Open a multiple-choice question in QuestionForm; select different correct
  answers via the radios and confirm the filled dot + `border-primary` styling
  moves. Remove the selected answer and confirm the correct-answer selection
  reassigns to a remaining radio.
- Confirm keyboard arrow-key navigation moves selection within the group.
