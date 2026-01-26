'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ArrowLeft, Palette, Trash2, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useTemplateStore } from '@/lib/template-store'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useTemplates, useTemplateMutations, useDefaultTemplate } from '@/hooks/use-templates'
import { useToast } from '@/hooks/use-toast'
import { StyleCard } from './StyleCard'
import { DeleteStyleDialog } from './DeleteStyleDialog'
import { SYSTEM_TEMPLATES } from '@/lib/system-templates'
import { convexToInvoiceTemplate } from '@/lib/template-utils'
import type { InvoiceTemplate } from '@invoice-generator/shared-types'

export default function StyleManagerPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { isAuthenticated, isLoading: isAuthLoading } = useCurrentUser()

  // Local store for creating new templates
  const { createNewTemplate, setCurrentTemplate } = useTemplateStore()

  // Convex hooks for templates
  const { templates: convexTemplates, isLoading: isTemplatesLoading } = useTemplates()
  const { template: defaultTemplate } = useDefaultTemplate()
  const {
    duplicateTemplate,
    duplicateFromSystemTemplate,
    deleteTemplate: convexDeleteTemplate,
    setDefaultTemplate: convexSetDefaultTemplate,
    clearDefaultTemplate: convexClearDefaultTemplate,
  } = useTemplateMutations()

  // Convert Convex templates to InvoiceTemplate format
  const userTemplates = useMemo(() => {
    return convexTemplates.map(convexToInvoiceTemplate)
  }, [convexTemplates])

  // System templates (static, from code)
  const systemTemplates = SYSTEM_TEMPLATES

  // Default template ID (from Convex or system template)
  const defaultTemplateId = defaultTemplate?._id ?? null

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<InvoiceTemplate | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDelete, setIsBulkDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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

  const handleDuplicate = async (template: InvoiceTemplate) => {
    if (!isAuthenticated) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to duplicate templates.',
        variant: 'destructive',
      })
      return
    }

    try {
      if (template.isSystem) {
        // Duplicate from system template
        // Note: We must ensure all optional fields have explicit values (not undefined)
        // because undefined values are stripped during JSON serialization to Convex,
        // causing data loss (e.g., content: undefined becomes missing, not empty string)
        await duplicateFromSystemTemplate({
          name: `${template.name} (Copy)`,
          description: template.description,
          pageSize: template.pageSize,
          orientation: template.orientation,
          margins: template.margins,
          theme: template.theme,
          backgroundColor: template.backgroundColor,
          elements: template.elements.map((el) => ({
            id: el.id,
            type: el.type,
            name: el.name ?? 'Untitled Element',
            position: el.position,
            content: el.content ?? '',
            // Ensure all fontStyle properties are explicitly set to prevent data loss
            // during JSON serialization (undefined values are stripped)
            fontStyle: el.fontStyle ? {
              fontFamily: el.fontStyle.fontFamily ?? 'Helvetica',
              fontSize: el.fontStyle.fontSize ?? 12,
              fontWeight: el.fontStyle.fontWeight ?? 'normal',
              fontStyle: el.fontStyle.fontStyle ?? 'normal',
              textAlign: el.fontStyle.textAlign ?? 'left',
              textDecoration: el.fontStyle.textDecoration ?? 'none',
              textTransform: el.fontStyle.textTransform ?? 'none',
              letterSpacing: el.fontStyle.letterSpacing ?? 0,
              lineHeight: el.fontStyle.lineHeight ?? 1.2,
              color: el.fontStyle.color ?? '#333333',
            } : undefined,
            // Ensure all border properties are explicitly set
            border: el.border ? {
              width: el.border.width ?? 0,
              color: el.border.color ?? '#000000',
              style: el.border.style ?? 'solid',
              radius: el.border.radius ?? 0,
            } : undefined,
            backgroundColor: el.backgroundColor,
            padding: el.padding ?? 0,
            opacity: el.opacity ?? 1,
            zIndex: el.zIndex ?? 0,
            locked: el.locked ?? false,
            visible: el.visible ?? true,
            // Ensure all tableStyle properties are explicitly set
            tableStyle: el.tableStyle ? {
              headerBackgroundColor: el.tableStyle.headerBackgroundColor ?? '#1a1a2e',
              headerTextColor: el.tableStyle.headerTextColor ?? '#ffffff',
              rowBackgroundColor: el.tableStyle.rowBackgroundColor ?? '#ffffff',
              alternateRowBackgroundColor: el.tableStyle.alternateRowBackgroundColor ?? '#f8fafc',
              borderColor: el.tableStyle.borderColor ?? '#e0e0e0',
              showHeaderBorder: el.tableStyle.showHeaderBorder ?? true,
              showRowBorders: el.tableStyle.showRowBorders ?? true,
              columns: el.tableStyle.columns,
            } : undefined,
            logoUrl: el.logoUrl,
            objectFit: el.objectFit,
          })),
        })
      } else {
        // Duplicate Convex template
        await duplicateTemplate({
          templateId: template.id as any,
        })
      }
      toast({
        title: 'Style duplicated',
        description: `A copy of "${template.name}" has been created.`,
      })
    } catch (error) {
      console.error('Failed to duplicate template:', error)
      toast({
        title: 'Failed to duplicate',
        description: 'An error occurred while duplicating the style.',
        variant: 'destructive',
      })
    }
  }

  const handleSetDefault = async (template: InvoiceTemplate) => {
    if (!isAuthenticated) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to set a default template.',
        variant: 'destructive',
      })
      return
    }

    // Only Convex templates can be set as default (not system templates)
    if (template.isSystem) {
      toast({
        title: 'Cannot set default',
        description: 'System templates cannot be set as default. Duplicate it first to create your own version.',
        variant: 'destructive',
      })
      return
    }

    try {
      if (defaultTemplateId === template.id) {
        await convexClearDefaultTemplate({})
        toast({
          title: 'Default cleared',
          description: 'No default style is set.',
        })
      } else {
        await convexSetDefaultTemplate({ templateId: template.id as any })
        toast({
          title: 'Default set',
          description: `"${template.name}" is now the default export style.`,
        })
      }
    } catch (error) {
      console.error('Failed to set default template:', error)
      toast({
        title: 'Failed to set default',
        description: 'An error occurred while setting the default style.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteClick = (template: InvoiceTemplate) => {
    setIsBulkDelete(false)
    setTemplateToDelete(template)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!isAuthenticated) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to delete templates.',
        variant: 'destructive',
      })
      return
    }

    setIsDeleting(true)
    try {
      if (isBulkDelete) {
        // Bulk delete
        const count = selectedIds.size
        for (const id of selectedIds) {
          await convexDeleteTemplate({ templateId: id as any })
        }
        toast({
          title: 'Styles deleted',
          description: `${count} style${count > 1 ? 's have' : ' has'} been deleted.`,
        })
        setSelectedIds(new Set())
        setIsBulkDelete(false)
      } else if (templateToDelete) {
        // Single delete
        await convexDeleteTemplate({ templateId: templateToDelete.id as any })
        toast({
          title: 'Style deleted',
          description: `"${templateToDelete.name}" has been deleted.`,
        })
        setTemplateToDelete(null)
      }
    } catch (error) {
      console.error('Failed to delete template:', error)
      toast({
        title: 'Failed to delete',
        description: 'An error occurred while deleting the style.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
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

  // Show loading state
  const isLoading = isAuthLoading || (isAuthenticated && isTemplatesLoading)

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
                isDefault={false}
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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !isAuthenticated ? (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/30 py-12 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Palette className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mb-2 font-semibold">Sign in to save custom styles</h3>
              <p className="mb-4 max-w-sm text-sm text-muted-foreground">
                Create and save your own invoice styles by signing in to your account.
              </p>
              <Button onClick={handleCreateNew}>
                <Plus className="mr-2 h-4 w-4" />
                Create Style
              </Button>
            </div>
          ) : userTemplates.length === 0 ? (
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
              {userTemplates.length > 1 && (
                <div className="sticky top-16 z-30 -mx-4 mb-4 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:-mx-6 md:px-6">
                  <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) {
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
                    {hasSelection ? (
                      <>
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
                      </>
                    ) : (
                      <span
                        className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground"
                        onClick={() => handleSelectAll(true)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleSelectAll(true)
                          }
                        }}
                      >
                        Select all ({userTemplates.length} styles)
                      </span>
                    )}
                  </div>

                  {hasSelection && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDeleteClick}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete ({selectedIds.size})
                    </Button>
                  )}
                  </div>
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
        isDeleting={isDeleting}
      />
    </div>
  )
}
