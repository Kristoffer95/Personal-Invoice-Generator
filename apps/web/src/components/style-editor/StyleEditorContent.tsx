'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  pointerWithin,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  Active,
} from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import {
  Type,
  Hash,
  Calendar,
  DollarSign,
  TextCursor,
  Building2,
  User,
  Mail,
  Clock,
  List,
  Calculator,
  Minus,
  Square,
  Image,
  Table,
} from 'lucide-react'
import { useTemplateStore } from '@/lib/template-store'
import { StyleEditorHeader } from './StyleEditorHeader'
import { ElementsPanel } from './ElementsPanel'
import { StyleEditorCanvas } from './StyleEditorCanvas'
import { PropertiesPanel } from './PropertiesPanel'
import { PREDEFINED_ELEMENTS } from './predefined-elements'
import type { TemplateElement } from '@invoice-generator/shared-types'

// Icon map for drag overlay
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Type,
  Hash,
  Calendar,
  DollarSign,
  TextCursor,
  Building2,
  User,
  Mail,
  Clock,
  List,
  Calculator,
  Minus,
  Square,
  Image,
  Table,
}

// Drag preview component for panel elements
function DragPreview({ id }: { id: string }) {
  const predefined = PREDEFINED_ELEMENTS.find((el) => el.id === id)
  if (!predefined) return null

  const IconComponent = iconMap[predefined.icon] || Type

  return (
    <div className="flex cursor-grabbing items-center gap-3 rounded-lg border-2 border-primary bg-background p-3 shadow-xl">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
        <IconComponent className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{predefined.name}</p>
        <p className="truncate text-xs text-muted-foreground">{predefined.description}</p>
      </div>
    </div>
  )
}

// Drag preview for canvas elements
function CanvasElementPreview({ element }: { element: TemplateElement }) {
  const getPreviewContent = () => {
    switch (element.type) {
      case 'text':
        return (
          <div
            className="overflow-hidden rounded border-2 border-primary bg-background p-2 shadow-xl"
            style={{
              width: Math.min(element.position.width, 200),
              maxHeight: 60,
              fontSize: element.fontStyle?.fontSize || 12,
              fontFamily: element.fontStyle?.fontFamily || 'inherit',
              color: element.fontStyle?.color || '#000',
            }}
          >
            {element.content || element.name}
          </div>
        )
      case 'divider':
        return (
          <div
            className="rounded shadow-xl"
            style={{
              width: Math.min(element.position.width, 200),
              height: 4,
              backgroundColor: element.fontStyle?.color || '#e0e0e0',
            }}
          />
        )
      case 'rectangle':
        return (
          <div
            className="rounded border-2 border-primary shadow-xl"
            style={{
              width: Math.min(element.position.width, 100),
              height: Math.min(element.position.height, 60),
              backgroundColor: element.backgroundColor || '#f0f0f0',
            }}
          />
        )
      case 'table_work_hours':
      case 'table_line_items':
      case 'table_summary':
        return (
          <div className="rounded border-2 border-primary bg-background p-2 shadow-xl">
            <Table className="h-6 w-6 text-muted-foreground" />
            <p className="mt-1 text-xs text-muted-foreground">{element.name}</p>
          </div>
        )
      case 'logo':
        return (
          <div
            className="flex items-center justify-center rounded border-2 border-primary bg-muted shadow-xl"
            style={{
              width: Math.min(element.position.width, 80),
              height: Math.min(element.position.height, 60),
            }}
          >
            <Image className="h-6 w-6 text-muted-foreground" />
          </div>
        )
      default:
        return (
          <div className="rounded border-2 border-primary bg-background p-2 shadow-xl">
            <p className="text-xs">{element.name}</p>
          </div>
        )
    }
  }

  return <div className="opacity-95">{getPreviewContent()}</div>
}

