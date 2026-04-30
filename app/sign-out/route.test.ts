// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AUTH_SESSION_COOKIE } from '@/lib/auth-session-cookie';
import { GET } from './route';

describe('sign-out route', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('clears the auth marker before redirecting to oauth2-proxy sign out', () => {
    const response = GET(new NextRequest('https://example.com/sign-out'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'https://example.com/oauth2/sign_out'
    );
    expect(response.headers.get('set-cookie')).toContain(
      `${AUTH_SESSION_COOKIE}=`
    );
    expect(response.headers.get('set-cookie')).toContain(
      'Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    );
  });

  it('uses the incoming app origin as the dev return URL', () => {
    vi.stubEnv('NODE_ENV', 'development');

    const response = GET(new NextRequest('http://localhost:3001/sign-out'));

    const location = new URL(response.headers.get('location') as string);
    expect(location.origin).toBe('http://localhost:4181');
    expect(location.pathname).toBe('/oauth2/sign_out');
    expect(location.searchParams.get('rd')).toBe('http://localhost:3001');
  });

  it('clears the auth marker before returning to root with dev auth bypass', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DEV_AUTH_BYPASS', 'true');

    const response = GET(new NextRequest('http://localhost:3000/sign-out'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/');
    expect(response.headers.get('set-cookie')).toContain(
      `${AUTH_SESSION_COOKIE}=`
    );
  });
});
