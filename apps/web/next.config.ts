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
          // Content Security Policy - allows PDF preview, Clerk auth, Convex, Turnstile, and Google Fonts
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com", // Next.js + Clerk + Turnstile
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Tailwind + Google Fonts
              "img-src 'self' data: blob: https://*.clerk.com https://img.clerk.com",
              "font-src 'self' data: blob: https://fonts.gstatic.com", // PDF fonts + Google Fonts
              "connect-src 'self' blob: https://*.clerk.accounts.dev https://*.clerk.com https://*.convex.cloud https://clerk-telemetry.com", // Clerk + Convex + Telemetry
              "worker-src 'self' blob:", // PDF renderer uses web workers
              "child-src 'self' blob:", // Allow blob iframes for PDF preview
              "frame-src 'self' blob: https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com", // Clerk + Turnstile
              "object-src 'self' blob:", // Allow PDF objects
              "frame-ancestors 'self'",
              "form-action 'self' https://*.clerk.accounts.dev https://*.clerk.com",
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
