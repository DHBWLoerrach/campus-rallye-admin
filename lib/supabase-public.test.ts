import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getQuestionMediaPublicUrl,
  getSupabasePublicUrl,
} from './supabase-public';

const env = process.env as Record<string, string | undefined>;
const ORIGINAL_NODE_ENV = env.NODE_ENV;
const ORIGINAL_PUBLIC_URL = env.NEXT_PUBLIC_SUPABASE_URL;

const resetEnv = () => {
  if (ORIGINAL_NODE_ENV === undefined) {
    delete env.NODE_ENV;
  } else {
    env.NODE_ENV = ORIGINAL_NODE_ENV;
  }

  if (ORIGINAL_PUBLIC_URL === undefined) {
    delete env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_PUBLIC_URL;
  }
};

beforeEach(resetEnv);
afterEach(resetEnv);

describe('getSupabasePublicUrl', () => {
  it('trims trailing slashes', () => {
    env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co/';
    expect(getSupabasePublicUrl()).toBe('https://example.supabase.co');
  });

  it('falls back to local url in non-production', () => {
    delete env.NEXT_PUBLIC_SUPABASE_URL;
    env.NODE_ENV = 'development';
    expect(getSupabasePublicUrl()).toBe('http://127.0.0.1:54321');
  });

  it('throws in production when url is missing', () => {
    delete env.NEXT_PUBLIC_SUPABASE_URL;
    env.NODE_ENV = 'production';
    expect(() => getSupabasePublicUrl()).toThrow(
      'Missing NEXT_PUBLIC_SUPABASE_URL'
    );
  });
});

describe('getQuestionMediaPublicUrl', () => {
  it('encodes path segments and keeps slashes', () => {
    env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co/';
    const url = getQuestionMediaPublicUrl('folder/space name.png');
    expect(url).toBe(
      'https://example.supabase.co/storage/v1/object/public/question-pictures/folder/space%20name.png'
    );
  });
});
