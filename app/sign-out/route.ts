import { NextRequest, NextResponse } from 'next/server';
import { AUTH_SESSION_COOKIE } from '@/lib/auth-session-cookie';
import { getDevBypassContext } from '@/lib/user-context';

function getSignOutLocation(req: NextRequest) {
  if (getDevBypassContext()) {
    return '/';
  }

  if (process.env.NODE_ENV === 'development') {
    const signOutUrl = new URL('http://localhost:4181/oauth2/sign_out');
    signOutUrl.searchParams.set('rd', req.nextUrl.origin);
    return signOutUrl.toString();
  }

  return '/oauth2/sign_out';
}

export function GET(req: NextRequest) {
  // Construct manually so production can emit a relative Location header.
  // NextResponse.redirect() requires an absolute URL, but behind Traefik
  // req.url may contain the internal Next origin instead of the public origin.
  const response = new NextResponse(null, {
    status: 307,
    headers: {
      Location: getSignOutLocation(req),
    },
  });
  response.cookies.delete(AUTH_SESSION_COOKIE);
  return response;
}
