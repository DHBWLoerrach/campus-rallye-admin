import { describe, expect, it } from 'vitest';
import { parsePlannedEnd, plannedEndToMinutes } from './planned-end';

describe('parsePlannedEnd', () => {
  it('treats an empty field as no planned end', () => {
    expect(parsePlannedEnd('')).toEqual({ kind: 'none' });
  });

  it('accepts a 24-hour time and normalizes database seconds', () => {
    expect(parsePlannedEnd('18:30')).toEqual({ kind: 'time', value: '18:30' });
    expect(parsePlannedEnd('18:30:00')).toEqual({
      kind: 'time',
      value: '18:30',
    });
  });

  it('rejects malformed or out-of-range times', () => {
    expect(parsePlannedEnd('24:00')).toEqual({ kind: 'invalid' });
    expect(parsePlannedEnd('09:60')).toEqual({ kind: 'invalid' });
    expect(parsePlannedEnd('9:30')).toEqual({ kind: 'invalid' });
    expect(parsePlannedEnd('18:30 Uhr')).toEqual({ kind: 'invalid' });
  });
});

describe('plannedEndToMinutes', () => {
  it('returns minutes after midnight for valid times', () => {
    expect(plannedEndToMinutes('18:30:00')).toBe(1110);
  });

  it('returns null for absent or malformed times', () => {
    expect(plannedEndToMinutes(null)).toBeNull();
    expect(plannedEndToMinutes('invalid')).toBeNull();
  });
});
