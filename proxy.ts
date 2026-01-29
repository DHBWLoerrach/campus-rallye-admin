import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedUser } from '@/lib/auth';
import { getDevBypassContext } from '@/lib/user-context';
import {
  extractKeycloakEmail,
  extractKeycloakRoles,
  extractKeycloakUuid,
  getKeycloakConfig,
  verifyKeycloakToken,
} from '@/lib/keycloak';

function safeReturnTo(req: NextRequest) {
  const redirectTo = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  const withLeadingSlash = redirectTo.startsWith('/')
    ? redirectTo
    : `/${redirectTo}`;
  return withLeadingSlash.replace(/^\/+/, '/');
}

export async function proxy(req: NextRequest) {
  // extract access token (set by Traefik / oauth2-proxy)
  const token = req.headers.get('x-forwarded-access-token');
  let uuid: string | null = null;
  let email: string | null = null;
  let roles: string[] = [];

  // Check dev bypass first
  const devBypass = getDevBypassContext();
  if (devBypass) {
    uuid = devBypass.uuid;
    email = devBypass.email;
    roles = devBypass.roles;
  } else {
    const keycloakConfig = getKeycloakConfig();
    if (!keycloakConfig) {
      console.error('Missing KEYCLOAK_ISSUER or KEYCLOAK_AUDIENCE');
      return NextResponse.redirect(new URL('/access-denied', req.url));
    }

    if (token) {
      try {
        const payload = await verifyKeycloakToken(token, keycloakConfig);
        // Normalized extraction to support dev/prod differences
        uuid = extractKeycloakUuid(payload);
        email = extractKeycloakEmail(payload);
        roles = extractKeycloakRoles(payload);
      } catch {
        console.warn('Invalid token');
      }
    }
  }

  const isAuthorized = isAuthorizedUser(roles, email);

  // 🔐 Not logged in → Redirect to login page with return-to parameter
  if (!uuid) {
    // Use local oauth2-proxy endpoint in development, absolute path in production
    const authUrl = process.env.NODE_ENV === 'development'
      ? 'http://localhost:4181/oauth2/start'
      : '/oauth2/start';
    const loginUrl = new URL(authUrl, req.url);
    loginUrl.searchParams.set('rd', safeReturnTo(req));
    return NextResponse.redirect(loginUrl);
  }

  // 🚫 Logged in but not authorized → Redirect to access denied page
  if (!isAuthorized) {
    return NextResponse.redirect(new URL('/access-denied', req.url));
  }

  // ✅ Logged in and authorized → Allow request to proceed
  return NextResponse.next();
}

// Middleware configuration: Protects all routes except explicitly defined exceptions.
// Exceptions: root, the access-denied page, favicon, Next.js static assets, and the `assets` path.
export const config = {
  matcher: [
    '/((?!$|access-denied|favicon\\.ico|_next/static|_next/image|assets).*)',
  ],
};
