import { describe, expect, it } from 'vitest';
import { getPointValueValidationError } from './point-value';

describe('getPointValueValidationError', () => {
  it('requires a point value', () => {
    expect(getPointValueValidationError(undefined)).toBe(
      'Punktwert ist erforderlich'
    );
  });

  it('accepts a non-negative integer', () => {
    expect(getPointValueValidationError(0)).toBeUndefined();
    expect(getPointValueValidationError(5)).toBeUndefined();
  });

  it('rejects a decimal value', () => {
    expect(getPointValueValidationError(2.5)).toBe(
      'Punktwert muss eine ganze Zahl sein'
    );
  });

  it('rejects a negative value', () => {
    expect(getPointValueValidationError(-1)).toBe(
      'Punktwert muss größer oder gleich 0 sein'
    );
  });
});
