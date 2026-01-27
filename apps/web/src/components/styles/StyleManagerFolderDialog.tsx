'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StyleCard } from './StyleCard'
import type { InvoiceTemplate } from '@invoice-generator/shared-types'

interface StyleManagerFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folderName: string
  templates: InvoiceTemplate[]
  onEdit: (template: InvoiceTemplate) => void
  onDuplicate: (template: InvoiceTemplate) => void
  onSetDefault: (template: InvoiceTemplate) => void
}

export function StyleManagerFolderDialog({
  open,
  onOpenChange,
  folderName,
  templates,
  onEdit,
  onDuplicate,
  onSetDefault,
}: StyleManagerFolderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{folderName}</DialogTitle>
          <DialogDescription>
            Duplicate a template to customize it or set it as your default export style.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="grid grid-cols-2 gap-4 pr-4 lg:grid-cols-3">
            {templates.map((template) => (
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
              />
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
