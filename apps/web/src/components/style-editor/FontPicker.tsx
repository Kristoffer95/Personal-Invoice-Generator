'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Strikethrough,
} from 'lucide-react'
import { ColorPicker } from './ColorPicker'
import type { FontStyle } from '@invoice-generator/shared-types'

interface FontPickerProps {
  fontStyle?: Partial<FontStyle>
  onChange: (style: Partial<FontStyle>) => void
}

const FONT_FAMILIES = [
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Helvetica-Bold', label: 'Helvetica Bold' },
  { value: 'Times-Roman', label: 'Times Roman' },
  { value: 'Times-Bold', label: 'Times Bold' },
  { value: 'Courier', label: 'Courier' },
  { value: 'Courier-Bold', label: 'Courier Bold' },
  { value: 'Geist', label: 'Geist Sans' },
  { value: 'Geist Mono', label: 'Geist Mono' },
]

export function FontPicker({ fontStyle, onChange }: FontPickerProps) {
  const handleFontFamilyChange = (value: string) => {
    onChange({ fontFamily: value as FontStyle['fontFamily'] })
  }

  const handleFontSizeChange = (value: string) => {
    const size = parseInt(value, 10)
    if (!isNaN(size) && size >= 6 && size <= 72) {
      onChange({ fontSize: size })
    }
  }

  const handleTextAlignChange = (value: string) => {
    if (value) {
      onChange({ textAlign: value as FontStyle['textAlign'] })
    }
  }

  const handleColorChange = (color: string) => {
    onChange({ color })
  }

  const handleLineHeightChange = (value: number[]) => {
    onChange({ lineHeight: value[0] })
  }

  const handleLetterSpacingChange = (value: string) => {
    const spacing = parseFloat(value)
    if (!isNaN(spacing)) {
      onChange({ letterSpacing: spacing })
    }
  }

  const toggleDecoration = (decoration: 'underline' | 'line-through') => {
    const current = fontStyle?.textDecoration ?? 'none'
    onChange({
      textDecoration: current === decoration ? 'none' : decoration,
    })
  }

  const toggleTransform = (transform: 'uppercase' | 'lowercase' | 'capitalize') => {
    const current = fontStyle?.textTransform ?? 'none'
    onChange({
      textTransform: current === transform ? 'none' : transform,
    })
  }

  const toggleBold = () => {
    onChange({
      fontWeight: fontStyle?.fontWeight === 'bold' ? 'normal' : 'bold',
    })
  }

  const toggleItalic = () => {
    onChange({
      fontStyle: fontStyle?.fontStyle === 'italic' ? 'normal' : 'italic',
    })
  }

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium text-muted-foreground uppercase">
        Typography
      </Label>

      {/* Font Family */}
      <div className="space-y-1">
        <Label className="text-xs">Font</Label>
        <Select
          value={fontStyle?.fontFamily ?? 'Helvetica'}
          onValueChange={handleFontFamilyChange}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Font Size */}
      <div className="space-y-1">
        <Label className="text-xs">Size</Label>
        <Input
          type="number"
          value={fontStyle?.fontSize ?? 12}
          onChange={(e) => handleFontSizeChange(e.target.value)}
          min={6}
          max={72}
          className="h-8"
        />
      </div>

      {/* Text Color */}
      <div className="space-y-1">
        <Label className="text-xs">Color</Label>
        <ColorPicker
          color={fontStyle?.color ?? '#333333'}
          onChange={handleColorChange}
        />
      </div>

      {/* Text Alignment */}
      <div className="space-y-1">
        <Label className="text-xs">Alignment</Label>
        <ToggleGroup
          type="single"
          value={fontStyle?.textAlign ?? 'left'}
          onValueChange={handleTextAlignChange}
          className="justify-start"
        >
          <ToggleGroupItem value="left" size="sm" aria-label="Align left">
            <AlignLeft className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" size="sm" aria-label="Align center">
            <AlignCenter className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="right" size="sm" aria-label="Align right">
            <AlignRight className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="justify" size="sm" aria-label="Justify">
            <AlignJustify className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Text Decoration */}
      <div className="space-y-1">
        <Label className="text-xs">Style</Label>
        <div className="flex gap-1">
          <button
            onClick={toggleBold}
            className={`flex h-8 w-8 items-center justify-center rounded border transition-colors ${
              fontStyle?.fontWeight === 'bold'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-accent'
            }`}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            onClick={toggleItalic}
            className={`flex h-8 w-8 items-center justify-center rounded border transition-colors ${
              fontStyle?.fontStyle === 'italic'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-accent'
            }`}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            onClick={() => toggleDecoration('underline')}
            className={`flex h-8 w-8 items-center justify-center rounded border transition-colors ${
              fontStyle?.textDecoration === 'underline'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-accent'
            }`}
            title="Underline"
          >
            <Underline className="h-4 w-4" />
          </button>
          <button
            onClick={() => toggleDecoration('line-through')}
            className={`flex h-8 w-8 items-center justify-center rounded border transition-colors ${
              fontStyle?.textDecoration === 'line-through'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-accent'
            }`}
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </button>
          <button
            onClick={() => toggleTransform('uppercase')}
            className={`flex h-8 w-8 items-center justify-center rounded border text-xs font-medium transition-colors ${
              fontStyle?.textTransform === 'uppercase'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-accent'
            }`}
            title="Uppercase"
          >
            AA
          </button>
          <button
            onClick={() => toggleTransform('capitalize')}
            className={`flex h-8 w-8 items-center justify-center rounded border text-xs font-medium transition-colors ${
              fontStyle?.textTransform === 'capitalize'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-accent'
            }`}
            title="Capitalize"
          >
            Aa
          </button>
        </div>
      </div>

      {/* Line Height */}
      <div className="space-y-1">
        <Label className="text-xs">Line Height</Label>
        <div className="flex items-center gap-3">
          <Slider
            value={[fontStyle?.lineHeight ?? 1.2]}
            onValueChange={handleLineHeightChange}
            min={0.8}
            max={2.5}
            step={0.1}
            className="flex-1"
          />
          <span className="w-10 text-right text-xs text-muted-foreground">
            {(fontStyle?.lineHeight ?? 1.2).toFixed(1)}
          </span>
        </div>
      </div>

      {/* Letter Spacing */}
      <div className="space-y-1">
        <Label className="text-xs">Letter Spacing</Label>
        <Input
          type="number"
          value={fontStyle?.letterSpacing ?? 0}
          onChange={(e) => handleLetterSpacingChange(e.target.value)}
          step={0.5}
          className="h-8"
        />
      </div>
    </div>
  )
}
