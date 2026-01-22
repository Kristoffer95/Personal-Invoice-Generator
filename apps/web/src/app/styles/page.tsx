'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Dynamic import to avoid SSR issues with Zustand persist
const StyleManagerPage = dynamic(
  () => import('@/components/styles/StyleManagerPage'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading styles...</span>
      </div>
    ),
  }
)

export default function StylesPage() {
  return <StyleManagerPage />
}
