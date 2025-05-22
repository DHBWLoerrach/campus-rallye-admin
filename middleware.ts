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
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/',
    '/((?!_next/static|_next/image|access-denied|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
