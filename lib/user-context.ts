import { headers } from 'next/headers';
import { SignJWT } from 'jose';
import { jwtDecode } from 'jwt-decode';

export type UserContext = {
  uuid: string;
  email: string | null;
  roles: string[];
};

export function getUserContext(): UserContext {
  const h = headers();

  const token = h.get('x-forwarded-access-token') ?? '';
  let uuid: string | null = null;
  let email: string | null = null;
  let roles: string[] = [];

  if (token) {
    try {
      const data = jwtDecode(token) as any;
      // Normalized extraction to support dev/prod differences
      uuid = data.UUID || data.uuid || data.sub;
      email = data.email ?? data.preferred_username ?? null;
      roles = data?.realm_access?.roles ?? data?.roles ?? [];
    } catch {
      console.warn('Invalid token');
    }
  }

  if (!uuid) throw new Error('Missing user sub');

  return { uuid, email, roles };
}

// cached JWT pro Request
let cachedJwt: string | null = null;
let cachedUuid: string | null = null;

export async function getSupabaseJwt(): Promise<string> {
  const { uuid } = getUserContext();

  // Helper: check if a JWT is still valid for at least the given seconds
  const isJwtValidFor = (token: string, minValidSeconds: number) => {
    try {
      const payload = jwtDecode<{ exp?: number }>(token);
      const exp = payload?.exp;
      if (!exp) return false;
      const now = Math.floor(Date.now() / 1000);
      return exp - now > minValidSeconds;
    } catch {
      return false;
    }
  };

  // Reuse cached JWT only if it belongs to the same user and isn't expiring soon
  if (cachedJwt && cachedUuid === uuid && isJwtValidFor(cachedJwt, 30)) {
    return cachedJwt;
  }

  const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);

  const jwt = await new SignJWT({
    uuid,
    role: 'authenticated',
    aud: 'authenticated',
    iss: 'campusrallye-admin',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);

  cachedJwt = jwt;
  cachedUuid = uuid;

  return jwt;
}
