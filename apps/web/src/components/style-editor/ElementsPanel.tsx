'use client'

import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
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
  Users,
  Table,
  Shapes,
  Search,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { PREDEFINED_ELEMENTS, ELEMENT_CATEGORIES } from './predefined-elements'

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
  Users,
  Table,
  Shapes,
}

interface DraggableElementProps {
  id: string
  name: string
  description: string
  icon: string
}

function DraggableElement({ id, name, description, icon }: DraggableElementProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: { type: 'panel-element' },
  })

  const IconComponent = iconMap[icon] || Type

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'flex cursor-grab items-center gap-3 rounded-lg border bg-background p-3 transition-colors hover:bg-accent/50',
        isDragging && 'opacity-0 cursor-grabbing'
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
        <IconComponent className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

export function ElementsPanel() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(ELEMENT_CATEGORIES.map((c) => c.id))
  )

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  const filteredElements = PREDEFINED_ELEMENTS.filter(
    (el) =>
      el.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      el.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getCategoryIcon = (categoryId: string) => {
    const icons: Record<string, React.ComponentType<{ className?: string }>> = {
      text: Type,
      contact: Users,
      tables: Table,
      decorative: Shapes,
    }
    return icons[categoryId] || Type
  }

  return (
    <div className="flex w-80 flex-col border-r bg-background">
      <div className="border-b p-4">
        <h2 className="mb-3 text-sm font-semibold">Elements</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search elements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {searchQuery ? (
            // Show flat list when searching
            <div className="space-y-2">
              {filteredElements.map((element) => (
                <DraggableElement
                  key={element.id}
                  id={element.id}
                  name={element.name}
                  description={element.description}
                  icon={element.icon}
                />
              ))}
              {filteredElements.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No elements found
                </p>
              )}
            </div>
          ) : (
            // Show categorized list
            ELEMENT_CATEGORIES.map((category) => {
              const categoryElements = PREDEFINED_ELEMENTS.filter(
                (el) => el.category === category.id
              )
              const CategoryIcon = getCategoryIcon(category.id)
              const isExpanded = expandedCategories.has(category.id)

              return (
                <div key={category.id}>
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent/50"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{category.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {categoryElements.length}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-2 pl-2">
                      {categoryElements.map((element) => (
                        <DraggableElement
                          key={element.id}
                          id={element.id}
                          name={element.name}
                          description={element.description}
                          icon={element.icon}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-3 text-xs text-muted-foreground">
        <p>Drag elements to the canvas</p>
      </div>
    </div>
  )
}
