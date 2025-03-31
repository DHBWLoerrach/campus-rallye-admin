import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const email = req.headers.get('oidc_claim_email');
  const roles = req.headers.get('oidc_claim_roles')?.split(',');

  const isDev = process.env.NODE_ENV === 'development';

  if (!email && !isDev) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Only allow access to the staff pages if the user has the 'staff' role
  if (!roles?.includes('staff') && !isDev) {
    return new NextResponse('Forbidden', { status: 403 });
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
