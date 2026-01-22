'use client'

import { useRef, useCallback } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useTemplateStore } from '@/lib/template-store'
import { TemplateElement } from './TemplateElement'
import { Ruler } from './Ruler'
import { A4_POINTS } from '@invoice-generator/shared-types'
import { cn } from '@/lib/utils'

export function StyleEditorCanvas() {
  const {
    currentTemplate,
    selectedElementId,
    selectElement,
    editorSettings,
  } = useTemplateStore()

  const canvasRef = useRef<HTMLDivElement>(null)

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

  if (!currentTemplate) {
    return null
  }

  const { zoomLevel, showRulers, showGrid, gridSize } = editorSettings
  const scale = zoomLevel / 100

  // Canvas dimensions based on page size
  const canvasWidth = A4_POINTS.width
  const canvasHeight = A4_POINTS.height

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
            ref={setNodeRef}
            data-testid="style-editor-canvas"
            className={cn(
              'relative bg-white shadow-lg transition-shadow',
              isOver && 'ring-2 ring-primary ring-offset-2'
            )}
            style={{
              width: canvasWidth * scale,
              height: canvasHeight * scale,
              backgroundColor: currentTemplate.backgroundColor,
            }}
            onClick={handleCanvasClick}
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
