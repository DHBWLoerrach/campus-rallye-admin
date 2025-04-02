import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const sub = req.headers.get('oidc_claim_sub');
  const roles = req.headers.get('oidc_claim_roles')?.split(',') ?? [];
  const isStaff = roles.includes('staff');
  const isDev = process.env.NODE_ENV === 'development';

  // If user does not belong to'staff' redirect to 'access-denied' page
  if (!isStaff && !isDev) {
    return NextResponse.redirect(new URL('/access-denied', req.url));
  }

  if (!sub && !isDev) {
    return new NextResponse('Unauthorized', { status: 401 });
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
