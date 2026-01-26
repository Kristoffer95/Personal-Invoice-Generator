import { useCallback, useMemo } from 'react'
import { useTemplateStore } from '@/lib/template-store'
import type { InvoiceTemplate } from '@invoice-generator/shared-types'

export function useTemplateEditor() {
  const store = useTemplateStore()

  const {
    currentTemplate,
    selectedElementId,
  } = store

  // Get the currently selected element
  const selectedElement = useMemo(() => {
    if (!currentTemplate || !selectedElementId) return null
    return currentTemplate.elements.find((el) => el.id === selectedElementId) ?? null
  }, [currentTemplate, selectedElementId])

  // Get elements sorted by z-index
  const sortedElements = useMemo(() => {
    if (!currentTemplate) return []
    return [...currentTemplate.elements].sort((a, b) => a.zIndex - b.zIndex)
  }, [currentTemplate])

  // Get visible elements sorted by z-index
  const visibleElements = useMemo(() => {
    return sortedElements.filter((el) => el.visible)
  }, [sortedElements])

  // Check if there are unsaved changes using the store's tracking
  const hasUnsavedChanges = store.hasUnsavedChanges()

  // Element selection helpers
  const selectNextElement = useCallback(() => {
    if (!currentTemplate || currentTemplate.elements.length === 0) return

    const currentIndex = currentTemplate.elements.findIndex(
      (el) => el.id === selectedElementId
    )
    const nextIndex = (currentIndex + 1) % currentTemplate.elements.length
    store.selectElement(currentTemplate.elements[nextIndex].id)
  }, [currentTemplate, selectedElementId, store])

  const selectPreviousElement = useCallback(() => {
    if (!currentTemplate || currentTemplate.elements.length === 0) return

    const currentIndex = currentTemplate.elements.findIndex(
      (el) => el.id === selectedElementId
    )
    const prevIndex =
      currentIndex <= 0
        ? currentTemplate.elements.length - 1
        : currentIndex - 1
    store.selectElement(currentTemplate.elements[prevIndex].id)
  }, [currentTemplate, selectedElementId, store])

  // Export template as JSON
  const exportTemplateJson = useCallback(() => {
    if (!currentTemplate) return null
    return JSON.stringify(currentTemplate, null, 2)
  }, [currentTemplate])

  // Import template from JSON
  const importTemplateJson = useCallback(
    (json: string) => {
      try {
        const template = JSON.parse(json) as InvoiceTemplate
        // Generate new IDs to avoid conflicts
        const newTemplate: InvoiceTemplate = {
          ...template,
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name: `${template.name} (Imported)`,
          elements: template.elements.map((el) => ({
            ...el,
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        store.setCurrentTemplate(newTemplate)
        return newTemplate
      } catch (error) {
        console.error('Failed to import template:', error)
        return null
      }
    },
    [store]
  )

  // Nudge selected element with arrow keys
  const nudgeElement = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right', amount = 1) => {
      if (!selectedElement) return

      const delta = {
        up: { x: 0, y: -amount },
        down: { x: 0, y: amount },
        left: { x: -amount, y: 0 },
        right: { x: amount, y: 0 },
      }[direction]

      store.moveElement(selectedElement.id, {
        x: selectedElement.position.x + delta.x,
        y: selectedElement.position.y + delta.y,
      })
    },
    [selectedElement, store]
  )

  return {
    // Actions from store
    ...store,

    // Computed values (override store properties with enhanced versions)
    selectedElement,
    sortedElements,
    visibleElements,
    hasUnsavedChanges,

    // Additional helpers
    selectNextElement,
    selectPreviousElement,
    exportTemplateJson,
    importTemplateJson,
    nudgeElement,
  }
}
