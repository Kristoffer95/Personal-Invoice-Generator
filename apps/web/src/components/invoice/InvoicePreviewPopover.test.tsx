import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Use vi.hoisted to ensure the mock object is created before vi.mock is hoisted
const mockState = vi.hoisted(() => ({
  queryReturns: {} as Record<string, unknown>
}))

// Mock convex/react
vi.mock('convex/react', () => ({
  useQuery: (query: string) => {
    return mockState.queryReturns[query]
  },
}))

// Mock the API import
vi.mock('@invoice-generator/backend/convex/_generated/api', () => ({
  api: {
    invoices: {
      getInvoice: 'invoices:getInvoice',
    },
  },
}))

// Import after mocks
import { InvoicePreviewPopover } from './InvoicePreviewPopover'
import type { Id } from '@invoice-generator/backend/convex/_generated/dataModel'

// Helper to create a mock invoice
function createMockInvoice(overrides: Record<string, unknown> = {}) {
  const base = {
    _id: 'invoice_123',
    invoiceNumber: 'INV-2024-001',
    status: 'DRAFT',
    currency: 'USD',
    totalAmount: 1250.00,
    subtotal: 1000.00,
    discountPercent: 10,
    discountAmount: 100.00,
    taxPercent: 15,
    taxAmount: 150.00,
    totalHours: 40,
    totalDays: 5,
    issueDate: '2024-03-15',
    dueDate: '2024-04-15',
    periodStart: '2024-03-01',
    periodEnd: '2024-03-31',
    to: {
      name: 'Acme Corporation',
      address: '123 Main St',
      email: 'billing@acme.com',
    },
    from: {
      name: 'My Company',
      address: '456 Oak Ave',
      email: 'invoices@mycompany.com',
    },
  }
  return { ...base, ...overrides }
}

