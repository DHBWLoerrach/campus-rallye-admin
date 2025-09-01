import { NextRequest, NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';

export function middleware(req: NextRequest) {
  // exctract access token (set by Traefik / oauth2-proxy)
  const token = req.headers.get('x-forwarded-access-token') ?? '';
  let uuid: string | null = null;
  let roles: string[] = [];

  if (token) {
    try {
      const data = jwtDecode(token);
      // in prod, keycloak sends a uuid claim whereas in dev, we take the sub field
      uuid = (data as any).UUID || (data as any).sub;
      roles = (data as any).realm_access.roles ?? [];
    } catch {
      console.warn('Invalid token');
    }
  }
  const isStaff = roles.includes('staff');
  const isDev = process.env.NODE_ENV === 'development';

  // 🔐 Not logged in → Redirect to login page with return-to parameter
  if (!uuid) {
    const authUrl = isDev
      ? 'http://localhost:4181/oauth2/start'
      : '/oauth2/start';
    const redirectTo = req.nextUrl.pathname;
    const loginUrl = new URL(`${authUrl}?rd=${redirectTo}`, req.url);
    return NextResponse.redirect(loginUrl);
  }

  // 🚫 Logged in but not authorized → Redirect to access denied page
  if (!isStaff) {
    return NextResponse.redirect(new URL('/access-denied', req.url));
  }

  // ✅ Logged in and authorized → Allow request to proceed
  return NextResponse.next();
}

// 💡 Apply this middleware only to protected paths
export const config = {
  matcher: [
    '/questions/:path*',
    '/rallyes/:path*',
    '/rallye_questions/:path*',
    '/api/:path*',
  ],
};
