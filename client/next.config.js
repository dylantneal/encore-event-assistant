/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'production' 
          ? 'https://web-production-ff93.up.railway.app/api/:path*'
          : 'http://localhost:3001/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig; 