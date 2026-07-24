// A rallye code is a shared access code teams enter to join a team rallye. It
// should be short and easy to read aloud, so a suggestion pairs a common word
// with a few digits (e.g. "campus-427"). The suggestion is only a starting
// point; editors may replace it with anything non-empty.
const CODE_WORDS = [
  'campus',
  'rallye',
  'start',
  'team',
  'tour',
  'quiz',
] as const;

export function suggestRallyeCode(): string {
  const word = CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)];
  const digits = Math.floor(100 + Math.random() * 900);
  return `${word}-${digits}`;
}
