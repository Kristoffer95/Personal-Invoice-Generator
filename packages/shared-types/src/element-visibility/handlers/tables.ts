/**
 * Table Element Visibility Handlers
 *
 * Tables have visibility rules based on their content:
 * - Work Hours Table: visible if showDetailedHours && workDaysCount > 0
 * - Line Items Table: visible if lineItemsCount > 0
 * - Summary Table: always visible (shows subtotal/discount/tax/total)
 *
 * In preview mode, all tables are visible for design purposes.
 */

import type { TemplateElement } from '../../template'
import type { VisibilityContext, VisibilityResult, RenderContext } from '../types'

/**
 * Check if context is render context (not preview)
 */
function isRenderContext(context: VisibilityContext): context is RenderContext {
  return context.type === 'render'
}

/**
 * Work Hours Table visibility handler
 *
 * Visible when:
 * - showDetailedHours is enabled in invoice settings
 * - There is at least one work day with hours > 0
 */
export function workHoursTableVisibilityHandler(
  element: TemplateElement,
  context: VisibilityContext
): VisibilityResult {
  // Respect explicit visibility flag
  if (element.visible === false) {
    return { shouldRender: false, reason: 'Element is explicitly hidden' }
  }

  // In preview mode, always show for design purposes
  if (context.type === 'preview') {
    return { shouldRender: true }
  }

  // In render mode, check invoice data
  if (isRenderContext(context)) {
    if (!context.invoice.showDetailedHours) {
      return {
        shouldRender: false,
        reason: 'showDetailedHours is disabled',
      }
    }

    if (context.invoice.workDaysCount === 0) {
      return {
        shouldRender: false,
        reason: 'No work days with hours',
      }
    }
  }

  return { shouldRender: true }
}

/**
 * Line Items Table visibility handler
 *
 * Visible when:
 * - There is at least one line item
 */
export function lineItemsTableVisibilityHandler(
  element: TemplateElement,
  context: VisibilityContext
): VisibilityResult {
  // Respect explicit visibility flag
  if (element.visible === false) {
    return { shouldRender: false, reason: 'Element is explicitly hidden' }
  }

  // In preview mode, always show for design purposes
  if (context.type === 'preview') {
    return { shouldRender: true }
  }

  // In render mode, check invoice data
  if (isRenderContext(context)) {
    if (context.invoice.lineItemsCount === 0) {
      return {
        shouldRender: false,
        reason: 'No line items',
      }
    }
  }

  return { shouldRender: true }
}

/**
 * Summary Table visibility handler
 *
 * Summary table always renders because it shows:
 * - Subtotal (always present)
 * - Discount (if applicable)
 * - Tax (if applicable)
 * - Total (always present)
 *
 * Even an "empty" invoice has a subtotal and total of 0.
 */
export function summaryTableVisibilityHandler(
  element: TemplateElement,
  _context: VisibilityContext
): VisibilityResult {
  // Respect explicit visibility flag
  if (element.visible === false) {
    return { shouldRender: false, reason: 'Element is explicitly hidden' }
  }

  // Summary table always renders
  return { shouldRender: true }
}
