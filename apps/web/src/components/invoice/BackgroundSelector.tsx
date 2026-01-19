'use client'

import { Check, Palette } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { BackgroundDesign } from '@invoice-generator/shared-types'

interface BackgroundSelectorProps {
  designs: BackgroundDesign[]
  selectedId?: string
  onSelect: (designId: string | undefined) => void
}

export function BackgroundSelector({
  designs,
  selectedId,
  onSelect,
}: BackgroundSelectorProps) {
  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-4">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <Palette className="h-4 w-4 sm:h-5 sm:w-5" />
          Invoice Design
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Choose a background design for your invoice
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {designs.map((design) => (
            <button
              key={design.id}
              onClick={() => onSelect(design.id === selectedId ? undefined : design.id)}
              className={cn(
                'group relative flex aspect-[3/4] flex-col items-center justify-center rounded-md border-2 p-2 transition-all hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:rounded-lg sm:p-4',
                selectedId === design.id
                  ? 'border-primary bg-primary/5'
                  : 'border-muted'
              )}
              style={{
                backgroundColor: design.backgroundColor || '#ffffff',
              }}
              aria-label={`Select ${design.name} design`}
              aria-pressed={selectedId === design.id}
            >
              {/* Preview content */}
              <div className="flex h-full w-full flex-col items-start gap-0.5 p-0.5 sm:gap-1 sm:p-1">
                {/* Header simulation */}
                <div
                  className="h-0.5 w-6 rounded-full sm:h-1 sm:w-8"
                  style={{ backgroundColor: design.accentColor || '#1a1a2e' }}
                />
                <div
                  className="mt-auto h-0.5 w-full rounded-full opacity-20 sm:h-1"
                  style={{ backgroundColor: design.accentColor || '#1a1a2e' }}
                />
                <div
                  className="h-0.5 w-3/4 rounded-full opacity-20 sm:h-1"
                  style={{ backgroundColor: design.accentColor || '#1a1a2e' }}
                />
                <div
                  className="h-0.5 w-1/2 rounded-full opacity-20 sm:h-1"
                  style={{ backgroundColor: design.accentColor || '#1a1a2e' }}
                />
              </div>

              {/* Border decoration */}
              {design.borderColor && (
                <div
                  className="absolute inset-0 rounded-md border-l-2 sm:rounded-lg sm:border-l-4"
                  style={{ borderColor: design.borderColor }}
                />
              )}

              {/* Selected indicator */}
              {selectedId === design.id && (
                <div className="absolute -right-0.5 -top-0.5 rounded-full bg-primary p-0.5 text-primary-foreground sm:-right-1 sm:-top-1 sm:p-1">
                  <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Selected design name */}
        <div className="mt-3 text-center text-xs text-muted-foreground sm:mt-4 sm:text-sm">
          {selectedId
            ? `Selected: ${designs.find((d) => d.id === selectedId)?.name}`
            : 'No design selected (using default)'}
        </div>
      </CardContent>
    </Card>
  )
}
