/**
 * Utility functions for creating stable fingerprints of objects.
 * Used for detecting unsaved changes by comparing state snapshots.
 */

/**
 * Creates a stable fingerprint string from an object.
 * Handles nested objects, arrays, and sorts keys for consistent comparison.
 *
 * @param obj - The object to fingerprint
 * @returns A stable string representation for comparison
 */
export function createFingerprint(obj: unknown): string {
  return JSON.stringify(obj, (_, value) => {
    // Handle objects: sort keys for consistent ordering
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const sorted: Record<string, unknown> = {}
      Object.keys(value)
        .sort()
        .forEach((key) => {
          sorted[key] = value[key]
        })
      return sorted
    }
    return value
  })
}

/**
 * Compares two objects for deep equality using fingerprints.
 *
 * @param a - First object
 * @param b - Second object
 * @returns true if the objects are deeply equal
 */
export function areEqual(a: unknown, b: unknown): boolean {
  return createFingerprint(a) === createFingerprint(b)
}

/**
 * Creates a shallow copy suitable for fingerprinting.
 * Useful for creating a snapshot of state at a specific point.
 *
 * @param obj - The object to clone
 * @returns A deep clone of the object
 */
export function createSnapshot<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}
