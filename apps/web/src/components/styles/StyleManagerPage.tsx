'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ArrowLeft, Palette, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useTemplateStore } from '@/lib/template-store'
import { useToast } from '@/hooks/use-toast'
import { StyleCard } from './StyleCard'
import { DeleteStyleDialog } from './DeleteStyleDialog'
import type { InvoiceTemplate } from '@invoice-generator/shared-types'

export default function StyleManagerPage() {
  const router = useRouter()
  const { toast } = useToast()
  const {
    savedTemplates,
    defaultTemplateId,
    setDefaultTemplate,
    clearDefaultTemplate,
    deleteTemplate,
    duplicateTemplate,
    createNewTemplate,
    setCurrentTemplate,
  } = useTemplateStore()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<InvoiceTemplate | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDelete, setIsBulkDelete] = useState(false)

  // Memoized selection state
  const isAllSelected = useMemo(
    () => savedTemplates.length > 0 && selectedIds.size === savedTemplates.length,
    [savedTemplates.length, selectedIds.size]
  )
  const isSomeSelected = useMemo(
    () => selectedIds.size > 0 && selectedIds.size < savedTemplates.length,
    [savedTemplates.length, selectedIds.size]
  )
  const hasSelection = selectedIds.size > 0

  const handleEdit = (template: InvoiceTemplate) => {
    router.push(`/style-editor?templateId=${template.id}`)
  }

  const handleDuplicate = (template: InvoiceTemplate) => {
    const duplicated = duplicateTemplate(template.id)
    if (duplicated) {
      toast({
        title: 'Style duplicated',
        description: `"${duplicated.name}" has been created.`,
      })
    }
  }

  const handleSetDefault = (template: InvoiceTemplate) => {
    if (defaultTemplateId === template.id) {
      clearDefaultTemplate()
      toast({
        title: 'Default cleared',
        description: 'No default style is set.',
      })
    } else {
      setDefaultTemplate(template.id)
      toast({
        title: 'Default set',
        description: `"${template.name}" is now the default export style.`,
      })
    }
  }

  const handleDeleteClick = (template: InvoiceTemplate) => {
    setIsBulkDelete(false)
    setTemplateToDelete(template)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (isBulkDelete) {
      // Bulk delete
      const count = selectedIds.size
      selectedIds.forEach((id) => deleteTemplate(id))
      toast({
        title: 'Styles deleted',
        description: `${count} style${count > 1 ? 's have' : ' has'} been deleted.`,
      })
      setSelectedIds(new Set())
      setIsBulkDelete(false)
    } else if (templateToDelete) {
      // Single delete
      deleteTemplate(templateToDelete.id)
      toast({
        title: 'Style deleted',
        description: `"${templateToDelete.name}" has been deleted.`,
      })
      setTemplateToDelete(null)
    }
    setDeleteDialogOpen(false)
  }

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(savedTemplates.map((t) => t.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (templateId: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(templateId)
      } else {
        next.delete(templateId)
      }
      return next
    })
  }

  const handleClearSelection = () => {
    setSelectedIds(new Set())
  }

  const handleBulkDeleteClick = () => {
    setIsBulkDelete(true)
    setTemplateToDelete(null)
    setDeleteDialogOpen(true)
  }

  const handleCreateNew = () => {
    const template = createNewTemplate('New Invoice Style')
    setCurrentTemplate(template)
    router.push('/style-editor')
  }

  // Get selected template names for delete dialog
  const selectedTemplateNames = useMemo(() => {
    return savedTemplates
      .filter((t) => selectedIds.has(t.id))
      .map((t) => t.name)
  }, [savedTemplates, selectedIds])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Go back</span>
            </Button>
            <div>
              <h1 className="text-xl font-bold">Invoice Styles</h1>
              <p className="text-sm text-muted-foreground">
                Manage your custom invoice templates
              </p>
            </div>
          </div>
          <Button onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            New Style
          </Button>
        </div>
      </header>

      {/* Bulk Action Bar - shown when items are selected */}
      {hasSelection && (
        <div className="sticky top-16 z-30 border-b bg-primary/10 backdrop-blur">
          <div className="container mx-auto flex h-12 items-center justify-between gap-4 px-4 md:px-6">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={isAllSelected}
                ref={(el) => {
                  if (el) {
                    // Handle indeterminate state
                    const input = el.querySelector('button')
                    if (input) {
                      (input as HTMLButtonElement).dataset.state = isSomeSelected
                        ? 'indeterminate'
                        : isAllSelected
                          ? 'checked'
                          : 'unchecked'
                    }
                  }
                }}
                onCheckedChange={handleSelectAll}
                aria-label="Select all styles"
              />
              <span className="text-sm font-medium">
                {selectedIds.size} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="h-7 px-2"
              >
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDeleteClick}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete ({selectedIds.size})
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:px-6">
        {savedTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Palette className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">No custom styles yet</h2>
            <p className="mb-6 max-w-md text-muted-foreground">
              Create your first custom invoice style to personalize your PDF exports.
              You can design unique layouts, colors, and typography.
            </p>
            <Button onClick={handleCreateNew} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Create Your First Style
            </Button>
          </div>
        ) : (
          <>
            {/* Selection Toolbar */}
            {!hasSelection && savedTemplates.length > 1 && (
              <div className="mb-4 flex items-center gap-3">
                <Checkbox
                  checked={false}
                  onCheckedChange={() => handleSelectAll(true)}
                  aria-label="Select all styles"
                />
                <span className="text-sm text-muted-foreground">
                  Select all ({savedTemplates.length} styles)
                </span>
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {savedTemplates.map((template) => (
                <StyleCard
                  key={template.id}
                  template={template}
                  isDefault={defaultTemplateId === template.id}
                  isSelected={selectedIds.has(template.id)}
                  showCheckbox={savedTemplates.length > 1}
                  onEdit={() => handleEdit(template)}
                  onDuplicate={() => handleDuplicate(template)}
                  onSetDefault={() => handleSetDefault(template)}
                  onDelete={() => handleDeleteClick(template)}
                  onSelect={(selected) => handleSelectOne(template.id, selected)}
                />
              ))}

              {/* Add New Card */}
              <button
                onClick={handleCreateNew}
                className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed bg-muted/30 p-6 text-muted-foreground transition-colors hover:border-primary hover:bg-muted/50 hover:text-foreground"
              >
                <Plus className="h-10 w-10" />
                <span className="font-medium">Create New Style</span>
              </button>
            </div>
          </>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <DeleteStyleDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) {
            setIsBulkDelete(false)
            setTemplateToDelete(null)
          }
        }}
        templateName={templateToDelete?.name}
        templateNames={isBulkDelete ? selectedTemplateNames : undefined}
        count={isBulkDelete ? selectedIds.size : undefined}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
