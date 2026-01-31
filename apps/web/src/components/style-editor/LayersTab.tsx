'use client'

import { useCallback, useState, useMemo } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Type,
  Table,
  Minus,
  Square,
  Image,
  LayoutGrid,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  MoreVertical,
  Copy,
  Trash2,
  FolderInput,
  GripVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useTemplateStore } from '@/lib/template-store'
import type { TemplateElement, TemplateElementType } from '@invoice-generator/shared-types'

// Element type icons
const elementIcons: Record<TemplateElementType, React.ComponentType<{ className?: string }>> = {
  text: Type,
  table_work_hours: Table,
  table_line_items: Table,
  table_summary: Table,
  divider: Minus,
  rectangle: Square,
  logo: Image,
  layout_container: LayoutGrid,
}

// Build tree structure from flat element list
interface TreeNode {
  element: TemplateElement
  children: TreeNode[]
  depth: number
}

function buildTree(elements: TemplateElement[]): TreeNode[] {
  const elementMap = new Map<string, TemplateElement>()
  elements.forEach((el) => elementMap.set(el.id, el))

  // Find root elements (no parentId or parentId doesn't exist)
  const rootElements = elements.filter(
    (el) => !el.parentId || !elementMap.has(el.parentId)
  )

  // Build tree recursively
  function buildNode(element: TemplateElement, depth: number): TreeNode {
    const children = elements
      .filter((el) => el.parentId === element.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((child) => buildNode(child, depth + 1))

    return { element, children, depth }
  }

  return rootElements
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((el) => buildNode(el, 0))
}

// Get all descendant IDs of an element
function getDescendantIds(elementId: string, elements: TemplateElement[]): Set<string> {
  const descendants = new Set<string>()

  function collectDescendants(id: string) {
    elements
      .filter((el) => el.parentId === id)
      .forEach((child) => {
        descendants.add(child.id)
        collectDescendants(child.id)
      })
  }

  collectDescendants(elementId)
  return descendants
}

interface LayerItemProps {
  node: TreeNode
  expandedIds: Set<string>
  onToggleExpand: (id: string) => void
  selectedElementId: string | null
  onSelect: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onToggleLock: (id: string, locked: boolean) => void
  onToggleVisibility: (id: string) => void
  onMoveToContainer: (id: string) => void
  containers: TemplateElement[]
  isDragging: boolean
  draggedElementId: string | null
  dragOverElementId: string | null
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent, id: string) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent, targetId: string) => void
  invalidDropTargets: Set<string>
}

