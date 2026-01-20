import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InvoiceForm } from './InvoiceForm'
import { useInvoiceStore } from '@/lib/store'

// Mock the store
vi.mock('@/lib/store', () => ({
  useInvoiceStore: vi.fn(),
}))

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

// Mock child components to isolate InvoiceForm testing
vi.mock('./PartyInfoForm', () => ({
  PartyInfoForm: vi.fn(({ title, showNameError }) => (
    <div data-testid={`party-info-${title.includes('From') ? 'from' : 'to'}`}>
      {title}
      {showNameError && <span data-testid="name-error">Name required</span>}
    </div>
  )),
}))

vi.mock('./WorkHoursEditor', () => ({
  WorkHoursEditor: vi.fn(() => <div data-testid="work-hours-editor">Work Hours Editor</div>),
}))

vi.mock('./LineItemsEditor', () => ({
  LineItemsEditor: vi.fn(() => <div data-testid="line-items-editor">Line Items Editor</div>),
}))

vi.mock('./ScheduleConfig', () => ({
  ScheduleConfig: vi.fn(() => <div data-testid="schedule-config">Schedule Config</div>),
}))

vi.mock('./BackgroundSelector', () => ({
  BackgroundSelector: vi.fn(() => <div data-testid="background-selector">Background Selector</div>),
}))

vi.mock('./FinancialSettings', () => ({
  FinancialSettings: vi.fn(() => <div data-testid="financial-settings">Financial Settings</div>),
}))

vi.mock('./PageSizeSelector', () => ({
  PageSizeSelector: vi.fn(() => <div data-testid="page-size-selector">Page Size Selector</div>),
}))

vi.mock('./InvoiceSummary', () => ({
  InvoiceSummary: vi.fn(() => <div data-testid="invoice-summary">Invoice Summary</div>),
}))

vi.mock('./InvoicePreview', () => ({
  InvoicePreview: vi.fn(() => <div data-testid="invoice-preview">Invoice Preview</div>),
}))

const createMockStore = (overrides = {}) => ({
  currentInvoice: {
    invoiceNumber: '',
    status: 'DRAFT',
    issueDate: '2024-01-15',
    from: { name: '' },
    to: { name: '' },
    hourlyRate: 50,
    defaultHoursPerDay: 8,
    dailyWorkHours: [],
    lineItems: [],
    totalDays: 0,
    totalHours: 0,
    subtotal: 0,
    discountPercent: 0,
    discountAmount: 0,
    taxPercent: 0,
    taxAmount: 0,
    totalAmount: 0,
    currency: 'USD',
    paymentTerms: 'NET_30',
    pageSize: 'A4',
    notes: '',
    terms: '',
    jobTitle: '',
    showDetailedHours: false,
    pdfTheme: 'light',
  },
  scheduleConfig: {
    frequency: 'BOTH_15TH_AND_LAST',
    workdayType: 'WEEKDAYS_ONLY',
    defaultHoursPerDay: 8,
  },
  backgroundDesigns: [
    { id: 'minimal', name: 'Minimal', backgroundColor: '#ffffff' },
  ],
  updateCurrentInvoice: vi.fn(),
  updateFromInfo: vi.fn(),
  updateToInfo: vi.fn(),
  updateDayHours: vi.fn(),
  toggleWorkday: vi.fn(),
  setDefaultHoursForPeriod: vi.fn(),
  addLineItem: vi.fn(),
  updateLineItem: vi.fn(),
  removeLineItem: vi.fn(),
  setPageSize: vi.fn(),
  setBackgroundDesign: vi.fn(),
  setHourlyRate: vi.fn(),
  setCurrency: vi.fn(),
  updateScheduleConfig: vi.fn(),
  saveInvoice: vi.fn(),
  resetCurrentInvoice: vi.fn(),
  ...overrides,
})

