import { z } from 'zod'

// Define pageSizeSchema locally to avoid circular dependency
const pageSizeSchemaLocal = z.enum(['A4', 'LETTER', 'LEGAL', 'LONG', 'SHORT', 'A5', 'B5'])

// Allowed tokens for template interpolation
export const ALLOWED_TOKENS = [
  // Invoice
  'invoice_number',
  'issue_date',
  'due_date',
  'billing_period',
  // From
  'from_name',
  'from_address',
  'from_city',
  'from_state',
  'from_postal_code',
  'from_country',
  'from_email',
  'from_phone',
  'from_tax_id',
  // To
  'to_name',
  'to_address',
  'to_city',
  'to_state',
  'to_postal_code',
  'to_country',
  'to_email',
  'to_phone',
  'to_tax_id',
  // Financial
  'total_hours',
  'total_days',
  'hourly_rate',
  'subtotal',
  'discount_percent',
  'discount_amount',
  'tax_percent',
  'tax_amount',
  'total_amount',
  'currency_symbol',
  'currency_code',
  // Other
  'job_title',
  'notes',
  'terms',
  'payment_terms',
] as const

export type AllowedToken = (typeof ALLOWED_TOKENS)[number]

// Element types that can be added to a template
export const templateElementTypeSchema = z.enum([
  'text',
  'table_work_hours',
  'table_line_items',
  'table_summary',
  'divider',
  'rectangle',
  'logo',
])

export type TemplateElementType = z.infer<typeof templateElementTypeSchema>

// Font style options
export const fontStyleSchema = z.object({
  fontFamily: z.enum(['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique', 'Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic', 'Courier', 'Courier-Bold', 'Courier-Oblique', 'Courier-BoldOblique']).default('Helvetica'),
  fontSize: z.number().min(6).max(72).default(12),
  fontWeight: z.enum(['normal', 'bold']).default('normal'),
  fontStyle: z.enum(['normal', 'italic']).default('normal'),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).default('left'),
  textDecoration: z.enum(['none', 'underline', 'line-through']).default('none'),
  textTransform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']).default('none'),
  letterSpacing: z.number().default(0),
  lineHeight: z.number().min(0.5).max(3).default(1.2),
  color: z.string().default('#000000'),
})

export type FontStyle = z.infer<typeof fontStyleSchema>

// Border style options
export const borderStyleSchema = z.object({
  width: z.number().min(0).max(10).default(0),
  color: z.string().default('#000000'),
  style: z.enum(['solid', 'dashed', 'dotted']).default('solid'),
  radius: z.number().min(0).max(50).default(0),
})

export type BorderStyle = z.infer<typeof borderStyleSchema>

// Position in points (1 point = 1/72 inch)
export const positionSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().min(10),
  height: z.number().min(10),
})

export type Position = z.infer<typeof positionSchema>

// Table column definition
export const tableColumnSchema = z.object({
  id: z.string(),
  header: z.string(),
  field: z.string(),
  width: z.number().min(0).max(100), // Percentage
  align: z.enum(['left', 'center', 'right']).default('left'),
})

export type TableColumn = z.infer<typeof tableColumnSchema>

// Table style options
export const tableStyleSchema = z.object({
  headerBackgroundColor: z.string().default('#1a1a2e'),
  headerTextColor: z.string().default('#ffffff'),
  rowBackgroundColor: z.string().default('#ffffff'),
  alternateRowBackgroundColor: z.string().default('#f8fafc'),
  borderColor: z.string().default('#e0e0e0'),
  showHeaderBorder: z.boolean().default(true),
  showRowBorders: z.boolean().default(true),
  columns: z.array(tableColumnSchema).optional(),
})

export type TableStyle = z.infer<typeof tableStyleSchema>

