import { headers } from 'next/headers';
import { SignJWT } from 'jose';
import { jwtDecode } from 'jwt-decode';

export type UserContext = {
  uuid: string;
  email: string | null;
  roles: string[];
};

export function getUserContext(): UserContext {
  const h = headers();

  const token = h.get('x-forwarded-access-token') ?? '';
  let uuid: string | null = null;
  let email: string | null = null;
  let roles: string[] = [];

  if (token) {
    try {
      const data = jwtDecode(token);
      uuid = (data as any).uuid || (data as any).sub;
      email = (data as any).email ?? null;
      roles = (data as any).roles ?? [];
    } catch {
      console.warn('Invalid token');
    }
  }

  if (!uuid) throw new Error('Missing user sub');

  return { uuid, email, roles };
}

// cached JWT pro Request
let cachedJwt: string | null = null;
let cachedUuid: string | null = null;

export async function getSupabaseJwt(): Promise<string> {
  const { uuid } = getUserContext();

  if (cachedJwt && cachedUuid === uuid) {
    return cachedJwt;
  }

  const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);

  const jwt = await new SignJWT({
    uuid,
    role: 'authenticated',
    aud: 'authenticated',
    iss: 'campusrallye-admin',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(secret);

  cachedJwt = jwt;
  cachedUuid = uuid;

  return jwt;
}
