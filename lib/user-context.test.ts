// @vitest-environment node
import { SignJWT, decodeProtectedHeader, exportJWK, generateKeyPair } from 'jose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const ISSUER = 'https://auth.dhbw-loerrach.de/realms/dhbw';
const AUDIENCE = 'campusrallye';
const KEY_ID = 'test-key';
const SUPABASE_KEY_ID = 'supabase-key';

const { mockHeaders } = vi.hoisted(() => ({
  mockHeaders: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: mockHeaders,
}));

let privateKey: Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];
let getUserContext: typeof import('./user-context').getUserContext;
let getSupabaseJwt: typeof import('./user-context').getSupabaseJwt;

const env = process.env as Record<string, string | undefined>;
const ORIGINAL_NODE_ENV = env.NODE_ENV;
const ORIGINAL_DEV_AUTH_BYPASS = env.DEV_AUTH_BYPASS;
const ORIGINAL_DEV_AUTH_USER_ID = env.DEV_AUTH_USER_ID;
const ORIGINAL_DEV_AUTH_EMAIL = env.DEV_AUTH_EMAIL;

const restoreEnvVar = (key: string, value: string | undefined) => {
  if (value === undefined) {
    delete env[key];
    return;
  }
  env[key] = value;
};

beforeAll(async () => {
  env.KEYCLOAK_ISSUER = ISSUER;
  env.KEYCLOAK_AUDIENCE = AUDIENCE;
  const { privateKey: supabasePrivateKey } = await generateKeyPair('ES256', {
    extractable: true,
  });
  const supabaseJwk = await exportJWK(supabasePrivateKey);
  supabaseJwk.kid = SUPABASE_KEY_ID;
  env.SUPABASE_JWT_JWK = JSON.stringify(supabaseJwk);

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
  delete env.KEYCLOAK_ISSUER;
  delete env.KEYCLOAK_AUDIENCE;
  delete env.SUPABASE_JWT_JWK;
  restoreEnvVar('NODE_ENV', ORIGINAL_NODE_ENV);
  restoreEnvVar('DEV_AUTH_BYPASS', ORIGINAL_DEV_AUTH_BYPASS);
  restoreEnvVar('DEV_AUTH_USER_ID', ORIGINAL_DEV_AUTH_USER_ID);
  restoreEnvVar('DEV_AUTH_EMAIL', ORIGINAL_DEV_AUTH_EMAIL);
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

describe('getUserContext (dev bypass)', () => {
  beforeEach(() => {
    env.NODE_ENV = 'development';
    env.DEV_AUTH_BYPASS = 'true';
    delete env.DEV_AUTH_USER_ID;
    delete env.DEV_AUTH_EMAIL;
  });

  afterEach(() => {
    restoreEnvVar('NODE_ENV', ORIGINAL_NODE_ENV);
    restoreEnvVar('DEV_AUTH_BYPASS', ORIGINAL_DEV_AUTH_BYPASS);
    restoreEnvVar('DEV_AUTH_USER_ID', ORIGINAL_DEV_AUTH_USER_ID);
    restoreEnvVar('DEV_AUTH_EMAIL', ORIGINAL_DEV_AUTH_EMAIL);
  });

  it('returns default dev user context without configuration', async () => {
    setTokenHeader();
    await expect(getUserContext()).resolves.toEqual({
      uuid: '550e8400-e29b-41d4-a716-446655440000',
      email: 'dev@example.test',
      roles: ['staff'],
    });
  });

  it('returns dev user context with custom values', async () => {
    env.DEV_AUTH_USER_ID = 'dev-123-uuid-456';
    env.DEV_AUTH_EMAIL = 'custom@example.test';

    setTokenHeader();
    await expect(getUserContext()).resolves.toEqual({
      uuid: 'dev-123-uuid-456',
      email: 'custom@example.test',
      roles: ['staff'],
    });
  });

  it('ignores bypass when not in development', async () => {
    env.NODE_ENV = 'test';
    env.DEV_AUTH_BYPASS = 'true';
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
    const header = decodeProtectedHeader(jwt);
    expect(header.alg).toBe('ES256');
    expect(header.kid).toBe(SUPABASE_KEY_ID);
  });

  it('rejects non-staff users', async () => {
    const token = await signToken({ roles: ['student'], subject: 'user-456' });
    setTokenHeader(token);

    await expect(getSupabaseJwt()).rejects.toThrow('Zugriff verweigert');
  });
});
