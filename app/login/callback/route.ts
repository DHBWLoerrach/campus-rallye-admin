import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const origin = requestUrl.origin;
  if (token_hash) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'email',
    });
    if (error) {
      console.error(error);
    }
  }

  return NextResponse.redirect(`${origin}`);
}
