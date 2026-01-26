/**
 * Layout Container Visibility Handler
 *
 * Containers have complex visibility rules:
 * - Fixed height containers: always render (may be intentionally empty)
 * - Auto height containers: collapse if all children are hidden
 * - showWhenEmpty overrides the collapse behavior
 *
 * The handler recursively checks child visibility to determine if a container
 * should render. This prevents gaps when all child elements resolve to empty.
 */

import type { TemplateElement } from '../../template'
import type { VisibilityContext, VisibilityResult } from '../types'

// Forward declaration - will be imported from registry
// This avoids circular dependency issues
type ShouldRenderFn = (element: TemplateElement, context: VisibilityContext) => boolean

let _shouldRenderFn: ShouldRenderFn | null = null

/**
 * Set the shouldRender function for recursive child checks
 * Called by registry after initialization to break circular dependency
 */
export function setContainerShouldRenderFn(fn: ShouldRenderFn): void {
  _shouldRenderFn = fn
}

/**
 * Get direct children of a container
 */
function getContainerChildren(
  containerId: string,
  elements: TemplateElement[]
): TemplateElement[] {
  return elements.filter(
    (el) =>
      el.parentId === containerId &&
      el.positionMode === 'relative' &&
      el.visible !== false
  )
}

/**
 * Check if container has any visible children
 * Uses the registry's shouldRender for recursive visibility checks
 */
function hasVisibleChildren(
  container: TemplateElement,
  context: VisibilityContext
): boolean {
  const children = getContainerChildren(container.id, context.elements)

  if (children.length === 0) {
    return false
  }

  // If shouldRender function not set, assume all children visible
  if (!_shouldRenderFn) {
    return true
  }

  // Check if any child is visible
  return children.some((child) => _shouldRenderFn!(child, context))
}

/**
 * Layout container visibility handler
 */
export function containerVisibilityHandler(
  element: TemplateElement,
  context: VisibilityContext
): VisibilityResult {
  // Respect explicit visibility flag
  if (element.visible === false) {
    return { shouldRender: false, reason: 'Element is explicitly hidden' }
  }

  // In preview mode, always show containers for design purposes
  if (context.type === 'preview') {
    return { shouldRender: true }
  }

  // If showWhenEmpty is true, always render (user override)
  if (element.showWhenEmpty) {
    return { shouldRender: true }
  }

  // Fixed height containers always render (may be intentionally empty)
  const isAutoHeight = element.heightMode === 'auto'
  if (!isAutoHeight) {
    return { shouldRender: true }
  }

  // Auto height containers: check if any children will render
  const hasChildren = hasVisibleChildren(element, context)

  if (!hasChildren) {
    return {
      shouldRender: false,
      reason: 'Auto-height container with no visible children',
    }
  }

  return { shouldRender: true }
}
