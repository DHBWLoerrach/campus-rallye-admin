import { createClient } from '@/lib/supabase/server';

// Adopted from https://marmelab.com/react-admin/NextJs.html#adding-an-api
export const dynamic = 'force-dynamic'; // defaults to auto
export async function GET(request: Request) {
  return handler(request);
}

export async function POST(request: Request) {
  return handler(request);
}

export async function PUT(request: Request) {
  return handler(request);
}

export async function PATCH(request: Request) {
  return handler(request);
}

export async function DELETE(request: Request) {
  return handler(request);
}

async function handler(request: Request) {
  const supabase = createClient();
  // global middleware makes sure that this is a trustworthy user session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // get part after /api/admin/ in string url
  const requestUrl = request.url.split('/api/admin')[1];

  // build the CRUD request based on the incoming request
  const url = `${process.env.SUPABASE_URL}/rest/v1${requestUrl}`;

  const options: RequestInit = {
    method: request.method,
    headers: {
      prefer: (request.headers.get('prefer') as string) ?? '',
      accept: request.headers.get('accept') ?? 'application/json',
      ['content-type']:
        request.headers.get('content-type') ?? 'application/json',
      // supabase authentication
      apiKey: process.env.SUPABASE_ANON_KEY ?? '',
      Authorization: `Bearer ${session?.access_token}`,
    },
  };

  if (
    request.body &&
    parseInt(request.headers.get('content-length') ?? '0') > 0
  ) {
    const body = await request.json();
    options.body = JSON.stringify(body);
  }

  // call the CRUD API
  const response = await fetch(url, options);

  const contentRange = response.headers.get('content-range');

  const headers = new Headers();
  if (contentRange) {
    headers.set('Content-Range', contentRange);
  }
  const data = await response.text();
  return new Response(data, {
    status: 200,
    headers,
  });
}
