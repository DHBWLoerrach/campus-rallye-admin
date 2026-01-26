import { headers } from 'next/headers';
import { SignJWT, importJWK, type JWK } from 'jose';
import { isAuthorizedUser } from '@/lib/auth';
import {
  extractKeycloakEmail,
  extractKeycloakRoles,
  extractKeycloakUuid,
  verifyKeycloakToken,
} from '@/lib/keycloak';

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
    const payload = await verifyKeycloakToken(token);
    const uuid = extractKeycloakUuid(payload);
    if (!uuid) throw new Error('Missing user sub/uuid in token');

    const email = extractKeycloakEmail(payload);
    const roles = extractKeycloakRoles(payload);

    return { uuid, email, roles };
  } catch (err) {
    console.warn('Failed to parse user token', err);
    throw new Error('Invalid access token');
  }
}

export async function getSupabaseJwt(): Promise<string> {
  const { uuid, email, roles } = await getUserContext();
  if (!isAuthorizedUser(roles, email)) {
    throw new Error('Zugriff verweigert');
  }
  const now = Math.floor(Date.now() / 1000);

  const jwkStr = process.env.SUPABASE_JWT_JWK;
  if (!jwkStr) throw new Error('Missing SUPABASE_JWT_JWK');

  let parsed: unknown;
  try {
    parsed = JSON.parse(jwkStr);
  } catch {
    throw new Error('Invalid SUPABASE_JWT_JWK');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid SUPABASE_JWT_JWK');
  }

  const jwk = parsed as JWK;
  const kid = typeof jwk.kid === 'string' ? jwk.kid : null;
  if (!kid) throw new Error('Missing SUPABASE_JWT_JWK kid');
  if (jwk.kty && jwk.kty !== 'EC') {
    throw new Error('SUPABASE_JWT_JWK must be an EC key');
  }
  if (jwk.crv && jwk.crv !== 'P-256') {
    throw new Error('SUPABASE_JWT_JWK must use P-256');
  }
  if (typeof (jwk as { d?: string }).d !== 'string') {
    throw new Error('SUPABASE_JWT_JWK must be a private key');
  }

  const key = await importJWK(
    {
      ...jwk,
      key_ops: ['sign'],
    },
    'ES256'
  );

  const exp = now + 55 * 60;

  const jwt = await new SignJWT({ role: 'authenticated', uuid })
    .setProtectedHeader({ alg: 'ES256', kid, typ: 'JWT' })
    .setSubject(uuid)
    .setIssuer('supabase')
    .setAudience('authenticated')
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(key);

  return jwt;
}
