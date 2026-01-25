'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Palette, Sun, Moon, Lock, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { StylePreviewCard } from './StylePreviewCard'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useTemplates, useDefaultTemplate, useTemplateMutations } from '@/hooks/use-templates'
import { SYSTEM_TEMPLATES } from '@/lib/system-templates'
import { convexToInvoiceTemplate } from '@/lib/template-utils'
import type { InvoiceTemplate } from '@invoice-generator/shared-types'

// Built-in style options (not actual templates, just theme indicators)
type BuiltInStyle = 'light' | 'dark'

interface StylePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectTemplate: (template: InvoiceTemplate) => void
  onSelectBuiltIn: (style: BuiltInStyle) => void
}

export function StylePickerDialog({
  open,
  onOpenChange,
  onSelectTemplate,
  onSelectBuiltIn,
}: StylePickerDialogProps) {
  const { isAuthenticated, isLoading: isAuthLoading } = useCurrentUser()

  // Convex hooks
  const { templates: convexTemplates, isLoading: isTemplatesLoading } = useTemplates()
  const { template: defaultTemplate } = useDefaultTemplate()
  const { setDefaultTemplate, clearDefaultTemplate } = useTemplateMutations()

  // System templates (static, from code)
  const systemTemplates = SYSTEM_TEMPLATES

  // User templates from Convex
  const userTemplates = useMemo(() => {
    return convexTemplates.map(convexToInvoiceTemplate)
  }, [convexTemplates])

  // Default template ID
  const defaultTemplateId = defaultTemplate?._id ?? null

  const handleSetDefault = async (templateId: string) => {
    if (!isAuthenticated) return

    // Only Convex templates can be set as default (not system templates)
    const isSystemTemplate = systemTemplates.some(t => t.id === templateId)
    if (isSystemTemplate) return

    try {
      if (defaultTemplateId === templateId) {
        await clearDefaultTemplate({})
      } else {
        await setDefaultTemplate({ templateId: templateId as any })
      }
    } catch (error) {
      console.error('Failed to set default template:', error)
    }
  }

  const handleSelectTemplate = (template: InvoiceTemplate) => {
    onSelectTemplate(template)
    onOpenChange(false)
  }

  const handleSelectBuiltIn = (style: BuiltInStyle) => {
    onSelectBuiltIn(style)
    onOpenChange(false)
  }

  const isLoading = isAuthLoading || (isAuthenticated && isTemplatesLoading)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose Export Style</DialogTitle>
          <DialogDescription>
            Select a style for your PDF export. Set a default to use it for quick exports.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            {/* Default Styles (System Templates) */}
            {systemTemplates.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Default Styles
                  </h3>
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Lock className="h-2.5 w-2.5" />
                    System
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {systemTemplates.map((template) => (
                    <StylePreviewCard
                      key={template.id}
                      template={template}
                      isDefault={false}
                      onSelect={() => handleSelectTemplate(template)}
                      onSetDefault={() => {}}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Classic Built-in Styles */}
            <Separator />
            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                Classic Styles
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {/* Light Theme */}
                <button
                  type="button"
                  className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-all hover:border-primary hover:shadow-md"
                  onClick={() => handleSelectBuiltIn('light')}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                    <Sun className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Classic Light</div>
                    <div className="text-xs text-muted-foreground">
                      Clean, professional light theme
                    </div>
                  </div>
                </button>

                {/* Dark Theme */}
                <button
                  type="button"
                  className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-all hover:border-primary hover:shadow-md"
                  onClick={() => handleSelectBuiltIn('dark')}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800">
                    <Moon className="h-5 w-5 text-gray-200" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Classic Dark</div>
                    <div className="text-xs text-muted-foreground">
                      Elegant dark theme
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Custom Templates */}
            {isAuthenticated && (
              <>
                <Separator />
                <div>
                  <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                    Custom Styles {userTemplates.length > 0 && `(${userTemplates.length})`}
                  </h3>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : userTemplates.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3">
                      {userTemplates.map((template) => (
                        <StylePreviewCard
                          key={template.id}
                          template={template}
                          isDefault={defaultTemplateId === template.id}
                          onSelect={() => handleSelectTemplate(template)}
                          onSetDefault={() => handleSetDefault(template.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No custom styles yet. Create one in the Style Manager.
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Manage Styles & Create New CTA */}
            <Separator />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center justify-between rounded-lg border border-dashed bg-muted/30 p-4 sm:flex-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Palette className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">Custom Styles</div>
                    <div className="text-xs text-muted-foreground">
                      Create and manage templates
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/styles">Manage</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/style-editor">New</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
