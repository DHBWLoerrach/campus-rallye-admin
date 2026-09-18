import { describe, expect, it } from 'vitest';
import { getUserRef } from './user-ref';

describe('getUserRef', () => {
  it('returns the first eight hexadecimal characters of a UUID', () => {
    expect(getUserRef('550e8400-e29b-41d4-a716-446655440000')).toBe('550e8400');
  });

  it('normalizes uppercase UUIDs', () => {
    expect(getUserRef('A50E8400E29B41D4A716446655440000')).toBe('a50e8400');
  });

  it.each([null, undefined, '', 'user@example.test', 'user-123'])(
    'does not shorten a non-UUID value: %s',
    (value) => {
      expect(getUserRef(value)).toBeNull();
    }
  );
});
