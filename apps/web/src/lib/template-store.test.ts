import { describe, it, expect, beforeEach } from 'vitest'
import { useTemplateStore } from './template-store'
import type { TemplateElement } from '@invoice-generator/shared-types'

// Helper to create test elements with all required fields
function createTestElement(overrides: Partial<Omit<TemplateElement, 'id'>> & { type: TemplateElement['type']; name: string }): Omit<TemplateElement, 'id'> {
  return {
    position: { x: 0, y: 0, width: 100, height: 50 },
    content: '',
    padding: 0,
    opacity: 1,
    zIndex: 0,
    locked: false,
    visible: true,
    positionMode: 'absolute',
    order: 0,
    flexGrow: 0,
    flexShrink: 1,
    ...overrides,
  }
}

describe('useTemplateStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useTemplateStore.setState({
      currentTemplate: null,
      convexTemplateId: null,
      selectedElementId: null,
      editorSettings: {
        showRulers: true,
        showGrid: true,
        snapToGrid: true,
        gridSize: 10,
        zoomLevel: 100,
      },
      history: [],
      historyIndex: -1,
      clipboard: null,
    })
  })

  describe('createNewTemplate', () => {
    it('creates a new template with default settings', () => {
      const { createNewTemplate } = useTemplateStore.getState()

      const template = createNewTemplate('My Template')

      expect(template.name).toBe('My Template')
      expect(template.pageSize).toBe('A4')
      expect(template.elements).toEqual([])

      const state = useTemplateStore.getState()
      expect(state.currentTemplate).toEqual(template)
    })

    it('creates a template with custom page size', () => {
      const { createNewTemplate } = useTemplateStore.getState()

      const template = createNewTemplate('Letter Template', 'LETTER')

      expect(template.pageSize).toBe('LETTER')
    })

    it('resets selection and history', () => {
      const { createNewTemplate, addElement, selectElement } = useTemplateStore.getState()

      createNewTemplate('First')
      addElement(createTestElement({
        type: 'text',
        name: 'Test',
        content: 'Test',
      }))

      const state1 = useTemplateStore.getState()
      selectElement(state1.currentTemplate?.elements[0].id ?? null)

      createNewTemplate('Second')

      const state2 = useTemplateStore.getState()
      expect(state2.selectedElementId).toBeNull()
      expect(state2.history).toEqual([])
    })
  })

  describe('addElement', () => {
    it('adds an element to the current template', () => {
      const { createNewTemplate, addElement } = useTemplateStore.getState()

      createNewTemplate('Test')
      const elementId = addElement(createTestElement({
        type: 'text',
        name: 'Title',
        position: { x: 40, y: 40, width: 200, height: 40 },
        content: 'INVOICE',
      }))

      const state = useTemplateStore.getState()
      expect(state.currentTemplate?.elements).toHaveLength(1)
      expect(state.currentTemplate?.elements[0].id).toBe(elementId)
      expect(state.currentTemplate?.elements[0].name).toBe('Title')
    })

    it('selects the newly added element', () => {
      const { createNewTemplate, addElement } = useTemplateStore.getState()

      createNewTemplate('Test')
      const elementId = addElement(createTestElement({
        type: 'text',
        name: 'Title',
        position: { x: 40, y: 40, width: 200, height: 40 },
        content: 'INVOICE',
      }))

      const state = useTemplateStore.getState()
      expect(state.selectedElementId).toBe(elementId)
    })

    it('assigns incremental z-index', () => {
      const { createNewTemplate, addElement } = useTemplateStore.getState()

      createNewTemplate('Test')

      addElement(createTestElement({ type: 'text', name: 'First' }))

      addElement(createTestElement({ type: 'text', name: 'Second' }))

      const state = useTemplateStore.getState()
      expect(state.currentTemplate?.elements[0].zIndex).toBe(0)
      expect(state.currentTemplate?.elements[1].zIndex).toBe(1)
    })
  })

  describe('updateElement', () => {
    it('updates element properties', () => {
      const { createNewTemplate, addElement, updateElement } = useTemplateStore.getState()

      createNewTemplate('Test')
      const elementId = addElement(createTestElement({
        type: 'text',
        name: 'Title',
        position: { x: 40, y: 40, width: 200, height: 40 },
        content: 'Old Content',
      }))

      updateElement(elementId, { content: 'New Content' })

      const state = useTemplateStore.getState()
      expect(state.currentTemplate?.elements[0].content).toBe('New Content')
    })
  })

  describe('removeElement', () => {
    it('removes an element from the template', () => {
      const { createNewTemplate, addElement, removeElement } = useTemplateStore.getState()

      createNewTemplate('Test')
      const elementId = addElement(createTestElement({
        type: 'text',
        name: 'To Remove',
      }))

      removeElement(elementId)

      const state = useTemplateStore.getState()
      expect(state.currentTemplate?.elements).toHaveLength(0)
    })

    it('clears selection when removing selected element', () => {
      const { createNewTemplate, addElement, selectElement, removeElement } =
        useTemplateStore.getState()

      createNewTemplate('Test')
      const elementId = addElement(createTestElement({
        type: 'text',
        name: 'Selected',
      }))

      selectElement(elementId)
      removeElement(elementId)

      const state = useTemplateStore.getState()
      expect(state.selectedElementId).toBeNull()
    })
  })

  describe('duplicateElement', () => {
    it('creates a copy of the element with offset position', () => {
      const { createNewTemplate, addElement, duplicateElement } = useTemplateStore.getState()

      createNewTemplate('Test')
      const originalId = addElement(createTestElement({
        type: 'text',
        name: 'Original',
        position: { x: 40, y: 40, width: 200, height: 40 },
        content: 'Test',
      }))

      const newId = duplicateElement(originalId)

      const state = useTemplateStore.getState()
      expect(state.currentTemplate?.elements).toHaveLength(2)
      expect(newId).not.toBe(originalId)

      const duplicate = state.currentTemplate?.elements[1]
      expect(duplicate?.name).toBe('Original (Copy)')
      expect(duplicate?.position.x).toBe(50) // 40 + 10 offset
      expect(duplicate?.position.y).toBe(50) // 40 + 10 offset
    })

    it('selects the duplicated element', () => {
      const { createNewTemplate, addElement, duplicateElement } = useTemplateStore.getState()

      createNewTemplate('Test')
      const originalId = addElement(createTestElement({
        type: 'text',
        name: 'Original',
      }))

      const newId = duplicateElement(originalId)

      const state = useTemplateStore.getState()
      expect(state.selectedElementId).toBe(newId)
    })
  })

  describe('moveElement', () => {
    it('updates element position', () => {
      const { createNewTemplate, addElement, moveElement } = useTemplateStore.getState()

      createNewTemplate('Test')
      const elementId = addElement(createTestElement({
        type: 'text',
        name: 'Movable',
        position: { x: 40, y: 40, width: 200, height: 40 },
      }))

      moveElement(elementId, { x: 100, y: 100 })

      const state = useTemplateStore.getState()
      expect(state.currentTemplate?.elements[0].position.x).toBe(100)
      expect(state.currentTemplate?.elements[0].position.y).toBe(100)
    })

    it('snaps to grid when enabled', () => {
      const { createNewTemplate, addElement, moveElement, updateEditorSettings } =
        useTemplateStore.getState()

      createNewTemplate('Test')
      updateEditorSettings({ snapToGrid: true, gridSize: 10 })

      const elementId = addElement(createTestElement({
        type: 'text',
        name: 'Movable',
        position: { x: 0, y: 0, width: 200, height: 40 },
      }))

      moveElement(elementId, { x: 43, y: 47 })

      const state = useTemplateStore.getState()
      expect(state.currentTemplate?.elements[0].position.x).toBe(40) // Snapped
      expect(state.currentTemplate?.elements[0].position.y).toBe(50) // Snapped
    })

    it('does not move locked elements', () => {
      const { createNewTemplate, addElement, lockElement, moveElement } =
        useTemplateStore.getState()

      createNewTemplate('Test')
      const elementId = addElement(createTestElement({
        type: 'text',
        name: 'Locked',
        position: { x: 40, y: 40, width: 200, height: 40 },
      }))

      lockElement(elementId, true)
      moveElement(elementId, { x: 100, y: 100 })

      const state = useTemplateStore.getState()
      expect(state.currentTemplate?.elements[0].position.x).toBe(40)
      expect(state.currentTemplate?.elements[0].position.y).toBe(40)
    })
  })

  describe('resizeElement', () => {
    it('updates element size', () => {
      const { createNewTemplate, addElement, resizeElement } = useTemplateStore.getState()

      createNewTemplate('Test')
      const elementId = addElement(createTestElement({
        type: 'text',
        name: 'Resizable',
        position: { x: 40, y: 40, width: 100, height: 50 },
      }))

      resizeElement(elementId, { width: 200, height: 100 })

      const state = useTemplateStore.getState()
      expect(state.currentTemplate?.elements[0].position.width).toBe(200)
      expect(state.currentTemplate?.elements[0].position.height).toBe(100)
    })

    it('enforces minimum size', () => {
      const { createNewTemplate, addElement, resizeElement } = useTemplateStore.getState()

      createNewTemplate('Test')
      const elementId = addElement(createTestElement({
        type: 'text',
        name: 'Resizable',
        position: { x: 40, y: 40, width: 100, height: 50 },
      }))

      resizeElement(elementId, { width: 5, height: 5 })

      const state = useTemplateStore.getState()
      expect(state.currentTemplate?.elements[0].position.width).toBe(10) // Minimum
      expect(state.currentTemplate?.elements[0].position.height).toBe(10) // Minimum
    })
  })

  describe('bringToFront and sendToBack', () => {
    it('brings element to front', () => {
      const { createNewTemplate, addElement, bringToFront } = useTemplateStore.getState()

      createNewTemplate('Test')
      const firstId = addElement(createTestElement({ type: 'text', name: 'First' }))
      addElement(createTestElement({ type: 'text', name: 'Second' }))

      bringToFront(firstId)

      const state = useTemplateStore.getState()
      const first = state.currentTemplate?.elements.find((el) => el.id === firstId)
      expect(first?.zIndex).toBe(2) // Higher than second (which was 1)
    })

    it('sends element to back', () => {
      const { createNewTemplate, addElement, sendToBack } = useTemplateStore.getState()

      createNewTemplate('Test')
      addElement(createTestElement({ type: 'text', name: 'First' }))
      const secondId = addElement(createTestElement({ type: 'text', name: 'Second' }))

      sendToBack(secondId)

      const state = useTemplateStore.getState()
      const second = state.currentTemplate?.elements.find((el) => el.id === secondId)
      expect(second?.zIndex).toBe(-1) // Lower than first (which was 0)
    })
  })

  describe('clipboard operations', () => {
    it('copies and pastes an element', () => {
      const { createNewTemplate, addElement, copyElement, pasteElement } =
        useTemplateStore.getState()

      createNewTemplate('Test')
      const originalId = addElement(createTestElement({
        type: 'text',
        name: 'To Copy',
        position: { x: 40, y: 40, width: 200, height: 40 },
        content: 'Content',
      }))

      copyElement(originalId)
      const pastedId = pasteElement()

      const state = useTemplateStore.getState()
      expect(state.currentTemplate?.elements).toHaveLength(2)
      expect(pastedId).not.toBe(originalId)

      const pasted = state.currentTemplate?.elements.find((el) => el.id === pastedId)
      expect(pasted?.name).toBe('To Copy (Pasted)')
      expect(pasted?.content).toBe('Content')
    })

    it('cuts an element', () => {
      const { createNewTemplate, addElement, cutElement, pasteElement } =
        useTemplateStore.getState()

      createNewTemplate('Test')
      const originalId = addElement(createTestElement({
        type: 'text',
        name: 'To Cut',
        position: { x: 40, y: 40, width: 200, height: 40 },
      }))

      cutElement(originalId)

      const state1 = useTemplateStore.getState()
      expect(state1.currentTemplate?.elements).toHaveLength(0)
      expect(state1.clipboard).not.toBeNull()

      pasteElement()

      const state2 = useTemplateStore.getState()
      expect(state2.currentTemplate?.elements).toHaveLength(1)
    })
  })

  // NOTE: Template storage (saveCurrentTemplate, loadTemplate, deleteTemplate)
  // has been moved to Convex. See use-templates.ts for the new API.

  describe('editor settings', () => {
    it('toggles rulers', () => {
      const { toggleRulers } = useTemplateStore.getState()

      toggleRulers()

      const state = useTemplateStore.getState()
      expect(state.editorSettings.showRulers).toBe(false)
    })

    it('toggles grid', () => {
      const { toggleGrid } = useTemplateStore.getState()

      toggleGrid()

      const state = useTemplateStore.getState()
      expect(state.editorSettings.showGrid).toBe(false)
    })

    it('toggles snap to grid', () => {
      const { toggleSnapToGrid } = useTemplateStore.getState()

      toggleSnapToGrid()

      const state = useTemplateStore.getState()
      expect(state.editorSettings.snapToGrid).toBe(false)
    })

    it('sets zoom level within bounds', () => {
      const { setZoomLevel } = useTemplateStore.getState()

      setZoomLevel(150)
      expect(useTemplateStore.getState().editorSettings.zoomLevel).toBe(150)

      setZoomLevel(300) // Above max
      expect(useTemplateStore.getState().editorSettings.zoomLevel).toBe(200)

      setZoomLevel(10) // Below min
      expect(useTemplateStore.getState().editorSettings.zoomLevel).toBe(25)
    })

    it('zooms in and out', () => {
      const { zoomIn, zoomOut } = useTemplateStore.getState()

      zoomIn()
      expect(useTemplateStore.getState().editorSettings.zoomLevel).toBe(110)

      zoomOut()
      expect(useTemplateStore.getState().editorSettings.zoomLevel).toBe(100)
    })
  })

  describe('lockElement', () => {
    it('locks and unlocks an element', () => {
      const { createNewTemplate, addElement, lockElement } = useTemplateStore.getState()

      createNewTemplate('Test')
      const elementId = addElement(createTestElement({
        type: 'text',
        name: 'Lockable',
      }))

      lockElement(elementId, true)
      expect(useTemplateStore.getState().currentTemplate?.elements[0].locked).toBe(true)

      lockElement(elementId, false)
      expect(useTemplateStore.getState().currentTemplate?.elements[0].locked).toBe(false)
    })
  })

  describe('toggleElementVisibility', () => {
    it('toggles element visibility', () => {
      const { createNewTemplate, addElement, toggleElementVisibility } =
        useTemplateStore.getState()

      createNewTemplate('Test')
      const elementId = addElement(createTestElement({
        type: 'text',
        name: 'Toggleable',
      }))

      toggleElementVisibility(elementId)
      expect(useTemplateStore.getState().currentTemplate?.elements[0].visible).toBe(false)

      toggleElementVisibility(elementId)
      expect(useTemplateStore.getState().currentTemplate?.elements[0].visible).toBe(true)
    })
  })

  // NOTE: System template tests have been moved to Convex integration tests.
  // The getAllTemplates, loadTemplate, deleteTemplate, duplicateTemplate,
  // setDefaultTemplate, and getDefaultTemplate functions are now handled by Convex.
})
