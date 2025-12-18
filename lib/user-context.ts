import { headers } from 'next/headers';
import { SignJWT, type JWTPayload } from 'jose';
import { jwtDecode } from 'jwt-decode';

type UserContext = {
  uuid: string;
  email: string | null;
  roles: string[];
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function getStringClaim(
  claims: Record<string, unknown>,
  key: string
): string | undefined {
  const value = claims[key];
  return typeof value === 'string' ? value : undefined;
}

function getRolesFromRealmAccess(value: unknown): string[] | null {
  if (!value || typeof value !== 'object') return null;
  const roles = (value as { roles?: unknown }).roles;
  return isStringArray(roles) ? roles : null;
}

function getRolesFromResourceAccess(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  return Object.values(value as Record<string, unknown>).flatMap((resource) => {
    if (!resource || typeof resource !== 'object') return [];
    const roles = (resource as { roles?: unknown }).roles;
    return isStringArray(roles) ? roles : [];
  });
}

export async function getUserContext(): Promise<UserContext> {
  const h = await headers();
  const token = h.get('x-forwarded-access-token');
  if (!token) throw new Error('Missing access token header');

  try {
    const data = jwtDecode<JWTPayload & Record<string, unknown>>(token);
    const claims = data as JWTPayload & Record<string, unknown>;

    const uuid =
      getStringClaim(claims, 'UUID') ??
      getStringClaim(claims, 'uuid') ??
      claims.sub ??
      null;
    if (!uuid) throw new Error('Missing user sub/uuid in token');

    const email =
      getStringClaim(claims, 'email') ??
      getStringClaim(claims, 'preferred_username') ??
      null;

    const realmRoles = getRolesFromRealmAccess(claims['realm_access']);
    const directRoles = isStringArray(claims['roles']) ? claims['roles'] : null;
    const resourceRoles = getRolesFromResourceAccess(claims['resource_access']);
    const roles = realmRoles ?? directRoles ?? resourceRoles;

    return { uuid, email, roles };
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
