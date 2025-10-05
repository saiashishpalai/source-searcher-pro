/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  // Ensure API routes are enabled
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  // Allow CORS for Vite frontend
  async headers() {
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? [process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com']
      : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:8080'];

    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
  // Keep your existing Vite alias
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, './src'),
    }
    return config
  },
}

module.exports = nextConfig
