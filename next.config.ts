import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: "C:\\dev\\taletime",
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.gutenberg.org',
        pathname: '/cache/epub/**',
      },
      {
        protocol: 'https',
        hostname: 'standardebooks.org',
        pathname: '/ebooks/**',
      },
    ],
    localPatterns: [
      { pathname: '/mascot.png' },
      { pathname: '/api/proxy' },
      { pathname: '/api/local-image' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: process.env.NODE_ENV === 'development' 
              ? 'no-cache, no-store, must-revalidate' 
              : 'public, max-age=3600, stale-while-revalidate=86400',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
