import { describe, expect, it } from 'vitest';
import { getRallyeStatusLabel, RALLYE_STATUSES } from './types';

describe('getRallyeStatusLabel', () => {
  it.each([
    ['preparing', 'Entwurf'],
    ['inactive', 'Bereit'],
    ['running', 'Läuft'],
    ['voting', 'Abstimmung'],
    ['ranking', 'Ranking'],
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
