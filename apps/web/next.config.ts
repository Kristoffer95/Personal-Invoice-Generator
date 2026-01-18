import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@invoice-generator/pdf-generator', '@invoice-generator/shared-types'],
}

export default nextConfig
