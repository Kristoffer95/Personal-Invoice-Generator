'use client'

import { useState, useCallback, useRef } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Lock, Move, CornerRightDown, Box } from 'lucide-react'
import { useTemplateStore } from '@/lib/template-store'
import { cn } from '@/lib/utils'
import type { TemplateElement as TemplateElementType, CalculatedPosition } from '@invoice-generator/shared-types'
import { TextElement } from './TextElement'
import { TableElement } from './TableElement'

interface TemplateElementProps {
  element: TemplateElementType
  isSelected: boolean
  margins: { top: number; left: number }
  calculatedPosition?: CalculatedPosition
  childCount?: number
}

export function TemplateElement({ element, isSelected, margins, calculatedPosition, childCount }: TemplateElementProps) {
  const { selectElement, moveElement, resizeElement, updateElement, currentTemplate } = useTemplateStore()
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null)

  const isContainer = element.type === 'layout_container'
  const isRelative = element.positionMode === 'relative' && element.parentId

  const { attributes, listeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({
    id: element.id,
    data: { type: 'canvas-element' },
    disabled: element.locked,
  })

  // Make containers droppable
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `container-${element.id}`,
    disabled: !isContainer,
    data: { type: 'container', containerId: element.id },
  })

  // Combine refs for containers
  const setNodeRef = useCallback(
    (node: HTMLElement | null) => {
      setDraggableRef(node)
      if (isContainer) {
        setDroppableRef(node)
      }
    },
    [setDraggableRef, setDroppableRef, isContainer]
  )

  // Use calculated position if available (for relative elements), otherwise use element position
  const pos = calculatedPosition ?? element.position

  const style: React.CSSProperties = {
    position: 'absolute',
    left: pos.x + margins.left,
    top: pos.y + margins.top,
    width: pos.width,
    height: pos.height,
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
      case 'layout_container':
        // Map justify values to CSS justify-content
        const justifyMap: Record<string, string> = {
          'start': 'flex-start',
          'center': 'center',
          'end': 'flex-end',
          'space-between': 'space-between',
          'space-around': 'space-around',
          'space-evenly': 'space-evenly',
        }
        // Map align values to CSS align-items
        const alignMap: Record<string, string> = {
          'start': 'flex-start',
          'center': 'center',
          'end': 'flex-end',
          'stretch': 'stretch',
        }
        // Margin for Row containers
        const containerMargin = element.layoutConfig?.direction === 'row' && element.spacing
          ? {
              marginTop: element.spacing.top,
              marginRight: element.spacing.right,
              marginBottom: element.spacing.bottom,
              marginLeft: element.spacing.left,
            }
          : {}
        return (
          <div
            className={cn(
              'w-full h-full min-h-[40px] min-w-[40px] flex border-2 border-dashed rounded transition-colors',
              isOver ? 'border-blue-500 bg-blue-50/50' : 'border-blue-400/50'
            )}
            style={{
              flexDirection: element.layoutConfig?.direction || 'column',
              gap: element.layoutConfig?.gap || 8,
              justifyContent: justifyMap[element.layoutConfig?.justify || 'start'] || 'flex-start',
              alignItems: alignMap[element.layoutConfig?.align || 'stretch'] || 'stretch',
              background: isOver
                ? 'rgba(59, 130, 246, 0.1)'
                : 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(59, 130, 246, 0.03) 5px, rgba(59, 130, 246, 0.03) 10px)',
              ...containerMargin,
            }}
          >
            <div className="absolute top-1 left-1 flex items-center gap-1 text-xs text-blue-500/70 pointer-events-none">
              <Box className="h-3 w-3" />
              {element.layoutConfig?.direction === 'row' ? '→ Row' : '↓ Column'}
            </div>
            {typeof childCount === 'number' && (
              <div className="absolute bottom-1 right-1 text-xs text-blue-500/70 pointer-events-none">
                {childCount} {childCount === 1 ? 'item' : 'items'}
              </div>
            )}
            {childCount === 0 && (
              <span className="text-xs text-muted-foreground/50 pointer-events-none">
                Drop elements here
              </span>
            )}
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
            {isRelative && (
              <span className="ml-1 text-blue-500 bg-blue-500/10 px-1 rounded text-[9px]">
                in container
              </span>
            )}
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
