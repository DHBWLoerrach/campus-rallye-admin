import { describe, expect, it } from 'vitest';
import { getZonedHourMinute, parsePlannedEnd } from './planned-end';

// The test suite runs in America/New_York (see vitest.config.ts) so these
// assertions prove the conversion stays in the fixed organizer timezone
// (Europe/Berlin) rather than following the local machine's zone.
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

  it('interprets the time as Berlin summer time (CEST, UTC+2)', () => {
    const base = new Date('2026-07-08T12:00:00.000Z');
    expect(parsePlannedEnd('18', '30', base)).toEqual({
      kind: 'time',
      iso: '2026-07-08T16:30:00.000Z',
    });
  });

  it('interprets the time as Berlin winter time (CET, UTC+1)', () => {
    const base = new Date('2026-01-08T12:00:00.000Z');
    expect(parsePlannedEnd('18', '30', base)).toEqual({
      kind: 'time',
      iso: '2026-01-08T17:30:00.000Z',
    });
  });

  it('defaults a missing field to zero', () => {
    const base = new Date('2026-07-08T12:00:00.000Z');
    expect(parsePlannedEnd('18', '', base)).toEqual({
      kind: 'time',
      iso: '2026-07-08T16:00:00.000Z',
    });
  });

  it('pins the time to the base day in Berlin, not the local zone', () => {
    // 02:00Z is still 2026-07-07 in New York but already 2026-07-08 in Berlin.
    const base = new Date('2026-07-08T02:00:00.000Z');
    expect(parsePlannedEnd('18', '30', base)).toEqual({
      kind: 'time',
      iso: '2026-07-08T16:30:00.000Z',
    });
  });

  // On 2026-03-29 Berlin jumps from CET (+1) to CEST (+2) at 01:00 UTC, so the
  // wall-clock hour 02:00–02:59 does not exist on that day.
  it('converts a valid time before the spring-forward gap (CET)', () => {
    const base = new Date('2026-03-29T12:00:00.000Z');
    expect(parsePlannedEnd('1', '30', base)).toEqual({
      kind: 'time',
      iso: '2026-03-29T00:30:00.000Z',
    });
  });

  it('converts a valid time after the spring-forward gap (CEST)', () => {
    const base = new Date('2026-03-29T12:00:00.000Z');
    expect(parsePlannedEnd('3', '30', base)).toEqual({
      kind: 'time',
      iso: '2026-03-29T01:30:00.000Z',
    });
  });

  it('rejects a time that falls into the spring-forward gap', () => {
    const base = new Date('2026-03-29T12:00:00.000Z');
    expect(parsePlannedEnd('2', '30', base)).toEqual({ kind: 'invalid' });
  });

  it('accepts an ambiguous time in the autumn fall-back overlap', () => {
    // On 2026-10-25 Berlin falls back from CEST to CET at 01:00 UTC, so 02:30
    // exists twice; it is a real time and stays valid (one occurrence is used).
    const base = new Date('2026-10-25T12:00:00.000Z');
    expect(parsePlannedEnd('2', '30', base)).toEqual({
      kind: 'time',
      iso: '2026-10-25T01:30:00.000Z',
    });
  });
});

describe('getZonedHourMinute', () => {
  it('reads the Berlin wall-clock hour and minute (CEST)', () => {
    expect(getZonedHourMinute(new Date('2026-07-08T16:30:00.000Z'))).toEqual({
      hour: 18,
      minute: 30,
    });
  });

  it('reads the Berlin wall-clock hour and minute (CET)', () => {
    expect(getZonedHourMinute(new Date('2026-01-08T17:30:00.000Z'))).toEqual({
      hour: 18,
      minute: 30,
    });
  });

  it('normalizes Berlin midnight to hour 0', () => {
    expect(getZonedHourMinute(new Date('2026-07-07T22:00:00.000Z'))).toEqual({
      hour: 0,
      minute: 0,
    });
  });

  it('round-trips with parsePlannedEnd on the same Berlin day', () => {
    const instant = new Date('2026-07-08T16:30:00.000Z');
    const { hour, minute } = getZonedHourMinute(instant);
    expect(parsePlannedEnd(String(hour), String(minute), instant)).toEqual({
      kind: 'time',
      iso: instant.toISOString(),
    });
  });
});
