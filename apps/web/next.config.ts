import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@invoice-generator/pdf-generator', '@invoice-generator/shared-types'],

  // Security headers for all routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent XSS attacks
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Control iframe embedding
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          // Referrer policy for privacy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions policy - disable unused features
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // Content Security Policy - allows PDF preview and necessary features
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Required for Next.js
              "style-src 'self' 'unsafe-inline'", // Required for Tailwind
              "img-src 'self' data: blob:",
              "font-src 'self' data: blob:", // PDF fonts may use blob URLs
              "connect-src 'self' blob:", // Allow blob connections for PDF
              "worker-src 'self' blob:", // PDF renderer uses web workers
              "child-src 'self' blob:", // Allow blob iframes for PDF preview
              "frame-src 'self' blob:", // Allow blob frames for PDF preview
              "object-src 'self' blob:", // Allow PDF objects
              "frame-ancestors 'self'",
              "form-action 'self'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },

  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Enable experimental features for better performance
  experimental: {
    // Optimize package imports for smaller bundles
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
}

export default nextConfig
