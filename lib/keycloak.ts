import { createRemoteJWKSet, errors, jwtVerify, type JWTPayload } from 'jose';
import { getUserRef } from './user-ref';

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

const KEYCLOAK_AZP_MISMATCH = 'ERR_KEYCLOAK_AZP_MISMATCH';
const UNKNOWN_TOKEN_VERIFICATION_ERROR = 'ERR_TOKEN_VERIFICATION_UNKNOWN';

type TokenVerificationErrorDetails = {
  code: string;
  claim?: string;
  reason?: string;
  issuedAt?: string;
  expiredAt?: string;
  expiredBySeconds?: number;
  tokenLifetimeSeconds?: number;
  errorName?: string;
  userRef?: string;
};

class KeycloakTokenValidationError extends Error {
  readonly code: string;
  readonly userRef: string | null;

  constructor(code: string, userId?: string | null) {
    super('Keycloak access token validation failed');
    this.name = 'KeycloakTokenValidationError';
    this.code = code;
    this.userRef = getUserRef(userId);
  }
}

function addUserRef(
  details: TokenVerificationErrorDetails,
  payload: JWTPayload
): TokenVerificationErrorDetails {
  const userRef = getUserRef(extractKeycloakUuid(payload));
  return userRef ? { ...details, userRef } : details;
}

function numericDateToIso(value: unknown): string | null {
  if (typeof value !== 'number') return null;
  const date = new Date(value * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function getTokenVerificationErrorDetails(
  error: unknown,
  now = Date.now()
): TokenVerificationErrorDetails {
  if (error instanceof KeycloakTokenValidationError) {
    return error.userRef
      ? { code: error.code, userRef: error.userRef }
      : { code: error.code };
  }

  if (error instanceof errors.JWTExpired) {
    const details: TokenVerificationErrorDetails = {
      code: error.code,
      claim: error.claim,
      reason: error.reason,
    };
    const expirationTime = error.payload.exp;
    const issuedAt = error.payload.iat;
    const expirationDate = numericDateToIso(expirationTime);
    const issuedAtDate = numericDateToIso(issuedAt);
    if (expirationDate && typeof expirationTime === 'number') {
      details.expiredAt = expirationDate;
      details.expiredBySeconds = Math.max(
        0,
        Math.floor(now / 1000) - expirationTime
      );
    }
    if (issuedAtDate) {
      details.issuedAt = issuedAtDate;
    }
    if (
      typeof expirationTime === 'number' &&
      typeof issuedAt === 'number' &&
      expirationTime >= issuedAt
    ) {
      details.tokenLifetimeSeconds = expirationTime - issuedAt;
    }
    return addUserRef(details, error.payload);
  }

  if (error instanceof errors.JWTClaimValidationFailed) {
    return addUserRef(
      {
        code: error.code,
        claim: error.claim,
        reason: error.reason,
      },
      error.payload
    );
  }

  if (error instanceof errors.JOSEError) {
    return { code: error.code };
  }

  return {
    code: UNKNOWN_TOKEN_VERIFICATION_ERROR,
    errorName: error instanceof Error ? error.name : typeof error,
  };
}

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
    // if issuer/audience are missing, we cannot verify trust boundaries.
    throw new Error('Missing KEYCLOAK_ISSUER or KEYCLOAK_AUDIENCE');
  }

  const { payload } = await jwtVerify<KeycloakTokenPayload>(
    token,
    resolved.jwks,
    {
      // issuer must match exactly (prevents accepting tokens from a different realm/IdP).
      issuer: resolved.issuer,
      algorithms: ['RS256'],
      // tolerate small clock skew; jwtVerify still enforces exp/nbf by default.
      clockTolerance: '5s',
    }
  );

  // Keycloak often doesn't put the client_id into `aud` for access tokens in all flows.
  // `azp` ("authorized party") is the most reliable binding to the OIDC client that obtained the token.
  // If this is not our expected client_id, treat it as a token for a different client/context.
  if (typeof payload.azp !== 'string' || payload.azp !== resolved.audience) {
    throw new KeycloakTokenValidationError(
      KEYCLOAK_AZP_MISMATCH,
      extractKeycloakUuid(payload)
    );
  }

  // Note: We intentionally do NOT enforce `aud` here because our Keycloak server delivers other values as audience ('account').
  // If there would be an Audience Mapper in Keycloak, we could enforce aud as an additional check.

  return payload;
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

export function extractKeycloakRoles(payload: KeycloakTokenPayload) {
  const realmRoles = Array.isArray(payload.realm_access?.roles)
    ? payload.realm_access.roles
    : [];
  return realmRoles;
}
