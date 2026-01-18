import { describe, it, expect } from 'vitest'
import type { Invoice } from '@invoice-generator/shared-types'

describe('PDF Generator', () => {
  it('exports the correct functions', async () => {
    const { generatePDFBlob, generatePDF, downloadPDF, InvoicePDF } = await import('./index')

    expect(typeof generatePDFBlob).toBe('function')
    expect(typeof generatePDF).toBe('function')
    expect(typeof downloadPDF).toBe('function')
    expect(typeof InvoicePDF).toBe('function')
  })

  it('InvoicePDF returns a valid React element', async () => {
    const { InvoicePDF } = await import('./index')

    const mockInvoice: Invoice = {
      id: 'test-1',
      invoiceNumber: 'INV-001',
      status: 'DRAFT',
      issueDate: '2024-01-01',
      from: { name: 'Test Company' },
      to: { name: 'Client Company' },
      hourlyRate: 100,
      defaultHoursPerDay: 8,
      dailyWorkHours: [],
      totalDays: 0,
      totalHours: 0,
      subtotal: 0,
      lineItems: [],
      discountPercent: 0,
      discountAmount: 0,
      taxPercent: 0,
      taxAmount: 0,
      totalAmount: 0,
      currency: 'USD',
      paymentTerms: 'NET_30',
      pageSize: 'A4',
      showDetailedHours: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    }

    const element = InvoicePDF({ invoice: mockInvoice })
    expect(element).toBeDefined()
    expect(element.type).toBeDefined()
  })
})
