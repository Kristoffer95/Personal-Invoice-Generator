import type { InvoiceTemplate, TemplateElement, FontStyle, BorderStyle, TableStyle } from '@invoice-generator/shared-types'
import type { Template } from '@/hooks/use-templates'
import type { SystemTemplate } from '@/hooks/use-system-templates'

/**
 * Converts a Convex template document to the InvoiceTemplate format used by the frontend.
 *
 * This function handles all the necessary type conversions and provides default values
 * for optional fields to ensure consistent behavior across the application.
 *
 * @param t - The Convex template document
 * @returns The converted InvoiceTemplate
 */
export function convexToInvoiceTemplate(t: Template): InvoiceTemplate {
  return {
    id: t._id,
    name: t.name,
    description: t.description,
    pageSize: t.pageSize,
    orientation: t.orientation,
    margins: t.margins,
    theme: t.theme ? {
      primary: t.theme.primary ?? '#1a1a2e',
      secondary: t.theme.secondary ?? '#16213e',
      accent: t.theme.accent ?? '#0f3460',
      text: t.theme.text ?? '#333333',
      textLight: t.theme.textLight ?? '#666666',
      background: t.theme.background ?? '#ffffff',
    } : undefined,
    backgroundColor: t.backgroundColor,
    elements: t.elements.map((el) => convertElement(el)),
    isDefault: t.isDefault,
    isSystem: false,
    createdAt: new Date(t.createdAt).toISOString(),
    updatedAt: new Date(t.updatedAt).toISOString(),
  }
}

/**
 * Converts a Convex template element to the TemplateElement format.
 * Provides default values for all optional fields to prevent undefined values.
 */
function convertElement(el: Template['elements'][0]): TemplateElement {
  const converted: TemplateElement = {
    id: el.id,
    type: el.type,
    name: el.name ?? 'Untitled Element',
    position: el.position,
    content: el.content ?? '',
    fontStyle: el.fontStyle ? convertFontStyle(el.fontStyle) : undefined,
    border: el.border ? convertBorder(el.border) : undefined,
    backgroundColor: el.backgroundColor,
    padding: el.padding ?? 0,
    opacity: el.opacity ?? 1,
    zIndex: el.zIndex ?? 0,
    locked: el.locked ?? false,
    visible: el.visible ?? true,
    tableStyle: el.tableStyle ? convertTableStyle(el.tableStyle) : undefined,
    logoUrl: el.logoUrl,
    objectFit: el.objectFit,
    // Relative positioning fields
    positionMode: el.positionMode ?? 'absolute',
    parentId: el.parentId,
    order: el.order ?? 0,
    spacing: el.spacing ? {
      top: el.spacing.top ?? 0,
      right: el.spacing.right ?? 0,
      bottom: el.spacing.bottom ?? 0,
      left: el.spacing.left ?? 0,
    } : undefined,
    flexGrow: el.flexGrow ?? 0,
    flexShrink: el.flexShrink ?? 1,
    alignSelf: el.alignSelf,
    layoutConfig: el.layoutConfig ? {
      direction: el.layoutConfig.direction ?? 'column',
      gap: el.layoutConfig.gap ?? 8,
      align: el.layoutConfig.align ?? 'stretch',
      justify: el.layoutConfig.justify ?? 'start',
      wrap: el.layoutConfig.wrap ?? false,
    } : undefined,
  }

  // DEBUG: Log text element conversion to trace content issues
  if (process.env.NODE_ENV === 'development' && el.type === 'text') {
    console.log('[template-utils DEBUG] convertElement (text):', {
      id: el.id,
      name: el.name,
      inputContent: el.content,
      inputContentType: typeof el.content,
      outputContent: converted.content,
      hasInputContent: el.content !== undefined && el.content !== null,
    })
  }

  return converted
}

/**
 * Converts font style with defaults for optional fields.
 */
function convertFontStyle(fs: NonNullable<Template['elements'][0]['fontStyle']>): FontStyle {
  return {
    fontFamily: fs.fontFamily ?? 'Helvetica',
    fontSize: fs.fontSize ?? 12,
    fontWeight: fs.fontWeight ?? 'normal',
    fontStyle: fs.fontStyle ?? 'normal',
    textAlign: fs.textAlign ?? 'left',
    textDecoration: fs.textDecoration ?? 'none',
    textTransform: fs.textTransform ?? 'none',
    letterSpacing: fs.letterSpacing ?? 0,
    lineHeight: fs.lineHeight ?? 1.2,
    color: fs.color ?? '#000000',
  }
}

/**
 * Converts border style with defaults for optional fields.
 */
function convertBorder(b: NonNullable<Template['elements'][0]['border']>): BorderStyle {
  return {
    width: b.width ?? 0,
    color: b.color ?? '#000000',
    style: b.style ?? 'solid',
    radius: b.radius ?? 0,
  }
}

/**
 * Converts table style with defaults for optional fields.
 */
function convertTableStyle(ts: NonNullable<Template['elements'][0]['tableStyle']>): TableStyle {
  return {
    headerBackgroundColor: ts.headerBackgroundColor ?? '#1a1a2e',
    headerTextColor: ts.headerTextColor ?? '#ffffff',
    rowBackgroundColor: ts.rowBackgroundColor ?? '#ffffff',
    alternateRowBackgroundColor: ts.alternateRowBackgroundColor ?? '#f8fafc',
    borderColor: ts.borderColor ?? '#e0e0e0',
    showHeaderBorder: ts.showHeaderBorder ?? true,
    showRowBorders: ts.showRowBorders ?? true,
    columns: ts.columns?.map((col) => ({
      id: col.id,
      header: col.header,
      field: col.field,
      width: col.width,
      align: col.align ?? 'left',
    })),
  }
}

/**
 * Converts a Convex system template document to the InvoiceTemplate format used by the frontend.
 *
 * This function handles all the necessary type conversions and provides default values
 * for optional fields to ensure consistent behavior across the application.
 *
 * @param t - The Convex system template document
 * @returns The converted InvoiceTemplate with isSystem: true
 */
export function systemTemplateToInvoiceTemplate(t: SystemTemplate): InvoiceTemplate {
  return {
    id: t._id,
    name: t.name,
    description: t.description,
    pageSize: t.pageSize,
    orientation: t.orientation,
    margins: t.margins,
    theme: t.theme ? {
      primary: t.theme.primary ?? '#1a1a2e',
      secondary: t.theme.secondary ?? '#16213e',
      accent: t.theme.accent ?? '#0f3460',
      text: t.theme.text ?? '#333333',
      textLight: t.theme.textLight ?? '#666666',
      background: t.theme.background ?? '#ffffff',
    } : undefined,
    backgroundColor: t.backgroundColor,
    elements: t.elements.map((el) => convertSystemElement(el)),
    isDefault: t.isDefault,
    isSystem: true, // System templates are always marked as system
    createdAt: new Date(t.createdAt).toISOString(),
    updatedAt: new Date(t.updatedAt).toISOString(),
    // Preserve folderId for folder-based navigation in styles page
    folderId: t.folderId,
  }
}

/**
 * Converts a system template element to the TemplateElement format.
 * Uses the same logic as regular template elements.
 */
function convertSystemElement(el: SystemTemplate['elements'][0]): TemplateElement {
  // System template elements have the same structure, so we can reuse the conversion logic
  return convertElement(el as Template['elements'][0])
}
