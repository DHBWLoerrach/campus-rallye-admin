import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_COOKIE_VALUE,
} from '@/lib/auth-session-cookie';
import LandingPage from './page';

const { mockCookies, mockRedirect } = vi.hoisted(() => ({
  mockCookies: vi.fn(),
  mockRedirect: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: mockCookies,
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

function mockCookieStore(value?: string) {
  mockCookies.mockResolvedValue({
    get: (name: string) =>
      name === AUTH_SESSION_COOKIE && value ? { name, value } : undefined,
  });
}

describe('LandingPage', () => {
  beforeEach(() => {
    mockCookies.mockReset();
    mockRedirect.mockReset();
    mockRedirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
  });

  it('renders the login prompt without an auth marker', async () => {
    mockCookieStore();

    render(await LandingPage());

    expect(
      screen.getByRole('link', { name: 'Login mit DHBW-Account' })
    ).toHaveAttribute('href', '/rallyes');
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('redirects authenticated browsers to the app', async () => {
    mockCookieStore(AUTH_SESSION_COOKIE_VALUE);

    await expect(LandingPage()).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledWith('/rallyes');
  });
});
