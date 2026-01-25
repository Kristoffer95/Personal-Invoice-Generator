'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'
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

interface DeleteStyleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templateName?: string
  templateNames?: string[]
  count?: number
  onConfirm: () => void
  isDeleting?: boolean
}

export function DeleteStyleDialog({
  open,
  onOpenChange,
  templateName,
  templateNames,
  count,
  onConfirm,
  isDeleting = false,
}: DeleteStyleDialogProps) {
  // Determine if this is a bulk delete
  const isBulkDelete = (count && count > 1) || (templateNames && templateNames.length > 1)
  const deleteCount = count || templateNames?.length || 1

  // Build the description text (simple text only - no block elements)
  const getDescriptionText = () => {
    if (isBulkDelete) {
      if (templateNames && templateNames.length <= 3) {
        const nameList = templateNames.map((n) => `"${n}"`).join(', ')
        return `Are you sure you want to delete ${nameList}? This action cannot be undone.`
      }
      return `Are you sure you want to delete ${deleteCount} styles? This action cannot be undone.`
    }
    return `Are you sure you want to delete "${templateName}"? This action cannot be undone.`
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center">
            {isBulkDelete ? `Delete ${deleteCount} Styles?` : 'Delete Style?'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {getDescriptionText()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : isBulkDelete ? (
              `Delete ${deleteCount} Styles`
            ) : (
              'Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
