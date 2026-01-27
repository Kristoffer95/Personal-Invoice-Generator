'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StylePreviewCard } from './StylePreviewCard'
import type { InvoiceTemplate } from '@invoice-generator/shared-types'

interface StyleFolderContentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folderName: string
  templates: InvoiceTemplate[]
  onSelectTemplate: (template: InvoiceTemplate) => void
}

export function StyleFolderContentsDialog({
  open,
  onOpenChange,
  folderName,
  templates,
  onSelectTemplate,
}: StyleFolderContentsDialogProps) {
  const handleSelectTemplate = (template: InvoiceTemplate) => {
    onSelectTemplate(template)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{folderName}</DialogTitle>
          <DialogDescription>
            Select a template from this folder to export your invoice.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="grid grid-cols-3 gap-3 pr-4">
            {templates.map((template) => (
              <StylePreviewCard
                key={template.id}
                template={template}
                isDefault={false}
                onSelect={() => handleSelectTemplate(template)}
                onSetDefault={() => {}}
                showDefaultButton={false}
              />
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
