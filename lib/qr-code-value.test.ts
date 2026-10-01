import { describe, expect, it } from 'vitest';
import { getQrCodeValue } from './qr-code-value';

describe('getQrCodeValue', () => {
  it('trims the first solution and ignores additional options', () => {
    expect(
      getQrCodeValue([{ text: '  QR-Inhalt  ' }, { text: 'Andere Lösung' }])
    ).toBe('QR-Inhalt');
  });

  it('returns an empty value for missing or blank first solutions', () => {
    for (const options of [
      undefined,
      null,
      [],
      [{}],
      [{ text: null }],
      [{ text: '  ' }],
      [{ text: '' }, { text: 'Zweite Lösung' }],
    ]) {
      expect(getQrCodeValue(options)).toBe('');
    }
  });
});
