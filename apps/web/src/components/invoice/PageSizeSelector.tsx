'use client'

import { FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { PageSizeKey } from '@invoice-generator/shared-types'
import { PAGE_SIZES } from '@invoice-generator/shared-types'

interface PageSizeSelectorProps {
  selectedSize: PageSizeKey
  onSelect: (size: PageSizeKey) => void
}

const pageSizeOptions: PageSizeKey[] = ['A4', 'LETTER', 'LEGAL', 'LONG', 'SHORT', 'A5', 'B5']

export function PageSizeSelector({ selectedSize, onSelect }: PageSizeSelectorProps) {
  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-4">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
          Page Size
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Select the paper size for the exported PDF
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedSize}
          onValueChange={(value) => onSelect(value as PageSizeKey)}
          className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5"
        >
          {pageSizeOptions.map((size) => {
            const sizeInfo = PAGE_SIZES[size]
            return (
              <div key={size} className="relative">
                <RadioGroupItem
                  value={size}
                  id={`size-${size}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`size-${size}`}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-muted p-2 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 sm:rounded-lg sm:p-4"
                >
                  {/* Visual preview - scaled for mobile */}
                  <div
                    className="mb-1.5 rounded border border-current sm:mb-2"
                    style={{
                      width: `${Math.min(sizeInfo.width / 6, 32)}px`,
                      height: `${Math.min(sizeInfo.height / 6, 45)}px`,
                    }}
                  />
                  <span className="text-xs font-medium sm:text-sm">{sizeInfo.label}</span>
                  <span className="hidden text-[10px] text-muted-foreground sm:block sm:text-xs">
                    {sizeInfo.width} × {sizeInfo.height} mm
                  </span>
                </Label>
              </div>
            )
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  )
}
