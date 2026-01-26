/**
 * Visibility System Utilities
 *
 * Helper functions for building render contexts and working with the visibility system.
 */

import type { TemplateElement, AllowedToken } from '../template'
import type { TableContentData } from '../layout-engine'
import type { RenderContext, PreviewRenderContext } from './types'

/**
 * Invoice data subset needed for visibility checks
 */
export interface InvoiceVisibilityData {
  showDetailedHours: boolean
  lineItemsCount: number
  workDaysCount: number
  logoUrl?: string
}

/**
 * Build a RenderContext for PDF generation
 *
 * @param tokenValues - Token values from buildTokenValues()
 * @param tableContent - Table content data from layout engine
 * @param invoiceData - Invoice data for visibility checks
 * @param elements - All template elements
 */
export function buildRenderContext(
  tokenValues: Record<AllowedToken, string>,
  tableContent: TableContentData,
  invoiceData: InvoiceVisibilityData,
  elements: TemplateElement[]
): RenderContext {
  return {
    type: 'render',
    tokenValues,
    tableContent,
    invoice: {
      showDetailedHours: invoiceData.showDetailedHours,
      lineItemsCount: invoiceData.lineItemsCount,
      workDaysCount: invoiceData.workDaysCount,
    },
    invoiceLogoUrl: invoiceData.logoUrl,
    elements,
  }
}

/**
 * Build a PreviewRenderContext for Style Editor
 *
 * In preview mode, all elements render to allow design work.
 *
 * @param elements - All template elements
 */
export function buildPreviewContext(
  elements: TemplateElement[]
): PreviewRenderContext {
  return {
    type: 'preview',
    elements,
  }
}

/**
 * Filter elements that should render
 *
 * Convenience function for filtering a list of elements to only
 * those that should render in the given context.
 *
 * @param elements - Elements to filter
 * @param context - Render context
 * @param shouldRenderFn - The shouldRenderElement function from registry
 */
export function filterVisibleElements(
  elements: TemplateElement[],
  context: RenderContext | PreviewRenderContext,
  shouldRenderFn: (element: TemplateElement, context: RenderContext | PreviewRenderContext) => boolean
): TemplateElement[] {
  return elements.filter((el) => shouldRenderFn(el, context))
}

/**
 * Count visible children of a container
 *
 * @param containerId - The container element ID
 * @param elements - All template elements
 * @param context - Render context
 * @param shouldRenderFn - The shouldRenderElement function from registry
 */
export function countVisibleChildren(
  containerId: string,
  elements: TemplateElement[],
  context: RenderContext | PreviewRenderContext,
  shouldRenderFn: (element: TemplateElement, context: RenderContext | PreviewRenderContext) => boolean
): number {
  return elements.filter(
    (el) =>
      el.parentId === containerId &&
      el.positionMode === 'relative' &&
      el.visible !== false &&
      shouldRenderFn(el, context)
  ).length
}
