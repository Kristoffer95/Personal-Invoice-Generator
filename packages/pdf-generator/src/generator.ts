import { pdf } from '@react-pdf/renderer'
import type { Invoice, BackgroundDesign, ExportConfig } from '@invoice-generator/shared-types'
import { InvoicePDF } from './InvoicePDF'

export interface PDFGeneratorOptions {
  invoice: Invoice
  backgroundDesign?: BackgroundDesign
  exportConfig?: ExportConfig
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
