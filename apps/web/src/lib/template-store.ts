import { create } from 'zustand'
import type {
  InvoiceTemplate,
  TemplateElement,
  EditorSettings,
  EditorHistoryState,
  Position,
  FontStyle,
  BorderStyle,
  TableStyle,
  LayoutConfig,
  Spacing,
  Alignment,
  CalculatedPosition,
} from '@invoice-generator/shared-types'
import { calculateElementPositions, orphanChildren } from '@invoice-generator/shared-types'
import type { Doc, Id } from '@invoice-generator/backend/convex/_generated/dataModel'
import {
  DEFAULT_SYSTEM_TEMPLATE_ID,
  isSystemTemplate,
  getSystemTemplate,
} from './system-templates'

// Type alias for Convex template document
type ConvexTemplate = Doc<"templates">

const MAX_HISTORY_SIZE = 50

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

interface TemplateState {
  // Current template being edited (in-memory)
  currentTemplate: InvoiceTemplate | null

  // Convex template ID - tracks if current template is from Convex (for save operations)
  convexTemplateId: Id<"templates"> | null

  // Last saved state - used to detect unsaved changes
  lastSavedState: string | null

  // Selected element
  selectedElementId: string | null

  // Editor settings (synced with Convex for authenticated users)
  editorSettings: EditorSettings

  // Undo/Redo history
  history: EditorHistoryState[]
  historyIndex: number

  // Clipboard
  clipboard: TemplateElement | null

  // Template actions
  createNewTemplate: (name: string, pageSize?: string) => InvoiceTemplate
  setCurrentTemplate: (template: InvoiceTemplate | null) => void
  updateCurrentTemplate: (updates: Partial<InvoiceTemplate>) => void

  // Element actions
  addElement: (element: Omit<TemplateElement, 'id'>) => string
  updateElement: (id: string, updates: Partial<TemplateElement>) => void
  removeElement: (id: string) => void
  duplicateElement: (id: string) => string | null
  selectElement: (id: string | null) => void
  bringToFront: (id: string) => void
  sendToBack: (id: string) => void
  moveUp: (id: string) => void
  moveDown: (id: string) => void
  moveElement: (id: string, position: Partial<Position>) => void
  resizeElement: (id: string, size: { width: number; height?: number }) => void

  // Element style actions
  updateElementFont: (id: string, fontStyle: Partial<FontStyle>) => void
  updateElementBorder: (id: string, border: Partial<BorderStyle>) => void
  updateElementTableStyle: (id: string, tableStyle: Partial<TableStyle>) => void

  // Container operations
  addElementToContainer: (elementId: string, containerId: string) => void
  removeElementFromContainer: (elementId: string) => void
  reorderElementInContainer: (elementId: string, newOrder: number) => void
  updateLayoutConfig: (containerId: string, config: Partial<LayoutConfig>) => void

  // Clipboard actions
  copyElement: (id: string) => void
  pasteElement: () => string | null
  cutElement: (id: string) => void

  // History actions
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  pushHistory: () => void
  jumpToHistoryIndex: (index: number) => void

  // Editor settings actions
  updateEditorSettings: (settings: Partial<EditorSettings>) => void
  setEditorSettings: (settings: EditorSettings) => void
  toggleRulers: () => void
  toggleGrid: () => void
  toggleSnapToGrid: () => void
  setZoomLevel: (zoom: number) => void
  zoomIn: () => void
  zoomOut: () => void

  // Bulk operations
  selectAll: () => void
  deselectAll: () => void
  deleteSelected: () => void
  lockElement: (id: string, locked: boolean) => void
  toggleElementVisibility: (id: string) => void

  // Convex integration actions
  setCurrentTemplateFromConvex: (convexTemplate: ConvexTemplate) => void
  setConvexTemplateId: (id: Id<"templates"> | null) => void
  getConvexTemplateId: () => Id<"templates"> | null

  // Unsaved changes tracking
  markAsSaved: () => void
  hasUnsavedChanges: () => boolean

