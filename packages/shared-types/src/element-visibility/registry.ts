/**
 * Visibility Handler Registry
 *
 * This registry maps element types to their visibility handlers.
 * It provides a single entry point for both layout engine and PDF renderer
 * to make consistent visibility decisions.
 *
 * ## When Custom Handlers Are Needed
 *
 * Add a custom handler when an element type:
 * - Has content that can be empty (text with tokens, tables with no rows)
 * - Has visibility dependent on invoice data (showDetailedHours, lineItems)
 * - Has visibility dependent on external resources (logo URL)
 * - Contains children that may be hidden (layout containers)
 *
 * ## When Custom Handlers Are NOT Needed
 *
 * Use the default handler (automatic) when an element type:
 * - Always renders when visible=true (decorative elements)
 * - Has no invoice-data dependencies (divider, rectangle)
 * - Has no empty content state
 *
 * ## Adding a New Element Type
 *
 * 1. Add the type to templateElementTypeSchema in template.ts
 * 2. If custom handler needed:
 *    a. Create handler file in handlers/ directory
 *    b. Export from handlers/index.ts
 *    c. Register in VISIBILITY_HANDLERS below
 * 3. If no custom handler needed:
 *    a. Default handler applies automatically - done!
 */

import type { TemplateElement } from '../template'
import type {
  VisibilityContext,
  VisibilityResult,
  VisibilityHandler,
  VisibilityHandlerRegistry,
} from './types'
import {
  defaultVisibilityHandler,
  textVisibilityHandler,
  workHoursTableVisibilityHandler,
  lineItemsTableVisibilityHandler,
  summaryTableVisibilityHandler,
  logoVisibilityHandler,
  containerVisibilityHandler,
  setContainerShouldRenderFn,
} from './handlers'

/**
 * Static registry of visibility handlers by element type
 *
 * Element types not listed here will use defaultVisibilityHandler.
 */
const VISIBILITY_HANDLERS: VisibilityHandlerRegistry = {
  text: textVisibilityHandler,
  table_work_hours: workHoursTableVisibilityHandler,
  table_line_items: lineItemsTableVisibilityHandler,
  table_summary: summaryTableVisibilityHandler,
  logo: logoVisibilityHandler,
  layout_container: containerVisibilityHandler,
  // divider and rectangle use default handler (always render)
}

/**
 * Dynamic handler registry for runtime registration
 */
const dynamicHandlers: VisibilityHandlerRegistry = {}

/**
 * Register a custom visibility handler for an element type
 *
 * Use this for runtime registration of handlers for custom element types.
 * Handlers registered this way override static handlers.
 *
 * @param elementType - The element type to register a handler for
 * @param handler - The visibility handler function
 */
export function registerVisibilityHandler(
  elementType: TemplateElement['type'],
  handler: VisibilityHandler
): void {
  dynamicHandlers[elementType] = handler
}

/**
 * Get the visibility handler for an element type
 *
 * Priority:
 * 1. Dynamic handlers (runtime registered)
 * 2. Static handlers (VISIBILITY_HANDLERS)
 * 3. Default handler (always renders)
 */
function getHandler(elementType: TemplateElement['type']): VisibilityHandler {
  return (
    dynamicHandlers[elementType] ??
    VISIBILITY_HANDLERS[elementType] ??
    defaultVisibilityHandler
  )
}

/**
 * Check if an element should render
 *
 * This is the main entry point for visibility checks.
 * Both layout engine and PDF renderer should use this function.
 *
 * @param element - The template element to check
 * @param context - Render context (RenderContext or PreviewRenderContext)
 * @returns VisibilityResult with shouldRender boolean and optional reason
 */
export function checkElementVisibility(
  element: TemplateElement,
  context: VisibilityContext
): VisibilityResult {
  const handler = getHandler(element.type)
  return handler(element, context)
}

/**
 * Convenience function to check if element should render
 *
 * @param element - The template element to check
 * @param context - Render context
 * @returns true if element should render, false otherwise
 */
export function shouldRenderElement(
  element: TemplateElement,
  context: VisibilityContext
): boolean {
  return checkElementVisibility(element, context).shouldRender
}

// Initialize container handler with recursive check function
// This breaks the circular dependency between container handler and registry
setContainerShouldRenderFn(shouldRenderElement)