export default function StyleEditorContent() {
  const searchParams = useSearchParams()
  const templateIdParam = searchParams.get('templateId')
  const hasLoadedTemplate = useRef(false)

  const {
    currentTemplate,
    savedTemplates,
    createNewTemplate,
    loadTemplate,
    addElement,
    moveElement,
    selectElement,
    selectedElementId,
  } = useTemplateStore()

  // Track the active drag item
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeType, setActiveType] = useState<'panel-element' | 'canvas-element' | null>(null)

  // Load template from URL param or create new one
  useEffect(() => {
    if (hasLoadedTemplate.current) return

    if (templateIdParam) {
      // Load existing template for editing
      const templateExists = savedTemplates.some((t) => t.id === templateIdParam)
      if (templateExists) {
        loadTemplate(templateIdParam)
        hasLoadedTemplate.current = true
      } else {
        // Template not found, create new one
        createNewTemplate('My Invoice Template')
        hasLoadedTemplate.current = true
      }
    } else if (!currentTemplate) {
      // No param and no current template, create new one
      createNewTemplate('My Invoice Template')
      hasLoadedTemplate.current = true
    } else {
      hasLoadedTemplate.current = true
    }
  }, [templateIdParam, savedTemplates, currentTemplate, loadTemplate, createNewTemplate])

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor)
  )

  // Handle drag start
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event
      setActiveId(active.id as string)
      setActiveType(active.data.current?.type as 'panel-element' | 'canvas-element' | null)

      // If dragging an element on the canvas, select it
      if (active.data.current?.type === 'canvas-element') {
        selectElement(active.id as string)
      }
    },
    [selectElement]
  )

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over, delta } = event

      // Clear active drag state
      setActiveId(null)
      setActiveType(null)

      // Dragging from elements panel to canvas
      if (active.data.current?.type === 'panel-element' && over?.id === 'canvas') {
        const predefinedId = active.id as string
        const predefined = PREDEFINED_ELEMENTS.find((el) => el.id === predefinedId)

        if (predefined) {
          // Get drop position relative to canvas
          const canvasRect = over.rect
          const dropX = Math.max(0, event.activatorEvent instanceof MouseEvent
            ? event.activatorEvent.clientX - canvasRect.left + delta.x
            : 50)
          const dropY = Math.max(0, event.activatorEvent instanceof MouseEvent
            ? event.activatorEvent.clientY - canvasRect.top + delta.y
            : 50)

          addElement({
            ...predefined.defaultElement,
            position: {
              ...predefined.defaultElement.position,
              x: dropX,
              y: dropY,
            },
          })
        }
      }

      // Moving an element on the canvas
      if (active.data.current?.type === 'canvas-element') {
        const element = currentTemplate?.elements.find(
          (el) => el.id === active.id
        )
        if (element && !element.locked) {
          moveElement(active.id as string, {
            x: element.position.x + delta.x,
            y: element.position.y + delta.y,
          })
        }
      }
    },
    [addElement, currentTemplate?.elements, moveElement]
  )

  // Handle drag cancel
  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setActiveType(null)
  }, [])

  // Get the element being dragged for canvas elements
  const activeElement = activeType === 'canvas-element'
    ? currentTemplate?.elements.find((el) => el.id === activeId)
    : null

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      const state = useTemplateStore.getState()

      // Delete selected element
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedElementId) {
        e.preventDefault()
        state.removeElement(state.selectedElementId)
      }

      // Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        state.undo()
      }

      // Redo
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        state.redo()
      }

      // Copy
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && state.selectedElementId) {
        e.preventDefault()
        state.copyElement(state.selectedElementId)
      }

      // Paste
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        e.preventDefault()
        state.pasteElement()
      }

      // Cut
      if ((e.metaKey || e.ctrlKey) && e.key === 'x' && state.selectedElementId) {
        e.preventDefault()
        state.cutElement(state.selectedElementId)
      }

      // Duplicate
      if ((e.metaKey || e.ctrlKey) && e.key === 'd' && state.selectedElementId) {
        e.preventDefault()
        state.duplicateElement(state.selectedElementId)
      }

      // Escape to deselect
      if (e.key === 'Escape') {
        state.selectElement(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!currentTemplate) {
    return null
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      modifiers={[restrictToWindowEdges]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-screen flex-col bg-background">
        <StyleEditorHeader />

        <div className="flex flex-1 overflow-hidden">
          {/* Elements Panel - Left */}
          <ElementsPanel />

          {/* Canvas - Center */}
          <div className="flex-1 overflow-auto bg-muted/30 p-4">
            <StyleEditorCanvas />
          </div>

          {/* Properties Panel - Right */}
          {selectedElementId && <PropertiesPanel />}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeId && activeType === 'panel-element' && (
          <DragPreview id={activeId} />
        )}
        {activeId && activeType === 'canvas-element' && activeElement && (
          <CanvasElementPreview element={activeElement} />
        )}
      </DragOverlay>
    </DndContext>
  )
}
