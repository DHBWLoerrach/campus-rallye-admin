import { headers } from 'next/headers';
import { SignJWT, type JWTPayload } from 'jose';
import { jwtDecode } from 'jwt-decode';

type UserContext = {
  uuid: string;
  email: string | null;
  roles: string[];
};

export async function getUserContext(): Promise<UserContext> {
  const h = await headers();
  const token = h.get('x-forwarded-access-token');
  if (!token) throw new Error('Missing access token header');

  try {
    const data = jwtDecode<JWTPayload & Record<string, any>>(token);

    const uuid = (data as any).UUID ?? (data as any).uuid ?? data.sub ?? null;
    if (!uuid) throw new Error('Missing user sub/uuid in token');

    const email =
      (data as any).email ?? (data as any).preferred_username ?? null;

    const roles =
      (data as any).realm_access?.roles ??
      (data as any).roles ??
      Object.values((data as any).resource_access ?? {}).flatMap(
        (r: any) => r?.roles ?? []
      );

    return { uuid, email, roles: Array.isArray(roles) ? roles : [] };
  } catch (err) {
    console.warn('Failed to parse user token', err);
    throw new Error('Invalid access token');
  }
}

// TTL-aware cache per runtime instance for the signed supabase JWT
let cache: { jwt: string; uuid: string; exp: number } | null = null;

export async function getSupabaseJwt(): Promise<string> {
  const { uuid } = await getUserContext();
  const now = Math.floor(Date.now() / 1000);

  if (cache && cache.uuid === uuid && cache.exp - now > 30) return cache.jwt;

  const secretStr = process.env.SUPABASE_JWT_SECRET;
  if (!secretStr) throw new Error('Missing SUPABASE_JWT_SECRET');
  const secret = new TextEncoder().encode(secretStr);

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
