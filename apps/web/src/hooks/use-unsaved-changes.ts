'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { createFingerprint, createSnapshot } from '@/lib/fingerprint'

interface UseUnsavedChangesOptions<T> {
  /** Current state to track */
  currentState: T
  /** Initial/saved state to compare against */
  initialState: T
  /** Whether to enable browser beforeunload warning */
  enableBeforeUnload?: boolean
  /** Callback when user attempts to navigate away with unsaved changes */
  onNavigationAttempt?: () => void
}

interface UseUnsavedChangesReturn {
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean
  /** Mark current state as saved (update the baseline) */
  markAsSaved: () => void
  /** Reset tracking with new initial state */
  resetTracking: (newInitialState: unknown) => void
  /** The fingerprint of the saved state */
  savedFingerprint: string
}

/**
 * Hook to track unsaved changes and warn users before losing data.
 *
 * Features:
 * - Compares current state against saved state using fingerprints
 * - Attaches beforeunload handler for browser refresh/close warnings
 * - Provides markAsSaved() to update baseline after saves
 *
 * @example
 * ```tsx
 * const { hasUnsavedChanges, markAsSaved } = useUnsavedChanges({
 *   currentState: formData,
 *   initialState: originalData,
 *   enableBeforeUnload: true,
 * })
 *
 * const handleSave = async () => {
 *   await saveData(formData)
 *   markAsSaved()
 * }
 * ```
 */
export function useUnsavedChanges<T>({
  currentState,
  initialState,
  enableBeforeUnload = true,
  onNavigationAttempt,
}: UseUnsavedChangesOptions<T>): UseUnsavedChangesReturn {
  // Store the fingerprint of the last saved state
  const [savedFingerprint, setSavedFingerprint] = useState(() =>
    createFingerprint(initialState)
  )

  // Keep a ref for the callback to avoid stale closures
  const onNavigationAttemptRef = useRef(onNavigationAttempt)
  useEffect(() => {
    onNavigationAttemptRef.current = onNavigationAttempt
  }, [onNavigationAttempt])

  // Calculate current fingerprint
  const currentFingerprint = createFingerprint(currentState)
  const hasUnsavedChanges = currentFingerprint !== savedFingerprint

  // Mark current state as saved
  const markAsSaved = useCallback(() => {
    setSavedFingerprint(createFingerprint(currentState))
  }, [currentState])

  // Reset tracking with new initial state
  const resetTracking = useCallback((newInitialState: unknown) => {
    setSavedFingerprint(createFingerprint(newInitialState))
  }, [])

  // Handle beforeunload event for browser refresh/close
  useEffect(() => {
    if (!enableBeforeUnload || !hasUnsavedChanges) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      // Modern browsers ignore custom messages, but we set one for legacy support
      event.returnValue =
        'You have unsaved changes. Are you sure you want to leave?'
      return event.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [enableBeforeUnload, hasUnsavedChanges])

  return {
    hasUnsavedChanges,
    markAsSaved,
    resetTracking,
    savedFingerprint,
  }
}

/**
 * Simplified hook for form data tracking.
 * Automatically creates initial snapshot on mount.
 *
 * @example
 * ```tsx
 * const { hasUnsavedChanges, markAsSaved, showDialog, setShowDialog } = useFormUnsavedChanges(formData)
 * ```
 */
export function useFormUnsavedChanges<T>(currentState: T) {
  const [initialSnapshot] = useState(() => createSnapshot(currentState))
  const [showDialog, setShowDialog] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null
  )

  const { hasUnsavedChanges, markAsSaved, resetTracking, savedFingerprint } =
    useUnsavedChanges({
      currentState,
      initialState: initialSnapshot,
      enableBeforeUnload: true,
    })

  // Handle navigation attempt - show dialog if unsaved changes
  const handleNavigationAttempt = useCallback(
    (destination: string) => {
      if (hasUnsavedChanges) {
        setPendingNavigation(destination)
        setShowDialog(true)
        return true // Blocked
      }
      return false // Allow
    },
    [hasUnsavedChanges]
  )

  // Called when user confirms discard
  const confirmDiscard = useCallback(() => {
    setShowDialog(false)
    const nav = pendingNavigation
    setPendingNavigation(null)
    return nav
  }, [pendingNavigation])

  // Called when user cancels
  const cancelNavigation = useCallback(() => {
    setShowDialog(false)
    setPendingNavigation(null)
  }, [])

  return {
    hasUnsavedChanges,
    markAsSaved,
    resetTracking,
    savedFingerprint,
    showDialog,
    setShowDialog,
    pendingNavigation,
    handleNavigationAttempt,
    confirmDiscard,
    cancelNavigation,
  }
}
