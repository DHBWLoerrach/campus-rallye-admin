import { headers } from 'next/headers';
import { SignJWT } from 'jose';

let cachedJwt: string | null = null;
let cachedSub: string | null = null;

export default async function getSupabaseJwt(): Promise<string> {
  const h = headers();

  const isDev = process.env.NODE_ENV === 'development';

  const sub = h.get('oidc_claim_sub') ?? (isDev ? 'dev-sub' : null);
  const email =
    h.get('oidc_claim_email') ?? (isDev ? 'admin@example.com' : null);

  if (!sub || !email) throw new Error('Missing user headers');

  // Caching: only generate a new JWT if the sub has changed
  if (cachedJwt && cachedSub === sub) {
    return cachedJwt;
  }

  const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);

  const jwt = await new SignJWT({
    sub,
    email,
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
