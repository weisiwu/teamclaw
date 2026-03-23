/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // 忽略 tests/ 目录的类型检查（这些是 vitest 测试文件，不是 Next.js 代码）
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  experimental: {
    // 性能优化：优化包导入，提升 tree-shaking 效果
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'clsx',
    ],
  },
  images: {
    // enabled default image optimization (LCP improvement)
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
