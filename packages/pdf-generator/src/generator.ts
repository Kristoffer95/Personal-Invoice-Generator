import { pdf } from '@react-pdf/renderer'
import type { Invoice, BackgroundDesign, ExportConfig, InvoiceTemplate } from '@invoice-generator/shared-types'
import { InvoicePDF } from './InvoicePDF'
import { TemplatePDF } from './TemplatePDF'
import { ensureFontsRegistered } from './fonts'

export interface PDFGeneratorOptions {
  invoice: Invoice
  backgroundDesign?: BackgroundDesign
  exportConfig?: ExportConfig
}

export interface TemplateGeneratorOptions {
  template: InvoiceTemplate
  invoice: Invoice
}

/**
 * Generate a PDF blob from invoice data
 */
export async function generatePDFBlob(options: PDFGeneratorOptions): Promise<Blob> {
  const { invoice, backgroundDesign } = options

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = InvoicePDF({ invoice, backgroundDesign }) as any

  const blob = await pdf(element).toBlob()
  return blob
}

/**
 * Generate a PDF and return as base64 string
 */
export async function generatePDF(options: PDFGeneratorOptions): Promise<string> {
  const blob = await generatePDFBlob(options)

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix
        const base64 = reader.result.split(',')[1]
        resolve(base64)
      } else {
        reject(new Error('Failed to convert blob to base64'))
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Generate PDF and trigger download in browser
 */
export async function downloadPDF(
  options: PDFGeneratorOptions,
  filename?: string
): Promise<void> {
  const blob = await generatePDFBlob(options)
  const { invoice } = options

  const defaultFilename = `invoice-${invoice.invoiceNumber}-${invoice.issueDate}.pdf`
  const finalFilename = filename || defaultFilename

  // Create download link
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = finalFilename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Generate a PDF blob from a template and invoice data
 */
export async function generateTemplatePDFBlob(
  options: TemplateGeneratorOptions
): Promise<Blob> {
  // Ensure custom fonts are registered before PDF generation
  ensureFontsRegistered()

  const { template, invoice } = options

  // DEBUG: Log input data to trace issues
  if (process.env.NODE_ENV === 'development' || process.env.PDF_DEBUG === 'true') {
    console.log('[PDF Generator DEBUG] generateTemplatePDFBlob called:', {
      templateId: template.id,
      templateName: template.name,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      textElementsCount: template.elements.filter(el => el.type === 'text').length,
      textElements: template.elements
        .filter(el => el.type === 'text')
        .map(el => ({
          id: el.id,
          name: el.name,
          content: el.content,
          contentType: typeof el.content,
          hasContent: Boolean(el.content),
        })),
    })
  }

  // Validate template has visible elements
  const visibleElements = template.elements.filter((el) => el.visible !== false)
  if (visibleElements.length === 0) {
    console.warn(
      '[PDF Generator] Warning: Template has no visible elements. The PDF may appear blank.',
      { templateName: template.name, totalElements: template.elements.length }
    )
  }

  // Check for elements positioned outside page bounds (in points, 1mm ≈ 2.83 points)
  const pageWidthPts = 210 * 2.83465 // A4 default width
  const pageHeightPts = 297 * 2.83465 // A4 default height
  const outOfBounds = visibleElements.filter(
    (el) =>
      el.position.x + el.position.width > pageWidthPts ||
      el.position.y + el.position.height > pageHeightPts
  )
  if (outOfBounds.length > 0) {
    console.warn(
      '[PDF Generator] Warning: Some elements may be positioned outside page bounds.',
      outOfBounds.map((el) => ({ name: el.name, position: el.position }))
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = TemplatePDF({ template, invoice }) as any

  const blob = await pdf(element).toBlob()
  return blob
}

/**
 * Generate template-based PDF and trigger download in browser
 */
export async function downloadTemplatePDF(
  options: TemplateGeneratorOptions,
  filename?: string
): Promise<void> {
  const blob = await generateTemplatePDFBlob(options)
  const { invoice, template } = options

  const defaultFilename = `${template.name}-${invoice.invoiceNumber}-${invoice.issueDate}.pdf`
  const finalFilename = filename || defaultFilename

  // Create download link
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = finalFilename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
