'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Dynamic import to avoid SSR issues with dnd-kit
const StyleEditorContent = dynamic(
  () => import('@/components/style-editor/StyleEditorContent'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading editor...</span>
      </div>
    ),
  }
)

export default function StyleEditorPage() {
  return <StyleEditorContent />
}
