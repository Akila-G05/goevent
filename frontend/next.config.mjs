/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    API_URL: process.env.API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '/goevent/api',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/goevent/api/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:8080'}/goevent/api/:path*`,
      },
      {
        source: '/api/v1/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:8080'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
