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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Page Size
        </CardTitle>
        <CardDescription>
          Select the paper size for the exported PDF
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedSize}
          onValueChange={(value) => onSelect(value as PageSizeKey)}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
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
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-muted p-4 hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                >
                  {/* Visual preview */}
                  <div
                    className="mb-2 rounded border border-current"
                    style={{
                      width: `${Math.min(sizeInfo.width / 5, 40)}px`,
                      height: `${Math.min(sizeInfo.height / 5, 56)}px`,
                    }}
                  />
                  <span className="font-medium">{sizeInfo.label}</span>
                  <span className="text-xs text-muted-foreground">
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
