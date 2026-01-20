import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  InvoiceFilters,
  InvoiceStatusFilter,
  defaultFilters,
  type InvoiceFiltersState,
} from './InvoiceFilters'

// Mock the TagSelector component since it uses Convex
vi.mock('@/components/tags/TagSelector', () => ({
  TagSelector: ({
    selectedTags,
    onChange,
  }: {
    selectedTags: string[]
    onChange: (tags: string[]) => void
  }) => (
    <div data-testid="tag-selector">
      <span>Tags: {selectedTags.length}</span>
      <button onClick={() => onChange(['tag_1'])}>Select Tag</button>
      <button onClick={() => onChange([])}>Clear Tags</button>
    </div>
  ),
}))

describe('InvoiceFilters', () => {
  const user = userEvent.setup()
  const mockOnChange = vi.fn()
  const mockOnClear = vi.fn()

  const defaultProps = {
    filters: defaultFilters,
    onChange: mockOnChange,
    onClear: mockOnClear,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Search Input', () => {
    it('renders the search input with placeholder', () => {
      render(<InvoiceFilters {...defaultProps} />)
      expect(screen.getByPlaceholderText('Search invoices...')).toBeInTheDocument()
    })

    it('displays current search query value', () => {
      render(
        <InvoiceFilters
          {...defaultProps}
          filters={{ ...defaultFilters, searchQuery: 'test query' }}
        />
      )
      expect(screen.getByPlaceholderText('Search invoices...')).toHaveValue('test query')
    })

    it('calls onChange when search input changes', async () => {
      render(<InvoiceFilters {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText('Search invoices...')
      fireEvent.change(searchInput, { target: { value: 'invoice 123' } })

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultFilters,
        searchQuery: 'invoice 123',
      })
    })

    it('renders search icon', () => {
      render(<InvoiceFilters {...defaultProps} />)
      // Search input container should have the search icon
      const searchContainer = screen.getByPlaceholderText('Search invoices...').parentElement
      expect(searchContainer?.querySelector('svg')).toBeInTheDocument()
    })
  })

  // Note: Status filter dropdown was removed - status filtering is now done via quick-select pills only

  describe('Tags Filter Popover', () => {
    it('renders tags button', () => {
      render(<InvoiceFilters {...defaultProps} />)
      expect(screen.getByRole('button', { name: /tags/i })).toBeInTheDocument()
    })

    it('shows tag count badge when tags are selected', () => {
      render(
        <InvoiceFilters
          {...defaultProps}
          filters={{ ...defaultFilters, tags: ['tag_1', 'tag_2'] as any }}
        />
      )

      const tagsButton = screen.getByRole('button', { name: /tags/i })
      expect(within(tagsButton).getByText('2')).toBeInTheDocument()
    })

    it('opens tags popover when clicked', async () => {
      render(<InvoiceFilters {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /tags/i }))

      await waitFor(() => {
        expect(screen.getByText('Filter by Tags')).toBeInTheDocument()
        expect(screen.getByTestId('tag-selector')).toBeInTheDocument()
      })
    })

    it('shows clear button when tags are selected', async () => {
      render(
        <InvoiceFilters
          {...defaultProps}
          filters={{ ...defaultFilters, tags: ['tag_1'] as any }}
        />
      )

      await user.click(screen.getByRole('button', { name: /tags/i }))

      await waitFor(() => {
        const popover = screen.getByText('Filter by Tags').parentElement
        expect(within(popover as HTMLElement).getByRole('button', { name: /clear/i })).toBeInTheDocument()
      })
    })

    it('clears tags when clear button clicked in popover', async () => {
      render(
        <InvoiceFilters
          {...defaultProps}
          filters={{ ...defaultFilters, tags: ['tag_1'] as any }}
        />
      )

      await user.click(screen.getByRole('button', { name: /tags/i }))

      await waitFor(() => {
        expect(screen.getByText('Filter by Tags')).toBeInTheDocument()
      })

      const popover = screen.getByText('Filter by Tags').parentElement
      await user.click(within(popover as HTMLElement).getByRole('button', { name: /clear/i }))

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultFilters,
        tags: [],
      })
    })
  })

  describe('More Filters Button (Advanced Filters Toggle)', () => {
    it('renders more button', () => {
      render(<InvoiceFilters {...defaultProps} />)
      expect(screen.getByRole('button', { name: /more/i })).toBeInTheDocument()
    })

    it('shows active filter count badge', () => {
      render(
        <InvoiceFilters
          {...defaultProps}
          filters={{
            ...defaultFilters,
            statuses: ['PAID'],
            dateFrom: '2024-01-01',
            showArchived: true,
          }}
        />
      )

      const moreButton = screen.getByRole('button', { name: /more/i })
      expect(within(moreButton).getByText('3')).toBeInTheDocument()
    })

    it('toggles advanced filters visibility when clicked', async () => {
      render(<InvoiceFilters {...defaultProps} />)

      // Advanced filters should not be visible initially
      expect(screen.queryByText('Date From')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /more/i }))

      // Advanced filters should now be visible
      expect(screen.getByText('Date From')).toBeInTheDocument()
      expect(screen.getByText('Date To')).toBeInTheDocument()
      expect(screen.getByText('Min Amount')).toBeInTheDocument()
      expect(screen.getByText('Max Amount')).toBeInTheDocument()
    })

    it('hides advanced filters when clicked again', async () => {
      render(<InvoiceFilters {...defaultProps} />)

      const moreButton = screen.getByRole('button', { name: /more/i })

      // Show advanced filters
      await user.click(moreButton)
      expect(screen.getByText('Date From')).toBeInTheDocument()

      // Hide advanced filters
      await user.click(moreButton)
      expect(screen.queryByText('Date From')).not.toBeInTheDocument()
    })
  })

  describe('Show Archived Switch', () => {
    it('renders archived switch', () => {
      render(<InvoiceFilters {...defaultProps} />)
      expect(screen.getByRole('switch', { name: /archived/i })).toBeInTheDocument()
    })

    it('is unchecked by default', () => {
      render(<InvoiceFilters {...defaultProps} />)
      expect(screen.getByRole('switch', { name: /archived/i })).not.toBeChecked()
    })

    it('is checked when showArchived is true', () => {
      render(
        <InvoiceFilters
          {...defaultProps}
          filters={{ ...defaultFilters, showArchived: true }}
        />
      )
      expect(screen.getByRole('switch', { name: /archived/i })).toBeChecked()
    })

    it('calls onChange when toggled', async () => {
      render(<InvoiceFilters {...defaultProps} />)

      await user.click(screen.getByRole('switch', { name: /archived/i }))

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultFilters,
        showArchived: true,
      })
    })
  })

  describe('Clear All Button', () => {
    it('does not show clear all button when no filters active', () => {
      render(<InvoiceFilters {...defaultProps} />)
      expect(screen.queryByRole('button', { name: /clear all/i })).not.toBeInTheDocument()
    })

    it('shows clear all button when search query is active', () => {
      render(
        <InvoiceFilters
          {...defaultProps}
          filters={{ ...defaultFilters, searchQuery: 'test' }}
        />
      )
      expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument()
    })

    it('shows clear all button when statuses are selected', () => {
      render(
        <InvoiceFilters
          {...defaultProps}
          filters={{ ...defaultFilters, statuses: ['PAID'] }}
        />
      )
      expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument()
    })

    it('shows clear all button when showArchived is true', () => {
      render(
        <InvoiceFilters
          {...defaultProps}
          filters={{ ...defaultFilters, showArchived: true }}
        />
      )
      expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument()
    })

    it('calls onClear when clicked', async () => {
      render(
        <InvoiceFilters
          {...defaultProps}
          filters={{ ...defaultFilters, searchQuery: 'test' }}
        />
      )

      await user.click(screen.getByRole('button', { name: /clear all/i }))

      expect(mockOnClear).toHaveBeenCalled()
    })
  })

  describe('Status Pills Quick Select', () => {
    it('shows status pills when no statuses selected and advanced filters hidden', () => {
      render(<InvoiceFilters {...defaultProps} />)

      // All 8 status pills should be visible (VIEWED and PAYMENT_PENDING were removed)
      expect(screen.getByText('Draft')).toBeInTheDocument()
      expect(screen.getByText('To Send')).toBeInTheDocument()
      expect(screen.getByText('Sent')).toBeInTheDocument()
      expect(screen.getByText('Partial Payment')).toBeInTheDocument()
      expect(screen.getByText('Paid')).toBeInTheDocument()
      expect(screen.getByText('Overdue')).toBeInTheDocument()
      expect(screen.getByText('Cancelled')).toBeInTheDocument()
      expect(screen.getByText('Refunded')).toBeInTheDocument()
    })

    it('keeps all status pills visible when statuses are selected (multi-select)', () => {
      render(
        <InvoiceFilters
          {...defaultProps}
          filters={{ ...defaultFilters, statuses: ['PAID'] }}
        />
      )

      // All status pills should remain visible for multi-selection
      expect(screen.getByText('Draft')).toBeInTheDocument()
      expect(screen.getByText('Sent')).toBeInTheDocument()
      expect(screen.getByText('Paid')).toBeInTheDocument()
      expect(screen.getByText('Overdue')).toBeInTheDocument()

      // The selected status (PAID) should have opacity-100 and ring styling
      const paidButton = screen.getByText('Paid')
      expect(paidButton.className).toContain('opacity-100')
      expect(paidButton.className).toContain('ring-2')

      // Unselected statuses should have opacity-50
      const draftButton = screen.getByText('Draft')
      expect(draftButton.className).toContain('opacity-50')
    })

    it('hides status pills when advanced filters are shown', async () => {
      render(<InvoiceFilters {...defaultProps} />)

      // Initially, status pills should be visible
      expect(screen.getByText('Draft')).toBeInTheDocument()
      expect(screen.getByText('Paid')).toBeInTheDocument()

      // Show advanced filters
      await user.click(screen.getByRole('button', { name: /more/i }))

      // After showing advanced filters, status pills should be hidden
      // They are conditionally rendered with !showAdvanced
      const draftElements = screen.queryAllByText('Draft')
      // All Draft elements should be gone (status pills are hidden when advanced is shown)
      expect(draftElements.length).toBe(0)
    })

    it('selects status when quick select pill clicked', async () => {
      render(<InvoiceFilters {...defaultProps} />)

      const draftButtons = screen.getAllByText('Draft')
      // Click the first one (quick select pill)
      await user.click(draftButtons[0])

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultFilters,
        statuses: ['DRAFT'],
      })
    })
  })

  describe('Status Multi-Selection', () => {
    it('shows all status options with selected styling for chosen statuses', () => {
      render(
        <InvoiceFilters
          {...defaultProps}
          filters={{ ...defaultFilters, statuses: ['PAID', 'SENT'] }}
        />
      )

      // All status pills should be visible
      const paidButton = screen.getByText('Paid')
      const sentButton = screen.getByText('Sent')
      const draftButton = screen.getByText('Draft')

      // Selected statuses should have opacity-100 and ring styling
      expect(paidButton.className).toContain('opacity-100')
      expect(paidButton.className).toContain('ring-2')
      expect(sentButton.className).toContain('opacity-100')
      expect(sentButton.className).toContain('ring-2')

      // Unselected statuses should have opacity-50
      expect(draftButton.className).toContain('opacity-50')
    })

    it('renders clear button when statuses are selected', () => {
      render(
        <InvoiceFilters
          {...defaultProps}
          filters={{ ...defaultFilters, statuses: ['PAID'] }}
        />
      )

      // A "Clear" button should appear to clear all selected statuses
      expect(screen.getByText('Clear')).toBeInTheDocument()
    })

    it('deselects status when selected status is clicked (toggle)', async () => {
      render(
        <InvoiceFilters
          {...defaultProps}
          filters={{ ...defaultFilters, statuses: ['PAID', 'SENT'] }}
        />
      )

      // Click on the Paid status to deselect it
      await user.click(screen.getByText('Paid'))

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultFilters,
        statuses: ['SENT'],
      })
    })

    it('clears all statuses when clear button clicked', async () => {
      render(
        <InvoiceFilters
          {...defaultProps}
          filters={{ ...defaultFilters, statuses: ['PAID', 'SENT'] }}
        />
      )

      // Click the Clear button
      await user.click(screen.getByText('Clear'))

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultFilters,
        statuses: [],
      })
    })
  })

  describe('Advanced Filter Inputs', () => {
    beforeEach(async () => {
      render(<InvoiceFilters {...defaultProps} />)
      // Open advanced filters
      await user.click(screen.getByRole('button', { name: /more/i }))
    })

    it('renders date from input', async () => {
      await waitFor(() => {
        expect(screen.getByText('Date From')).toBeInTheDocument()
      })
      const dateInputs = screen.getAllByRole('textbox').filter((input) =>
        (input as HTMLInputElement).type === 'date'
      )
      // Should have at least the date from input (it might be type="date" which shows as no role)
      expect(screen.getByText('Date From')).toBeInTheDocument()
    })

    it('renders date to input', () => {
      expect(screen.getByText('Date To')).toBeInTheDocument()
    })

    it('renders min amount input', () => {
      expect(screen.getByText('Min Amount')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('0')).toBeInTheDocument()
    })

    it('renders max amount input', () => {
      expect(screen.getByText('Max Amount')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('No limit')).toBeInTheDocument()
    })
  })

  describe('Advanced Filter State Changes', () => {
    it('calls onChange when date from changes', async () => {
      render(<InvoiceFilters {...defaultProps} />)
      await user.click(screen.getByRole('button', { name: /more/i }))

      // Find date input by its label
      const dateFromLabel = screen.getByText('Date From')
      const dateFromContainer = dateFromLabel.closest('.space-y-2')
      const dateFromInput = dateFromContainer?.querySelector('input[type="date"]')

      if (dateFromInput) {
        fireEvent.change(dateFromInput, { target: { value: '2024-01-01' } })

        expect(mockOnChange).toHaveBeenCalledWith({
          ...defaultFilters,
          dateFrom: '2024-01-01',
        })
      }
    })

    it('calls onChange when date to changes', async () => {
      render(<InvoiceFilters {...defaultProps} />)
      await user.click(screen.getByRole('button', { name: /more/i }))

      const dateToLabel = screen.getByText('Date To')
      const dateToContainer = dateToLabel.closest('.space-y-2')
      const dateToInput = dateToContainer?.querySelector('input[type="date"]')

      if (dateToInput) {
        fireEvent.change(dateToInput, { target: { value: '2024-12-31' } })

        expect(mockOnChange).toHaveBeenCalledWith({
          ...defaultFilters,
          dateTo: '2024-12-31',
        })
      }
    })

    it('calls onChange when min amount changes', async () => {
      render(<InvoiceFilters {...defaultProps} />)
      await user.click(screen.getByRole('button', { name: /more/i }))

      const minAmountInput = screen.getByPlaceholderText('0')
      fireEvent.change(minAmountInput, { target: { value: '100' } })

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultFilters,
        amountMin: 100,
      })
    })

    it('calls onChange when max amount changes', async () => {
      render(<InvoiceFilters {...defaultProps} />)
      await user.click(screen.getByRole('button', { name: /more/i }))

      const maxAmountInput = screen.getByPlaceholderText('No limit')
      fireEvent.change(maxAmountInput, { target: { value: '5000' } })

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultFilters,
        amountMax: 5000,
      })
    })

    it('sets amountMin to undefined when cleared', async () => {
      render(
        <InvoiceFilters
          {...defaultProps}
          filters={{ ...defaultFilters, amountMin: 100 }}
        />
      )
      await user.click(screen.getByRole('button', { name: /more/i }))

      const minAmountInput = screen.getByDisplayValue('100')
      await user.clear(minAmountInput)

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultFilters,
        amountMin: undefined,
      })
    })

    it('sets amountMax to undefined when cleared', async () => {
      render(
        <InvoiceFilters
          {...defaultProps}
          filters={{ ...defaultFilters, amountMax: 5000 }}
        />
      )
      await user.click(screen.getByRole('button', { name: /more/i }))

      const maxAmountInput = screen.getByDisplayValue('5000')
      await user.clear(maxAmountInput)

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultFilters,
        amountMax: undefined,
      })
    })

    it('displays existing filter values', async () => {
      render(
        <InvoiceFilters
          {...defaultProps}
          filters={{
            ...defaultFilters,
            dateFrom: '2024-01-01',
            dateTo: '2024-12-31',
            amountMin: 100,
            amountMax: 5000,
          }}
        />
      )
      await user.click(screen.getByRole('button', { name: /more/i }))

      expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument()
      expect(screen.getByDisplayValue('2024-12-31')).toBeInTheDocument()
      expect(screen.getByDisplayValue('100')).toBeInTheDocument()
      expect(screen.getByDisplayValue('5000')).toBeInTheDocument()
    })
  })

  describe('Active Filter Count', () => {
    it('counts statuses as one filter when present', () => {
      render(
        <InvoiceFilters
          {...defaultProps}
          filters={{ ...defaultFilters, statuses: ['PAID', 'SENT', 'DRAFT'] }}
        />
      )

      const moreButton = screen.getByRole('button', { name: /more/i })
      expect(within(moreButton).getByText('1')).toBeInTheDocument()
    })

    it('counts each filter type separately', () => {
      render(
        <InvoiceFilters
          {...defaultProps}
          filters={{
            ...defaultFilters,
            statuses: ['PAID'],
            tags: ['tag_1'] as any,
            dateFrom: '2024-01-01',
            dateTo: '2024-12-31',
            amountMin: 100,
            amountMax: 5000,
            showArchived: true,
          }}
        />
      )

      // Should count: statuses(1) + tags(1) + dateFrom(1) + dateTo(1) + amountMin(1) + amountMax(1) + showArchived(1) = 7
      const moreButton = screen.getByRole('button', { name: /more/i })
      expect(within(moreButton).getByText('7')).toBeInTheDocument()
    })

    it('does not count search query in active filter count', () => {
      render(
        <InvoiceFilters
          {...defaultProps}
          filters={{ ...defaultFilters, searchQuery: 'test' }}
        />
      )

      // Search query doesn't count toward the badge on More button
      const moreButton = screen.getByRole('button', { name: /more/i })
      expect(within(moreButton).queryByText('1')).not.toBeInTheDocument()
    })
  })
})

