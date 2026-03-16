/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {},
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
