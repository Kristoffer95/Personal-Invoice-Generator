'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  MoreVertical,
  Pencil,
  Copy,
  Star,
  Trash2,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { InvoiceTemplate } from '@invoice-generator/shared-types'

interface StyleCardProps {
  template: InvoiceTemplate
  isDefault: boolean
  isSelected?: boolean
  showCheckbox?: boolean
  onEdit: () => void
  onDuplicate: () => void
  onSetDefault: () => void
  onDelete: () => void
  onSelect?: (selected: boolean) => void
  // Admin-specific props
  isAdmin?: boolean
  isHidden?: boolean
  onToggleVisibility?: () => void
}

export function StyleCard({
  template,
  isDefault,
  isSelected = false,
  showCheckbox = false,
  onEdit,
  onDuplicate,
  onSetDefault,
  onDelete,
  onSelect,
  isAdmin = false,
  isHidden = false,
  onToggleVisibility,
}: StyleCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const isSystem = template.isSystem ?? false
  const elementCount = template.elements?.length || 0
  const createdDate = template.createdAt
    ? format(new Date(template.createdAt), 'MMM d, yyyy')
    : 'Unknown'
  const updatedDate = template.updatedAt
    ? format(new Date(template.updatedAt), 'MMM d, yyyy')
    : createdDate

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-all hover:border-primary hover:shadow-md',
        isSelected && 'border-primary ring-2 ring-primary/20',
        isMenuOpen && 'border-primary shadow-md',
        showCheckbox && 'cursor-pointer'
      )}
      onClick={showCheckbox ? () => onSelect?.(!isSelected) : undefined}
    >
      {/* Preview Area */}
      <div
        className="relative flex h-40 items-center justify-center overflow-hidden"
        style={{ backgroundColor: template.backgroundColor || '#ffffff' }}
      >
        {/* Mini preview of elements */}
        <div className="relative h-32 w-24 rounded border bg-white shadow-sm">
          {/* Simplified preview representation */}
          <div className="absolute left-2 top-2 h-3 w-8 rounded-sm bg-gray-300" />
          <div className="absolute left-2 top-7 h-1.5 w-12 rounded-sm bg-gray-200" />
          <div className="absolute left-2 top-10 h-1.5 w-10 rounded-sm bg-gray-200" />
          <div className="absolute bottom-2 left-2 right-2 h-4 rounded-sm bg-primary/20" />
        </div>

        {/* System, Default & Hidden Badges */}
        <div className="absolute right-2 top-12 flex flex-col gap-1">
          {isSystem && (
            <Badge
              variant="secondary"
              className="gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            >
              <Lock className="h-3 w-3" />
              System
            </Badge>
          )}
          {isDefault && (
            <Badge
              variant="secondary"
              className="gap-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
            >
              <Star className="h-3 w-3 fill-current" />
              Default
            </Badge>
          )}
          {isAdmin && isHidden && (
            <Badge
              variant="secondary"
              className="gap-1 bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
            >
              <EyeOff className="h-3 w-3" />
              Hidden
            </Badge>
          )}
        </div>

        {/* Selection Checkbox */}
        {showCheckbox && (
          <div
            className={cn(
              'absolute left-2 top-2 z-20 transition-opacity',
              isSelected || isMenuOpen
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100'
            )}
            onClick={handleCheckboxClick}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect?.(checked === true)}
              aria-label={`Select ${template.name}`}
              className="h-5 w-5 border-2 bg-background shadow-sm"
            />
          </div>
        )}

        {/* Actions Menu */}
        <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className={cn(
                'absolute right-2 top-2 z-20 h-8 w-8 transition-opacity',
                isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isSystem ? (
              // System templates: show duplicate option only (plus admin options if admin)
              <>
                {isAdmin && (
                  <>
                    <DropdownMenuItem onClick={onEdit}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate to Customize
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSetDefault}>
                  <Star className="mr-2 h-4 w-4" />
                  {isDefault ? 'Clear Default' : 'Set as Default'}
                </DropdownMenuItem>
                {isAdmin && onToggleVisibility && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onToggleVisibility}>
                      {isHidden ? (
                        <>
                          <Eye className="mr-2 h-4 w-4" />
                          Show to Users
                        </>
                      ) : (
                        <>
                          <EyeOff className="mr-2 h-4 w-4" />
                          Hide from Users
                        </>
                      )}
                    </DropdownMenuItem>
                  </>
                )}
              </>
            ) : (
              // User templates: show all options
              <>
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSetDefault}>
                  <Star className="mr-2 h-4 w-4" />
                  {isDefault ? 'Clear Default' : 'Set as Default'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      {/* Info Section */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-1 truncate font-semibold">{template.name}</h3>
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{template.pageSize || 'A4'}</span>
          <span className="text-muted-foreground/50">|</span>
          <span>{elementCount} elements</span>
        </div>
        <div className="mt-auto text-xs text-muted-foreground">
          Updated {updatedDate}
        </div>
      </div>

      {/* Quick Action Button - visible on hover or when menu is open */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 flex items-center justify-center bg-background/80 transition-opacity',
          isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
      >
        {isSystem ? (
          <Button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} size="lg" className="pointer-events-auto">
            <Copy className="mr-2 h-4 w-4" />
            Duplicate to Customize
          </Button>
        ) : (
          <Button onClick={(e) => { e.stopPropagation(); onEdit(); }} size="lg" className="pointer-events-auto">
            <Pencil className="mr-2 h-4 w-4" />
            Edit Style
          </Button>
        )}
      </div>
    </div>
  )
}