// Template element with all properties
export const templateElementSchema = z.object({
  id: z.string(),
  type: templateElementTypeSchema,
  name: z.string().default('Untitled Element'),
  position: positionSchema,
  content: z.string().default(''), // Can contain {{tokens}}
  fontStyle: fontStyleSchema.optional(),
  border: borderStyleSchema.optional(),
  backgroundColor: z.string().optional(),
  padding: z.number().min(0).max(50).default(0),
  opacity: z.number().min(0).max(1).default(1),
  zIndex: z.number().default(0),
  locked: z.boolean().default(false),
  visible: z.boolean().default(true),
  // Table-specific
  tableStyle: tableStyleSchema.optional(),
  // Logo-specific
  logoUrl: z.string().optional(),
  objectFit: z.enum(['contain', 'cover', 'fill']).optional(),
})

export type TemplateElement = z.infer<typeof templateElementSchema>

// Margin definition
export const marginSchema = z.object({
  top: z.number().min(0).default(40),
  right: z.number().min(0).default(40),
  bottom: z.number().min(0).default(60),
  left: z.number().min(0).default(40),
})

export type Margin = z.infer<typeof marginSchema>

// Template theme colors
export const templateThemeSchema = z.object({
  primary: z.string().default('#1a1a2e'),
  secondary: z.string().default('#16213e'),
  accent: z.string().default('#0f3460'),
  text: z.string().default('#333333'),
  textLight: z.string().default('#666666'),
  background: z.string().default('#ffffff'),
})

export type TemplateTheme = z.infer<typeof templateThemeSchema>

// Full invoice template
export const invoiceTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional(),
  pageSize: pageSizeSchemaLocal.default('A4'),
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
  margins: marginSchema.default({
    top: 40,
    right: 40,
    bottom: 60,
    left: 40,
  }),
  theme: templateThemeSchema.optional(),
  backgroundColor: z.string().default('#ffffff'),
  elements: z.array(templateElementSchema).default([]),
  isDefault: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type InvoiceTemplate = z.infer<typeof invoiceTemplateSchema>

// Editor state for undo/redo
export interface EditorHistoryState {
  elements: TemplateElement[]
  selectedElementId: string | null
}

// Grid and ruler settings
export const editorSettingsSchema = z.object({
  showRulers: z.boolean().default(true),
  showGrid: z.boolean().default(true),
  snapToGrid: z.boolean().default(true),
  gridSize: z.number().default(10), // Points
  zoomLevel: z.number().min(25).max(200).default(100),
})

export type EditorSettings = z.infer<typeof editorSettingsSchema>

// Predefined element templates for the elements panel
export interface PredefinedElement {
  id: string
  category: 'text' | 'contact' | 'tables' | 'decorative'
  name: string
  description: string
  icon: string
  defaultElement: Omit<TemplateElement, 'id'>
}

// A4 dimensions in points
export const A4_POINTS = {
  width: 595.28, // 210mm
  height: 841.89, // 297mm
} as const

// Helper to convert mm to points
export function mmToPoints(mm: number): number {
  return mm * 2.83465
}

// Helper to convert points to mm
export function pointsToMm(points: number): number {
  return points / 2.83465
}

// Sanitize content for PDF (remove potential XSS)
export function sanitizeForPdf(content: string): string {
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
}

// Validate and interpolate tokens
export function interpolateTokens(
  content: string,
  tokenValues: Record<AllowedToken, string>
): string {
  return content.replace(/\{\{(\w+)\}\}/g, (match, token) => {
    if (!ALLOWED_TOKENS.includes(token as AllowedToken)) {
      return '' // Remove invalid tokens
    }
    const value = tokenValues[token as AllowedToken]
    return sanitizeForPdf(value ?? '')
  })
}

// Validate template JSON for import (security)
export function validateTemplateImport(json: unknown): InvoiceTemplate | null {
  try {
    const result = invoiceTemplateSchema.safeParse(json)
    if (!result.success) {
      console.error('Template validation failed:', result.error)
      return null
    }

    // Additional security checks
    const template = result.data

    // Limit number of elements
    if (template.elements.length > 100) {
      console.error('Template has too many elements (max 100)')
      return null
    }

    // Validate element content doesn't exceed size limit
    const jsonSize = JSON.stringify(template).length
    if (jsonSize > 1024 * 1024) { // 1MB limit
      console.error('Template JSON exceeds 1MB limit')
      return null
    }

    return template
  } catch (error) {
    console.error('Template import error:', error)
    return null
  }
}