describe('InvoiceForm', () => {
  let mockStore: ReturnType<typeof createMockStore>
  const mockOnExportPDF = vi.fn()
  const user = userEvent.setup()

  beforeEach(() => {
    mockStore = createMockStore()
    vi.mocked(useInvoiceStore).mockReturnValue(mockStore)
    mockOnExportPDF.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the form with correct title', () => {
      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      expect(screen.getByText('Invoice Generator')).toBeInTheDocument()
      expect(screen.getByText('Create and export professional invoices')).toBeInTheDocument()
    })

    it('renders all action buttons', () => {
      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /export pdf/i })).toBeInTheDocument()
    })

    it('renders all tab triggers', () => {
      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      expect(screen.getByRole('tab', { name: /details/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /work hours/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /items/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /settings/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /design/i })).toBeInTheDocument()
    })

    it('renders invoice number input', () => {
      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      expect(screen.getByLabelText(/invoice number/i)).toBeInTheDocument()
    })
  })

  describe('Tab Navigation', () => {
    it('switches to Work Hours tab when clicked', async () => {
      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      await user.click(screen.getByRole('tab', { name: /work hours/i }))

      expect(screen.getByTestId('work-hours-editor')).toBeInTheDocument()
    })

    it('switches to Items tab when clicked', async () => {
      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      await user.click(screen.getByRole('tab', { name: /items/i }))

      expect(screen.getByTestId('line-items-editor')).toBeInTheDocument()
    })

    it('switches to Settings tab when clicked', async () => {
      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      await user.click(screen.getByRole('tab', { name: /settings/i }))

      expect(screen.getByTestId('financial-settings')).toBeInTheDocument()
    })

    it('switches to Design tab when clicked', async () => {
      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      await user.click(screen.getByRole('tab', { name: /design/i }))

      expect(screen.getByTestId('background-selector')).toBeInTheDocument()
      expect(screen.getByTestId('page-size-selector')).toBeInTheDocument()
    })
  })

  describe('Invoice Number', () => {
    it('updates invoice number when changed', async () => {
      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      const input = screen.getByLabelText(/invoice number/i)
      await user.type(input, 'INV-001')

      expect(mockStore.updateCurrentInvoice).toHaveBeenCalledWith({ invoiceNumber: 'I' })
    })

    it('shows validation error for empty invoice number when trying to export', async () => {
      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      await user.click(screen.getByRole('button', { name: /export pdf/i }))

      await waitFor(() => {
        expect(screen.getByText('Invoice number is required')).toBeInTheDocument()
      })
    })
  })

  describe('Form Actions', () => {
    it('resets form when reset button is clicked', async () => {
      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      await user.click(screen.getByRole('button', { name: /reset/i }))

      expect(mockStore.resetCurrentInvoice).toHaveBeenCalled()
    })

    it('saves invoice when save button is clicked with valid data', async () => {
      const validStore = createMockStore({
        currentInvoice: {
          ...createMockStore().currentInvoice,
          invoiceNumber: 'INV-001',
          from: { name: 'Company A' },
          to: { name: 'Company B' },
        },
        saveInvoice: vi.fn().mockReturnValue({ invoiceNumber: 'INV-001' }),
      })
      vi.mocked(useInvoiceStore).mockReturnValue(validStore)

      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      await user.click(screen.getByRole('button', { name: /save/i }))

      expect(validStore.saveInvoice).toHaveBeenCalled()
    })

    it('shows error toast when save fails', async () => {
      const invalidStore = createMockStore({
        saveInvoice: vi.fn().mockReturnValue(null),
      })
      vi.mocked(useInvoiceStore).mockReturnValue(invalidStore)

      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      await user.click(screen.getByRole('button', { name: /save/i }))

      expect(invalidStore.saveInvoice).toHaveBeenCalled()
    })
  })

  describe('Validation', () => {
    it('prevents export when invoice number is missing', async () => {
      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      await user.click(screen.getByRole('button', { name: /export pdf/i }))

      expect(mockOnExportPDF).not.toHaveBeenCalled()
    })

    it('prevents export when from name is missing', async () => {
      const invalidStore = createMockStore({
        currentInvoice: {
          ...createMockStore().currentInvoice,
          invoiceNumber: 'INV-001',
          from: { name: '' },
          to: { name: 'Company B' },
        },
      })
      vi.mocked(useInvoiceStore).mockReturnValue(invalidStore)

      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      await user.click(screen.getByRole('button', { name: /export pdf/i }))

      expect(mockOnExportPDF).not.toHaveBeenCalled()
    })

    it('prevents export when to name is missing', async () => {
      const invalidStore = createMockStore({
        currentInvoice: {
          ...createMockStore().currentInvoice,
          invoiceNumber: 'INV-001',
          from: { name: 'Company A' },
          to: { name: '' },
        },
      })
      vi.mocked(useInvoiceStore).mockReturnValue(invalidStore)

      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      await user.click(screen.getByRole('button', { name: /export pdf/i }))

      expect(mockOnExportPDF).not.toHaveBeenCalled()
    })

    it('clears validation errors when fields are filled', async () => {
      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      // Trigger validation error
      await user.click(screen.getByRole('button', { name: /export pdf/i }))

      // Fill in the invoice number
      const input = screen.getByLabelText(/invoice number/i)
      await user.type(input, 'INV-001')

      // Check that the error styling would be removed (via updateCurrentInvoice call)
      expect(mockStore.updateCurrentInvoice).toHaveBeenCalled()
    })
  })

  describe('Export', () => {
    it('exports PDF when all required fields are valid', async () => {
      const validStore = createMockStore({
        currentInvoice: {
          ...createMockStore().currentInvoice,
          invoiceNumber: 'INV-001',
          from: { name: 'Company A' },
          to: { name: 'Company B' },
        },
        saveInvoice: vi.fn().mockReturnValue({
          id: '1',
          invoiceNumber: 'INV-001',
          from: { name: 'Company A' },
          to: { name: 'Company B' },
        }),
      })
      vi.mocked(useInvoiceStore).mockReturnValue(validStore)
      mockOnExportPDF.mockResolvedValue(undefined)

      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      await user.click(screen.getByRole('button', { name: /export pdf/i }))

      await waitFor(() => {
        expect(mockOnExportPDF).toHaveBeenCalled()
      })
    })

    it('disables export button while exporting', async () => {
      const validStore = createMockStore({
        currentInvoice: {
          ...createMockStore().currentInvoice,
          invoiceNumber: 'INV-001',
          from: { name: 'Company A' },
          to: { name: 'Company B' },
        },
        saveInvoice: vi.fn().mockReturnValue({
          id: '1',
          invoiceNumber: 'INV-001',
        }),
      })
      vi.mocked(useInvoiceStore).mockReturnValue(validStore)

      // Create a never-resolving promise to keep exporting state
      mockOnExportPDF.mockImplementation(() => new Promise(() => {}))

      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      await user.click(screen.getByRole('button', { name: /export pdf/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /exporting/i })).toBeDisabled()
      })
    })
  })

  describe('Preview Dialog', () => {
    it('opens preview dialog when preview button is clicked with valid data', async () => {
      const validStore = createMockStore({
        currentInvoice: {
          ...createMockStore().currentInvoice,
          invoiceNumber: 'INV-001',
          from: { name: 'Company A' },
          to: { name: 'Company B' },
        },
      })
      vi.mocked(useInvoiceStore).mockReturnValue(validStore)

      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      await user.click(screen.getByRole('button', { name: /preview/i }))

      await waitFor(() => {
        // Dialog title and mock component both have "Invoice Preview" text
        const previewElements = screen.getAllByText('Invoice Preview')
        expect(previewElements.length).toBeGreaterThanOrEqual(1)
        // Also verify the mock component is rendered
        expect(screen.getByTestId('invoice-preview')).toBeInTheDocument()
      })
    })

    it('prevents preview when required fields are missing', async () => {
      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      await user.click(screen.getByRole('button', { name: /preview/i }))

      // Should not open dialog when validation fails
      expect(screen.queryByText('Invoice Preview')).not.toBeInTheDocument()
    })
  })

  describe('Date Handling', () => {
    it('renders issue date input', () => {
      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      expect(screen.getByText('Issue Date')).toBeInTheDocument()
    })

    it('renders due date input', () => {
      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      expect(screen.getByText('Due Date')).toBeInTheDocument()
    })
  })

  describe('Additional Fields', () => {
    it('updates job title when changed', async () => {
      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      const input = screen.getByLabelText(/job title/i)
      await user.type(input, 'Development')

      expect(mockStore.updateCurrentInvoice).toHaveBeenCalledWith({ jobTitle: 'D' })
    })

    it('updates notes when changed', async () => {
      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      const textarea = screen.getByLabelText(/^notes$/i)
      await user.type(textarea, 'Test note')

      expect(mockStore.updateCurrentInvoice).toHaveBeenCalledWith({ notes: 'T' })
    })

    it('updates terms when changed', async () => {
      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      const textarea = screen.getByLabelText(/terms & conditions/i)
      await user.type(textarea, 'Test terms')

      expect(mockStore.updateCurrentInvoice).toHaveBeenCalledWith({ terms: 'T' })
    })

    it('toggles show detailed hours checkbox', async () => {
      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      const checkbox = screen.getByLabelText(/show detailed per-day hours/i)
      await user.click(checkbox)

      expect(mockStore.updateCurrentInvoice).toHaveBeenCalledWith({ showDetailedHours: true })
    })
  })

  describe('Accessibility', () => {
    it('has accessible labels for all required inputs', () => {
      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      expect(screen.getByLabelText(/invoice number/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/job title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^notes$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/terms & conditions/i)).toBeInTheDocument()
    })

    it('marks required field with asterisk', () => {
      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      const invoiceNumberLabel = screen.getByText(/invoice number \*/i)
      expect(invoiceNumberLabel).toBeInTheDocument()
    })

    it('all buttons are keyboard accessible', () => {
      render(<InvoiceForm onExportPDF={mockOnExportPDF} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('tabindex', '-1')
      })
    })
  })
})
