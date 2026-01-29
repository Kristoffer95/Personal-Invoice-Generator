'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Save,
  Download,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Ruler,
  Magnet,
  MoreVertical,
  FileText,
  Star,
  Loader2,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { InvoicePreview } from '@/components/invoice/InvoicePreview'
import { useTemplateStore } from '@/lib/template-store'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useTemplateMutations, useDefaultTemplate } from '@/hooks/use-templates'
import { useSystemTemplateMutations } from '@/hooks/use-system-templates'
import { useUserRole } from '@/hooks/use-user-role'
import { useEditorSettingsMutations } from '@/hooks/use-editor-settings'
import { useToast } from '@/hooks/use-toast'
import { isSystemTemplate } from '@/lib/system-templates'
import type { Invoice } from '@invoice-generator/shared-types'
import { validateTemplateImport } from '@invoice-generator/shared-types'
import { ColorPicker } from './ColorPicker'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Paintbrush } from 'lucide-react'

export function StyleEditorHeader() {
  const {
    currentTemplate,
    convexTemplateId,
    convexSystemTemplateId,
    updateCurrentTemplate,
    setConvexTemplateId,
    editorSettings,
    undo,
    redo,
    canUndo,
    canRedo,
    hasUnsavedChanges,
    markAsSaved,
  } = useTemplateStore()

  const router = useRouter()
  const { toast } = useToast()
  const { isAuthenticated } = useCurrentUser()
  const { isAdmin } = useUserRole()

  // Convex hooks
  const { createTemplate, updateTemplate, setDefaultTemplate, clearDefaultTemplate } = useTemplateMutations()
  const { template: defaultTemplate } = useDefaultTemplate()
  const { updateSystemTemplate } = useSystemTemplateMutations()

  // Editor settings mutations with Convex sync
  const {
    toggleRulers,
    toggleGrid,
    toggleSnapToGrid,
    zoomIn,
    zoomOut,
    setZoomLevel,
  } = useEditorSettingsMutations()

  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [tempName, setTempName] = useState(currentTemplate?.name ?? '')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Unsaved changes warning state
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)

  // Preview dialog state
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)

  // Sample invoice data for preview and PDF export
  const sampleInvoice: Invoice = useMemo(() => ({
    id: 'preview',
    invoiceNumber: 'INV-2024-001',
    status: 'DRAFT',
    statusHistory: [],
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    from: {
      name: 'Your Company',
      companyName: 'Your Company Inc.',
      address: '123 Business St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94102',
      country: 'United States',
      email: 'billing@company.com',
      phone: '+1 (555) 123-4567',
    },
    to: {
      name: 'Client Name',
      companyName: 'Client Company',
      address: '456 Client Ave',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'United States',
      email: 'accounts@client.com',
      phone: '+1 (555) 987-6543',
    },
    hourlyRate: 75,
    defaultHoursPerDay: 8,
    dailyWorkHours: [],
    totalDays: 20,
    totalHours: 160,
    subtotal: 12000,
    lineItems: [],
    discountPercent: 10,
    discountAmount: 1200,
    taxPercent: 8,
    taxAmount: 864,
    totalAmount: 11664,
    currency: 'USD',
    paymentTerms: 'NET_30',
    showDetailedHours: false,
    pdfTheme: 'light',
    pageSize: currentTemplate?.pageSize || 'A4',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [],
    isArchived: false,
  }), [currentTemplate?.pageSize])

  // Browser beforeunload warning for page refresh/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault()
        // Modern browsers require returnValue to be set
        e.returnValue = ''
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Handle back navigation with unsaved changes check
  const handleBack = useCallback(() => {
    if (hasUnsavedChanges()) {
      setPendingNavigation(() => () => router.back())
      setShowUnsavedDialog(true)
    } else {
      router.back()
    }
  }, [hasUnsavedChanges, router])

  // Handle dialog actions
  const handleDiscardChanges = useCallback(() => {
    setShowUnsavedDialog(false)
    pendingNavigation?.()
    setPendingNavigation(null)
  }, [pendingNavigation])

  const handleCancelNavigation = useCallback(() => {
    setShowUnsavedDialog(false)
    setPendingNavigation(null)
  }, [])

  // Check if current template is a Convex template (saved to DB)
  const isConvexTemplate = !!convexTemplateId

  // Check if current template is the default
  const isCurrentTemplateDefault = convexTemplateId
    ? defaultTemplate?._id === convexTemplateId
    : false

  const handleToggleDefault = async () => {
    if (!currentTemplate || !isConvexTemplate || !isAuthenticated) return

    try {
      if (isCurrentTemplateDefault) {
        await clearDefaultTemplate({})
        toast({
          title: 'Default cleared',
          description: 'No default style is set.',
        })
      } else {
        await setDefaultTemplate({ templateId: convexTemplateId })
        toast({
          title: 'Default set',
          description: `"${currentTemplate.name}" is now the default export style.`,
        })
      }
    } catch (error) {
      console.error('Failed to toggle default:', error)
      toast({
        title: 'Failed to update default',
        description: 'An error occurred while updating the default style.',
        variant: 'destructive',
      })
    }
  }

  const handleSave = async () => {
    if (!currentTemplate) return

    if (!isAuthenticated) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to save your template.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      // Prepare elements for Convex
      const elements = currentTemplate.elements.map((el) => ({
        id: el.id,
        type: el.type,
        name: el.name,
        position: el.position,
        content: el.content,
        fontStyle: el.fontStyle,
        border: el.border,
        backgroundColor: el.backgroundColor,
        padding: el.padding,
        opacity: el.opacity,
        zIndex: el.zIndex,
        locked: el.locked,
        visible: el.visible,
        tableStyle: el.tableStyle,
        logoUrl: el.logoUrl,
        objectFit: el.objectFit,
        // Relative positioning fields
        positionMode: el.positionMode,
        parentId: el.parentId,
        order: el.order,
        spacing: el.spacing,
        flexGrow: el.flexGrow,
        flexShrink: el.flexShrink,
        flexBasis: el.flexBasis,
        alignSelf: el.alignSelf,
        // Grid item properties
        gridColumn: el.gridColumn,
        gridRow: el.gridRow,
        // Layout container configuration
        layoutConfig: el.layoutConfig,
        // Layout container height mode
        heightMode: el.heightMode,
        heightPercent: el.heightPercent,
        // Width/height sizing modes for non-container elements
        widthMode: el.widthMode,
        widthPercent: el.widthPercent,
        heightSizingMode: el.heightSizingMode,
        heightSizingPercent: el.heightSizingPercent,
        // Min height properties
        minHeightMode: el.minHeightMode,
        minHeightValue: el.minHeightValue,
        minHeightPercent: el.minHeightPercent,
        // Text element visibility
        showWhenEmpty: el.showWhenEmpty,
      }))

      if (convexSystemTemplateId && isAdmin) {
        // Admin: Update existing system template in Convex
        await updateSystemTemplate({
          templateId: convexSystemTemplateId,
          name: currentTemplate.name,
          description: currentTemplate.description,
          pageSize: currentTemplate.pageSize,
          orientation: currentTemplate.orientation,
          margins: currentTemplate.margins,
          theme: currentTemplate.theme,
          backgroundColor: currentTemplate.backgroundColor,
          elements,
        })
        markAsSaved()
        toast({
          title: 'System template saved',
          description: `"${currentTemplate.name}" has been updated.`,
        })
      } else if (convexTemplateId) {
        // Update existing Convex user template
        await updateTemplate({
          templateId: convexTemplateId,
          name: currentTemplate.name,
          description: currentTemplate.description,
          pageSize: currentTemplate.pageSize,
          orientation: currentTemplate.orientation,
          margins: currentTemplate.margins,
          theme: currentTemplate.theme,
          backgroundColor: currentTemplate.backgroundColor,
          elements,
          isDefault: currentTemplate.isDefault,
        })
        markAsSaved()
        toast({
          title: 'Template saved',
          description: `"${currentTemplate.name}" has been updated.`,
        })
      } else {
        // Create new template in Convex
        // If this is a system template, create a new user copy
        const name = isSystemTemplate(currentTemplate.id)
          ? `${currentTemplate.name} (Custom)`
          : currentTemplate.name

        const newTemplateId = await createTemplate({
          name,
          description: currentTemplate.description,
          pageSize: currentTemplate.pageSize,
          orientation: currentTemplate.orientation,
          margins: currentTemplate.margins,
          theme: currentTemplate.theme,
          backgroundColor: currentTemplate.backgroundColor,
          elements,
          isDefault: false,
        })

        // Update local state with the new Convex ID
        setConvexTemplateId(newTemplateId)
        updateCurrentTemplate({ name })
        markAsSaved()

        toast({
          title: 'Template created',
          description: `"${name}" has been saved to your account.`,
        })
      }
    } catch (error) {
      console.error('Failed to save template:', error)
      toast({
        title: 'Failed to save',
        description: 'An error occurred while saving the template.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Save and then navigate (used in unsaved changes dialog)
  const handleSaveAndLeave = async () => {
    await handleSave()
    setShowUnsavedDialog(false)
    pendingNavigation?.()
    setPendingNavigation(null)
  }

  const handleNameChange = () => {
    if (tempName.trim()) {
      updateCurrentTemplate({ name: tempName.trim() })
    }
    setIsEditing(false)
  }

  const handleExportPDF = async () => {
    if (!currentTemplate) return

    const { downloadTemplatePDF } = await import('@invoice-generator/pdf-generator')

    await downloadTemplatePDF({
      template: currentTemplate,
      invoice: sampleInvoice,
    })
  }

  const handleExportJson = () => {
    if (!currentTemplate) return

    const exportData = {
      ...currentTemplate,
      // Reset timestamps for export
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Mark as non-system template
      isSystem: false,
      isDefault: false,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentTemplate.name.replace(/[^a-zA-Z0-9]/g, '-')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: 'Template exported',
      description: `"${currentTemplate.name}" has been exported to JSON.`,
    })
  }

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const json = JSON.parse(content)

        const importedTemplate = validateTemplateImport(json)
        if (!importedTemplate) {
          toast({
            title: 'Import failed',
            description: 'The file is not a valid template format.',
            variant: 'destructive',
          })
          return
        }

        // Generate new ID and update timestamps
        const newTemplate = {
          ...importedTemplate,
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name: `${importedTemplate.name} (Imported)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isSystem: false,
          isDefault: false,
        }

        // Load the imported template
        useTemplateStore.getState().setCurrentTemplate(newTemplate)

        toast({
          title: 'Template imported',
          description: `"${newTemplate.name}" has been loaded.`,
        })
      } catch (error) {
        console.error('Import error:', error)
        toast({
          title: 'Import failed',
          description: 'Could not parse the template file.',
          variant: 'destructive',
        })
      }
    }
    reader.readAsText(file)

    // Reset the input so the same file can be imported again
    event.target.value = ''
  }

  return (
    <TooltipProvider>
      <header className="flex h-14 items-center justify-between border-b bg-background px-4">
        {/* Left section */}
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Go Back</TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            {isEditing ? (
              <Input
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleNameChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameChange()
                  if (e.key === 'Escape') {
                    setTempName(currentTemplate?.name ?? '')
                    setIsEditing(false)
                  }
                }}
                className="h-8 w-[200px]"
                autoFocus
              />
            ) : (
              <button
                onClick={() => {
                  setTempName(currentTemplate?.name ?? '')
                  setIsEditing(true)
                }}
                className="text-sm font-medium hover:underline"
              >
                {currentTemplate?.name ?? 'Untitled Template'}
              </button>
            )}
          </div>
        </div>

        {/* Center section - Tools */}
        <div className="flex items-center gap-1">
          {/* Undo/Redo */}
          <div className="flex items-center gap-1 border-r pr-2 mr-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={undo}
                  disabled={!canUndo()}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo (Cmd+Z)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={redo}
                  disabled={!canRedo()}
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo (Cmd+Shift+Z)</TooltipContent>
            </Tooltip>
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-1 border-r pr-2 mr-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={editorSettings.showRulers ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={toggleRulers}
                >
                  <Ruler className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Rulers</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={editorSettings.showGrid ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={toggleGrid}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Grid</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={editorSettings.snapToGrid ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={toggleSnapToGrid}
                >
                  <Magnet className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Snap to Grid</TooltipContent>
            </Tooltip>

            {/* Page Background Color */}
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <div className="relative">
                        <Paintbrush className="h-4 w-4" />
                        <div
                          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-background"
                          style={{ backgroundColor: currentTemplate?.backgroundColor || '#ffffff' }}
                        />
                      </div>
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>Page Background</TooltipContent>
              </Tooltip>
              <PopoverContent className="w-auto p-3" align="center">
                <div className="space-y-2">
                  <Label className="text-xs">Page Background Color</Label>
                  <ColorPicker
                    color={currentTemplate?.backgroundColor || '#ffffff'}
                    onChange={(color) => updateCurrentTemplate({ backgroundColor: color })}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={zoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>

            <button
              onClick={() => setZoomLevel(100)}
              className="min-w-[60px] text-center text-sm text-muted-foreground hover:text-foreground"
            >
              {editorSettings.zoomLevel}%
            </button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={zoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isSaving ? 'Saving...' : 'Save'}
          </Button>

          {/* Default toggle - only show when template is saved to Convex */}
          {isConvexTemplate && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isCurrentTemplateDefault ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={handleToggleDefault}
                  className={isCurrentTemplateDefault ? 'text-yellow-500' : ''}
                >
                  <Star
                    className={`h-4 w-4 ${isCurrentTemplateDefault ? 'fill-current' : ''}`}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isCurrentTemplateDefault
                  ? 'Remove as default export style'
                  : 'Set as default export style'}
              </TooltipContent>
            </Tooltip>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreviewDialog(true)}
            disabled={!currentTemplate}
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>

          <Button size="sm" onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                Import Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJson}>
                Export Template JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Duplicate Template</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Delete Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Hidden file input for import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
      </header>

      {/* Unsaved changes warning dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={handleCancelNavigation}>
              Cancel
            </AlertDialogCancel>
            <Button variant="outline" onClick={handleDiscardChanges}>
              Discard
            </Button>
            <AlertDialogAction onClick={handleSaveAndLeave} disabled={isSaving || !isAuthenticated}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {currentTemplate && (
              <InvoicePreview
                invoice={sampleInvoice}
                template={currentTemplate}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
