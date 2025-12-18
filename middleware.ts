import { NextRequest, NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';

export function middleware(req: NextRequest) {
  // exctract access token (set by Traefik / oauth2-proxy)
  const token = req.headers.get('x-forwarded-access-token') ?? '';
  let uuid: string | null = null;
  let roles: string[] = [];

  if (token) {
    try {
      const data = jwtDecode(token) as any;
      // Normalized extraction to support dev/prod differences
      uuid = data.UUID || data.uuid || data.sub;
      const resourceRoles = Object.values(data?.resource_access ?? {}).flatMap(
        (r: any) => r?.roles ?? []
      );
      const extracted =
        data?.realm_access?.roles ?? data?.roles ?? resourceRoles ?? [];
      roles = Array.isArray(extracted) ? extracted : [];
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
    const redirectTo = `${req.nextUrl.pathname}${req.nextUrl.search}`;
    const loginUrl = new URL(authUrl, req.url);
    loginUrl.searchParams.set('rd', redirectTo);
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
  matcher: ['/questions/:path*', '/rallyes/:path*', '/api/:path*'],
};
