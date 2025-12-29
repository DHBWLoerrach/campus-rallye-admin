import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

export type KeycloakTokenPayload = JWTPayload & {
  UUID?: string;
  uuid?: string;
  azp?: string;
  email?: string;
  preferred_username?: string;
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
};

type KeycloakConfig = {
  issuer: string;
  audience: string;
  jwks: ReturnType<typeof createRemoteJWKSet>;
};

const issuer = process.env.KEYCLOAK_ISSUER;
const audience = process.env.KEYCLOAK_AUDIENCE;
const jwksUrl = issuer
  ? new URL(`${issuer.replace(/\/$/, '')}/protocol/openid-connect/certs`)
  : null;
const jwks = jwksUrl ? createRemoteJWKSet(jwksUrl) : null;

export function getKeycloakConfig(): KeycloakConfig | null {
  if (!issuer || !audience || !jwks) return null;
  return { issuer, audience, jwks };
}

export async function verifyKeycloakToken(
  token: string,
  config?: KeycloakConfig
) {
  const resolved = config ?? getKeycloakConfig();
  if (!resolved) {
    throw new Error('Missing KEYCLOAK_ISSUER or KEYCLOAK_AUDIENCE');
  }

  const { payload } = await jwtVerify<KeycloakTokenPayload>(
    token,
    resolved.jwks,
    {
      issuer: resolved.issuer,
      algorithms: ['RS256'],
    }
  );

  // KEYCLOAK_AUDIENCE is the Keycloak client_id; some flows may not include
  // the client_id in aud, so we accept azp as a fallback for the authorized party.
  const tokenAud = Array.isArray(payload.aud)
    ? payload.aud
    : payload.aud
      ? [payload.aud]
      : [];
  const azp = typeof payload.azp === 'string' ? payload.azp : null;
  if (!tokenAud.includes(resolved.audience) && azp !== resolved.audience) {
    throw new Error('Invalid audience');
  }

  return { payload, audience: resolved.audience };
}

export function extractKeycloakUuid(payload: KeycloakTokenPayload) {
  return (
    (typeof payload.UUID === 'string' && payload.UUID) ||
    (typeof payload.uuid === 'string' && payload.uuid) ||
    (typeof payload.sub === 'string' && payload.sub) ||
    null
  );
}

export function extractKeycloakEmail(payload: KeycloakTokenPayload) {
  return (
    (typeof payload.email === 'string' && payload.email) ||
    (typeof payload.preferred_username === 'string' &&
      payload.preferred_username) ||
    null
  );
}

export function extractKeycloakRoles(
  payload: KeycloakTokenPayload,
  audience: string
) {
  const realmRoles = Array.isArray(payload.realm_access?.roles)
    ? payload.realm_access?.roles
    : [];
  const resourceRoles = Array.isArray(payload.resource_access?.[audience]?.roles)
    ? payload.resource_access?.[audience]?.roles
    : [];
  return Array.from(new Set([...realmRoles, ...resourceRoles]));
}
