import { NextRequest, NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';

export function middleware(req: NextRequest) {
  // exctract access token (set by Traefik / oauth2-proxy)
  const token = req.headers.get('x-forwarded-access-token') ?? '';
  let sub: string | null = null;
  let roles: string[] = [];

  if (token) {
    try {
      const data = jwtDecode(token);
      sub = (data as any).sub;
      roles = (data as any).roles ?? [];
    } catch {
      console.warn('Invalid token');
    }
  }

  const isStaff = roles.includes('staff');
  const isDev = process.env.NODE_ENV === 'development';

  // 🔐 Not logged in → Redirect to login page with return-to parameter
  if (!sub && !isDev) {
    const redirectTo = req.nextUrl.pathname;
    const loginUrl = new URL(`/oauth2/start?rd=${redirectTo}`, req.url);
    return NextResponse.redirect(loginUrl);
  }

  // 🚫 Logged in but not authorized → Redirect to access denied page
  if (!isStaff && !isDev) {
    return NextResponse.redirect(new URL('/access-denied', req.url));
  }

  // ✅ Logged in and authorized → Allow request to proceed
  return NextResponse.next();
}

// 💡 Apply this middleware only to protected paths
export const config = {
  matcher: ['/questions/:path*', '/rallyes/:path*', '/api/:path*'],
};
