/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://essaycompetitionbackend-production-e729.up.railway.app/api',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'https://essaycompetitionbackend-production-e729.up.railway.app/api'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

