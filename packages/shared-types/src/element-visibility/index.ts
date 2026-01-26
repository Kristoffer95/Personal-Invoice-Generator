/**
 * Element Visibility System
 *
 * This module provides a unified system for determining element visibility
 * in PDF output. It ensures consistency between the layout engine (which
 * calculates positions) and the PDF renderer (which decides what to render).
 *
 * ## Problem Solved
 *
 * Previously, the layout engine calculated positions for ALL elements before
 * the PDF renderer decided to hide some elements. This caused gaps in the
 * output when elements were hidden (e.g., empty text elements, tables with
 * no data).
 *
 * ## Solution
 *
 * The visibility system provides:
 * - A shared `shouldRenderElement()` function used by both layout engine and PDF renderer
 * - Element-type-specific handlers (text, tables, logo, containers)
 * - A default handler for elements that always render (divider, rectangle)
 * - Support for both real rendering (PDF) and preview rendering (Style Editor)
 *
 * ## Usage
 *
 * In PDF renderer:
 * ```ts
 * import { buildRenderContext, shouldRenderElement } from '@invoice-generator/shared-types'
 *
 * const context = buildRenderContext(tokenValues, tableContent, invoiceData, elements)
 * const visibleElements = elements.filter(el => shouldRenderElement(el, context))
 * ```
 *
 * In Style Editor:
 * ```ts
 * import { buildPreviewContext, shouldRenderElement } from '@invoice-generator/shared-types'
 *
 * const context = buildPreviewContext(elements)
 * // In preview mode, all elements render
 * ```
 *
 * ## Extending
 *
 * To add a new element type:
 * 1. Add type to templateElementTypeSchema in template.ts
 * 2. If custom visibility needed, create handler in handlers/
 * 3. Register handler in registry.ts VISIBILITY_HANDLERS
 * 4. If no custom needed, default handler applies automatically
 */

// Types
export type {
  RenderContext,
  PreviewRenderContext,
  VisibilityContext,
  VisibilityResult,
  VisibilityHandler,
  VisibilityHandlerRegistry,
} from './types'

// Registry (main API)
export {
  checkElementVisibility,
  shouldRenderElement,
  registerVisibilityHandler,
} from './registry'

// Utils
export {
  buildRenderContext,
  buildPreviewContext,
  filterVisibleElements,
  countVisibleChildren,
} from './utils'
export type { InvoiceVisibilityData } from './utils'

// Handlers (for testing/extension)
export {
  defaultVisibilityHandler,
  textVisibilityHandler,
  workHoursTableVisibilityHandler,
  lineItemsTableVisibilityHandler,
  summaryTableVisibilityHandler,
  logoVisibilityHandler,
  containerVisibilityHandler,
} from './handlers'
