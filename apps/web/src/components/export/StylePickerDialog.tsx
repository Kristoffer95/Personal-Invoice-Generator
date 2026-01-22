'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Palette, Sun, Moon } from 'lucide-react'
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
import { StylePreviewCard } from './StylePreviewCard'
import { useTemplateStore } from '@/lib/template-store'
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
  const {
    savedTemplates,
    defaultTemplateId,
    setDefaultTemplate,
    clearDefaultTemplate,
  } = useTemplateStore()

  const handleSetDefault = (templateId: string) => {
    if (defaultTemplateId === templateId) {
      clearDefaultTemplate()
    } else {
      setDefaultTemplate(templateId)
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
            {/* Built-in Styles */}
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
            {savedTemplates.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                    Custom Styles ({savedTemplates.length})
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {savedTemplates.map((template) => (
                      <StylePreviewCard
                        key={template.id}
                        template={template}
                        isDefault={defaultTemplateId === template.id}
                        onSelect={() => handleSelectTemplate(template)}
                        onSetDefault={() => handleSetDefault(template.id)}
                      />
                    ))}
                  </div>
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
