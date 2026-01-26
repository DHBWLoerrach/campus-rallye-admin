import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isAuthorizedUser } from './auth';

describe('isAuthorizedUser', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns true if user has staff role', () => {
    expect(isAuthorizedUser(['staff'], null)).toBe(true);
    expect(isAuthorizedUser(['staff', 'admin'], 'user@example.com')).toBe(true);
  });

  it('returns false if no staff role and no email', () => {
    expect(isAuthorizedUser([], null)).toBe(false);
    expect(isAuthorizedUser(['user'], null)).toBe(false);
  });

  it('returns false if no staff role and ALLOWED_EMAILS not set', () => {
    delete process.env.ALLOWED_EMAILS;
    expect(isAuthorizedUser([], 'user@example.com')).toBe(false);
  });

  it('returns true if email is in ALLOWED_EMAILS', () => {
    process.env.ALLOWED_EMAILS = 'user@example.com,other@example.com';
    expect(isAuthorizedUser([], 'user@example.com')).toBe(true);
    expect(isAuthorizedUser([], 'other@example.com')).toBe(true);
  });

  it('returns false if email is not in ALLOWED_EMAILS', () => {
    process.env.ALLOWED_EMAILS = 'allowed@example.com';
    expect(isAuthorizedUser([], 'notallowed@example.com')).toBe(false);
  });

  it('handles case-insensitive email matching', () => {
    process.env.ALLOWED_EMAILS = 'User@Example.COM';
    expect(isAuthorizedUser([], 'user@example.com')).toBe(true);
    expect(isAuthorizedUser([], 'USER@EXAMPLE.COM')).toBe(true);
  });

  it('handles whitespace in ALLOWED_EMAILS', () => {
    process.env.ALLOWED_EMAILS = ' user@example.com , other@example.com ';
    expect(isAuthorizedUser([], 'user@example.com')).toBe(true);
    expect(isAuthorizedUser([], 'other@example.com')).toBe(true);
  });

  it('handles empty ALLOWED_EMAILS', () => {
    process.env.ALLOWED_EMAILS = '';
    expect(isAuthorizedUser([], 'user@example.com')).toBe(false);
  });
});
