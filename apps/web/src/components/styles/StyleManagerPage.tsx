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
    getAllTemplates,
    defaultTemplateId,
    setDefaultTemplate,
    clearDefaultTemplate,
    deleteTemplate,
    duplicateTemplate,
    createNewTemplate,
    setCurrentTemplate,
  } = useTemplateStore()

  // Get all templates (system + user)
  const allTemplates = getAllTemplates()
  const systemTemplates = useMemo(() => allTemplates.filter((t) => t.isSystem), [allTemplates])
  const userTemplates = useMemo(() => allTemplates.filter((t) => !t.isSystem), [allTemplates])

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<InvoiceTemplate | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDelete, setIsBulkDelete] = useState(false)

  // Memoized selection state (only user templates can be selected for bulk operations)
  const isAllSelected = useMemo(
    () => userTemplates.length > 0 && selectedIds.size === userTemplates.length,
    [userTemplates.length, selectedIds.size]
  )
  const isSomeSelected = useMemo(
    () => selectedIds.size > 0 && selectedIds.size < userTemplates.length,
    [userTemplates.length, selectedIds.size]
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

  // Selection handlers (only user templates can be selected)
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(userTemplates.map((t) => t.id)))
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
    return userTemplates
      .filter((t) => selectedIds.has(t.id))
      .map((t) => t.name)
  }, [userTemplates, selectedIds])

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
        {/* System Templates Section */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold">Default Styles</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Professional templates available to everyone. Duplicate to customize.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {systemTemplates.map((template) => (
              <StyleCard
                key={template.id}
                template={template}
                isDefault={defaultTemplateId === template.id}
                isSelected={false}
                showCheckbox={false}
                onEdit={() => handleEdit(template)}
                onDuplicate={() => handleDuplicate(template)}
                onSetDefault={() => handleSetDefault(template)}
                onDelete={() => {}}
                onSelect={() => {}}
              />
            ))}
          </div>
        </section>

        {/* Custom Templates Section */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">Custom Styles</h2>
          {userTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/30 py-12 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Palette className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mb-2 font-semibold">No custom styles yet</h3>
              <p className="mb-4 max-w-sm text-sm text-muted-foreground">
                Create your own style or duplicate a default template to customize.
              </p>
              <Button onClick={handleCreateNew}>
                <Plus className="mr-2 h-4 w-4" />
                Create Style
              </Button>
            </div>
          ) : (
            <>
              {/* Selection Toolbar */}
              {!hasSelection && userTemplates.length > 1 && (
                <div className="mb-4 flex items-center gap-3">
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => handleSelectAll(true)}
                    aria-label="Select all styles"
                  />
                  <span className="text-sm text-muted-foreground">
                    Select all ({userTemplates.length} styles)
                  </span>
                </div>
              )}

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {userTemplates.map((template) => (
                  <StyleCard
                    key={template.id}
                    template={template}
                    isDefault={defaultTemplateId === template.id}
                    isSelected={selectedIds.has(template.id)}
                    showCheckbox={userTemplates.length > 1}
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
        </section>
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
