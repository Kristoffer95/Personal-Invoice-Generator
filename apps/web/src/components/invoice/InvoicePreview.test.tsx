import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Invoice, BackgroundDesign } from '@invoice-generator/shared-types'

// Mock the PDF generator module
const mockGeneratePDFBlob = vi.fn()
vi.mock('@invoice-generator/pdf-generator', () => ({
  generatePDFBlob: (...args: unknown[]) => mockGeneratePDFBlob(...args),
}))

// Import after mocking
import { InvoicePreview } from './InvoicePreview'

describe('InvoicePreview', () => {
  const user = userEvent.setup()

  const mockInvoice: Invoice = {
    id: '1',
    invoiceNumber: 'INV-001',
    status: 'DRAFT',
    statusHistory: [],
    issueDate: '2024-01-15',
    dueDate: '2024-02-15',
    from: {
      name: 'Test Company',
      address: '123 Main St',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'USA',
      email: 'test@company.com',
      phone: '+1 555-123-4567',
    },
    to: {
      name: 'Client Corp',
      address: '456 Oak Ave',
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90001',
      country: 'USA',
      email: 'client@corp.com',
      phone: '+1 555-987-6543',
    },
    hourlyRate: 100,
    defaultHoursPerDay: 8,
    dailyWorkHours: [
      { date: '2024-01-15', hours: 8, isWorkday: true },
      { date: '2024-01-16', hours: 8, isWorkday: true },
    ],
    totalDays: 2,
    totalHours: 16,
    subtotal: 1600,
    lineItems: [],
    discountPercent: 0,
    discountAmount: 0,
    taxPercent: 10,
    taxAmount: 160,
    totalAmount: 1760,
    currency: 'USD',
    paymentTerms: 'NET_30',
    pageSize: 'A4',
    tags: [],
    isArchived: false,
    showDetailedHours: false,
    pdfTheme: 'light',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  }

  const mockBackgroundDesign: BackgroundDesign = {
    id: 'minimal',
    name: 'Minimal',
    backgroundColor: '#ffffff',
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-pdf')
    global.URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Loading State', () => {
    it('shows loading state initially', () => {
      // Mock to never resolve
      mockGeneratePDFBlob.mockImplementation(() => new Promise(() => {}))

      render(<InvoicePreview invoice={mockInvoice} />)

      expect(screen.getByText(/generating preview/i)).toBeInTheDocument()
    })
  })

  describe('Successful Render', () => {
    it('renders PDF viewer after generation', async () => {
      mockGeneratePDFBlob.mockResolvedValue(new Blob(['pdf content'], { type: 'application/pdf' }))

      render(<InvoicePreview invoice={mockInvoice} />)

      await waitFor(() => {
        // Find the object element (primary PDF viewer)
        const elements = screen.getAllByTitle('Invoice Preview')
        const objectElement = elements.find(el => el.tagName.toLowerCase() === 'object')
        expect(objectElement).toBeInTheDocument()
      })
    })

    it('creates object URL from blob', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' })
      mockGeneratePDFBlob.mockResolvedValue(mockBlob)

      render(<InvoicePreview invoice={mockInvoice} />)

      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob)
      })
    })
  })

  describe('Error State', () => {
    it('shows error message when generation fails', async () => {
      mockGeneratePDFBlob.mockRejectedValue(new Error('Generation failed'))

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(<InvoicePreview invoice={mockInvoice} />)

      await waitFor(() => {
        expect(screen.getByText(/failed to generate preview/i)).toBeInTheDocument()
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Zoom Controls', () => {
    it('renders zoom controls', async () => {
      mockGeneratePDFBlob.mockResolvedValue(new Blob(['pdf content'], { type: 'application/pdf' }))

      render(<InvoicePreview invoice={mockInvoice} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /zoom out/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /zoom in/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /reset zoom/i })).toBeInTheDocument()
      })
    })

    it('displays current zoom level', async () => {
      mockGeneratePDFBlob.mockResolvedValue(new Blob(['pdf content'], { type: 'application/pdf' }))

      render(<InvoicePreview invoice={mockInvoice} />)

      await waitFor(() => {
        expect(screen.getByText('50%')).toBeInTheDocument()
      })
    })

    it('increases zoom when zoom in is clicked', async () => {
      mockGeneratePDFBlob.mockResolvedValue(new Blob(['pdf content'], { type: 'application/pdf' }))

      render(<InvoicePreview invoice={mockInvoice} />)

      await waitFor(() => {
        expect(screen.getByText('50%')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /zoom in/i }))

      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('disables zoom out at minimum zoom', async () => {
      mockGeneratePDFBlob.mockResolvedValue(new Blob(['pdf content'], { type: 'application/pdf' }))

      render(<InvoicePreview invoice={mockInvoice} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /zoom out/i })).toBeDisabled()
      })
    })
  })

  describe('Security', () => {
    it('uses object tag for secure PDF rendering with iframe fallback', async () => {
      mockGeneratePDFBlob.mockResolvedValue(new Blob(['pdf content'], { type: 'application/pdf' }))

      render(<InvoicePreview invoice={mockInvoice} />)

      await waitFor(() => {
        // Find object and iframe elements by title
        const elements = screen.getAllByTitle('Invoice Preview')
        const objectElement = elements.find(el => el.tagName.toLowerCase() === 'object')
        const iframeElement = elements.find(el => el.tagName.toLowerCase() === 'iframe')

        // Primary: object tag for native PDF rendering (no sandbox needed)
        expect(objectElement).toBeTruthy()
        expect(objectElement).toHaveAttribute('type', 'application/pdf')

        // Fallback: iframe with restrictive sandbox (allow-same-origin only)
        expect(iframeElement).toBeTruthy()
        expect(iframeElement).toHaveAttribute('sandbox', 'allow-same-origin')
      })
    })
  })

  describe('Accessibility', () => {
    it('zoom buttons have aria-labels', async () => {
      mockGeneratePDFBlob.mockResolvedValue(new Blob(['pdf content'], { type: 'application/pdf' }))

      render(<InvoicePreview invoice={mockInvoice} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /zoom out/i })).toHaveAttribute('aria-label')
        expect(screen.getByRole('button', { name: /zoom in/i })).toHaveAttribute('aria-label')
        expect(screen.getByRole('button', { name: /reset zoom/i })).toHaveAttribute('aria-label')
      })
    })

    it('PDF viewer elements have title for accessibility', async () => {
      mockGeneratePDFBlob.mockResolvedValue(new Blob(['pdf content'], { type: 'application/pdf' }))

      render(<InvoicePreview invoice={mockInvoice} />)

      await waitFor(() => {
        const elements = screen.getAllByTitle('Invoice Preview')
        expect(elements.length).toBeGreaterThan(0)
      })
    })
  })
})
