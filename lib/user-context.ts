import { headers } from 'next/headers';
import { SignJWT } from 'jose';
import { jwtDecode } from 'jwt-decode';

const DEV_SUB = '00000000-0000-0000-0000-000000000000';
const DEV_EMAIL = 'test@example.com';

export type UserContext = {
  sub: string;
  email: string | null;
  roles: string[];
};

export function getUserContext(): UserContext {
  const h = headers();
  const isDev = process.env.NODE_ENV === 'development';

  const token = h.get('x-forwarded-access-token') ?? '';
  let sub: string | null = null;
  let email: string | null = null;
  let roles: string[] = [];

  if (token) {
    try {
      const data = jwtDecode(token);
      sub = (data as any).sub;
      email = (data as any).email ?? null;
      roles = (data as any).roles ?? [];
    } catch {
      console.warn('Invalid token');
    }
  }

  sub ??= isDev ? DEV_SUB : null;
  email ??= isDev ? DEV_EMAIL : null;

  if (!sub) throw new Error('Missing user sub');

  return { sub, email, roles };
}

// cached JWT pro Request
let cachedJwt: string | null = null;
let cachedSub: string | null = null;

export async function getSupabaseJwt(): Promise<string> {
  const { sub } = getUserContext();

  if (cachedJwt && cachedSub === sub) {
    return cachedJwt;
  }

  const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);

  const jwt = await new SignJWT({
    sub,
    role: 'authenticated',
    aud: 'authenticated',
    iss: 'campusrallye-admin',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(secret);

  cachedJwt = jwt;
  cachedSub = sub;

  return jwt;
}
