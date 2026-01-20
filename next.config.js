/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Necessário para Docker build
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Aumentar limite para upload de arquivos
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

module.exports = nextConfig
