/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  },
  async rewrites() {
    // Use local endpoint if NEXT_PUBLIC_API_URL is null, undefined, or empty
    const apiUrl = process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.trim() !== '' 
      ? process.env.NEXT_PUBLIC_API_URL 
      : 'http://localhost:8000/api';
    
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

