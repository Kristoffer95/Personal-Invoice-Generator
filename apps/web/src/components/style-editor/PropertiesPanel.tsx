'use client'

import { useCallback, useState } from 'react'
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
  ChevronsUp,
  ChevronsDown,
  ChevronUp,
  ChevronDown,
  Unlink,
  History,
  RotateCcw,
  RotateCw,
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
    moveUp,
    moveDown,
    addElementToContainer,
    removeElementFromContainer,
    updateLayoutConfig,
    history,
    historyIndex,
    undo,
    redo,
    canUndo,
    canRedo,
    jumpToHistoryIndex,
  } = useTemplateStore()

  const [activeTab, setActiveTab] = useState<'properties' | 'history'>('properties')

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

  // Generate history descriptions for display
  const getHistoryDescription = (index: number): string => {
    if (index < 0) return 'Initial state'
    const state = history[index]
    if (!state) return `State ${index + 1}`
    const elementCount = state.elements.length
    return `${elementCount} element${elementCount !== 1 ? 's' : ''}`
  }

  return (
    <div className="flex h-full w-80 flex-col overflow-hidden border-l bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="text-sm font-semibold">
          {activeTab === 'properties' ? 'Properties' : 'History'}
        </h3>
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'properties' | 'history')} className="flex flex-1 flex-col">
        <div className="border-b px-3 pt-2">
          <TabsList className="w-full">
            <TabsTrigger value="properties" className="flex-1">Properties</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">
              <History className="mr-1 h-3 w-3" />
              History
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Properties Tab */}
        <TabsContent value="properties" className="mt-0 flex-1 min-h-0">
          <ScrollArea className="h-full">
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
              {/* Width with mode selector for non-container elements */}
              {element.type === 'layout_container' ? (
                <div className="space-y-1">
                  <Label htmlFor="pos-w" className="text-xs">Width</Label>
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
              ) : (
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Width</Label>
                  <div className="flex gap-2">
                    <Select
                      value={element.widthMode ?? 'fixed'}
                      onValueChange={(value) =>
                        updateElement(element.id, {
                          widthMode: value as 'fixed' | 'auto' | 'percentage' | 'fill',
                          ...(value !== 'percentage' && { widthPercent: undefined }),
                          ...(value === 'percentage' && !element.widthPercent && { widthPercent: 50 }),
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-[90px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed</SelectItem>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="percentage">Percent</SelectItem>
                        <SelectItem value="fill">Fill</SelectItem>
                      </SelectContent>
                    </Select>
                    {(element.widthMode ?? 'fixed') === 'fixed' && (
                      <Input
                        id="pos-w"
                        type="number"
                        value={Math.round(element.position.width)}
                        onChange={(e) =>
                          handlePositionChange('width', Number(e.target.value))
                        }
                        className="h-8 flex-1"
                      />
                    )}
                    {element.widthMode === 'percentage' && (
                      <div className="flex items-center gap-1 flex-1">
                        <Input
                          type="number"
                          value={element.widthPercent ?? 50}
                          onChange={(e) =>
                            updateElement(element.id, {
                              widthPercent: Math.min(100, Math.max(0, Number(e.target.value))),
                            })
                          }
                          className="h-8 flex-1"
                          min={0}
                          max={100}
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    )}
                    {element.widthMode === 'auto' && (
                      <span className="text-xs text-muted-foreground self-center flex-1">
                        Fits content
                      </span>
                    )}
                    {element.widthMode === 'fill' && (
                      <span className="text-xs text-muted-foreground self-center flex-1">
                        Fill parent
                      </span>
                    )}
                  </div>
                </div>
              )}
              {/* Height with mode selector */}
              {element.type === 'layout_container' ? (
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Height</Label>
                  <div className="flex gap-2">
                    <Select
                      value={element.heightMode ?? 'fixed'}
                      onValueChange={(value) =>
                        updateElement(element.id, {
                          heightMode: value as 'fixed' | 'auto' | 'percentage',
                          ...(value !== 'percentage' && { heightPercent: undefined }),
                          ...(value === 'percentage' && !element.heightPercent && { heightPercent: 50 }),
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed</SelectItem>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="percentage">Percent</SelectItem>
                      </SelectContent>
                    </Select>
                    {(element.heightMode ?? 'fixed') === 'fixed' && (
                      <Input
                        id="pos-h"
                        type="number"
                        value={Math.round(element.position.height)}
                        onChange={(e) =>
                          handlePositionChange('height', Number(e.target.value))
                        }
                        className="h-8 flex-1"
                        placeholder="Height"
                      />
                    )}
                    {element.heightMode === 'percentage' && (
                      <div className="flex items-center gap-1 flex-1">
                        <Input
                          type="number"
                          value={element.heightPercent ?? 50}
                          onChange={(e) =>
                            updateElement(element.id, {
                              heightPercent: Math.min(100, Math.max(0, Number(e.target.value))),
                            })
                          }
                          className="h-8 flex-1"
                          min={0}
                          max={100}
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    )}
                    {element.heightMode === 'auto' && (
                      <span className="text-xs text-muted-foreground self-center flex-1">
                        Fits content
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Height</Label>
                  <div className="flex gap-2">
                    <Select
                      value={element.heightSizingMode ?? 'fixed'}
                      onValueChange={(value) =>
                        updateElement(element.id, {
                          heightSizingMode: value as 'fixed' | 'auto' | 'percentage' | 'fill',
                          ...(value !== 'percentage' && { heightSizingPercent: undefined }),
                          ...(value === 'percentage' && !element.heightSizingPercent && { heightSizingPercent: 50 }),
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-[90px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed</SelectItem>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="percentage">Percent</SelectItem>
                        <SelectItem value="fill">Fill</SelectItem>
                      </SelectContent>
                    </Select>
                    {(element.heightSizingMode ?? 'fixed') === 'fixed' && (
                      <Input
                        id="pos-h"
                        type="number"
                        value={Math.round(element.position.height)}
                        onChange={(e) =>
                          handlePositionChange('height', Number(e.target.value))
                        }
                        className="h-8 flex-1"
                      />
                    )}
                    {element.heightSizingMode === 'percentage' && (
                      <div className="flex items-center gap-1 flex-1">
                        <Input
                          type="number"
                          value={element.heightSizingPercent ?? 50}
                          onChange={(e) =>
                            updateElement(element.id, {
                              heightSizingPercent: Math.min(100, Math.max(0, Number(e.target.value))),
                            })
                          }
                          className="h-8 flex-1"
                          min={0}
                          max={100}
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    )}
                    {element.heightSizingMode === 'auto' && (
                      <span className="text-xs text-muted-foreground self-center flex-1">
                        Fits content
                      </span>
                    )}
                    {element.heightSizingMode === 'fill' && (
                      <span className="text-xs text-muted-foreground self-center flex-1">
                        Fill parent
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Position Mode - for all elements except layout_container */}
          {element.type !== 'layout_container' && (
            <>
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground uppercase">
                  Positioning
                </Label>
                <div className="space-y-2">
                  <Label className="text-xs">Mode</Label>
                  <Select
                    value={element.positionMode ?? 'absolute'}
                    onValueChange={(value) =>
                      updateElement(element.id, {
                        positionMode: value as 'absolute' | 'relative',
                        parentId: value === 'absolute' ? undefined : element.parentId,
                      })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="absolute">Absolute</SelectItem>
                      <SelectItem value="relative">Relative (In Container)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Parent container dropdown - only for relative elements */}
                {element.positionMode === 'relative' && (
                  <div className="space-y-2">
                    <Label className="text-xs">Parent Container</Label>
                    <Select
                      value={element.parentId ?? '__none__'}
                      onValueChange={(value) => {
                        if (value && value !== '__none__') {
                          addElementToContainer(element.id, value)
                        } else {
                          removeElementFromContainer(element.id)
                        }
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select container..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {currentTemplate?.elements
                          .filter(
                            (el) =>
                              el.type === 'layout_container' && el.id !== element.id
                          )
                          .map((container) => (
                            <SelectItem key={container.id} value={container.id}>
                              {container.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Spacing for relative elements */}
                {element.positionMode === 'relative' && element.parentId && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs">Margin</Label>
                      <div className="grid grid-cols-4 gap-1">
                        <Input
                          type="number"
                          value={element.spacing?.top ?? 0}
                          onChange={(e) =>
                            updateElement(element.id, {
                              spacing: {
                                ...element.spacing,
                                top: Number(e.target.value),
                                right: element.spacing?.right ?? 0,
                                bottom: element.spacing?.bottom ?? 0,
                                left: element.spacing?.left ?? 0,
                              },
                            })
                          }
                          className="h-8"
                          placeholder="T"
                        />
                        <Input
                          type="number"
                          value={element.spacing?.right ?? 0}
                          onChange={(e) =>
                            updateElement(element.id, {
                              spacing: {
                                ...element.spacing,
                                top: element.spacing?.top ?? 0,
                                right: Number(e.target.value),
                                bottom: element.spacing?.bottom ?? 0,
                                left: element.spacing?.left ?? 0,
                              },
                            })
                          }
                          className="h-8"
                          placeholder="R"
                        />
                        <Input
                          type="number"
                          value={element.spacing?.bottom ?? 0}
                          onChange={(e) =>
                            updateElement(element.id, {
                              spacing: {
                                ...element.spacing,
                                top: element.spacing?.top ?? 0,
                                right: element.spacing?.right ?? 0,
                                bottom: Number(e.target.value),
                                left: element.spacing?.left ?? 0,
                              },
                            })
                          }
                          className="h-8"
                          placeholder="B"
                        />
                        <Input
                          type="number"
                          value={element.spacing?.left ?? 0}
                          onChange={(e) =>
                            updateElement(element.id, {
                              spacing: {
                                ...element.spacing,
                                top: element.spacing?.top ?? 0,
                                right: element.spacing?.right ?? 0,
                                bottom: element.spacing?.bottom ?? 0,
                                left: Number(e.target.value),
                              },
                            })
                          }
                          className="h-8"
                          placeholder="L"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Top, Right, Bottom, Left</p>
                    </div>

                    {/* Flex item properties - shown when parent uses flexbox */}
                    {(() => {
                      const parentElement = currentTemplate?.elements.find(
                        (el) => el.id === element.parentId
                      )
                      const isParentGrid = parentElement?.layoutConfig?.displayMode === 'grid'

                      if (isParentGrid) {
                        return (
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground uppercase">
                              Grid Item
                            </Label>
                            <div className="space-y-2">
                              <div className="space-y-1">
                                <Label htmlFor="grid-column" className="text-xs">Grid Column</Label>
                                <Input
                                  id="grid-column"
                                  type="text"
                                  value={element.gridColumn ?? ''}
                                  onChange={(e) =>
                                    updateElement(element.id, {
                                      gridColumn: e.target.value || undefined,
                                    })
                                  }
                                  placeholder="auto (e.g., 1 / 3, span 2)"
                                  className="h-8"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="grid-row" className="text-xs">Grid Row</Label>
                                <Input
                                  id="grid-row"
                                  type="text"
                                  value={element.gridRow ?? ''}
                                  onChange={(e) =>
                                    updateElement(element.id, {
                                      gridRow: e.target.value || undefined,
                                    })
                                  }
                                  placeholder="auto (e.g., 1 / 2, span 2)"
                                  className="h-8"
                                />
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Placement: line numbers or span
                            </p>
                          </div>
                        )
                      }

                      return (
                        <>
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground uppercase">
                              Flex Item
                            </Label>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <Label htmlFor="flex-grow" className="text-xs">Grow</Label>
                                <Input
                                  id="flex-grow"
                                  type="number"
                                  value={element.flexGrow ?? 0}
                                  onChange={(e) =>
                                    updateElement(element.id, {
                                      flexGrow: Math.max(0, Number(e.target.value)),
                                    })
                                  }
                                  min={0}
                                  step={1}
                                  className="h-8"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="flex-shrink" className="text-xs">Shrink</Label>
                                <Input
                                  id="flex-shrink"
                                  type="number"
                                  value={element.flexShrink ?? 1}
                                  onChange={(e) =>
                                    updateElement(element.id, {
                                      flexShrink: Math.max(0, Number(e.target.value)),
                                    })
                                  }
                                  min={0}
                                  step={1}
                                  className="h-8"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="flex-basis" className="text-xs">Basis</Label>
                                <Input
                                  id="flex-basis"
                                  type="text"
                                  value={element.flexBasis === 'auto' ? 'auto' : (element.flexBasis ?? '')}
                                  onChange={(e) => {
                                    const val = e.target.value.trim()
                                    if (val === '' || val === 'auto') {
                                      updateElement(element.id, { flexBasis: val === '' ? undefined : 'auto' })
                                    } else {
                                      const num = parseFloat(val)
                                      if (!isNaN(num) && num >= 0) {
                                        updateElement(element.id, { flexBasis: num })
                                      }
                                    }
                                  }}
                                  placeholder="auto"
                                  className="h-8"
                                />
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Grow/shrink factors and basis size (auto or px)
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Align Self</Label>
                            <Select
                              value={element.alignSelf ?? '__inherit__'}
                              onValueChange={(value) =>
                                updateElement(element.id, {
                                  alignSelf: value === '__inherit__' ? undefined : value as 'start' | 'center' | 'end' | 'stretch',
                                })
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__inherit__">Inherit from container</SelectItem>
                                <SelectItem value="start">Start</SelectItem>
                                <SelectItem value="center">Center</SelectItem>
                                <SelectItem value="end">End</SelectItem>
                                <SelectItem value="stretch">Stretch</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )
                    })()}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => removeElementFromContainer(element.id)}
                    >
                      <Unlink className="mr-1 h-4 w-4" />
                      Remove from container
                    </Button>
                  </>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Layout Container Config */}
          {element.type === 'layout_container' && (
            <>
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground uppercase">
                  Layout Config
                </Label>

                <div className="space-y-2">
                  <Label className="text-xs">Display Mode</Label>
                  <Select
                    value={element.layoutConfig?.displayMode ?? 'flex'}
                    onValueChange={(value) =>
                      updateLayoutConfig(element.id, {
                        displayMode: value as 'flex' | 'grid',
                      })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flex">Flexbox</SelectItem>
                      <SelectItem value="grid">Grid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Flexbox-specific controls */}
                {(element.layoutConfig?.displayMode ?? 'flex') === 'flex' && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs">Direction</Label>
                      <Select
                        value={element.layoutConfig?.direction ?? 'column'}
                        onValueChange={(value) =>
                          updateLayoutConfig(element.id, {
                            direction: value as 'column' | 'row',
                          })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="column">Column (Vertical)</SelectItem>
                          <SelectItem value="row">Row (Horizontal)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Gap</Label>
                      <Input
                        type="number"
                        value={element.layoutConfig?.gap ?? 8}
                        onChange={(e) =>
                          updateLayoutConfig(element.id, { gap: Number(e.target.value) })
                        }
                        min={0}
                        max={100}
                        className="h-8"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Align Items</Label>
                      <Select
                        value={element.layoutConfig?.align ?? 'stretch'}
                        onValueChange={(value) =>
                          updateLayoutConfig(element.id, {
                            align: value as 'start' | 'center' | 'end' | 'stretch',
                          })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="start">Start</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="end">End</SelectItem>
                          <SelectItem value="stretch">Stretch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Justify Content</Label>
                      <Select
                        value={element.layoutConfig?.justify ?? 'start'}
                        onValueChange={(value) =>
                          updateLayoutConfig(element.id, {
                            justify: value as 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly',
                          })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="start">Start</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="end">End</SelectItem>
                          <SelectItem value="space-between">Space Between</SelectItem>
                          <SelectItem value="space-around">Space Around</SelectItem>
                          <SelectItem value="space-evenly">Space Evenly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Grid-specific controls */}
                {element.layoutConfig?.displayMode === 'grid' && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs">Grid Columns</Label>
                      <Input
                        type="text"
                        value={element.layoutConfig?.grid?.templateColumns ?? '1fr 1fr'}
                        onChange={(e) =>
                          updateLayoutConfig(element.id, {
                            grid: {
                              ...element.layoutConfig?.grid,
                              templateColumns: e.target.value,
                              columnGap: element.layoutConfig?.grid?.columnGap ?? 8,
                              rowGap: element.layoutConfig?.grid?.rowGap ?? 8,
                            },
                          })
                        }
                        placeholder="e.g., 1fr 1fr 1fr"
                        className="h-8"
                      />
                      <p className="text-xs text-muted-foreground">
                        Use fr units, px, or %
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Grid Rows (optional)</Label>
                      <Input
                        type="text"
                        value={element.layoutConfig?.grid?.templateRows ?? ''}
                        onChange={(e) =>
                          updateLayoutConfig(element.id, {
                            grid: {
                              ...element.layoutConfig?.grid,
                              templateColumns: element.layoutConfig?.grid?.templateColumns ?? '1fr 1fr',
                              templateRows: e.target.value || undefined,
                              columnGap: element.layoutConfig?.grid?.columnGap ?? 8,
                              rowGap: element.layoutConfig?.grid?.rowGap ?? 8,
                            },
                          })
                        }
                        placeholder="auto (default)"
                        className="h-8"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Column Gap</Label>
                        <Input
                          type="number"
                          value={element.layoutConfig?.grid?.columnGap ?? 8}
                          onChange={(e) =>
                            updateLayoutConfig(element.id, {
                              grid: {
                                ...element.layoutConfig?.grid,
                                templateColumns: element.layoutConfig?.grid?.templateColumns ?? '1fr 1fr',
                                columnGap: Number(e.target.value),
                                rowGap: element.layoutConfig?.grid?.rowGap ?? 8,
                              },
                            })
                          }
                          min={0}
                          max={100}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Row Gap</Label>
                        <Input
                          type="number"
                          value={element.layoutConfig?.grid?.rowGap ?? 8}
                          onChange={(e) =>
                            updateLayoutConfig(element.id, {
                              grid: {
                                ...element.layoutConfig?.grid,
                                templateColumns: element.layoutConfig?.grid?.templateColumns ?? '1fr 1fr',
                                columnGap: element.layoutConfig?.grid?.columnGap ?? 8,
                                rowGap: Number(e.target.value),
                              },
                            })
                          }
                          min={0}
                          max={100}
                          className="h-8"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Flexbox-only: Wrap toggle */}
                {(element.layoutConfig?.displayMode ?? 'flex') === 'flex' && (
                  <div className="flex items-center justify-between">
                    <Label htmlFor="flex-wrap" className="text-xs">Wrap</Label>
                    <Switch
                      id="flex-wrap"
                      checked={element.layoutConfig?.wrap ?? false}
                      onCheckedChange={(checked) =>
                        updateLayoutConfig(element.id, { wrap: checked })
                      }
                    />
                  </div>
                )}

                {/* Margin controls for Row layout containers (flexbox only) */}
                {(element.layoutConfig?.displayMode ?? 'flex') === 'flex' &&
                  element.layoutConfig?.direction === 'row' && (
                  <div className="space-y-2">
                    <Label className="text-xs">Row Margin</Label>
                    <div className="grid grid-cols-4 gap-1">
                      <Input
                        type="number"
                        value={element.spacing?.top ?? 0}
                        onChange={(e) =>
                          updateElement(element.id, {
                            spacing: {
                              ...element.spacing,
                              top: Number(e.target.value),
                              right: element.spacing?.right ?? 0,
                              bottom: element.spacing?.bottom ?? 0,
                              left: element.spacing?.left ?? 0,
                            },
                          })
                        }
                        className="h-8"
                        placeholder="T"
                      />
                      <Input
                        type="number"
                        value={element.spacing?.right ?? 0}
                        onChange={(e) =>
                          updateElement(element.id, {
                            spacing: {
                              ...element.spacing,
                              top: element.spacing?.top ?? 0,
                              right: Number(e.target.value),
                              bottom: element.spacing?.bottom ?? 0,
                              left: element.spacing?.left ?? 0,
                            },
                          })
                        }
                        className="h-8"
                        placeholder="R"
                      />
                      <Input
                        type="number"
                        value={element.spacing?.bottom ?? 0}
                        onChange={(e) =>
                          updateElement(element.id, {
                            spacing: {
                              ...element.spacing,
                              top: element.spacing?.top ?? 0,
                              right: element.spacing?.right ?? 0,
                              bottom: Number(e.target.value),
                              left: element.spacing?.left ?? 0,
                            },
                          })
                        }
                        className="h-8"
                        placeholder="B"
                      />
                      <Input
                        type="number"
                        value={element.spacing?.left ?? 0}
                        onChange={(e) =>
                          updateElement(element.id, {
                            spacing: {
                              ...element.spacing,
                              top: element.spacing?.top ?? 0,
                              right: element.spacing?.right ?? 0,
                              bottom: element.spacing?.bottom ?? 0,
                              left: Number(e.target.value),
                            },
                          })
                        }
                        className="h-8"
                        placeholder="L"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Top, Right, Bottom, Left</p>
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

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

            <div className="space-y-2">
              <Label className="text-xs">Border Width</Label>
              <Input
                type="number"
                value={element.border?.width ?? 0}
                onChange={(e) =>
                  updateElement(element.id, {
                    border: {
                      width: Number(e.target.value),
                      color: element.border?.color ?? '#000000',
                      style: element.border?.style ?? 'solid',
                      radius: element.border?.radius ?? 0,
                    },
                  })
                }
                min={0}
                max={20}
                className="h-8"
              />
            </div>

            {(element.border?.width ?? 0) > 0 && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Border Color</Label>
                  <ColorPicker
                    color={element.border?.color ?? '#000000'}
                    onChange={(color) =>
                      updateElement(element.id, {
                        border: {
                          ...element.border!,
                          color: color,
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Border Style</Label>
                  <Select
                    value={element.border?.style ?? 'solid'}
                    onValueChange={(value) =>
                      updateElement(element.id, {
                        border: {
                          ...element.border!,
                          style: value as 'solid' | 'dashed' | 'dotted',
                        },
                      })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">Solid</SelectItem>
                      <SelectItem value="dashed">Dashed</SelectItem>
                      <SelectItem value="dotted">Dotted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Border Radius</Label>
                  <Input
                    type="number"
                    value={element.border?.radius ?? 0}
                    onChange={(e) =>
                      updateElement(element.id, {
                        border: {
                          ...element.border!,
                          radius: Number(e.target.value),
                        },
                      })
                    }
                    min={0}
                    max={50}
                    className="h-8"
                  />
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Layer Order */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase">
                Layer Order
              </Label>
              <span className="text-xs text-muted-foreground">
                z-index: {element.zIndex}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => sendToBack(element.id)}
                title="Send to back"
              >
                <ChevronsDown className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => moveDown(element.id)}
                title="Move down"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => moveUp(element.id)}
                title="Move up"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => bringToFront(element.id)}
                title="Bring to front"
              >
                <ChevronsUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
          </ScrollArea>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-0 flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="space-y-2 p-4">
              {/* Undo/Redo buttons */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={undo}
                  disabled={!canUndo()}
                >
                  <RotateCcw className="mr-1 h-4 w-4" />
                  Undo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={redo}
                  disabled={!canRedo()}
                >
                  <RotateCw className="mr-1 h-4 w-4" />
                  Redo
                </Button>
              </div>

              <Separator />

              {/* History list */}
              <div className="space-y-1 pt-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase">
                  Change History
                </Label>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No changes yet
                  </p>
                ) : (
                  <div className="space-y-1 mt-2">
                    {history.map((state, index) => {
                      const isCurrent = index === historyIndex
                      const isPast = index < historyIndex
                      return (
                        <button
                          key={index}
                          onClick={() => jumpToHistoryIndex(index)}
                          className={`
                            w-full text-left px-3 py-2 rounded-md text-sm transition-colors
                            ${isCurrent
                              ? 'bg-primary text-primary-foreground'
                              : isPast
                                ? 'bg-muted/50 text-muted-foreground hover:bg-muted'
                                : 'hover:bg-muted'
                            }
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              State {index + 1}
                            </span>
                            {isCurrent && (
                              <span className="text-xs opacity-75">Current</span>
                            )}
                          </div>
                          <p className="text-xs opacity-75">
                            {getHistoryDescription(index)}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

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
