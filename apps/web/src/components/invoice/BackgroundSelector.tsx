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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Invoice Design
        </CardTitle>
        <CardDescription>
          Choose a background design for your invoice
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {designs.map((design) => (
            <button
              key={design.id}
              onClick={() => onSelect(design.id === selectedId ? undefined : design.id)}
              className={cn(
                'group relative flex aspect-[3/4] flex-col items-center justify-center rounded-lg border-2 p-4 transition-all hover:border-primary/50',
                selectedId === design.id
                  ? 'border-primary bg-primary/5'
                  : 'border-muted'
              )}
              style={{
                backgroundColor: design.backgroundColor || '#ffffff',
              }}
            >
              {/* Preview content */}
              <div className="flex h-full w-full flex-col items-start gap-1 p-1">
                {/* Header simulation */}
                <div
                  className="h-1 w-8 rounded-full"
                  style={{ backgroundColor: design.accentColor || '#1a1a2e' }}
                />
                <div
                  className="mt-auto h-1 w-full rounded-full opacity-20"
                  style={{ backgroundColor: design.accentColor || '#1a1a2e' }}
                />
                <div
                  className="h-1 w-3/4 rounded-full opacity-20"
                  style={{ backgroundColor: design.accentColor || '#1a1a2e' }}
                />
                <div
                  className="h-1 w-1/2 rounded-full opacity-20"
                  style={{ backgroundColor: design.accentColor || '#1a1a2e' }}
                />
              </div>

              {/* Border decoration */}
              {design.borderColor && (
                <div
                  className="absolute inset-0 rounded-lg border-l-4"
                  style={{ borderColor: design.borderColor }}
                />
              )}

              {/* Selected indicator */}
              {selectedId === design.id && (
                <div className="absolute -right-1 -top-1 rounded-full bg-primary p-1 text-primary-foreground">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Selected design name */}
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {selectedId
            ? `Selected: ${designs.find((d) => d.id === selectedId)?.name}`
            : 'No design selected (using default)'}
        </div>
      </CardContent>
    </Card>
  )
}