  // System template helpers
  loadSystemTemplate: (id: string) => void

  // Helper functions
  getContainerChildCount: (containerId: string) => number
}

const defaultEditorSettings: EditorSettings = {
  showRulers: true,
  showGrid: true,
  snapToGrid: true,
  gridSize: 10,
  zoomLevel: 100,
}

const defaultTemplate: Omit<InvoiceTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Untitled Template',
  pageSize: 'A4',
  orientation: 'portrait',
  margins: {
    top: 40,
    right: 40,
    bottom: 60,
    left: 40,
  },
  backgroundColor: '#ffffff',
  elements: [],
  isDefault: false,
  isSystem: false,
}

// Helper to create a stable string representation for dirty checking
function getTemplateFingerprint(template: InvoiceTemplate | null): string | null {
  if (!template) return null
  // Create a fingerprint from the essential data (excluding timestamps)
  const data = {
    name: template.name,
    description: template.description,
    pageSize: template.pageSize,
    orientation: template.orientation,
    margins: template.margins,
    theme: template.theme,
    backgroundColor: template.backgroundColor,
    elements: template.elements,
    isDefault: template.isDefault,
  }
  return JSON.stringify(data)
}

export const useTemplateStore = create<TemplateState>()((set, get) => ({
  currentTemplate: null,
  convexTemplateId: null,
  lastSavedState: null,
  selectedElementId: null,
  editorSettings: defaultEditorSettings,
  history: [],
  historyIndex: -1,
  clipboard: null,

  createNewTemplate: (name, pageSize = 'A4') => {
    const now = new Date().toISOString()
    const template: InvoiceTemplate = {
      ...defaultTemplate,
      id: generateId(),
      name,
      pageSize: pageSize as InvoiceTemplate['pageSize'],
      createdAt: now,
      updatedAt: now,
    }
    set({
      currentTemplate: template,
      convexTemplateId: null, // New templates don't have a Convex ID yet
      selectedElementId: null,
      history: [],
      historyIndex: -1,
    })
    return template
  },

  setCurrentTemplate: (template) =>
    set({
      currentTemplate: template,
      convexTemplateId: null,
      selectedElementId: null,
      history: [],
      historyIndex: -1,
    }),

  updateCurrentTemplate: (updates) =>
    set((state) => {
      if (!state.currentTemplate) return state
      return {
        currentTemplate: {
          ...state.currentTemplate,
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      }
    }),

  // Element actions
  addElement: (element) => {
    const id = generateId()
    const state = get()
    state.pushHistory()

    set((s) => {
      if (!s.currentTemplate) return s
      const newElement: TemplateElement = {
        ...element,
        id,
        zIndex: s.currentTemplate.elements.length,
      }
      return {
        currentTemplate: {
          ...s.currentTemplate,
          elements: [...s.currentTemplate.elements, newElement],
          updatedAt: new Date().toISOString(),
        },
        selectedElementId: id,
      }
    })

    return id
  },

  updateElement: (id, updates) => {
    const state = get()
    state.pushHistory()

    set((s) => {
      if (!s.currentTemplate) return s
      return {
        currentTemplate: {
          ...s.currentTemplate,
          elements: s.currentTemplate.elements.map((el) =>
            el.id === id ? { ...el, ...updates } : el
          ),
          updatedAt: new Date().toISOString(),
        },
      }
    })
  },

  removeElement: (id) => {
    const state = get()
    state.pushHistory()

    set((s) => {
      if (!s.currentTemplate) return s

      const elementToRemove = s.currentTemplate.elements.find((el) => el.id === id)
      let updatedElements = s.currentTemplate.elements

      // If removing a container, orphan its children (convert to absolute at calculated positions)
      if (elementToRemove?.type === 'layout_container') {
        const calculatedPositions = calculateElementPositions(
          s.currentTemplate.elements,
          s.currentTemplate.margins,
          595.28, // A4 width
          841.89  // A4 height
        )
        updatedElements = orphanChildren(id, updatedElements, calculatedPositions)
      }

      // Now remove the element
      updatedElements = updatedElements.filter((el) => el.id !== id)

      return {
        currentTemplate: {
          ...s.currentTemplate,
          elements: updatedElements,
          updatedAt: new Date().toISOString(),
        },
        selectedElementId: s.selectedElementId === id ? null : s.selectedElementId,
      }
    })
  },

  duplicateElement: (id) => {
    const state = get()
    const template = state.currentTemplate
    if (!template) return null

    const element = template.elements.find((el) => el.id === id)
    if (!element) return null

    const newId = generateId()
    state.pushHistory()

    set((s) => {
      if (!s.currentTemplate) return s
      const newElement: TemplateElement = {
        ...element,
        id: newId,
        name: `${element.name} (Copy)`,
        position: {
          ...element.position,
          x: element.position.x + 10,
          y: element.position.y + 10,
        },
        zIndex: s.currentTemplate.elements.length,
      }
      return {
        currentTemplate: {
          ...s.currentTemplate,
          elements: [...s.currentTemplate.elements, newElement],
          updatedAt: new Date().toISOString(),
        },
        selectedElementId: newId,
      }
    })

    return newId
  },

  selectElement: (id) => set({ selectedElementId: id }),

  bringToFront: (id) =>
    set((state) => {
      if (!state.currentTemplate) return state
      const maxZ = Math.max(...state.currentTemplate.elements.map((el) => el.zIndex))
      return {
        currentTemplate: {
          ...state.currentTemplate,
          elements: state.currentTemplate.elements.map((el) =>
            el.id === id ? { ...el, zIndex: maxZ + 1 } : el
          ),
          updatedAt: new Date().toISOString(),
        },
      }
    }),

  sendToBack: (id) =>
    set((state) => {
      if (!state.currentTemplate) return state
      const minZ = Math.min(...state.currentTemplate.elements.map((el) => el.zIndex))
      return {
        currentTemplate: {
          ...state.currentTemplate,
          elements: state.currentTemplate.elements.map((el) =>
            el.id === id ? { ...el, zIndex: minZ - 1 } : el
          ),
          updatedAt: new Date().toISOString(),
        },
      }
    }),

  moveUp: (id) =>
    set((state) => {
      if (!state.currentTemplate) return state
      const element = state.currentTemplate.elements.find((el) => el.id === id)
      if (!element) return state

      // Find the element with the next higher z-index
      const sortedElements = [...state.currentTemplate.elements].sort(
        (a, b) => a.zIndex - b.zIndex
      )
      const currentIndex = sortedElements.findIndex((el) => el.id === id)
      const nextElement = sortedElements[currentIndex + 1]

      if (!nextElement) return state // Already at top

      // Swap z-indices
      return {
        currentTemplate: {
          ...state.currentTemplate,
          elements: state.currentTemplate.elements.map((el) => {
            if (el.id === id) return { ...el, zIndex: nextElement.zIndex }
            if (el.id === nextElement.id) return { ...el, zIndex: element.zIndex }
            return el
          }),
          updatedAt: new Date().toISOString(),
        },
      }
    }),

  moveDown: (id) =>
    set((state) => {
      if (!state.currentTemplate) return state
      const element = state.currentTemplate.elements.find((el) => el.id === id)
      if (!element) return state

      // Find the element with the next lower z-index
      const sortedElements = [...state.currentTemplate.elements].sort(
        (a, b) => a.zIndex - b.zIndex
      )
      const currentIndex = sortedElements.findIndex((el) => el.id === id)
      const prevElement = sortedElements[currentIndex - 1]

      if (!prevElement) return state // Already at bottom

      // Swap z-indices
      return {
        currentTemplate: {
          ...state.currentTemplate,
          elements: state.currentTemplate.elements.map((el) => {
            if (el.id === id) return { ...el, zIndex: prevElement.zIndex }
            if (el.id === prevElement.id) return { ...el, zIndex: element.zIndex }
            return el
          }),
          updatedAt: new Date().toISOString(),
        },
      }
    }),

  moveElement: (id, position) => {
    set((state) => {
      if (!state.currentTemplate) return state
      const { snapToGrid, gridSize } = state.editorSettings

      return {
        currentTemplate: {
          ...state.currentTemplate,
          elements: state.currentTemplate.elements.map((el) => {
            if (el.id !== id || el.locked) return el

            let newX = position.x ?? el.position.x
            let newY = position.y ?? el.position.y

            // Snap to grid if enabled
            if (snapToGrid) {
              newX = Math.round(newX / gridSize) * gridSize
              newY = Math.round(newY / gridSize) * gridSize
            }

            return {
              ...el,
              position: {
                ...el.position,
                x: Math.max(0, newX),
                y: Math.max(0, newY),
              },
            }
          }),
          updatedAt: new Date().toISOString(),
        },
      }
    })
  },

  resizeElement: (id, size) =>
    set((state) => {
      if (!state.currentTemplate) return state
      const { snapToGrid, gridSize } = state.editorSettings

      return {
        currentTemplate: {
          ...state.currentTemplate,
          elements: state.currentTemplate.elements.map((el) => {
            if (el.id !== id || el.locked) return el

            let newWidth = size.width
            let newHeight = size.height

            // Snap to grid if enabled
            if (snapToGrid) {
              newWidth = Math.round(newWidth / gridSize) * gridSize
              if (newHeight !== undefined) {
                newHeight = Math.round(newHeight / gridSize) * gridSize
              }
            }

            return {
              ...el,
              position: {
                ...el.position,
                width: Math.max(10, newWidth),
                ...(newHeight !== undefined && { height: Math.max(10, newHeight) }),
              },
            }
          }),
          updatedAt: new Date().toISOString(),
        },
      }
    }),

  updateElementFont: (id, fontStyle) =>
    set((state) => {
      if (!state.currentTemplate) return state
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
      return {
        currentTemplate: {
          ...state.currentTemplate,
          elements: state.currentTemplate.elements.map((el) =>
            el.id === id
              ? {
                  ...el,
                  fontStyle: { ...defaultFontStyle, ...el.fontStyle, ...fontStyle },
                }
              : el
          ),
          updatedAt: new Date().toISOString(),
        },
      }
    }),

  updateElementBorder: (id, border) =>
    set((state) => {
      if (!state.currentTemplate) return state
      const defaultBorder = {
        width: 0,
        color: '#000000',
        style: 'solid' as const,
        radius: 0,
      }
      return {
        currentTemplate: {
          ...state.currentTemplate,
          elements: state.currentTemplate.elements.map((el) =>
            el.id === id
              ? {
                  ...el,
                  border: { ...defaultBorder, ...el.border, ...border },
                }
              : el
          ),
          updatedAt: new Date().toISOString(),
        },
      }
    }),

  updateElementTableStyle: (id, tableStyle) =>
    set((state) => {
      if (!state.currentTemplate) return state
      const defaultTableStyle = {
        headerBackgroundColor: '#1a1a2e',
        headerTextColor: '#ffffff',
        rowBackgroundColor: '#ffffff',
        alternateRowBackgroundColor: '#f8fafc',
        borderColor: '#e0e0e0',
        showHeaderBorder: true,
        showRowBorders: true,
      }
      return {
        currentTemplate: {
          ...state.currentTemplate,
          elements: state.currentTemplate.elements.map((el) =>
            el.id === id
              ? {
                  ...el,
                  tableStyle: { ...defaultTableStyle, ...el.tableStyle, ...tableStyle },
                }
              : el
          ),
          updatedAt: new Date().toISOString(),
        },
      }
    }),

  // Container operations
  addElementToContainer: (elementId, containerId) => {
    const state = get()
    state.pushHistory()

    set((s) => {
      if (!s.currentTemplate) return s

      // Validate the container exists and is a layout_container
      const container = s.currentTemplate.elements.find(
        (el) => el.id === containerId && el.type === 'layout_container'
      )
      if (!container) return s

      // Check for circular reference
      const checkCircular = (id: string): boolean => {
        if (id === elementId) return true
        const el = s.currentTemplate!.elements.find((e) => e.id === id)
        return el?.parentId ? checkCircular(el.parentId) : false
      }
      if (checkCircular(containerId)) return s

      // Get the next order value
      const siblings = s.currentTemplate.elements.filter(
        (el) => el.parentId === containerId
      )
      const nextOrder = Math.max(...siblings.map((el) => el.order ?? 0), -1) + 1

      return {
        currentTemplate: {
          ...s.currentTemplate,
          elements: s.currentTemplate.elements.map((el) =>
            el.id === elementId
              ? {
                  ...el,
                  positionMode: 'relative' as const,
                  parentId: containerId,
                  order: nextOrder,
                }
              : el
          ),
          updatedAt: new Date().toISOString(),
        },
      }
    })
  },

  removeElementFromContainer: (elementId) => {
    const state = get()
    state.pushHistory()

    set((s) => {
      if (!s.currentTemplate) return s

      return {
        currentTemplate: {
          ...s.currentTemplate,
          elements: s.currentTemplate.elements.map((el) =>
            el.id === elementId
              ? {
                  ...el,
                  positionMode: 'absolute' as const,
                  parentId: undefined,
                  order: 0,
                }
              : el
          ),
          updatedAt: new Date().toISOString(),
        },
      }
    })
  },

  reorderElementInContainer: (elementId, newOrder) => {
    const state = get()
    state.pushHistory()

    set((s) => {
      if (!s.currentTemplate) return s

      const element = s.currentTemplate.elements.find((el) => el.id === elementId)
      if (!element?.parentId) return s

      const oldOrder = element.order ?? 0
      const parentId = element.parentId

      // Get siblings and reorder
      return {
        currentTemplate: {
          ...s.currentTemplate,
          elements: s.currentTemplate.elements.map((el) => {
            if (el.id === elementId) {
              return { ...el, order: newOrder }
            }
            if (el.parentId === parentId) {
              const elOrder = el.order ?? 0
              // Shift orders for affected siblings
              if (oldOrder < newOrder) {
                // Moving down: shift up elements between old and new
                if (elOrder > oldOrder && elOrder <= newOrder) {
                  return { ...el, order: elOrder - 1 }
                }
              } else {
                // Moving up: shift down elements between new and old
                if (elOrder >= newOrder && elOrder < oldOrder) {
                  return { ...el, order: elOrder + 1 }
                }
              }
            }
            return el
          }),
          updatedAt: new Date().toISOString(),
        },
      }
    })
  },

  updateLayoutConfig: (containerId, config) =>
    set((state) => {
      if (!state.currentTemplate) return state
      const defaultLayoutConfig = {
        direction: 'column' as const,
        gap: 8,
        align: 'stretch' as const,
        justify: 'start' as const,
        wrap: false,
      }
      return {
        currentTemplate: {
          ...state.currentTemplate,
          elements: state.currentTemplate.elements.map((el) =>
            el.id === containerId && el.type === 'layout_container'
              ? {
                  ...el,
                  layoutConfig: { ...defaultLayoutConfig, ...el.layoutConfig, ...config },
                }
              : el
          ),
          updatedAt: new Date().toISOString(),
        },
      }
    }),

  // Clipboard
  copyElement: (id) => {
    const state = get()
    const element = state.currentTemplate?.elements.find((el) => el.id === id)
    if (element) {
      set({ clipboard: { ...element } })
    }
  },

  pasteElement: () => {
    const state = get()
    if (!state.clipboard || !state.currentTemplate) return null

    const newId = generateId()
    state.pushHistory()

    set((s) => {
      if (!s.currentTemplate || !s.clipboard) return s
      const newElement: TemplateElement = {
        ...s.clipboard,
        id: newId,
        name: `${s.clipboard.name} (Pasted)`,
        position: {
          ...s.clipboard.position,
          x: s.clipboard.position.x + 20,
          y: s.clipboard.position.y + 20,
        },
        zIndex: s.currentTemplate.elements.length,
      }
      return {
        currentTemplate: {
          ...s.currentTemplate,
          elements: [...s.currentTemplate.elements, newElement],
          updatedAt: new Date().toISOString(),
        },
        selectedElementId: newId,
      }
    })

    return newId
  },

  cutElement: (id) => {
    const state = get()
    state.copyElement(id)
    state.removeElement(id)
  },

  // History
  undo: () =>
    set((state) => {
      if (state.historyIndex < 0 || !state.currentTemplate) return state

      const prevState = state.history[state.historyIndex]
      if (!prevState) return state

      return {
        currentTemplate: {
          ...state.currentTemplate,
          elements: prevState.elements,
          updatedAt: new Date().toISOString(),
        },
        selectedElementId: prevState.selectedElementId,
        historyIndex: state.historyIndex - 1,
      }
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex >= state.history.length - 1 || !state.currentTemplate)
        return state

      const nextState = state.history[state.historyIndex + 1]
      if (!nextState) return state

      return {
        currentTemplate: {
          ...state.currentTemplate,
          elements: nextState.elements,
          updatedAt: new Date().toISOString(),
        },
        selectedElementId: nextState.selectedElementId,
        historyIndex: state.historyIndex + 1,
      }
    }),

  canUndo: () => {
    const state = get()
    return state.historyIndex >= 0
  },

  canRedo: () => {
    const state = get()
    return state.historyIndex < state.history.length - 1
  },

  pushHistory: () =>
    set((state) => {
      if (!state.currentTemplate) return state

      const newHistoryState: EditorHistoryState = {
        elements: state.currentTemplate.elements.map((el) => ({ ...el })),
        selectedElementId: state.selectedElementId,
      }

      // Remove any redo states
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(newHistoryState)

      // Limit history size
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift()
      }

      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      }
    }),

  jumpToHistoryIndex: (index) =>
    set((state) => {
      if (!state.currentTemplate) return state
      if (index < 0 || index >= state.history.length) return state

      const targetState = state.history[index]
      if (!targetState) return state

      return {
        currentTemplate: {
          ...state.currentTemplate,
          elements: targetState.elements,
          updatedAt: new Date().toISOString(),
        },
        selectedElementId: targetState.selectedElementId,
        historyIndex: index,
      }
    }),

  // Editor settings
  updateEditorSettings: (settings) =>
    set((state) => ({
      editorSettings: { ...state.editorSettings, ...settings },
    })),

  setEditorSettings: (settings) =>
    set({
      editorSettings: settings,
    }),

  toggleRulers: () =>
    set((state) => ({
      editorSettings: {
        ...state.editorSettings,
        showRulers: !state.editorSettings.showRulers,
      },
    })),

  toggleGrid: () =>
    set((state) => ({
      editorSettings: {
        ...state.editorSettings,
        showGrid: !state.editorSettings.showGrid,
      },
    })),

  toggleSnapToGrid: () =>
    set((state) => ({
      editorSettings: {
        ...state.editorSettings,
        snapToGrid: !state.editorSettings.snapToGrid,
      },
    })),

  setZoomLevel: (zoom) =>
    set((state) => ({
      editorSettings: {
        ...state.editorSettings,
        zoomLevel: Math.max(25, Math.min(200, zoom)),
      },
    })),

  zoomIn: () =>
    set((state) => ({
      editorSettings: {
        ...state.editorSettings,
        zoomLevel: Math.min(200, state.editorSettings.zoomLevel + 10),
      },
    })),

  zoomOut: () =>
    set((state) => ({
      editorSettings: {
        ...state.editorSettings,
        zoomLevel: Math.max(25, state.editorSettings.zoomLevel - 10),
      },
    })),

  // Bulk operations
  selectAll: () =>
    set((state) => {
      if (!state.currentTemplate || state.currentTemplate.elements.length === 0)
        return state
      // Select the first element (multi-select would need more work)
      return {
        selectedElementId: state.currentTemplate.elements[0]?.id ?? null,
      }
    }),

  deselectAll: () => set({ selectedElementId: null }),

  deleteSelected: () => {
    const state = get()
    if (state.selectedElementId) {
      state.removeElement(state.selectedElementId)
    }
  },

  lockElement: (id, locked) =>
    set((state) => {
      if (!state.currentTemplate) return state
      return {
        currentTemplate: {
          ...state.currentTemplate,
          elements: state.currentTemplate.elements.map((el) =>
            el.id === id ? { ...el, locked } : el
          ),
          updatedAt: new Date().toISOString(),
        },
      }
    }),

  toggleElementVisibility: (id) =>
    set((state) => {
      if (!state.currentTemplate) return state
      return {
        currentTemplate: {
          ...state.currentTemplate,
          elements: state.currentTemplate.elements.map((el) =>
            el.id === id ? { ...el, visible: !el.visible } : el
          ),
          updatedAt: new Date().toISOString(),
        },
      }
    }),

  // Convex integration actions
  setCurrentTemplateFromConvex: (convexTemplate) =>
    set(() => {
      // Helper to convert fontStyle with defaults
      const convertFontStyle = (fs: ConvexTemplate['elements'][0]['fontStyle']): FontStyle | undefined => {
        if (!fs) return undefined
        return {
          fontFamily: fs.fontFamily ?? 'Helvetica',
          fontSize: fs.fontSize ?? 12,
          fontWeight: fs.fontWeight ?? 'normal',
          fontStyle: fs.fontStyle ?? 'normal',
          textAlign: fs.textAlign ?? 'left',
          textDecoration: fs.textDecoration ?? 'none',
          textTransform: fs.textTransform ?? 'none',
          letterSpacing: fs.letterSpacing ?? 0,
          lineHeight: fs.lineHeight ?? 1.2,
          color: fs.color ?? '#000000',
        }
      }

      // Helper to convert border with defaults
      const convertBorder = (b: ConvexTemplate['elements'][0]['border']): BorderStyle | undefined => {
        if (!b) return undefined
        return {
          width: b.width ?? 0,
          color: b.color ?? '#000000',
          style: b.style ?? 'solid',
          radius: b.radius ?? 0,
        }
      }

      // Helper to convert tableStyle with defaults
      const convertTableStyle = (ts: ConvexTemplate['elements'][0]['tableStyle']): TableStyle | undefined => {
        if (!ts) return undefined
        return {
          headerBackgroundColor: ts.headerBackgroundColor ?? '#1a1a2e',
          headerTextColor: ts.headerTextColor ?? '#ffffff',
          rowBackgroundColor: ts.rowBackgroundColor ?? '#ffffff',
          alternateRowBackgroundColor: ts.alternateRowBackgroundColor ?? '#f8fafc',
          borderColor: ts.borderColor ?? '#e0e0e0',
          showHeaderBorder: ts.showHeaderBorder ?? true,
          showRowBorders: ts.showRowBorders ?? true,
          columns: ts.columns?.map((col) => ({
            id: col.id,
            header: col.header,
            field: col.field,
            width: col.width,
            align: col.align ?? 'left',
          })),
        }
      }

      // Convert theme with defaults for optional fields
      const theme = convexTemplate.theme
        ? {
            primary: convexTemplate.theme.primary ?? '#1a1a2e',
            secondary: convexTemplate.theme.secondary ?? '#16213e',
            accent: convexTemplate.theme.accent ?? '#0f3460',
            text: convexTemplate.theme.text ?? '#333333',
            textLight: convexTemplate.theme.textLight ?? '#666666',
            background: convexTemplate.theme.background ?? '#ffffff',
          }
        : undefined

      // Convert Convex Doc<"templates"> to InvoiceTemplate format
      const template: InvoiceTemplate = {
        id: convexTemplate._id,
        name: convexTemplate.name,
        description: convexTemplate.description,
        pageSize: convexTemplate.pageSize,
        orientation: convexTemplate.orientation,
        margins: convexTemplate.margins,
        theme,
        backgroundColor: convexTemplate.backgroundColor,
        elements: convexTemplate.elements.map((el): TemplateElement => ({
          id: el.id,
          type: el.type,
          name: el.name ?? 'Untitled Element',
          position: el.position,
          content: el.content ?? '',
          fontStyle: convertFontStyle(el.fontStyle),
          border: convertBorder(el.border),
          backgroundColor: el.backgroundColor,
          padding: el.padding ?? 0,
          opacity: el.opacity ?? 1,
          zIndex: el.zIndex ?? 0,
          locked: el.locked ?? false,
          visible: el.visible ?? true,
          tableStyle: convertTableStyle(el.tableStyle),
          logoUrl: el.logoUrl,
          objectFit: el.objectFit,
          // Relative positioning fields
          positionMode: el.positionMode ?? 'absolute',
          parentId: el.parentId,
          order: el.order ?? 0,
          spacing: el.spacing ? {
            top: el.spacing.top ?? 0,
            right: el.spacing.right ?? 0,
            bottom: el.spacing.bottom ?? 0,
            left: el.spacing.left ?? 0,
          } : undefined,
          flexGrow: el.flexGrow ?? 0,
          flexShrink: el.flexShrink ?? 1,
          alignSelf: el.alignSelf,
          layoutConfig: el.layoutConfig ? {
            direction: el.layoutConfig.direction ?? 'column',
            gap: el.layoutConfig.gap ?? 8,
            align: el.layoutConfig.align ?? 'stretch',
            justify: el.layoutConfig.justify ?? 'start',
            wrap: el.layoutConfig.wrap ?? false,
            displayMode: el.layoutConfig.displayMode,
          } : undefined,
          // Flex/grid item properties
          flexBasis: el.flexBasis,
          gridColumn: el.gridColumn,
          gridRow: el.gridRow,
          // Layout container height mode
          heightMode: el.heightMode,
          heightPercent: el.heightPercent,
          // Width/height sizing modes for non-container elements
          widthMode: el.widthMode,
          widthPercent: el.widthPercent,
          heightSizingMode: el.heightSizingMode,
          heightSizingPercent: el.heightSizingPercent,
        })),
        isDefault: convexTemplate.isDefault,
        isSystem: false, // Convex templates are always user templates
        createdAt: new Date(convexTemplate.createdAt).toISOString(),
        updatedAt: new Date(convexTemplate.updatedAt).toISOString(),
      }
      return {
        currentTemplate: template,
        convexTemplateId: convexTemplate._id,
        lastSavedState: getTemplateFingerprint(template),
        selectedElementId: null,
        history: [],
        historyIndex: -1,
      }
    }),

  setConvexTemplateId: (id) => set({ convexTemplateId: id }),

  getConvexTemplateId: () => get().convexTemplateId,

  // System template helpers
  loadSystemTemplate: (id) =>
    set(() => {
      const template = getSystemTemplate(id)
      if (!template) return {}
      return {
        currentTemplate: { ...template },
        convexTemplateId: null, // System templates don't have Convex IDs
        selectedElementId: null,
        history: [],
        historyIndex: -1,
      }
    }),

  // Helper functions
  getContainerChildCount: (containerId) => {
    const state = get()
    if (!state.currentTemplate) return 0
    return state.currentTemplate.elements.filter(
      (el) => el.parentId === containerId
    ).length
  },

  // Unsaved changes tracking
  markAsSaved: () =>
    set((state) => ({
      lastSavedState: getTemplateFingerprint(state.currentTemplate),
    })),

  hasUnsavedChanges: () => {
    const state = get()
    if (!state.currentTemplate) return false
    // If no Convex ID and no last saved state, it's a new unsaved template
    if (!state.convexTemplateId && !state.lastSavedState) return true
    // Compare current state with last saved state
    const currentFingerprint = getTemplateFingerprint(state.currentTemplate)
    return currentFingerprint !== state.lastSavedState
  },
}))