describe('InvoicePreviewPopover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.queryReturns = {}
  })

  describe('preview button rendering', () => {
    it('renders the preview button with Eye icon', () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice()

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('h-8', 'w-8')
    })

    it('has correct aria-label for accessibility', () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice()

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      expect(screen.getByLabelText('Preview invoice')).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('displays loading spinner when invoice data is undefined', async () => {
      mockState.queryReturns['invoices:getInvoice'] = undefined

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      // Open the popover
      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      // Wait for popover content to appear
      await waitFor(() => {
        // The Loader2 icon should be present with animate-spin class
        const loader = document.querySelector('.animate-spin')
        expect(loader).toBeInTheDocument()
      })
    })
  })

  describe('error state', () => {
    it('displays error message when invoice is null', async () => {
      mockState.queryReturns['invoices:getInvoice'] = null

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      // Open the popover
      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Unable to load invoice preview.')).toBeInTheDocument()
      })
    })
  })

  describe('successful rendering with invoice details', () => {
    it('displays invoice number and status', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice({
        invoiceNumber: 'INV-2024-042',
        status: 'PAID',
      })

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('INV-2024-042')).toBeInTheDocument()
        expect(screen.getByText('Paid')).toBeInTheDocument()
      })
    })

    it('displays client name', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice({
        to: { name: 'Test Client Corp' },
      })

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Client:')).toBeInTheDocument()
        expect(screen.getByText('Test Client Corp')).toBeInTheDocument()
      })
    })

    it('displays total amount prominently', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice({
        totalAmount: 5000.00,
        subtotal: 4500.00,
        currency: 'USD',
      })

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        // Total amount appears in the prominent display
        const totalAmountElements = screen.getAllByText('$5,000.00')
        expect(totalAmountElements.length).toBeGreaterThanOrEqual(1)
        expect(screen.getByText('Total Amount')).toBeInTheDocument()
      })
    })

    it('renders different status badges correctly', async () => {
      const { rerender } = render(
        <InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />
      )

      // Test DRAFT status
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice({ status: 'DRAFT' })
      rerender(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Draft')).toBeInTheDocument()
      })
    })
  })

  describe('financial breakdown display', () => {
    it('displays subtotal', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice({
        subtotal: 2000.00,
        currency: 'USD',
      })

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Subtotal')).toBeInTheDocument()
        expect(screen.getByText('$2,000.00')).toBeInTheDocument()
      })
    })

    it('displays discount when present', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice({
        discountPercent: 20,
        discountAmount: 400.00,
        currency: 'USD',
      })

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Discount (20%)')).toBeInTheDocument()
        expect(screen.getByText('-$400.00')).toBeInTheDocument()
      })
    })

    it('does not display discount when zero', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice({
        discountPercent: 0,
        discountAmount: 0,
        taxPercent: 0,
        taxAmount: 0,
        subtotal: 1000.00,
        totalAmount: 1000.00,
      })

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Subtotal')).toBeInTheDocument()
      })

      expect(screen.queryByText(/Discount/)).not.toBeInTheDocument()
    })

    it('displays tax when present', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice({
        taxPercent: 12,
        taxAmount: 240.00,
        discountPercent: 0,
        discountAmount: 0,
        currency: 'USD',
      })

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Tax (12%)')).toBeInTheDocument()
        expect(screen.getByText('$240.00')).toBeInTheDocument()
      })
    })

    it('does not display tax when zero', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice({
        taxPercent: 0,
        taxAmount: 0,
        discountPercent: 0,
        discountAmount: 0,
        subtotal: 1000.00,
        totalAmount: 1000.00,
      })

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Subtotal')).toBeInTheDocument()
      })

      expect(screen.queryByText(/Tax \(/)).not.toBeInTheDocument()
    })

    it('displays total in the financial breakdown', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice({
        totalAmount: 3500.00,
        currency: 'EUR',
      })

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        // Total appears twice - once prominent, once in breakdown
        const totalElements = screen.getAllByText('Total')
        expect(totalElements.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('formats currency correctly for different currencies', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice({
        totalAmount: 100000,
        subtotal: 100000,
        currency: 'JPY',
        discountPercent: 0,
        discountAmount: 0,
        taxPercent: 0,
        taxAmount: 0,
      })

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        const yenAmounts = screen.getAllByText('¥100,000.00')
        expect(yenAmounts.length).toBeGreaterThanOrEqual(1)
      })
    })
  })

  describe('date formatting', () => {
    it('displays issue date in correct format', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice({
        issueDate: '2024-06-15',
      })

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Issue Date:')).toBeInTheDocument()
        expect(screen.getByText('Jun 15, 2024')).toBeInTheDocument()
      })
    })

    it('displays due date when present', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice({
        dueDate: '2024-07-15',
      })

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Due Date:')).toBeInTheDocument()
        expect(screen.getByText('Jul 15, 2024')).toBeInTheDocument()
      })
    })

    it('does not display due date when not present', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice({
        dueDate: null,
      })

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Issue Date:')).toBeInTheDocument()
      })

      expect(screen.queryByText('Due Date:')).not.toBeInTheDocument()
    })

    it('displays period dates when both start and end are present', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice({
        periodStart: '2024-05-01',
        periodEnd: '2024-05-31',
      })

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Period:')).toBeInTheDocument()
        expect(screen.getByText('May 1, 2024 - May 31, 2024')).toBeInTheDocument()
      })
    })

    it('does not display period when dates are missing', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice({
        periodStart: null,
        periodEnd: null,
      })

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Issue Date:')).toBeInTheDocument()
      })

      expect(screen.queryByText('Period:')).not.toBeInTheDocument()
    })
  })

  describe('hours and days display', () => {
    it('displays hours and days when both are positive', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice({
        totalHours: 160.5,
        totalDays: 20,
      })

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('160.5')).toBeInTheDocument()
        expect(screen.getByText('Hours')).toBeInTheDocument()
        expect(screen.getByText('20')).toBeInTheDocument()
        expect(screen.getByText('Days')).toBeInTheDocument()
      })
    })

    it('displays hours section when only hours is positive', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice({
        totalHours: 8,
        totalDays: 0,
      })

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('8.0')).toBeInTheDocument()
        expect(screen.getByText('Hours')).toBeInTheDocument()
      })
    })

    it('displays days section when only days is positive', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice({
        totalHours: 0,
        totalDays: 5,
      })

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument()
        expect(screen.getByText('Days')).toBeInTheDocument()
      })
    })

    it('does not display hours and days section when both are zero', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice({
        totalHours: 0,
        totalDays: 0,
        discountPercent: 0,
        discountAmount: 0,
        taxPercent: 0,
        taxAmount: 0,
      })

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Subtotal')).toBeInTheDocument()
      })

      expect(screen.queryByText('Hours')).not.toBeInTheDocument()
      expect(screen.queryByText('Days')).not.toBeInTheDocument()
    })

    it('formats hours with one decimal place', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice({
        totalHours: 42.333,
        totalDays: 5,
      })

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('42.3')).toBeInTheDocument()
      })
    })
  })

  describe('view full invoice modal', () => {
    it('displays "View Full Invoice" button', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice()

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('View Full Invoice')).toBeInTheDocument()
      })
    })

    it('opens modal when View Full Invoice button is clicked', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice()

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      // Open the popover
      const previewButton = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(previewButton)

      // Wait for popover to open and click View Full Invoice
      await waitFor(() => {
        expect(screen.getByText('View Full Invoice')).toBeInTheDocument()
      })

      const viewFullButton = screen.getByRole('button', { name: /view full invoice/i })
      fireEvent.click(viewFullButton)

      // Verify modal opens with invoice preview title
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Invoice Preview')).toBeInTheDocument()
      })
    })
  })

  describe('popover behavior', () => {
    it('opens popover on button click', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice()

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      expect(screen.queryByText('INV-2024-001')).not.toBeInTheDocument()

      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('INV-2024-001')).toBeInTheDocument()
      })
    })

    it('renders popover content with correct width', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice()

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        // The popover content should have the w-80 class
        const invoiceNumber = screen.getByText('INV-2024-001')
        // Find the popover content wrapper which should have w-80 class
        const popoverContent = invoiceNumber.closest('.w-80')
        expect(popoverContent).toBeInTheDocument()
      })
    })
  })

  describe('currency formatting', () => {
    it('formats USD correctly', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice({
        totalAmount: 1234.56,
        subtotal: 1234.56,
        discountPercent: 0,
        discountAmount: 0,
        taxPercent: 0,
        taxAmount: 0,
        currency: 'USD',
      })

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        const usdAmounts = screen.getAllByText('$1,234.56')
        expect(usdAmounts.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('formats EUR correctly', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice({
        totalAmount: 1234.56,
        subtotal: 1234.56,
        discountPercent: 0,
        discountAmount: 0,
        taxPercent: 0,
        taxAmount: 0,
        currency: 'EUR',
      })

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        const euroAmounts = screen.getAllByText('€1,234.56')
        expect(euroAmounts.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('formats GBP correctly', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice({
        totalAmount: 999.99,
        subtotal: 999.99,
        discountPercent: 0,
        discountAmount: 0,
        taxPercent: 0,
        taxAmount: 0,
        currency: 'GBP',
      })

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        const gbpAmounts = screen.getAllByText('£999.99')
        expect(gbpAmounts.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('formats PHP correctly', async () => {
      mockState.queryReturns['invoices:getInvoice'] = createMockInvoice({
        totalAmount: 50000.00,
        subtotal: 50000.00,
        discountPercent: 0,
        discountAmount: 0,
        taxPercent: 0,
        taxAmount: 0,
        currency: 'PHP',
      })

      render(<InvoicePreviewPopover invoiceId={'invoice_123' as Id<'invoices'>} />)

      const button = screen.getByRole('button', { name: /preview invoice/i })
      fireEvent.click(button)

      await waitFor(() => {
        const phpAmounts = screen.getAllByText('₱50,000.00')
        expect(phpAmounts.length).toBeGreaterThanOrEqual(1)
      })
    })
  })
})
