import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  InvoiceTemplate,
  TemplateElement,
  EditorSettings,
  EditorHistoryState,
  Position,
  FontStyle,
  BorderStyle,
  TableStyle,
} from '@invoice-generator/shared-types'

const MAX_HISTORY_SIZE = 50

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

interface TemplateState {
  // Current template being edited
  currentTemplate: InvoiceTemplate | null

  // All saved templates
  savedTemplates: InvoiceTemplate[]

  // Selected element
  selectedElementId: string | null

  // Editor settings
  editorSettings: EditorSettings

  // Undo/Redo history
  history: EditorHistoryState[]
  historyIndex: number

  // Clipboard
  clipboard: TemplateElement | null

  // Actions
  createNewTemplate: (name: string, pageSize?: string) => InvoiceTemplate
  setCurrentTemplate: (template: InvoiceTemplate | null) => void
  updateCurrentTemplate: (updates: Partial<InvoiceTemplate>) => void
  saveCurrentTemplate: () => InvoiceTemplate | null
  loadTemplate: (id: string) => void
  deleteTemplate: (id: string) => void
  duplicateTemplate: (id: string) => InvoiceTemplate | null

  // Element actions
  addElement: (element: Omit<TemplateElement, 'id'>) => string
  updateElement: (id: string, updates: Partial<TemplateElement>) => void
  removeElement: (id: string) => void
  duplicateElement: (id: string) => string | null
  selectElement: (id: string | null) => void
  bringToFront: (id: string) => void
  sendToBack: (id: string) => void
  moveElement: (id: string, position: Partial<Position>) => void
  resizeElement: (id: string, size: { width: number; height: number }) => void

  // Element style actions
  updateElementFont: (id: string, fontStyle: Partial<FontStyle>) => void
  updateElementBorder: (id: string, border: Partial<BorderStyle>) => void
  updateElementTableStyle: (id: string, tableStyle: Partial<TableStyle>) => void

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

  // Editor settings actions
  updateEditorSettings: (settings: Partial<EditorSettings>) => void
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
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      currentTemplate: null,
      savedTemplates: [],
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
          selectedElementId: null,
          history: [],
          historyIndex: -1,
        })
        return template
      },

      setCurrentTemplate: (template) =>
        set({
          currentTemplate: template,
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

      saveCurrentTemplate: () => {
        const state = get()
        if (!state.currentTemplate) return null

        const template = {
          ...state.currentTemplate,
          updatedAt: new Date().toISOString(),
        }

        set((s) => {
          const existingIndex = s.savedTemplates.findIndex((t) => t.id === template.id)
          const updated =
            existingIndex >= 0
              ? s.savedTemplates.map((t, i) => (i === existingIndex ? template : t))
              : [...s.savedTemplates, template]
          return {
            savedTemplates: updated,
            currentTemplate: template,
          }
        })

        return template
      },

      loadTemplate: (id) =>
        set((state) => {
          const template = state.savedTemplates.find((t) => t.id === id)
          if (template) {
            return {
              currentTemplate: { ...template },
              selectedElementId: null,
              history: [],
              historyIndex: -1,
            }
          }
          return state
        }),

      deleteTemplate: (id) =>
        set((state) => ({
          savedTemplates: state.savedTemplates.filter((t) => t.id !== id),
          currentTemplate:
            state.currentTemplate?.id === id ? null : state.currentTemplate,
        })),

      duplicateTemplate: (id) => {
        const state = get()
        const template = state.savedTemplates.find((t) => t.id === id)
        if (!template) return null

        const now = new Date().toISOString()
        const duplicated: InvoiceTemplate = {
          ...template,
          id: generateId(),
          name: `${template.name} (Copy)`,
          isDefault: false,
          elements: template.elements.map((el) => ({
            ...el,
            id: generateId(),
          })),
          createdAt: now,
          updatedAt: now,
        }

        set((s) => ({
          savedTemplates: [...s.savedTemplates, duplicated],
        }))

        return duplicated
      },

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
          return {
            currentTemplate: {
              ...s.currentTemplate,
              elements: s.currentTemplate.elements.filter((el) => el.id !== id),
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
                  newHeight = Math.round(newHeight / gridSize) * gridSize
                }

                return {
                  ...el,
                  position: {
                    ...el.position,
                    width: Math.max(10, newWidth),
                    height: Math.max(10, newHeight),
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

      // Editor settings
      updateEditorSettings: (settings) =>
        set((state) => ({
          editorSettings: { ...state.editorSettings, ...settings },
        })),

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
    }),
    {
      name: 'template-storage',
      partialize: (state) => ({
        savedTemplates: state.savedTemplates,
        editorSettings: state.editorSettings,
      }),
    }
  )
)
