import { describe, expect, it } from 'vitest';
import { parsePlannedEnd } from './planned-end';

describe('parsePlannedEnd', () => {
  it('treats two empty fields as no planned end', () => {
    expect(parsePlannedEnd('', '')).toEqual({ kind: 'none' });
  });

  it('rejects out-of-range hours instead of silently dropping them', () => {
    expect(parsePlannedEnd('24', '00')).toEqual({ kind: 'invalid' });
    expect(parsePlannedEnd('9', '60')).toEqual({ kind: 'invalid' });
    expect(parsePlannedEnd('-1', '0')).toEqual({ kind: 'invalid' });
  });

  it('rejects non-integer input', () => {
    expect(parsePlannedEnd('9.5', '0')).toEqual({ kind: 'invalid' });
    expect(parsePlannedEnd('abc', '0')).toEqual({ kind: 'invalid' });
  });

  it('defaults a missing field to zero', () => {
    const base = new Date('2026-07-08T00:00:00');
    expect(parsePlannedEnd('18', '', base)).toEqual({
      kind: 'time',
      iso: new Date('2026-07-08T18:00:00').toISOString(),
    });
  });

  it('pins the time to the provided base day', () => {
    const base = new Date('2026-07-08T09:15:00');
    const result = parsePlannedEnd('18', '30', base);
    expect(result.kind).toBe('time');
    if (result.kind !== 'time') throw new Error('Expected a time');
    const end = new Date(result.iso);
    expect(end.getHours()).toBe(18);
    expect(end.getMinutes()).toBe(30);
    expect(end.toDateString()).toBe(base.toDateString());
  });
});
