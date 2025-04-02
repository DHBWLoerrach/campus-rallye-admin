import { headers } from 'next/headers';
import { SignJWT } from 'jose';

const DEV_SUB = '00000000-0000-0000-0000-000000000000';

export type UserContext = {
  sub: string;
  roles: string[];
};

export function getUserContext(): UserContext {
  const h = headers();
  const isDev = process.env.NODE_ENV === 'development';

  const sub = h.get('oidc_claim_sub') ?? (isDev ? DEV_SUB : null);
  const roles = h.get('x-oidc_claim_roles')?.split(',') ?? [];

  if (!sub) throw new Error('Missing user sub (oidc_claim_sub)');

  return { sub, roles };
}

// cached JWT pro Request
let cachedJwt: string | null = null;
let cachedSub: string | null = null;

export async function getSupabaseJwt(): Promise<string> {
  const { sub } = getUserContext();

  if (cachedJwt && cachedSub === sub) {
    return cachedJwt;
  }

  const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);

  const jwt = await new SignJWT({
    sub,
    role: 'authenticated',
    aud: 'authenticated',
    iss: 'campusrallye-admin',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(secret);

  cachedJwt = jwt;
  cachedSub = sub;

  return jwt;
}
