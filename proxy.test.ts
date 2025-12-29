// @vitest-environment node
import { NextRequest } from 'next/server';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const ISSUER = 'https://auth.dhbw-loerrach.de/realms/dhbw';
const AUDIENCE = 'campusrallye';
const KEY_ID = 'test-key';

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
      const jwks = { keys: [{ ...jwk, kid: KEY_ID, use: 'sig', alg: 'RS256' }] };
      return new Response(JSON.stringify(jwks), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    })
  );

  proxy = (await import('./proxy')).proxy;
});

afterAll(() => {
  vi.unstubAllGlobals();
  delete process.env.KEYCLOAK_ISSUER;
  delete process.env.KEYCLOAK_AUDIENCE;
});

async function signToken({
  roles = [],
  aud = AUDIENCE,
  azp,
  subject = 'user-123',
}: {
  roles?: string[];
  aud?: string;
  azp?: string;
  subject?: string;
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
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(aud)
    .setSubject(subject)
    .setExpirationTime('2h')
    .sign(privateKey);
}

function buildRequest(path: string, token?: string) {
  const headers = new Headers();
  if (token) {
    headers.set('x-forwarded-access-token', token);
  }
  return new NextRequest(new URL(`http://example.com${path}`), { headers });
}

describe('proxy', () => {
  it('allows staff with a valid token', async () => {
    const token = await signToken({ roles: ['staff'] });
    const response = await proxy(buildRequest('/questions', token));

    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects non-staff to access denied', async () => {
    const token = await signToken();
    const response = await proxy(buildRequest('/questions', token));

    const location = response.headers.get('location');
    expect(location).not.toBeNull();
    expect(new URL(location as string).pathname).toBe('/access-denied');
  });

  it('redirects invalid tokens to login', async () => {
    const token = await signToken({ aud: 'other', azp: 'other' });
    const response = await proxy(buildRequest('/questions?tab=1', token));

    const location = response.headers.get('location');
    expect(location).not.toBeNull();

    const loginUrl = new URL(location as string);
    expect(loginUrl.pathname).toBe('/oauth2/start');
    expect(loginUrl.searchParams.get('rd')).toBe('/questions?tab=1');
  });
});
