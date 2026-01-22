'use client'

import { useEffect, useCallback } from 'react'
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
} from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import { useTemplateStore } from '@/lib/template-store'
import { StyleEditorHeader } from './StyleEditorHeader'
import { ElementsPanel } from './ElementsPanel'
import { StyleEditorCanvas } from './StyleEditorCanvas'
import { PropertiesPanel } from './PropertiesPanel'
import { PREDEFINED_ELEMENTS } from './predefined-elements'
import type { TemplateElement } from '@invoice-generator/shared-types'

export default function StyleEditorContent() {
  const {
    currentTemplate,
    createNewTemplate,
    addElement,
    moveElement,
    selectElement,
    selectedElementId,
  } = useTemplateStore()

  // Initialize a new template if none exists
  useEffect(() => {
    if (!currentTemplate) {
      createNewTemplate('My Invoice Template')
    }
  }, [currentTemplate, createNewTemplate])

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

      <DragOverlay>
        {/* Drag preview will be rendered by individual draggable components */}
      </DragOverlay>
    </DndContext>
  )
}
