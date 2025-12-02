const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['cdn.getairank.com', 'img.logo.dev'],
  },
  reactStrictMode: true,

  // Production optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  experimental: {
    // Tree-shake these packages for smaller bundles
    optimizePackageImports: [
      'recharts',
      'lodash',
      'date-fns',
      '@heroicons/react',
      'lucide-react',
      '@headlessui/react',
    ],
  },

  // Turbopack configuration (used in dev with --turbopack flag)
  turbopack: {
    // Turbopack handles chunking automatically, no custom config needed
  },

  // Webpack optimizations (used in production build)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Split chunks more aggressively for better caching
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          // Separate recharts into its own chunk
          recharts: {
            test: /[\\/]node_modules[\\/](recharts|d3-.*)[\\/]/,
            name: 'recharts',
            chunks: 'all',
            priority: 30,
          },
          // Separate react-flow into its own chunk
          reactflow: {
            test: /[\\/]node_modules[\\/](@?xyflow|reactflow)[\\/]/,
            name: 'reactflow',
            chunks: 'all',
            priority: 30,
          },
        },
      };
    }
    return config;
  },
};

module.exports = withBundleAnalyzer(nextConfig);
