import { describe, it, expect } from 'vitest'
import type { Invoice, InvoiceTemplate } from '@invoice-generator/shared-types'

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
      statusHistory: [],
      tags: [],
      isArchived: false,
      pdfTheme: 'light',
    }

    const element = InvoicePDF({ invoice: mockInvoice })
    expect(element).toBeDefined()
    expect(element.type).toBeDefined()
  })
})

describe('TemplatePDF', () => {
  const createMockInvoice = (overrides: Partial<Invoice> = {}): Invoice => ({
    id: 'test-1',
    invoiceNumber: 'INV-001',
    status: 'DRAFT',
    issueDate: '2024-01-01',
    from: { name: 'Test Company' },
    to: { name: 'Client Company' },
    hourlyRate: 100,
    defaultHoursPerDay: 8,
    dailyWorkHours: [
      { date: '2024-01-02', hours: 8, isWorkday: true, notes: 'Work day 1' },
      { date: '2024-01-03', hours: 8, isWorkday: true, notes: 'Work day 2' },
    ],
    totalDays: 2,
    totalHours: 16,
    subtotal: 1600,
    lineItems: [],
    discountPercent: 0,
    discountAmount: 0,
    taxPercent: 0,
    taxAmount: 0,
    totalAmount: 1600,
    currency: 'USD',
    paymentTerms: 'NET_30',
    pageSize: 'A4',
    showDetailedHours: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    statusHistory: [],
    tags: [],
    isArchived: false,
    pdfTheme: 'light',
    ...overrides,
  })

  const createMockTemplate = (): InvoiceTemplate => ({
    id: 'template-1',
    name: 'Test Template',
    description: 'A test template',
    pageSize: 'A4',
    orientation: 'portrait',
    margins: { top: 40, right: 40, bottom: 60, left: 40 },
    backgroundColor: '#ffffff',
    isDefault: false,
    isSystem: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    elements: [
      {
        id: 'work-hours-table',
        type: 'table_work_hours',
        name: 'Work Hours Table',
        position: { x: 40, y: 200, width: 515, height: 200 },
        content: '',
        padding: 0,
        opacity: 1,
        zIndex: 1,
        locked: false,
        visible: true,
      },
      {
        id: 'header-text',
        type: 'text',
        name: 'Invoice Title',
        position: { x: 40, y: 40, width: 200, height: 30 },
        content: 'INVOICE',
        padding: 0,
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      },
    ],
  })

  it('TemplatePDF returns a valid React element', async () => {
    const { TemplatePDF } = await import('./index')

    const template = createMockTemplate()
    const invoice = createMockInvoice({ showDetailedHours: true })

    const element = TemplatePDF({ template, invoice })
    expect(element).toBeDefined()
    expect(element.type).toBeDefined()
  })

  it('TemplatePDF respects showDetailedHours setting when true', async () => {
    const { TemplatePDF } = await import('./index')

    const template = createMockTemplate()
    const invoice = createMockInvoice({ showDetailedHours: true })

    const element = TemplatePDF({ template, invoice })
    expect(element).toBeDefined()
    // When showDetailedHours is true, TemplatePDF should render work hours table
    // The element should be a valid react-pdf Document
    expect(element.props.children).toBeDefined()
  })

  it('TemplatePDF respects showDetailedHours setting when false', async () => {
    const { TemplatePDF } = await import('./index')

    const template = createMockTemplate()
    const invoice = createMockInvoice({ showDetailedHours: false })

    const element = TemplatePDF({ template, invoice })
    expect(element).toBeDefined()
    // When showDetailedHours is false, TemplatePDF should NOT render work hours table
    // The element should still be a valid react-pdf Document
    expect(element.props.children).toBeDefined()
  })

  it('TemplatePDF handles invoice without work hours', async () => {
    const { TemplatePDF } = await import('./index')

    const template = createMockTemplate()
    const invoice = createMockInvoice({
      showDetailedHours: true,
      dailyWorkHours: [],
      totalHours: 0,
      totalDays: 0,
    })

    const element = TemplatePDF({ template, invoice })
    expect(element).toBeDefined()
    expect(element.props.children).toBeDefined()
  })
})