function LayerItem({
  node,
  expandedIds,
  onToggleExpand,
  selectedElementId,
  onSelect,
  onDuplicate,
  onDelete,
  onToggleLock,
  onToggleVisibility,
  onMoveToContainer,
  containers,
  isDragging,
  draggedElementId,
  dragOverElementId,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  invalidDropTargets,
}: LayerItemProps) {
  const { element, children, depth } = node
  const isExpanded = expandedIds.has(element.id)
  const isContainer = element.type === 'layout_container'
  const hasChildren = children.length > 0
  const isSelected = selectedElementId === element.id
  const isDraggedItem = draggedElementId === element.id
  const isDragOver = dragOverElementId === element.id && !invalidDropTargets.has(element.id)
  const isInvalidDropTarget = dragOverElementId === element.id && invalidDropTargets.has(element.id)

  const Icon = elementIcons[element.type]

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onSelect(element.id)
    },
    [element.id, onSelect]
  )

  const handleToggleExpand = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onToggleExpand(element.id)
    },
    [element.id, onToggleExpand]
  )

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (element.locked) {
        e.preventDefault()
        return
      }
      onDragStart(e, element.id)
    },
    [element.id, element.locked, onDragStart]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (isContainer && !isDraggedItem) {
        onDragOver(e, element.id)
      }
    },
    [element.id, isContainer, isDraggedItem, onDragOver]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (isContainer && !invalidDropTargets.has(element.id)) {
        onDrop(e, element.id)
      }
    },
    [element.id, isContainer, invalidDropTargets, onDrop]
  )

  return (
    <>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-md px-1 py-1 text-sm transition-colors cursor-pointer',
          isSelected && 'bg-primary text-primary-foreground',
          !isSelected && 'hover:bg-muted',
          isDraggedItem && 'opacity-50',
          isDragOver && 'ring-2 ring-primary ring-inset bg-primary/10',
          isInvalidDropTarget && 'ring-2 ring-destructive ring-inset bg-destructive/10'
        )}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onClick={handleClick}
        draggable={!element.locked}
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={onDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag handle */}
        <GripVertical
          className={cn(
            'h-3 w-3 shrink-0 cursor-grab opacity-0 transition-opacity',
            !element.locked && 'group-hover:opacity-50',
            element.locked && 'cursor-not-allowed'
          )}
        />

        {/* Expand/collapse chevron for containers */}
        {isContainer ? (
          <button
            onClick={handleToggleExpand}
            className={cn(
              'shrink-0 rounded p-0.5 hover:bg-accent/50',
              isSelected && 'hover:bg-primary-foreground/20'
            )}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <div className="w-4" /> // Spacer for alignment
        )}

        {/* Element type icon */}
        <Icon className="h-3.5 w-3.5 shrink-0" />

        {/* Element name */}
        <span className="flex-1 truncate text-xs">{element.name}</span>

        {/* Child count badge for collapsed containers */}
        {isContainer && !isExpanded && hasChildren && (
          <span
            className={cn(
              'text-[10px] rounded-full px-1.5 py-0.5',
              isSelected
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-muted-foreground/20 text-muted-foreground'
            )}
          >
            {children.length}
          </span>
        )}

        {/* Visibility toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleVisibility(element.id)
          }}
          className={cn(
            'shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100',
            !element.visible && 'opacity-100',
            isSelected && 'hover:bg-primary-foreground/20',
            !isSelected && 'hover:bg-accent'
          )}
        >
          {element.visible ? (
            <Eye className="h-3 w-3" />
          ) : (
            <EyeOff className="h-3 w-3 text-muted-foreground" />
          )}
        </button>

        {/* Lock toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleLock(element.id, !element.locked)
          }}
          className={cn(
            'shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100',
            element.locked && 'opacity-100',
            isSelected && 'hover:bg-primary-foreground/20',
            !isSelected && 'hover:bg-accent'
          )}
        >
          {element.locked ? (
            <Lock className="h-3 w-3" />
          ) : (
            <Unlock className="h-3 w-3" />
          )}
        </button>

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100',
                isSelected && 'hover:bg-primary-foreground/20',
                !isSelected && 'hover:bg-accent'
              )}
            >
              <MoreVertical className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onDuplicate(element.id)}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            {containers.length > 0 && (
              <DropdownMenuItem onClick={() => onMoveToContainer(element.id)}>
                <FolderInput className="mr-2 h-4 w-4" />
                Move to Container
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(element.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Render children if expanded */}
      {isContainer && isExpanded && (
        <div className="relative">
          {/* Indentation line */}
          <div
            className="absolute bottom-0 top-0 w-px bg-border"
            style={{ left: `${depth * 16 + 12}px` }}
          />
          {children.map((child) => (
            <LayerItem
              key={child.element.id}
              node={child}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              selectedElementId={selectedElementId}
              onSelect={onSelect}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onToggleLock={onToggleLock}
              onToggleVisibility={onToggleVisibility}
              onMoveToContainer={onMoveToContainer}
              containers={containers}
              isDragging={isDragging}
              draggedElementId={draggedElementId}
              dragOverElementId={dragOverElementId}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              invalidDropTargets={invalidDropTargets}
            />
          ))}
        </div>
      )}
    </>
  )
}

interface LayersTabProps {
  onScrollToElement?: (elementId: string) => void
  expandedIds: Set<string>
  setExpandedIds: React.Dispatch<React.SetStateAction<Set<string>>>
}

