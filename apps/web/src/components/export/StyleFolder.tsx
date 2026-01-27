'use client'

import { useState } from 'react'
import { Folder, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface StyleFolderProps {
  name: string
  templateCount: number
  onClick: () => void
}

export function StyleFolder({ name, templateCount, onClick }: StyleFolderProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      type="button"
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border bg-card p-4 transition-all',
        'hover:border-primary hover:shadow-md'
      )}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
        {isHovered ? (
          <FolderOpen className="h-10 w-10 text-primary" />
        ) : (
          <Folder className="h-10 w-10 text-muted-foreground" />
        )}
        <Badge
          variant="secondary"
          className="absolute -right-2 -top-2 h-5 min-w-5 justify-center px-1.5 text-[10px]"
        >
          {templateCount}
        </Badge>
      </div>
      <span className="text-sm font-medium">{name}</span>
    </button>
  )
}
