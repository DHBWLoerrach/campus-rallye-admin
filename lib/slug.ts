/**
 * Converts text to a URL-safe slug for filenames.
 * Replaces umlauts (ä→ae, ö→oe, ü→ue, ß→ss), lowercases, replaces non-alphanumeric with hyphens.
 * @param text - Input text (e.g. question content)
 * @param maxLength - Max length of result (default 50)
 * @returns Slug string, or 'qr-code' if result would be empty
 */
export function slugify(text: string, maxLength = 50): string {
  if (!text?.trim()) return 'qr-code';
  const normalized = text
    .trim()
    .slice(0, maxLength * 2)
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const result = normalized.slice(0, maxLength).replace(/-$/, '');
  return result || 'qr-code';
}
