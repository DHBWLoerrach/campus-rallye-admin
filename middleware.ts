import { NextRequest, NextResponse } from 'next/server';
import { jwtDecode } from 'jwt-decode';

export function middleware(req: NextRequest) {
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

  if (!sub && !isDev) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // If user does not belong to'staff' redirect to 'access-denied' page
  if (!isStaff && !isDev) {
    return NextResponse.redirect(new URL('/access-denied', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/questions/:path*', '/rallyes/:path*', '/api/:path*'],
};
