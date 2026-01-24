'use client'

import { useState, useCallback, useRef } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Lock, Move, CornerRightDown } from 'lucide-react'
import { useTemplateStore } from '@/lib/template-store'
import { cn } from '@/lib/utils'
import type { TemplateElement as TemplateElementType } from '@invoice-generator/shared-types'
import { TextElement } from './TextElement'
import { TableElement } from './TableElement'

interface TemplateElementProps {
  element: TemplateElementType
  isSelected: boolean
  margins: { top: number; left: number }
}

export function TemplateElement({ element, isSelected, margins }: TemplateElementProps) {
  const { selectElement, moveElement, resizeElement, updateElement } = useTemplateStore()
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null)

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: element.id,
    data: { type: 'canvas-element' },
    disabled: element.locked,
  })

  const style: React.CSSProperties = {
    position: 'absolute',
    left: element.position.x + margins.left,
    top: element.position.y + margins.top,
    width: element.position.width,
    height: element.position.height,
    zIndex: element.zIndex,
    opacity: isDragging ? 0.3 : element.opacity,
    backgroundColor: element.backgroundColor,
    padding: element.padding,
    ...(element.border && element.border.width > 0 && {
      borderWidth: element.border.width,
      borderColor: element.border.color,
      borderStyle: element.border.style,
      borderRadius: element.border.radius,
    }),
  }

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      selectElement(element.id)
    },
    [element.id, selectElement]
  )

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      if (element.locked) return

      setIsResizing(true)
      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startWidth: element.position.width,
        startHeight: element.position.height,
      }

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!resizeRef.current) return

        const deltaX = moveEvent.clientX - resizeRef.current.startX
        const deltaY = moveEvent.clientY - resizeRef.current.startY

        resizeElement(element.id, {
          width: Math.max(20, resizeRef.current.startWidth + deltaX),
          height: Math.max(20, resizeRef.current.startHeight + deltaY),
        })
      }

      const handleMouseUp = () => {
        setIsResizing(false)
        resizeRef.current = null
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [element.id, element.locked, element.position.width, element.position.height, resizeElement]
  )

  const renderElementContent = () => {
    switch (element.type) {
      case 'text':
        return <TextElement element={element} />
      case 'table_work_hours':
      case 'table_line_items':
      case 'table_summary':
        return <TableElement element={element} />
      case 'divider':
        return (
          <div
            className="w-full h-full"
            style={{ backgroundColor: element.backgroundColor || '#e0e0e0' }}
          />
        )
      case 'rectangle':
        return <div className="w-full h-full" />
      case 'logo':
        return element.logoUrl ? (
          <img
            src={element.logoUrl}
            alt="Logo"
            className="w-full h-full"
            style={{ objectFit: element.objectFit || 'contain' }}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-muted text-muted-foreground text-xs">
            Logo
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      data-element-id={element.id}
      data-element-type={element.type}
      className={cn(
        'group box-border',
        isDragging && 'cursor-grabbing',
        !element.locked && !isDragging && 'cursor-grab',
        element.locked && 'cursor-not-allowed',
        isSelected && 'ring-2 ring-primary ring-offset-1'
      )}
      {...(element.locked ? {} : { ...listeners, ...attributes })}
    >
      {/* Element Content */}
      <div className="w-full h-full overflow-hidden">
        {renderElementContent()}
      </div>

      {/* Selection UI */}
      {isSelected && (
        <>
          {/* Selection handles */}
          <div className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-primary" />
          <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
          <div className="absolute -bottom-1 -left-1 h-2 w-2 rounded-full bg-primary" />

          {/* Resize handle */}
          {!element.locked && (
            <div
              className="absolute -bottom-1 -right-1 h-4 w-4 cursor-se-resize bg-primary rounded-sm flex items-center justify-center"
              onMouseDown={handleResizeStart}
            >
              <CornerRightDown className="h-3 w-3 text-primary-foreground" />
            </div>
          )}

          {/* Lock indicator */}
          <div className="absolute -top-6 left-0 flex items-center gap-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] shadow-sm border">
            {element.locked ? (
              <Lock className="h-3 w-3 text-muted-foreground" />
            ) : (
              <Move className="h-3 w-3 text-muted-foreground" />
            )}
            <span className="truncate max-w-[100px]">{element.name}</span>
          </div>
        </>
      )}

      {/* Hover indicator for non-selected elements */}
      {!isSelected && (
        <div className="absolute inset-0 border border-transparent group-hover:border-primary/30 pointer-events-none" />
      )}
    </div>
  )
}
