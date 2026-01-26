/**
 * Default Visibility Handler
 *
 * This handler is used for element types that don't have a custom handler.
 * It implements the simplest visibility logic:
 * - Elements with visible=false are hidden
 * - All other elements are rendered
 *
 * Element types that always render and don't need custom handlers:
 * - divider: Always renders (decorative element)
 * - rectangle: Always renders (decorative element)
 *
 * To add a new element type without custom visibility logic:
 * 1. Add the type to templateElementTypeSchema in template.ts
 * 2. The default handler will automatically apply
 * 3. No additional registration needed
 */

import type { TemplateElement } from '../../template'
import type { VisibilityContext, VisibilityResult } from '../types'

/**
 * Default visibility handler - always renders unless explicitly hidden
 */
export function defaultVisibilityHandler(
  element: TemplateElement,
  _context: VisibilityContext
): VisibilityResult {
  // Respect explicit visibility flag
  if (element.visible === false) {
    return { shouldRender: false, reason: 'Element is explicitly hidden' }
  }

  return { shouldRender: true }
}
