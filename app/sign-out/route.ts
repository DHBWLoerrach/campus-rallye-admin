import { NextRequest, NextResponse } from 'next/server';
import { AUTH_SESSION_COOKIE } from '@/lib/auth-session-cookie';
import { getDevBypassContext } from '@/lib/user-context';

function getOauthSignOutUrl(req: NextRequest) {
  if (getDevBypassContext()) {
    return new URL('/', req.url);
  }

  if (process.env.NODE_ENV === 'development') {
    const signOutUrl = new URL('http://localhost:4181/oauth2/sign_out');
    signOutUrl.searchParams.set('rd', req.nextUrl.origin);
    return signOutUrl;
  }

  return new URL('/oauth2/sign_out', req.url);
}

export function GET(req: NextRequest) {
  const response = NextResponse.redirect(getOauthSignOutUrl(req));
  response.cookies.delete(AUTH_SESSION_COOKIE);
  return response;
}
