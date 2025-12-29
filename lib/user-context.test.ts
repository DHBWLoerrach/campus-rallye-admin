// @vitest-environment node
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const ISSUER = 'https://auth.dhbw-loerrach.de/realms/dhbw';
const AUDIENCE = 'campusrallye';
const KEY_ID = 'test-key';

const { mockHeaders } = vi.hoisted(() => ({
  mockHeaders: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: mockHeaders,
}));

let privateKey: Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];
let getUserContext: typeof import('./user-context').getUserContext;
let getSupabaseJwt: typeof import('./user-context').getSupabaseJwt;

beforeAll(async () => {
  process.env.KEYCLOAK_ISSUER = ISSUER;
  process.env.KEYCLOAK_AUDIENCE = AUDIENCE;
  process.env.SUPABASE_JWT_SECRET = 'test-secret';

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

  ({ getUserContext, getSupabaseJwt } = await import('./user-context'));
});

afterAll(() => {
  vi.unstubAllGlobals();
  delete process.env.KEYCLOAK_ISSUER;
  delete process.env.KEYCLOAK_AUDIENCE;
  delete process.env.SUPABASE_JWT_SECRET;
});

beforeEach(() => {
  mockHeaders.mockReset();
});

async function signToken({
  roles = [],
  aud = 'account',
  azp = AUDIENCE,
  subject = 'user-123',
  email = 'user@example.test',
}: {
  roles?: string[];
  aud?: string;
  azp?: string;
  subject?: string;
  email?: string;
} = {}) {
  const payload: Record<string, unknown> = {
    realm_access: { roles },
    resource_access: { [AUDIENCE]: { roles } },
    email,
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

function setTokenHeader(token?: string) {
  const headers = new Headers();
  if (token) {
    headers.set('x-forwarded-access-token', token);
  }
  mockHeaders.mockResolvedValue(headers);
}

describe('getUserContext', () => {
  it('returns user context for a valid token', async () => {
    const token = await signToken({ roles: ['staff'] });
    setTokenHeader(token);

    await expect(getUserContext()).resolves.toEqual({
      uuid: 'user-123',
      email: 'user@example.test',
      roles: ['staff'],
    });
  });

  it('rejects tokens with the wrong azp', async () => {
    const token = await signToken({ azp: 'other' });
    setTokenHeader(token);

    await expect(getUserContext()).rejects.toThrow('Invalid access token');
  });

  it('rejects when the token header is missing', async () => {
    setTokenHeader();
    await expect(getUserContext()).rejects.toThrow(
      'Missing access token header'
    );
  });
});

describe('getSupabaseJwt', () => {
  it('returns a jwt for staff users', async () => {
    const token = await signToken({ roles: ['staff'], subject: 'staff-123' });
    setTokenHeader(token);

    const jwt = await getSupabaseJwt();
    expect(jwt.split('.')).toHaveLength(3);
  });

  it('rejects non-staff users', async () => {
    const token = await signToken({ roles: ['student'], subject: 'user-456' });
    setTokenHeader(token);

    await expect(getSupabaseJwt()).rejects.toThrow('Zugriff verweigert');
  });
});
