'use client'

import { useCallback } from 'react'
import {
  X,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { useTemplateStore } from '@/lib/template-store'
import { FontPicker } from './FontPicker'
import { ColorPicker } from './ColorPicker'
import { TokenInserter } from './TokenInserter'

export function PropertiesPanel() {
  const {
    currentTemplate,
    selectedElementId,
    selectElement,
    updateElement,
    removeElement,
    duplicateElement,
    lockElement,
    toggleElementVisibility,
    bringToFront,
    sendToBack,
  } = useTemplateStore()

  const element = currentTemplate?.elements.find(
    (el) => el.id === selectedElementId
  )

  const handleClose = useCallback(() => {
    selectElement(null)
  }, [selectElement])

  const handleDelete = useCallback(() => {
    if (selectedElementId) {
      removeElement(selectedElementId)
    }
  }, [selectedElementId, removeElement])

  const handleDuplicate = useCallback(() => {
    if (selectedElementId) {
      duplicateElement(selectedElementId)
    }
  }, [selectedElementId, duplicateElement])

  const handleToggleLock = useCallback(() => {
    if (selectedElementId && element) {
      lockElement(selectedElementId, !element.locked)
    }
  }, [selectedElementId, element, lockElement])

  const handleToggleVisibility = useCallback(() => {
    if (selectedElementId) {
      toggleElementVisibility(selectedElementId)
    }
  }, [selectedElementId, toggleElementVisibility])

  const handleContentChange = useCallback(
    (content: string) => {
      if (selectedElementId) {
        updateElement(selectedElementId, { content })
      }
    },
    [selectedElementId, updateElement]
  )

  const handlePositionChange = useCallback(
    (key: 'x' | 'y' | 'width' | 'height', value: number) => {
      if (selectedElementId && element) {
        updateElement(selectedElementId, {
          position: { ...element.position, [key]: value },
        })
      }
    },
    [selectedElementId, element, updateElement]
  )

  const handleInsertToken = useCallback(
    (token: string) => {
      if (selectedElementId && element) {
        const newContent = (element.content || '') + `{{${token}}}`
        updateElement(selectedElementId, { content: newContent })
      }
    },
    [selectedElementId, element, updateElement]
  )

  if (!element) {
    return null
  }

  return (
    <div className="flex w-80 flex-col border-l bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="text-sm font-semibold">Properties</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleToggleLock}
          >
            {element.locked ? (
              <Lock className="h-4 w-4" />
            ) : (
              <Unlock className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleToggleVisibility}
          >
            {element.visible ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {/* Element Name */}
          <div className="space-y-2">
            <Label htmlFor="element-name">Name</Label>
            <Input
              id="element-name"
              value={element.name}
              onChange={(e) =>
                updateElement(element.id, { name: e.target.value })
              }
            />
          </div>

          <Separator />

          {/* Position & Size */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase">
              Position & Size
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="pos-x" className="text-xs">
                  X
                </Label>
                <Input
                  id="pos-x"
                  type="number"
                  value={Math.round(element.position.x)}
                  onChange={(e) =>
                    handlePositionChange('x', Number(e.target.value))
                  }
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pos-y" className="text-xs">
                  Y
                </Label>
                <Input
                  id="pos-y"
                  type="number"
                  value={Math.round(element.position.y)}
                  onChange={(e) =>
                    handlePositionChange('y', Number(e.target.value))
                  }
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pos-w" className="text-xs">
                  Width
                </Label>
                <Input
                  id="pos-w"
                  type="number"
                  value={Math.round(element.position.width)}
                  onChange={(e) =>
                    handlePositionChange('width', Number(e.target.value))
                  }
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pos-h" className="text-xs">
                  Height
                </Label>
                <Input
                  id="pos-h"
                  type="number"
                  value={Math.round(element.position.height)}
                  onChange={(e) =>
                    handlePositionChange('height', Number(e.target.value))
                  }
                  className="h-8"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Content (for text elements) */}
          {element.type === 'text' && (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase">
                  Content
                </Label>
                <Textarea
                  value={element.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Enter text content..."
                  rows={4}
                  className="text-sm"
                />
                <TokenInserter onInsert={handleInsertToken} />
              </div>

              <Separator />

              {/* Font Style */}
              <FontPicker
                fontStyle={element.fontStyle}
                onChange={(fontStyle) => {
                  const defaultFontStyle = {
                    fontFamily: 'Helvetica' as const,
                    fontSize: 12,
                    fontWeight: 'normal' as const,
                    fontStyle: 'normal' as const,
                    lineHeight: 1.2,
                    letterSpacing: 0,
                    textAlign: 'left' as const,
                    textDecoration: 'none' as const,
                    textTransform: 'none' as const,
                    color: '#000000',
                  }
                  updateElement(element.id, {
                    fontStyle: { ...defaultFontStyle, ...element.fontStyle, ...fontStyle },
                  })
                }}
              />

              <Separator />
            </>
          )}

          {/* Background & Border */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase">
              Appearance
            </Label>

            <div className="space-y-2">
              <Label className="text-xs">Background Color</Label>
              <ColorPicker
                color={element.backgroundColor || 'transparent'}
                onChange={(color) =>
                  updateElement(element.id, {
                    backgroundColor: color === 'transparent' ? undefined : color,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Opacity</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[element.opacity * 100]}
                  onValueChange={([value]) =>
                    updateElement(element.id, { opacity: value / 100 })
                  }
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="w-10 text-right text-xs text-muted-foreground">
                  {Math.round(element.opacity * 100)}%
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Padding</Label>
              <Input
                type="number"
                value={element.padding}
                onChange={(e) =>
                  updateElement(element.id, { padding: Number(e.target.value) })
                }
                min={0}
                max={50}
                className="h-8"
              />
            </div>
          </div>

          <Separator />

          {/* Layer Order */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase">
              Layer Order
            </Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => bringToFront(element.id)}
              >
                <ArrowUp className="mr-1 h-4 w-4" />
                Front
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => sendToBack(element.id)}
              >
                <ArrowDown className="mr-1 h-4 w-4" />
                Back
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleDuplicate}
          >
            <Copy className="mr-1 h-4 w-4" />
            Duplicate
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="flex-1"
            onClick={handleDelete}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}
