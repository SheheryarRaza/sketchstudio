/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async rewrites() {
    // Server-side rewrite runs inside the frontend container, so it must resolve the
    // backend over the Docker network (BACKEND_INTERNAL_URL), never the browser-facing
    // NEXT_PUBLIC_API_URL — that resolves to the frontend container itself in Compose.
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_INTERNAL_URL || 'http://backend:8000'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