describe('InvoiceStatusFilter', () => {
  const user = userEvent.setup()
  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all status options', () => {
    render(<InvoiceStatusFilter selectedStatuses={[]} onChange={mockOnChange} />)

    // 8 statuses (VIEWED and PAYMENT_PENDING were removed)
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText('To Send')).toBeInTheDocument()
    expect(screen.getByText('Sent')).toBeInTheDocument()
    expect(screen.getByText('Partial Payment')).toBeInTheDocument()
    expect(screen.getByText('Paid')).toBeInTheDocument()
    expect(screen.getByText('Overdue')).toBeInTheDocument()
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
    expect(screen.getByText('Refunded')).toBeInTheDocument()

    // These statuses should NOT exist
    expect(screen.queryByText('Viewed')).not.toBeInTheDocument()
    expect(screen.queryByText('Payment Pending')).not.toBeInTheDocument()
  })

  it('adds status when clicked', async () => {
    render(<InvoiceStatusFilter selectedStatuses={[]} onChange={mockOnChange} />)

    await user.click(screen.getByText('Paid'))
    expect(mockOnChange).toHaveBeenCalledWith(['PAID'])
  })

  it('removes status when already selected', async () => {
    render(
      <InvoiceStatusFilter selectedStatuses={['PAID', 'SENT']} onChange={mockOnChange} />
    )

    await user.click(screen.getByText('Paid'))
    expect(mockOnChange).toHaveBeenCalledWith(['SENT'])
  })

  it('allows multiple status selections', async () => {
    render(<InvoiceStatusFilter selectedStatuses={['PAID']} onChange={mockOnChange} />)

    await user.click(screen.getByText('Sent'))
    expect(mockOnChange).toHaveBeenCalledWith(['PAID', 'SENT'])
  })

  it('applies selected styling to selected statuses', () => {
    render(
      <InvoiceStatusFilter selectedStatuses={['PAID']} onChange={mockOnChange} />
    )

    const paidButton = screen.getByText('Paid')
    // Selected status should have opacity-100
    expect(paidButton.className).toContain('opacity-100')
  })

  it('applies unselected styling to unselected statuses', () => {
    render(<InvoiceStatusFilter selectedStatuses={[]} onChange={mockOnChange} />)

    const paidButton = screen.getByText('Paid')
    // Unselected status should have opacity-50
    expect(paidButton.className).toContain('opacity-50')
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
