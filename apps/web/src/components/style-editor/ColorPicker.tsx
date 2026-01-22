'use client'

import { useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
  showTransparent?: boolean
}

const PRESET_COLORS = [
  // Grayscale
  '#000000',
  '#333333',
  '#666666',
  '#999999',
  '#cccccc',
  '#ffffff',
  // Blues
  '#1a1a2e',
  '#16213e',
  '#0f3460',
  '#0369a1',
  '#3b82f6',
  '#60a5fa',
  // Greens
  '#065f46',
  '#059669',
  '#10b981',
  '#34d399',
  '#6ee7b7',
  '#a7f3d0',
  // Reds
  '#7f1d1d',
  '#dc2626',
  '#ef4444',
  '#f87171',
  '#fca5a5',
  '#fecaca',
  // Yellows/Oranges
  '#78350f',
  '#d97706',
  '#f59e0b',
  '#fbbf24',
  '#fcd34d',
  '#fef3c7',
  // Purples
  '#4c1d95',
  '#7c3aed',
  '#8b5cf6',
  '#a78bfa',
  '#c4b5fd',
  '#e9d5ff',
]

export function ColorPicker({ color, onChange, showTransparent = true }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customColor, setCustomColor] = useState(color)

  const handleColorSelect = (selectedColor: string) => {
    onChange(selectedColor)
    setCustomColor(selectedColor)
  }

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCustomColor(value)
    // Only update if it's a valid hex color
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      onChange(value)
    }
  }

  const handleNativeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCustomColor(value)
    onChange(value)
  }

  const isTransparent = color === 'transparent' || color === ''

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-8 w-full justify-start gap-2 px-2"
        >
          <div
            className={cn(
              'h-5 w-5 rounded border',
              isTransparent && 'bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%228%22%20height%3D%228%22%3E%3Crect%20width%3D%224%22%20height%3D%224%22%20fill%3D%22%23ccc%22%2F%3E%3Crect%20x%3D%224%22%20y%3D%224%22%20width%3D%224%22%20height%3D%224%22%20fill%3D%22%23ccc%22%2F%3E%3C%2Fsvg%3E")]'
            )}
            style={{
              backgroundColor: isTransparent ? undefined : color,
            }}
          />
          <span className="flex-1 truncate text-left text-xs">
            {isTransparent ? 'Transparent' : color.toUpperCase()}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="space-y-3">
          {/* Preset Colors */}
          <div className="grid grid-cols-6 gap-1">
            {showTransparent && (
              <button
                onClick={() => handleColorSelect('transparent')}
                className={cn(
                  'h-6 w-6 rounded border-2 bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%228%22%20height%3D%228%22%3E%3Crect%20width%3D%224%22%20height%3D%224%22%20fill%3D%22%23ccc%22%2F%3E%3Crect%20x%3D%224%22%20y%3D%224%22%20width%3D%224%22%20height%3D%224%22%20fill%3D%22%23ccc%22%2F%3E%3C%2Fsvg%3E")]',
                  isTransparent ? 'border-primary' : 'border-transparent hover:border-muted-foreground'
                )}
                title="Transparent"
              />
            )}
            {PRESET_COLORS.map((presetColor) => (
              <button
                key={presetColor}
                onClick={() => handleColorSelect(presetColor)}
                className={cn(
                  'h-6 w-6 rounded border-2 transition-transform hover:scale-110',
                  color === presetColor ? 'border-primary' : 'border-transparent hover:border-muted-foreground'
                )}
                style={{ backgroundColor: presetColor }}
                title={presetColor}
              />
            ))}
          </div>

          {/* Custom Color Input */}
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={isTransparent ? '#ffffff' : color}
              onChange={handleNativeColorChange}
              className="h-8 w-8 cursor-pointer rounded border bg-transparent p-0"
            />
            <Input
              value={customColor}
              onChange={handleCustomColorChange}
              placeholder="#000000"
              className="h-8 flex-1 font-mono text-xs"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
