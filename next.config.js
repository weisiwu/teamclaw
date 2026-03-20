/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    // 性能优化：优化包导入，提升 tree-shaking 效果
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-avatar',
      '@radix-ui/react-slot',
      'recharts',
      'clsx',
    ],
  },
  images: {
    unoptimized: true,
  },
  // 生产环境移除 console.log，减少包体积
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // 模块化导入优化，减少重复引用
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{member}}',
      skipDefaultConversion: true,
    },
  },
}

module.exports = nextConfig
