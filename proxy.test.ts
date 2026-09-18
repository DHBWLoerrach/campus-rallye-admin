// @vitest-environment node
import { NextRequest } from 'next/server';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_COOKIE_VALUE,
} from './lib/auth-session-cookie';

const ISSUER = 'https://auth.dhbw-loerrach.de/realms/dhbw';
const AUDIENCE = 'campusrallye';
const KEY_ID = 'test-key';
const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

let config: { matcher: string[] };
let proxy: (req: NextRequest) => Promise<Response>;
let privateKey: Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];

beforeAll(async () => {
  process.env.KEYCLOAK_ISSUER = ISSUER;
  process.env.KEYCLOAK_AUDIENCE = AUDIENCE;

  const { publicKey, privateKey: pk } = await generateKeyPair('RS256');
  privateKey = pk;
  const jwk = await exportJWK(publicKey);

  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      const jwks = {
        keys: [{ ...jwk, kid: KEY_ID, use: 'sig', alg: 'RS256' }],
      };
      return new Response(JSON.stringify(jwks), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  const proxyModule = await import('./proxy');
  config = proxyModule.config;
  proxy = proxyModule.proxy;
});

afterAll(() => {
  vi.unstubAllGlobals();
  delete process.env.KEYCLOAK_ISSUER;
  delete process.env.KEYCLOAK_AUDIENCE;
});

async function signToken({
  roles = [],
  aud = 'account',
  azp = AUDIENCE,
  subject = 'user-123',
  issuedAt = Math.floor(Date.now() / 1000),
  expirationTime = '2h',
}: {
  roles?: string[];
  aud?: string;
  azp?: string;
  subject?: string;
  issuedAt?: number;
  expirationTime?: string | number;
} = {}) {
  const payload: Record<string, unknown> = {
    realm_access: { roles },
    resource_access: { [AUDIENCE]: { roles } },
  };
  if (azp) {
    payload.azp = azp;
  }

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid: KEY_ID })
    .setIssuedAt(issuedAt)
    .setIssuer(ISSUER)
    .setAudience(aud)
    .setSubject(subject)
    .setExpirationTime(expirationTime)
    .sign(privateKey);
}

function buildRequest(path: string, token?: string, method = 'GET') {
  const headers = new Headers();
  if (token) {
    headers.set('x-forwarded-access-token', token);
  }
  return new NextRequest(new URL(`http://example.com${path}`), {
    headers,
    method,
  });
}

describe('proxy', () => {
  it('allows staff with a valid token and sets the auth marker', async () => {
    const token = await signToken({ roles: ['staff'] });
    const response = await proxy(buildRequest('/questions', token));

    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('set-cookie')).toContain(
      `${AUTH_SESSION_COOKIE}=${AUTH_SESSION_COOKIE_VALUE}`
    );
  });

  it('does not reset the auth marker when it already exists', async () => {
    const token = await signToken({ roles: ['staff'] });
    const request = buildRequest('/questions', token);
    request.cookies.set(AUTH_SESSION_COOKIE, AUTH_SESSION_COOKIE_VALUE);

    const response = await proxy(request);

    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('redirects non-staff to access denied', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const token = await signToken({ subject: USER_ID });
    const response = await proxy(buildRequest('/questions', token));

    const location = response.headers.get('location');
    expect(location).not.toBeNull();
    expect(new URL(location as string).pathname).toBe('/access-denied');
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('Access denied', {
      userRef: '550e8400',
      roles: [],
      path: '/questions',
    });
    const serializedLog = JSON.stringify(warnSpy.mock.calls);
    expect(serializedLog).not.toContain(USER_ID);
    warnSpy.mockRestore();
  });

  it('redirects invalid tokens to login', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const token = await signToken({ azp: 'other', subject: USER_ID });
    const response = await proxy(buildRequest('/questions?tab=1', token));

    const location = response.headers.get('location');
    expect(location).not.toBeNull();

    const loginUrl = new URL(location as string);
    expect(loginUrl.pathname).toBe('/oauth2/start');
    expect(loginUrl.searchParams.get('rd')).toBe('/questions?tab=1');
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('Access token verification failed', {
      source: 'proxy',
      method: 'GET',
      path: '/questions',
      code: 'ERR_KEYCLOAK_AZP_MISMATCH',
      userRef: '550e8400',
    });
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain(token);
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain(USER_ID);
    warnSpy.mockRestore();
  });

  it('logs safe diagnostics for an expired action token', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const expirationTime = Math.floor(Date.now() / 1000) - 60;
    const issuedAt = expirationTime - 5 * 60;
    const token = await signToken({
      issuedAt,
      expirationTime,
      subject: USER_ID,
    });

    await proxy(buildRequest('/questions/42?tab=details', token, 'POST'));

    expect(warnSpy).toHaveBeenCalledWith(
      'Access token verification failed',
      expect.objectContaining({
        source: 'proxy',
        method: 'POST',
        path: '/questions/42',
        code: 'ERR_JWT_EXPIRED',
        claim: 'exp',
        issuedAt: new Date(issuedAt * 1000).toISOString(),
        expiredAt: new Date(expirationTime * 1000).toISOString(),
        expiredBySeconds: expect.any(Number),
        tokenLifetimeSeconds: 300,
        userRef: '550e8400',
      })
    );
    const serializedLog = JSON.stringify(warnSpy.mock.calls);
    expect(serializedLog).not.toContain(token);
    expect(serializedLog).not.toContain(USER_ID);
    warnSpy.mockRestore();
  });

  it.each(['/impressum', '/datenschutz', '/nutzungshinweise'])(
    'keeps %s public',
    (path) => {
      const matcher = new RegExp(config.matcher[0]);

      expect(matcher.test(path)).toBe(false);
    }
  );
});
