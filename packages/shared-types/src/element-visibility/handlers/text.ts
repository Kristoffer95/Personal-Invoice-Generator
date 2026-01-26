/**
 * Text Element Visibility Handler
 *
 * Text elements can contain token placeholders like {{from_name}} that are
 * interpolated with invoice data. When all tokens resolve to empty strings,
 * the text element should be hidden unless showWhenEmpty is true.
 *
 * Visibility rules:
 * 1. In preview mode: always render (editor shows all elements)
 * 2. If showWhenEmpty is true: always render (user override)
 * 3. If content has text after interpolation: render
 * 4. If content is empty after interpolation: hide
 */

import type { TemplateElement, AllowedToken } from '../../template'
import { ALLOWED_TOKENS, sanitizeForPdf } from '../../template'
import type { VisibilityContext, VisibilityResult, RenderContext } from '../types'

/**
 * Interpolate tokens in content string
 * Used to determine if content will be empty after token replacement
 */
function interpolateTokens(
  content: string,
  tokenValues: Record<AllowedToken, string>
): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_matchStr, token) => {
    if (!ALLOWED_TOKENS.includes(token as AllowedToken)) {
      return ''
    }
    const value = tokenValues[token as AllowedToken]
    return sanitizeForPdf(value ?? '')
  })
}

/**
 * Check if text content is empty after token interpolation
 */
function isContentEmpty(content: string, context: RenderContext): boolean {
  const rawContent = typeof content === 'string' ? content : ''
  const interpolated = interpolateTokens(rawContent, context.tokenValues)
  return !interpolated || interpolated.trim() === ''
}

/**
 * Text element visibility handler
 */
export function textVisibilityHandler(
  element: TemplateElement,
  context: VisibilityContext
): VisibilityResult {
  // Respect explicit visibility flag
  if (element.visible === false) {
    return { shouldRender: false, reason: 'Element is explicitly hidden' }
  }

  // In preview mode, always show text elements
  if (context.type === 'preview') {
    return { shouldRender: true }
  }

  // If showWhenEmpty is true, always render (user override)
  if (element.showWhenEmpty) {
    return { shouldRender: true }
  }

  // Check if content is empty after interpolation
  if (isContentEmpty(element.content, context)) {
    return {
      shouldRender: false,
      reason: 'Text content is empty after token interpolation',
    }
  }

  return { shouldRender: true }
}
