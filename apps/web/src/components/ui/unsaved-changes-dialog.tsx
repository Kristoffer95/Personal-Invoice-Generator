'use client'

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
import { Button } from '@/components/ui/button'

interface UnsavedChangesDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Callback when user clicks Save */
  onSave?: () => void | Promise<void>
  /** Callback when user clicks Discard */
  onDiscard: () => void
  /** Callback when user clicks Cancel (stay on page) */
  onCancel: () => void
  /** Whether save action is in progress */
  isSaving?: boolean
  /** Custom title */
  title?: string
  /** Custom description */
  description?: string
}

/**
 * Dialog for confirming unsaved changes when navigating away.
 *
 * Provides three actions:
 * - Save: Save changes then proceed
 * - Discard: Proceed without saving
 * - Cancel: Stay on current page
 *
 * @example
 * ```tsx
 * <UnsavedChangesDialog
 *   open={showDialog}
 *   onOpenChange={setShowDialog}
 *   onSave={handleSave}
 *   onDiscard={handleDiscard}
 *   onCancel={handleCancel}
 * />
 * ```
 */
export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onSave,
  onDiscard,
  onCancel,
  isSaving = false,
  title = 'Unsaved Changes',
  description = 'You have unsaved changes. What would you like to do?',
}: UnsavedChangesDialogProps) {
  const handleSave = async () => {
    if (onSave) {
      await onSave()
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
          <AlertDialogCancel onClick={onCancel} disabled={isSaving}>
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={onDiscard}
            disabled={isSaving}
          >
            Discard Changes
          </Button>
          {onSave && (
            <AlertDialogAction onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
