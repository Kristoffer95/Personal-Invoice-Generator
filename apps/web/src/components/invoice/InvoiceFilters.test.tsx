import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InvoiceFilters, InvoiceStatusFilter, defaultFilters, type InvoiceFiltersState } from './InvoiceFilters'

// Mock the TagSelector component
vi.mock('@/components/tags/TagSelector', () => ({
  TagSelector: ({ selectedTags, onChange }: { selectedTags: string[]; onChange: (tags: string[]) => void }) => (
    <div data-testid="tag-selector">
      <span>Tags: {selectedTags.length}</span>
      <button onClick={() => onChange(['tag_1'])}>Select Tag</button>
    </div>
  ),
}))

describe('InvoiceFilters', () => {
  const mockOnChange = vi.fn()
  const mockOnClear = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the search input', () => {
    render(
      <InvoiceFilters
        filters={defaultFilters}
        onChange={mockOnChange}
        onClear={mockOnClear}
      />
    )

    expect(screen.getByPlaceholderText('Search invoices...')).toBeInTheDocument()
  })

  it('renders the filters button', () => {
    render(
      <InvoiceFilters
        filters={defaultFilters}
        onChange={mockOnChange}
        onClear={mockOnClear}
      />
    )

    expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument()
  })

  it('updates search query on input', () => {
    render(
      <InvoiceFilters
        filters={defaultFilters}
        onChange={mockOnChange}
        onClear={mockOnClear}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search invoices...')
    fireEvent.change(searchInput, { target: { value: 'test search' } })

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultFilters,
      searchQuery: 'test search',
    })
  })

  it('shows active filter count badge when filters are active', () => {
    const activeFilters: InvoiceFiltersState = {
      ...defaultFilters,
      searchQuery: 'test',
      statuses: ['PAID'],
    }

    render(
      <InvoiceFilters
        filters={activeFilters}
        onChange={mockOnChange}
        onClear={mockOnClear}
      />
    )

    // Should show badge with count (2 filters: searchQuery and statuses)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows clear button when filters are active', () => {
    const activeFilters: InvoiceFiltersState = {
      ...defaultFilters,
      searchQuery: 'test',
    }

    render(
      <InvoiceFilters
        filters={activeFilters}
        onChange={mockOnChange}
        onClear={mockOnClear}
      />
    )

    const clearButton = screen.getByRole('button', { name: /clear/i })
    expect(clearButton).toBeInTheDocument()

    fireEvent.click(clearButton)
    expect(mockOnClear).toHaveBeenCalled()
  })

  it('does not show clear button when no filters are active', () => {
    render(
      <InvoiceFilters
        filters={defaultFilters}
        onChange={mockOnChange}
        onClear={mockOnClear}
      />
    )

    // The clear button that appears when filters are active should not be present
    const buttons = screen.getAllByRole('button')
    const clearButton = buttons.find(btn => btn.textContent?.toLowerCase().includes('clear'))
    expect(clearButton).toBeUndefined()
  })

  it('opens filter sheet when filters button is clicked', async () => {
    render(
      <InvoiceFilters
        filters={defaultFilters}
        onChange={mockOnChange}
        onClear={mockOnClear}
      />
    )

    const filtersButton = screen.getByRole('button', { name: /filters/i })
    fireEvent.click(filtersButton)

    await waitFor(() => {
      expect(screen.getByText('Filter Invoices')).toBeInTheDocument()
    })
  })

  it('shows all status options in the filter sheet', async () => {
    render(
      <InvoiceFilters
        filters={defaultFilters}
        onChange={mockOnChange}
        onClear={mockOnClear}
      />
    )

    const filtersButton = screen.getByRole('button', { name: /filters/i })
    fireEvent.click(filtersButton)

    await waitFor(() => {
      expect(screen.getByText('Draft')).toBeInTheDocument()
      expect(screen.getByText('To Send')).toBeInTheDocument()
      expect(screen.getByText('Paid')).toBeInTheDocument()
      expect(screen.getByText('Overdue')).toBeInTheDocument()
    })
  })

  it('toggles status filter when clicked', async () => {
    render(
      <InvoiceFilters
        filters={defaultFilters}
        onChange={mockOnChange}
        onClear={mockOnClear}
      />
    )

    // Open sheet
    const filtersButton = screen.getByRole('button', { name: /filters/i })
    fireEvent.click(filtersButton)

    await waitFor(() => {
      expect(screen.getByText('Paid')).toBeInTheDocument()
    })

    // Click on Paid status
    fireEvent.click(screen.getByText('Paid'))

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultFilters,
      statuses: ['PAID'],
    })
  })

  it('shows date range inputs in filter sheet', async () => {
    render(
      <InvoiceFilters
        filters={defaultFilters}
        onChange={mockOnChange}
        onClear={mockOnClear}
      />
    )

    const filtersButton = screen.getByRole('button', { name: /filters/i })
    fireEvent.click(filtersButton)

    await waitFor(() => {
      expect(screen.getByText('Date Range')).toBeInTheDocument()
      expect(screen.getByText('From')).toBeInTheDocument()
      expect(screen.getByText('To')).toBeInTheDocument()
    })
  })

  it('shows amount range inputs in filter sheet', async () => {
    render(
      <InvoiceFilters
        filters={defaultFilters}
        onChange={mockOnChange}
        onClear={mockOnClear}
      />
    )

    const filtersButton = screen.getByRole('button', { name: /filters/i })
    fireEvent.click(filtersButton)

    await waitFor(() => {
      expect(screen.getByText('Amount Range')).toBeInTheDocument()
      expect(screen.getByText('Min')).toBeInTheDocument()
      expect(screen.getByText('Max')).toBeInTheDocument()
    })
  })

  it('shows archive toggle in filter sheet', async () => {
    render(
      <InvoiceFilters
        filters={defaultFilters}
        onChange={mockOnChange}
        onClear={mockOnClear}
      />
    )

    const filtersButton = screen.getByRole('button', { name: /filters/i })
    fireEvent.click(filtersButton)

    await waitFor(() => {
      expect(screen.getByText('Show Archived')).toBeInTheDocument()
    })
  })

  it('calls onClear when Clear All button is clicked in sheet', async () => {
    render(
      <InvoiceFilters
        filters={defaultFilters}
        onChange={mockOnChange}
        onClear={mockOnClear}
      />
    )

    const filtersButton = screen.getByRole('button', { name: /filters/i })
    fireEvent.click(filtersButton)

    await waitFor(() => {
      expect(screen.getByText('Clear All')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Clear All'))
    expect(mockOnClear).toHaveBeenCalled()
  })

  it('counts multiple filter types correctly', () => {
    const complexFilters: InvoiceFiltersState = {
      searchQuery: 'test',
      statuses: ['PAID', 'SENT'],
      tags: ['tag_1'] as any,
      dateFrom: '2024-01-01',
      dateTo: '2024-12-31',
      amountMin: 100,
      amountMax: 1000,
      showArchived: true,
    }

    render(
      <InvoiceFilters
        filters={complexFilters}
        onChange={mockOnChange}
        onClear={mockOnClear}
      />
    )

    // All 8 filter criteria should be counted
    expect(screen.getByText('8')).toBeInTheDocument()
  })
})

describe('InvoiceStatusFilter', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all status options', () => {
    render(
      <InvoiceStatusFilter
        selectedStatuses={[]}
        onChange={mockOnChange}
      />
    )

    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText('Paid')).toBeInTheDocument()
    expect(screen.getByText('Sent')).toBeInTheDocument()
    expect(screen.getByText('Overdue')).toBeInTheDocument()
  })

  it('adds status when clicked', () => {
    render(
      <InvoiceStatusFilter
        selectedStatuses={[]}
        onChange={mockOnChange}
      />
    )

    fireEvent.click(screen.getByText('Paid'))
    expect(mockOnChange).toHaveBeenCalledWith(['PAID'])
  })

  it('removes status when already selected', () => {
    render(
      <InvoiceStatusFilter
        selectedStatuses={['PAID', 'SENT']}
        onChange={mockOnChange}
      />
    )

    fireEvent.click(screen.getByText('Paid'))
    expect(mockOnChange).toHaveBeenCalledWith(['SENT'])
  })

  it('allows multiple status selections', () => {
    render(
      <InvoiceStatusFilter
        selectedStatuses={['PAID']}
        onChange={mockOnChange}
      />
    )

    fireEvent.click(screen.getByText('Sent'))
    expect(mockOnChange).toHaveBeenCalledWith(['PAID', 'SENT'])
  })
})

describe('defaultFilters', () => {
  it('has correct default values', () => {
    expect(defaultFilters).toEqual({
      searchQuery: '',
      statuses: [],
      tags: [],
      dateFrom: '',
      dateTo: '',
      amountMin: undefined,
      amountMax: undefined,
      showArchived: false,
    })
  })
})