export function LayersTab({ onScrollToElement, expandedIds, setExpandedIds }: LayersTabProps) {
  const {
    currentTemplate,
    selectedElementId,
    selectElement,
    duplicateElement,
    removeElement,
    lockElement,
    toggleElementVisibility,
    addElementToContainer,
  } = useTemplateStore()

  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [elementToMove, setElementToMove] = useState<string | null>(null)
  const [targetContainerId, setTargetContainerId] = useState<string>('')

  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const [draggedElementId, setDraggedElementId] = useState<string | null>(null)
  const [dragOverElementId, setDragOverElementId] = useState<string | null>(null)

  const elements = useMemo(
    () => currentTemplate?.elements ?? [],
    [currentTemplate?.elements]
  )

  // Build tree structure
  const tree = useMemo(() => buildTree(elements), [elements])

  // Get list of containers for "Move to Container" dialog
  const containers = useMemo(
    () => elements.filter((el) => el.type === 'layout_container'),
    [elements]
  )

  // Get invalid drop targets (self and descendants)
  const invalidDropTargets = useMemo(() => {
    if (!draggedElementId) return new Set<string>()
    const descendants = getDescendantIds(draggedElementId, elements)
    descendants.add(draggedElementId)
    return descendants
  }, [draggedElementId, elements])

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [setExpandedIds])

  const handleSelect = useCallback(
    (id: string) => {
      selectElement(id)
      onScrollToElement?.(id)
    },
    [selectElement, onScrollToElement]
  )

  const handleDuplicate = useCallback(
    (id: string) => {
      duplicateElement(id)
    },
    [duplicateElement]
  )

  const handleDelete = useCallback(
    (id: string) => {
      removeElement(id)
    },
    [removeElement]
  )

  const handleToggleLock = useCallback(
    (id: string, locked: boolean) => {
      lockElement(id, locked)
    },
    [lockElement]
  )

  const handleToggleVisibility = useCallback(
    (id: string) => {
      toggleElementVisibility(id)
    },
    [toggleElementVisibility]
  )

  const handleMoveToContainer = useCallback((id: string) => {
    setElementToMove(id)
    setTargetContainerId('')
    setMoveDialogOpen(true)
  }, [])

  const handleConfirmMove = useCallback(() => {
    if (elementToMove && targetContainerId) {
      addElementToContainer(elementToMove, targetContainerId)
    }
    setMoveDialogOpen(false)
    setElementToMove(null)
    setTargetContainerId('')
  }, [elementToMove, targetContainerId, addElementToContainer])

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    setIsDragging(true)
    setDraggedElementId(id)
  }, [])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
    setDraggedElementId(null)
    setDragOverElementId(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault()
    setDragOverElementId(id)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverElementId(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault()
      const draggedId = e.dataTransfer.getData('text/plain')

      if (draggedId && targetId && draggedId !== targetId && !invalidDropTargets.has(targetId)) {
        addElementToContainer(draggedId, targetId)
        // Expand the target container to show the moved element
        setExpandedIds((prev) => new Set(prev).add(targetId))
      }

      setIsDragging(false)
      setDraggedElementId(null)
      setDragOverElementId(null)
    },
    [addElementToContainer, invalidDropTargets, setExpandedIds]
  )

  // Get available containers for move dialog (excluding current element and its descendants)
  const availableContainers = useMemo(() => {
    if (!elementToMove) return containers
    const descendants = getDescendantIds(elementToMove, elements)
    return containers.filter(
      (c) => c.id !== elementToMove && !descendants.has(c.id)
    )
  }, [containers, elementToMove, elements])

  if (elements.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
        No elements yet.
        <br />
        Drag elements from the left panel.
      </div>
    )
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="p-2 space-y-0.5">
          {tree.map((node) => (
            <LayerItem
              key={node.element.id}
              node={node}
              expandedIds={expandedIds}
              onToggleExpand={handleToggleExpand}
              selectedElementId={selectedElementId}
              onSelect={handleSelect}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onToggleLock={handleToggleLock}
              onToggleVisibility={handleToggleVisibility}
              onMoveToContainer={handleMoveToContainer}
              containers={availableContainers}
              isDragging={isDragging}
              draggedElementId={draggedElementId}
              dragOverElementId={dragOverElementId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              invalidDropTargets={invalidDropTargets}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Move to Container Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Container</DialogTitle>
            <DialogDescription>
              Select a container to move this element into.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="target-container">Target Container</Label>
            <Select value={targetContainerId} onValueChange={setTargetContainerId}>
              <SelectTrigger id="target-container" className="mt-2">
                <SelectValue placeholder="Select a container..." />
              </SelectTrigger>
              <SelectContent>
                {availableContainers.map((container) => (
                  <SelectItem key={container.id} value={container.id}>
                    {container.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmMove} disabled={!targetContainerId}>
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
