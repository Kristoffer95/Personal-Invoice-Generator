'use client'

import { useRef, useCallback, useEffect, useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useTemplateStore } from '@/lib/template-store'
import { TemplateElement } from './TemplateElement'
import { Ruler } from './Ruler'
import { A4_POINTS, calculateElementPositions, type CalculatedPosition } from '@invoice-generator/shared-types'
import { cn } from '@/lib/utils'

export function StyleEditorCanvas() {
  const {
    currentTemplate,
    selectedElementId,
    selectElement,
    moveElement,
    removeElement,
    reorderElementInContainer,
    editorSettings,
  } = useTemplateStore()

  const canvasRef = useRef<HTMLDivElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)

  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas',
  })

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      // Only deselect if clicking on the canvas background, not on elements
      if (e.target === e.currentTarget || e.target === canvasRef.current) {
        selectElement(null)
      }
    },
    [selectElement]
  )

  const handleCanvasMouseDown = useCallback(() => {
    // Focus the canvas when clicking to enable keyboard navigation
    canvasContainerRef.current?.focus()
  }, [])

  // Auto-focus canvas when an element is selected
  useEffect(() => {
    if (selectedElementId) {
      canvasContainerRef.current?.focus()
    }
  }, [selectedElementId])

  // Canvas dimensions based on page size
  const canvasWidth = A4_POINTS.width
  const canvasHeight = A4_POINTS.height

  // Calculate positions using layout engine (for relative elements)
  const calculatedPositions = useMemo(() => {
    if (!currentTemplate) return new Map<string, CalculatedPosition>()
    return calculateElementPositions(
      currentTemplate.elements,
      currentTemplate.margins,
      canvasWidth,
      canvasHeight
    )
  }, [currentTemplate, canvasWidth, canvasHeight])

  // Keyboard handler for arrow keys, delete, escape
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Don't handle if typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      // Arrow key movement
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (!selectedElementId || !currentTemplate) return
        const element = currentTemplate.elements.find(
          (el) => el.id === selectedElementId
        )
        if (!element || element.locked) return

        e.preventDefault()

        // For relative elements in a container, arrow keys reorder within container
        if (element.positionMode === 'relative' && element.parentId) {
          const container = currentTemplate.elements.find(
            (el) => el.id === element.parentId
          )
          if (!container) return

          const siblings = currentTemplate.elements
            .filter((el) => el.parentId === element.parentId)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          const currentIndex = siblings.findIndex((el) => el.id === element.id)
          const direction = container.layoutConfig?.direction ?? 'column'

          // Up/Left moves earlier, Down/Right moves later
          const shouldMoveEarlier =
            (direction === 'column' && e.key === 'ArrowUp') ||
            (direction === 'row' && e.key === 'ArrowLeft')
          const shouldMoveLater =
            (direction === 'column' && e.key === 'ArrowDown') ||
            (direction === 'row' && e.key === 'ArrowRight')

          if (shouldMoveEarlier && currentIndex > 0) {
            reorderElementInContainer(
              selectedElementId,
              siblings[currentIndex - 1]?.order ?? 0
            )
          } else if (shouldMoveLater && currentIndex < siblings.length - 1) {
            reorderElementInContainer(
              selectedElementId,
              siblings[currentIndex + 1]?.order ?? 0
            )
          }
        } else {
          // For absolute elements, move position
          const amount = e.shiftKey ? 10 : 1
          const delta: Record<string, { x: number; y: number }> = {
            ArrowUp: { x: 0, y: -amount },
            ArrowDown: { x: 0, y: amount },
            ArrowLeft: { x: -amount, y: 0 },
            ArrowRight: { x: amount, y: 0 },
          }
          const d = delta[e.key]
          moveElement(selectedElementId, {
            x: element.position.x + d.x,
            y: element.position.y + d.y,
          })
        }
      }

      // Delete selected element
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedElementId
      ) {
        e.preventDefault()
        removeElement(selectedElementId)
      }

      // Escape to deselect
      if (e.key === 'Escape') {
        selectElement(null)
      }
    },
    [
      selectedElementId,
      currentTemplate,
      moveElement,
      removeElement,
      selectElement,
      reorderElementInContainer,
    ]
  )

  if (!currentTemplate) {
    return null
  }

  const { zoomLevel, showRulers, showGrid, gridSize } = editorSettings
  const scale = zoomLevel / 100

  return (
    <div className="flex flex-col items-center">
      {/* Rulers and Canvas Container */}
      <div className="relative">
        {/* Horizontal Ruler */}
        {showRulers && (
          <div className="mb-1 ml-6">
            <Ruler
              orientation="horizontal"
              length={canvasWidth}
              scale={scale}
            />
          </div>
        )}

        <div className="flex">
          {/* Vertical Ruler */}
          {showRulers && (
            <div className="mr-1">
              <Ruler
                orientation="vertical"
                length={canvasHeight}
                scale={scale}
              />
            </div>
          )}

          {/* Canvas */}
          <div
            ref={(node) => {
              setNodeRef(node)
              canvasContainerRef.current = node
            }}
            tabIndex={0}
            data-testid="style-editor-canvas"
            className={cn(
              'relative bg-white shadow-lg transition-shadow outline-none',
              isOver && 'ring-2 ring-primary ring-offset-2'
            )}
            style={{
              width: canvasWidth * scale,
              height: canvasHeight * scale,
              backgroundColor: currentTemplate.backgroundColor,
            }}
            onClick={handleCanvasClick}
            onMouseDown={handleCanvasMouseDown}
            onKeyDown={handleKeyDown}
          >
            {/* Grid Overlay */}
            {showGrid && (
              <svg
                className="pointer-events-none absolute inset-0"
                width="100%"
                height="100%"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <pattern
                    id="grid"
                    width={gridSize * scale}
                    height={gridSize * scale}
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d={`M ${gridSize * scale} 0 L 0 0 0 ${gridSize * scale}`}
                      fill="none"
                      stroke="rgba(0,0,0,0.1)"
                      strokeWidth="0.5"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            )}

            {/* Margin Guides */}
            <div
              className="pointer-events-none absolute border border-dashed border-blue-300/50"
              style={{
                left: currentTemplate.margins.left * scale,
                top: currentTemplate.margins.top * scale,
                right: currentTemplate.margins.right * scale,
                bottom: currentTemplate.margins.bottom * scale,
                width: (canvasWidth - currentTemplate.margins.left - currentTemplate.margins.right) * scale,
                height: (canvasHeight - currentTemplate.margins.top - currentTemplate.margins.bottom) * scale,
              }}
            />

            {/* Template Elements */}
            <div
              ref={canvasRef}
              className="absolute inset-0"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                width: canvasWidth,
                height: canvasHeight,
              }}
            >
              {currentTemplate.elements
                .filter((el) => el.visible)
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((element) => (
                  <TemplateElement
                    key={element.id}
                    element={element}
                    isSelected={element.id === selectedElementId}
                    margins={{
                      left: currentTemplate.margins.left,
                      top: currentTemplate.margins.top,
                    }}
                    calculatedPosition={calculatedPositions.get(element.id)}
                    childCount={
                      element.type === 'layout_container'
                        ? currentTemplate.elements.filter(
                            (el) => el.parentId === element.id
                          ).length
                        : undefined
                    }
                  />
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Info */}
      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span>A4 ({A4_POINTS.width.toFixed(0)} × {A4_POINTS.height.toFixed(0)} pts)</span>
        <span>|</span>
        <span>{currentTemplate.elements.length} elements</span>
        {selectedElementId && (
          <>
            <span>|</span>
            <span>
              Selected: {currentTemplate.elements.find((el) => el.id === selectedElementId)?.name}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
