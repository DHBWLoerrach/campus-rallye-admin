const DEFAULT_LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';

export function getSupabasePublicUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    if (process.env.NODE_ENV !== 'production') {
      return DEFAULT_LOCAL_SUPABASE_URL;
    }
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  return url.replace(/\/$/, '');
}

function encodePath(path: string): string {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export function getQuestionMediaPublicUrl(bucketPath: string): string {
  return `${getSupabasePublicUrl()}/storage/v1/object/public/question-media/${encodePath(
    bucketPath
  )}`;
}
