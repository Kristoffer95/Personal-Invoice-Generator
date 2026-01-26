/**
 * Logo Element Visibility Handler
 *
 * Logo elements render when they have a source URL:
 * - First checks element.logoUrl (element-specific URL)
 * - Falls back to invoiceLogoUrl (from invoice.from.logo)
 *
 * If neither source exists, the logo element is hidden.
 */

import type { TemplateElement } from '../../template'
import type { VisibilityContext, VisibilityResult, RenderContext } from '../types'

/**
 * Logo element visibility handler
 */
export function logoVisibilityHandler(
  element: TemplateElement,
  context: VisibilityContext
): VisibilityResult {
  // Respect explicit visibility flag
  if (element.visible === false) {
    return { shouldRender: false, reason: 'Element is explicitly hidden' }
  }

  // In preview mode, always show logo placeholder
  if (context.type === 'preview') {
    return { shouldRender: true }
  }

  // In render mode, check for logo URL
  const renderContext = context as RenderContext
  const logoUrl = element.logoUrl || renderContext.invoiceLogoUrl

  if (!logoUrl) {
    return {
      shouldRender: false,
      reason: 'No logo URL configured',
    }
  }

  return { shouldRender: true }
}
