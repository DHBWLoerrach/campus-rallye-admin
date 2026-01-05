const DEFAULT_LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? DEFAULT_LOCAL_SUPABASE_URL;
const { protocol, hostname, port } = new URL(supabaseUrl);
const supabasePattern = {
  protocol: protocol.replace(':', ''),
  hostname,
  ...(port ? { port } : {}),
  pathname: '/storage/v1/object/public/**',
};

const supabaseSignedPattern = {
  protocol: protocol.replace(':', ''),
  hostname,
  ...(port ? { port } : {}),
  pathname: '/storage/v1/object/sign/**',
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [supabasePattern, supabaseSignedPattern],
  },
};

export default nextConfig;
