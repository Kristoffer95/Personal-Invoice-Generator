import type { Metadata, Viewport } from 'next'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/components/theme-provider'

export const metadata: Metadata = {
  title: 'Invoice Generator',
  description: 'Professional invoice generator with PDF export',
  // Prevent telephone number detection on iOS
  formatDetection: {
    telephone: false,
  },
  // Enable PWA capabilities
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Invoice Generator',
  },
}

// Viewport configuration for responsive design
export const viewport: Viewport = {
  // Standard responsive viewport
  width: 'device-width',
  initialScale: 1,
  // Prevent zoom on input focus (iOS) while allowing manual zoom
  maximumScale: 5,
  userScalable: true,
  // Theme color for browser chrome
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a1a' },
  ],
  // Support for notched devices
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* DNS prefetch for performance */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        {/* Preconnect for critical resources */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={GeistMono.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
