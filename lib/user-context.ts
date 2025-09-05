import { headers } from 'next/headers';
import { SignJWT } from 'jose';
import { jwtDecode } from 'jwt-decode';

export type UserContext = {
  uuid: string;
  email: string | null;
  roles: string[];
};

export async function getUserContext(): Promise<UserContext> {
  const h = await headers();

  const token = h.get('x-forwarded-access-token') ?? '';
  let uuid: string | null = null;
  let email: string | null = null;
  let roles: string[] = [];

  if (token) {
    try {
      const data = jwtDecode<any>(token);
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

// TTL-aware cache for the signed supabase JWT
let cache: { jwt: string; uuid: string; exp: number } | null = null;

export async function getSupabaseJwt(): Promise<string> {
  const { uuid } = await getUserContext();
  const now = Math.floor(Date.now() / 1000);

  // 30s Leeway to prevent sending close to expiration
  if (cache && cache.uuid === uuid && cache.exp - now > 30) {
    return cache.jwt;
  }

  const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!);
  const exp = now + 55 * 60;

  const jwt = await new SignJWT({ role: 'authenticated', uuid })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(uuid)
    .setIssuer('supabase')
    .setAudience('authenticated')
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(secret);

  cache = { jwt, uuid, exp };
  return jwt;
}
