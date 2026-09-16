/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    const target = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://api:8000/api/v1';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${target.replace(/\/+$/, '')}/:path*`,
      },
    ];
  },
};

export default nextConfig;
