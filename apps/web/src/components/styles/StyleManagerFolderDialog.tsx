'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { FolderIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StyleCard } from './StyleCard'
import { StyleFolder } from '@/components/export/StyleFolder'
import { FolderBreadcrumb } from './FolderBreadcrumb'
import type { InvoiceTemplate } from '@invoice-generator/shared-types'
import type { Id, Doc } from '@invoice-generator/backend/convex/_generated/dataModel'

type SystemTemplateFolder = Doc<"systemTemplateFolders">

interface StyleManagerFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folderName: string
  templates: InvoiceTemplate[]
  folders?: SystemTemplateFolder[]
  onEdit: (template: InvoiceTemplate) => void
  onDuplicate: (template: InvoiceTemplate) => void
  onSetDefault: (template: InvoiceTemplate) => void
  // Admin-specific props
  isAdmin?: boolean
  hiddenTemplateIds?: Set<string>
  hiddenFolderIds?: Set<string>
  onToggleVisibility?: (templateId: string) => void
}

export function StyleManagerFolderDialog({
  open,
  onOpenChange,
  folderName,
  templates,
  folders = [],
  onEdit,
  onDuplicate,
  onSetDefault,
  isAdmin = false,
  hiddenTemplateIds = new Set(),
  hiddenFolderIds = new Set(),
  onToggleVisibility,
}: StyleManagerFolderDialogProps) {
  // Navigation state: null = root level, string = folder ID
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)

  // Reset navigation when dialog closes
  useEffect(() => {
    if (!open) {
      setCurrentFolderId(null)
    }
  }, [open])

  // Build breadcrumb items
  const breadcrumbItems = useMemo(() => {
    const items: { id: string | null; name: string }[] = [{ id: null, name: folderName }]

    if (currentFolderId !== null) {
      const folder = folders.find(f => f._id === currentFolderId)
      if (folder) {
        items.push({ id: folder._id, name: folder.name })
      }
    }

    return items
  }, [currentFolderId, folders, folderName])

  // Filter templates for current folder
  const currentTemplates = useMemo(() => {
    if (currentFolderId === null) {
      // At root: show templates without a folder (uncategorized)
      return templates.filter(t => {
        // Templates from Convex have folderId, hardcoded system templates don't
        const templateFolderId = (t as unknown as { folderId?: Id<"systemTemplateFolders"> }).folderId
        return !templateFolderId
      })
    }
    // In a folder: show templates with matching folderId
    return templates.filter(t => {
      const templateFolderId = (t as unknown as { folderId?: Id<"systemTemplateFolders"> }).folderId
      return templateFolderId === currentFolderId
    })
  }, [templates, currentFolderId])

  // Visible folders (filter hidden for non-admins)
  const visibleFolders = useMemo(() => {
    if (isAdmin) {
      return folders
    }
    return folders.filter(f => !hiddenFolderIds.has(f._id))
  }, [folders, isAdmin, hiddenFolderIds])

  // Get template count for a folder
  const getTemplateCount = useCallback((folderId: string) => {
    return templates.filter(t => {
      const templateFolderId = (t as unknown as { folderId?: Id<"systemTemplateFolders"> }).folderId
      return templateFolderId === folderId
    }).length
  }, [templates])

  // Handle folder click
  const handleFolderClick = (folderId: string) => {
    setCurrentFolderId(folderId)
  }

  // Handle breadcrumb navigation
  const handleBreadcrumbNavigate = (folderId: string | null) => {
    setCurrentFolderId(folderId)
  }

  // Check if we're at root level
  const isAtRoot = currentFolderId === null

  // Determine dialog description
  const description = isAdmin
    ? 'Edit, hide, duplicate, or set templates as default.'
    : 'Duplicate a template to customize it or set it as your default export style.'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{breadcrumbItems[breadcrumbItems.length - 1]?.name || folderName}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Breadcrumb navigation */}
        <FolderBreadcrumb
          items={breadcrumbItems}
          onNavigate={handleBreadcrumbNavigate}
        />

        <ScrollArea className="max-h-[60vh]">
          <div className="grid grid-cols-2 gap-4 pr-4 lg:grid-cols-3">
            {/* Show folder cards at root level */}
            {isAtRoot && visibleFolders.map((folder) => (
              <div key={folder._id} className="relative">
                <StyleFolder
                  name={folder.name}
                  templateCount={getTemplateCount(folder._id)}
                  onClick={() => handleFolderClick(folder._id)}
                />
                {isAdmin && folder.isHidden && (
                  <div className="absolute -top-1 -right-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    Hidden
                  </div>
                )}
              </div>
            ))}

            {/* Show templates */}
            {currentTemplates.map((template) => (
              <StyleCard
                key={template.id}
                template={template}
                isDefault={false}
                isSelected={false}
                showCheckbox={false}
                onEdit={() => onEdit(template)}
                onDuplicate={() => onDuplicate(template)}
                onSetDefault={() => onSetDefault(template)}
                onDelete={() => {}}
                onSelect={() => {}}
                isAdmin={isAdmin}
                isHidden={hiddenTemplateIds.has(template.id)}
                onToggleVisibility={
                  isAdmin && onToggleVisibility
                    ? () => onToggleVisibility(template.id)
                    : undefined
                }
              />
            ))}

            {/* Empty state */}
            {isAtRoot && visibleFolders.length === 0 && currentTemplates.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                <FolderIcon className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">No templates available</p>
              </div>
            )}

            {!isAtRoot && currentTemplates.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                <FolderIcon className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">This folder is empty</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
