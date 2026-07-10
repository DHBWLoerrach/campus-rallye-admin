import { describe, expect, it } from 'vitest';
import {
  getNextRallyeTransition,
  getRallyePhaseGroup,
  getRallyeStatusLabel,
  RALLYE_PHASE_GROUPS,
  RALLYE_STATUSES,
} from './types';

describe('getRallyeStatusLabel', () => {
  it.each([
    ['draft', 'Entwurf'],
    ['ready', 'Bereit'],
    ['running', 'Läuft'],
    ['voting', 'Abstimmung'],
    ['results', 'Ergebnisse'],
    ['ended', 'Abgeschlossen'],
  ] as const)('maps %s to %s', (status, label) => {
    expect(getRallyeStatusLabel(status)).toBe(label);
  });

  it('covers every status in RALLYE_STATUSES', () => {
    for (const status of RALLYE_STATUSES) {
      expect(getRallyeStatusLabel(status)).not.toBe('Unbekannt');
    }
  });
});

describe('getNextRallyeTransition', () => {
  it('advances draft to ready', () => {
    const t = getNextRallyeTransition('draft', false);
    expect(t?.target).toBe('ready');
    expect(t?.actionLabel).toBe('Entwurf abschließen');
  });

  it('advances ready to running', () => {
    const t = getNextRallyeTransition('ready', false);
    expect(t?.target).toBe('running');
    expect(t?.actionLabel).toBe('Rallye starten');
  });

  it('advances running to voting when voting questions exist', () => {
    const t = getNextRallyeTransition('running', true);
    expect(t?.target).toBe('voting');
    expect(t?.actionLabel).toBe('Abstimmung starten');
  });

  it('skips voting when no voting questions exist', () => {
    const t = getNextRallyeTransition('running', false);
    expect(t?.target).toBe('results');
    expect(t?.actionLabel).toBe('Ergebnisse anzeigen');
  });

  it('advances voting to results', () => {
    expect(getNextRallyeTransition('voting', true)?.target).toBe('results');
  });

  it('advances results to ended', () => {
    const t = getNextRallyeTransition('results', false);
    expect(t?.target).toBe('ended');
    expect(t?.actionLabel).toBe('Rallye beenden');
  });

  it('returns null for ended (final state)', () => {
    expect(getNextRallyeTransition('ended', false)).toBeNull();
  });

  it('provides a non-empty confirmText for every transition', () => {
    for (const status of RALLYE_STATUSES) {
      const t = getNextRallyeTransition(status, true);
      if (t) expect(t.confirmText.length).toBeGreaterThan(0);
    }
  });
});

describe('getRallyePhaseGroup', () => {
  it.each([
    ['running', 'live'],
    ['voting', 'live'],
    ['results', 'live'],
    ['draft', 'preparation'],
    ['ready', 'preparation'],
    ['ended', 'done'],
  ] as const)('maps %s to %s', (status, group) => {
    expect(getRallyePhaseGroup(status)).toBe(group);
  });

  it('orders groups live, preparation, done with German labels', () => {
    expect(RALLYE_PHASE_GROUPS.map((g) => g.id)).toEqual([
      'live',
      'preparation',
      'done',
    ]);
    expect(RALLYE_PHASE_GROUPS.map((g) => g.label)).toEqual([
      'Läuft gerade',
      'In Vorbereitung',
      'Abgeschlossen',
    ]);
  });
});
