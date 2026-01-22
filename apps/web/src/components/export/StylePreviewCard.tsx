'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { InvoiceTemplate } from '@invoice-generator/shared-types'

interface StylePreviewCardProps {
  template: InvoiceTemplate
  isDefault: boolean
  onSelect: () => void
  onSetDefault: () => void
  showDefaultButton?: boolean
}

export function StylePreviewCard({
  template,
  isDefault,
  onSelect,
  onSetDefault,
  showDefaultButton = true,
}: StylePreviewCardProps) {
  return (
    <div
      className={cn(
        'group relative flex cursor-pointer flex-col rounded-lg border bg-card p-3 transition-all hover:border-primary hover:shadow-md',
        isDefault && 'border-primary ring-1 ring-primary'
      )}
      onClick={onSelect}
    >
      {/* Mini preview area */}
      <div
        className="mb-2 aspect-[8.5/11] w-full rounded border bg-white"
        style={{ backgroundColor: template.backgroundColor }}
      >
        {/* Simplified preview representation */}
        <div className="flex h-full flex-col p-2">
          {/* Header area */}
          <div className="mb-1 h-2 w-12 rounded-sm bg-gray-200" />
          <div className="mb-2 h-1.5 w-8 rounded-sm bg-gray-100" />

          {/* Content area */}
          <div className="flex-1 space-y-1">
            <div className="h-1 w-full rounded-sm bg-gray-100" />
            <div className="h-1 w-3/4 rounded-sm bg-gray-100" />
            <div className="h-1 w-1/2 rounded-sm bg-gray-100" />
          </div>

          {/* Table area */}
          <div className="mt-auto space-y-0.5">
            <div className="h-1.5 w-full rounded-sm bg-gray-200" />
            <div className="h-1 w-full rounded-sm bg-gray-50" />
            <div className="h-1 w-full rounded-sm bg-gray-50" />
          </div>
        </div>
      </div>

      {/* Template name and actions */}
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium">{template.name}</span>
        {showDefaultButton && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-6 w-6 shrink-0',
              isDefault
                ? 'text-yellow-500 hover:text-yellow-600'
                : 'text-muted-foreground opacity-0 group-hover:opacity-100'
            )}
            onClick={(e) => {
              e.stopPropagation()
              onSetDefault()
            }}
            aria-label={isDefault ? 'Remove as default' : 'Set as default'}
          >
            <Star
              className={cn('h-4 w-4', isDefault && 'fill-current')}
            />
          </Button>
        )}
      </div>

      {/* Default badge */}
      {isDefault && (
        <div className="absolute -top-2 left-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
          Default
        </div>
      )}
    </div>
  )
}
