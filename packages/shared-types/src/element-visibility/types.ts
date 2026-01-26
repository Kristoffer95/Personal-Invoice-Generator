/**
 * Element Visibility System Types
 *
 * These types define the contract for the visibility handler registry.
 * The system determines whether elements should render in the final PDF output,
 * allowing both the layout engine and PDF renderer to make consistent decisions.
 */

import type { TemplateElement, AllowedToken } from '../template'
import type { TableContentData } from '../layout-engine'

/**
 * Context for rendering real invoices (PDF output)
 * Contains actual invoice data for visibility decisions
 */
export interface RenderContext {
  type: 'render'
  /** Token values derived from invoice data (for text elements) */
  tokenValues: Record<AllowedToken, string>
  /** Table content data for row counts */
  tableContent: TableContentData
  /** Invoice data for table visibility checks */
  invoice: {
    showDetailedHours: boolean
    lineItemsCount: number
    workDaysCount: number
  }
  /** Logo URL from invoice (fallback for logo elements) */
  invoiceLogoUrl?: string
  /** All template elements (for container child checks) */
  elements: TemplateElement[]
}

/**
 * Context for editor preview (Style Editor)
 * Uses sample data so elements are always visible in preview
 */
export interface PreviewRenderContext {
  type: 'preview'
  /** All template elements (for container child checks) */
  elements: TemplateElement[]
}

/**
 * Union type for render contexts
 * Handlers check context.type to determine behavior
 */
export type VisibilityContext = RenderContext | PreviewRenderContext

/**
 * Result of a visibility check
 */
export interface VisibilityResult {
  /** Whether the element should render */
  shouldRender: boolean
  /** Optional reason for hiding (useful for debugging) */
  reason?: string
}

/**
 * Visibility handler function signature
 *
 * Handlers receive:
 * - element: The template element to check
 * - context: Either RenderContext (PDF) or PreviewRenderContext (editor)
 *
 * Handlers return:
 * - shouldRender: true if element should be included in output
 * - reason: optional string explaining why element was hidden
 *
 * Handlers should:
 * - Return { shouldRender: true } for preview context (editor shows everything)
 * - Check element.showWhenEmpty to respect user override
 * - Be pure functions with no side effects
 */
export type VisibilityHandler = (
  element: TemplateElement,
  context: VisibilityContext
) => VisibilityResult

/**
 * Registry type for mapping element types to their handlers
 */
export type VisibilityHandlerRegistry = Partial<
  Record<TemplateElement['type'], VisibilityHandler>
>
