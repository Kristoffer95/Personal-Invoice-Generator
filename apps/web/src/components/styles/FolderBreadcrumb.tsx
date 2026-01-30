'use client'

import { ChevronRight, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FolderBreadcrumbItem {
  id: string | null  // null represents root
  name: string
}

interface FolderBreadcrumbProps {
  items: FolderBreadcrumbItem[]
  onNavigate: (folderId: string | null) => void
}

export function FolderBreadcrumb({ items, onNavigate }: FolderBreadcrumbProps) {
  if (items.length <= 1) {
    // At root level, no need for breadcrumb
    return null
  }

  return (
    <nav aria-label="Folder navigation" className="flex items-center gap-1 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <div key={item.id ?? 'root'} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="mx-1 h-4 w-4 text-muted-foreground" />
            )}
            {isLast ? (
              <span className="font-medium text-foreground">
                {item.id === null ? (
                  <span className="flex items-center gap-1">
                    <Home className="h-3 w-3" />
                    {item.name}
                  </span>
                ) : (
                  item.name
                )}
              </span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-1 py-0.5 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => onNavigate(item.id)}
              >
                {item.id === null ? (
                  <span className="flex items-center gap-1">
                    <Home className="h-3 w-3" />
                    {item.name}
                  </span>
                ) : (
                  item.name
                )}
              </Button>
            )}
          </div>
        )
      })}
    </nav>
  )
}
