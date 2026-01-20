import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LineItemsEditor } from './LineItemsEditor'
import type { LineItem, Currency } from '@invoice-generator/shared-types'

describe('LineItemsEditor', () => {
  const user = userEvent.setup()

  const defaultProps = {
    items: [] as LineItem[],
    currency: 'USD' as Currency,
    onAdd: vi.fn(),
    onUpdate: vi.fn(),
    onRemove: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the card with title and description', () => {
      render(<LineItemsEditor {...defaultProps} />)

      expect(screen.getByText('Additional Items')).toBeInTheDocument()
      expect(screen.getByText(/add extra charges or deductions/i)).toBeInTheDocument()
    })

    it('renders Add Item button', () => {
      render(<LineItemsEditor {...defaultProps} />)

      expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument()
    })

    it('shows empty state message when no items', () => {
      render(<LineItemsEditor {...defaultProps} />)

      expect(screen.getByText(/no additional items/i)).toBeInTheDocument()
      expect(screen.getByText(/click "add item"/i)).toBeInTheDocument()
    })
  })

  describe('Adding Items', () => {
    it('calls onAdd with default values when Add Item is clicked', async () => {
      render(<LineItemsEditor {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add item/i }))

      expect(defaultProps.onAdd).toHaveBeenCalledWith({
        description: '',
        quantity: 1,
        unitPrice: 0,
      })
    })
  })

  describe('With Items', () => {
    const itemsProps = {
      ...defaultProps,
      items: [
        { id: '1', description: 'Hosting Fee', quantity: 1, unitPrice: 50, amount: 50 },
        { id: '2', description: 'Domain Registration', quantity: 2, unitPrice: 15, amount: 30 },
      ],
    }

    it('renders all items', () => {
      render(<LineItemsEditor {...itemsProps} />)

      expect(screen.queryByText(/no additional items/i)).not.toBeInTheDocument()

      // Should have inputs for each item
      const descInputs = screen.getAllByPlaceholderText(/item description/i)
      expect(descInputs).toHaveLength(2)
    })

    it('displays item descriptions', () => {
      render(<LineItemsEditor {...itemsProps} />)

      expect(screen.getByDisplayValue('Hosting Fee')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Domain Registration')).toBeInTheDocument()
    })

    it('displays item quantities', () => {
      render(<LineItemsEditor {...itemsProps} />)

      // Check that quantity values are present
      const inputs = screen.getAllByRole('spinbutton')
      const quantityInputs = inputs.filter(input => input.getAttribute('step') === '0.5')
      expect(quantityInputs.length).toBeGreaterThan(0)
    })

    it('displays formatted amounts with currency symbol', () => {
      render(<LineItemsEditor {...itemsProps} />)

      expect(screen.getByText('$50.00')).toBeInTheDocument()
      expect(screen.getByText('$30.00')).toBeInTheDocument()
    })

    it('displays items total', () => {
      render(<LineItemsEditor {...itemsProps} />)

      expect(screen.getByText('Items Total')).toBeInTheDocument()
      expect(screen.getByText('$80.00')).toBeInTheDocument()
    })

    it('renders delete buttons for each item', () => {
      render(<LineItemsEditor {...itemsProps} />)

      const deleteButtons = screen.getAllByRole('button', { name: /remove item/i })
      expect(deleteButtons).toHaveLength(2)
    })
  })

  describe('Updating Items', () => {
    const itemsProps = {
      ...defaultProps,
      items: [
        { id: '1', description: 'Hosting Fee', quantity: 1, unitPrice: 50, amount: 50 },
      ],
    }

    it('calls onUpdate when description is changed', () => {
      render(<LineItemsEditor {...itemsProps} />)

      const descInput = screen.getByDisplayValue('Hosting Fee')
      fireEvent.change(descInput, { target: { value: 'New Description' } })

      expect(defaultProps.onUpdate).toHaveBeenCalledWith('1', { description: 'New Description' })
    })

    it('calls onUpdate when quantity is changed', () => {
      render(<LineItemsEditor {...itemsProps} />)

      // Find quantity inputs (step=0.5)
      const inputs = screen.getAllByRole('spinbutton')
      const quantityInput = inputs.find(input => input.getAttribute('step') === '0.5')

      expect(quantityInput).toBeDefined()
      fireEvent.change(quantityInput!, { target: { value: '3' } })

      expect(defaultProps.onUpdate).toHaveBeenCalledWith('1', { quantity: 3 })
    })

    it('calls onUpdate when unit price is changed', () => {
      render(<LineItemsEditor {...itemsProps} />)

      // Find unit price inputs (step=0.01)
      const inputs = screen.getAllByRole('spinbutton')
      const unitPriceInput = inputs.find(input => input.getAttribute('step') === '0.01')

      expect(unitPriceInput).toBeDefined()
      fireEvent.change(unitPriceInput!, { target: { value: '75' } })

      expect(defaultProps.onUpdate).toHaveBeenCalledWith('1', { unitPrice: 75 })
    })
  })

  describe('Removing Items', () => {
    const itemsProps = {
      ...defaultProps,
      items: [
        { id: '1', description: 'Hosting Fee', quantity: 1, unitPrice: 50, amount: 50 },
        { id: '2', description: 'Domain', quantity: 1, unitPrice: 15, amount: 15 },
      ],
    }

    it('calls onRemove with correct id when delete button is clicked', async () => {
      render(<LineItemsEditor {...itemsProps} />)

      const deleteButtons = screen.getAllByRole('button', { name: /remove item/i })
      await user.click(deleteButtons[0])

      expect(defaultProps.onRemove).toHaveBeenCalledWith('1')
    })

    it('removes correct item when multiple items exist', async () => {
      render(<LineItemsEditor {...itemsProps} />)

      const deleteButtons = screen.getAllByRole('button', { name: /remove item/i })
      await user.click(deleteButtons[1])

      expect(defaultProps.onRemove).toHaveBeenCalledWith('2')
    })
  })

  describe('Currency Formatting', () => {
    it('formats amounts in USD', () => {
      const props = {
        ...defaultProps,
        currency: 'USD' as Currency,
        items: [{ id: '1', description: 'Test', quantity: 1, unitPrice: 100, amount: 100 }],
      }

      render(<LineItemsEditor {...props} />)

      // Amount appears twice: line item and total
      const amounts = screen.getAllByText('$100.00')
      expect(amounts.length).toBeGreaterThanOrEqual(1)
    })

    it('formats amounts in EUR', () => {
      const props = {
        ...defaultProps,
        currency: 'EUR' as Currency,
        items: [{ id: '1', description: 'Test', quantity: 1, unitPrice: 100, amount: 100 }],
      }

      render(<LineItemsEditor {...props} />)

      // Amount appears twice: line item and total
      const amounts = screen.getAllByText('€100.00')
      expect(amounts.length).toBeGreaterThanOrEqual(1)
    })

    it('formats amounts in GBP', () => {
      const props = {
        ...defaultProps,
        currency: 'GBP' as Currency,
        items: [{ id: '1', description: 'Test', quantity: 1, unitPrice: 100, amount: 100 }],
      }

      render(<LineItemsEditor {...props} />)

      // Amount appears twice: line item and total
      const amounts = screen.getAllByText('£100.00')
      expect(amounts.length).toBeGreaterThanOrEqual(1)
    })

    it('formats amounts in PHP', () => {
      const props = {
        ...defaultProps,
        currency: 'PHP' as Currency,
        items: [{ id: '1', description: 'Test', quantity: 1, unitPrice: 1000, amount: 1000 }],
      }

      render(<LineItemsEditor {...props} />)

      // Amount appears twice: line item and total
      const amounts = screen.getAllByText('₱1,000.00')
      expect(amounts.length).toBeGreaterThanOrEqual(1)
    })

    it('formats amounts in JPY', () => {
      const props = {
        ...defaultProps,
        currency: 'JPY' as Currency,
        items: [{ id: '1', description: 'Test', quantity: 1, unitPrice: 10000, amount: 10000 }],
      }

      render(<LineItemsEditor {...props} />)

      // Amount appears twice: line item and total
      const amounts = screen.getAllByText('¥10,000.00')
      expect(amounts.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Total Calculation', () => {
    it('calculates correct total for multiple items', () => {
      const props = {
        ...defaultProps,
        items: [
          { id: '1', description: 'Item 1', quantity: 2, unitPrice: 25, amount: 50 },
          { id: '2', description: 'Item 2', quantity: 1, unitPrice: 100, amount: 100 },
          { id: '3', description: 'Item 3', quantity: 3, unitPrice: 10, amount: 30 },
        ],
      }

      render(<LineItemsEditor {...props} />)

      // Total should be 50 + 100 + 30 = 180
      expect(screen.getByText('$180.00')).toBeInTheDocument()
    })

    it('handles zero total', () => {
      const props = {
        ...defaultProps,
        items: [
          { id: '1', description: 'Free Item', quantity: 1, unitPrice: 0, amount: 0 },
        ],
      }

      render(<LineItemsEditor {...props} />)

      // Both the item amount and total will show $0.00
      const zeroAmounts = screen.getAllByText('$0.00')
      expect(zeroAmounts.length).toBeGreaterThan(0)
    })

    it('handles negative amounts (deductions)', () => {
      const props = {
        ...defaultProps,
        items: [
          { id: '1', description: 'Discount', quantity: 1, unitPrice: -50, amount: -50 },
        ],
      }

      render(<LineItemsEditor {...props} />)

      // Should display negative amount (appears twice: item and total)
      const negativeAmounts = screen.getAllByText('$-50.00')
      expect(negativeAmounts.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Input Validation', () => {
    const itemsProps = {
      ...defaultProps,
      items: [
        { id: '1', description: 'Test', quantity: 1, unitPrice: 50, amount: 50 },
      ],
    }

    it('quantity input has correct attributes', () => {
      render(<LineItemsEditor {...itemsProps} />)

      const inputs = screen.getAllByRole('spinbutton')
      const quantityInput = inputs.find(input => input.getAttribute('step') === '0.5')

      expect(quantityInput).toHaveAttribute('min', '0')
      expect(quantityInput).toHaveAttribute('inputMode', 'decimal')
    })

    it('unit price input has correct attributes', () => {
      render(<LineItemsEditor {...itemsProps} />)

      const inputs = screen.getAllByRole('spinbutton')
      const unitPriceInput = inputs.find(input => input.getAttribute('step') === '0.01')

      expect(unitPriceInput).toHaveAttribute('min', '0')
      expect(unitPriceInput).toHaveAttribute('inputMode', 'decimal')
    })

    it('handles empty quantity input', async () => {
      render(<LineItemsEditor {...itemsProps} />)

      const inputs = screen.getAllByRole('spinbutton')
      const quantityInput = inputs.find(input => input.getAttribute('step') === '0.5')

      if (quantityInput) {
        await user.clear(quantityInput)

        expect(defaultProps.onUpdate).toHaveBeenCalledWith('1', { quantity: 0 })
      }
    })
  })

  describe('Accessibility', () => {
    it('has accessible remove buttons with aria-label', () => {
      const itemsProps = {
        ...defaultProps,
        items: [
          { id: '1', description: 'Test', quantity: 1, unitPrice: 50, amount: 50 },
        ],
      }

      render(<LineItemsEditor {...itemsProps} />)

      const removeButton = screen.getByRole('button', { name: /remove item/i })
      expect(removeButton).toHaveAttribute('aria-label', 'Remove item')
    })

    it('description input has placeholder', () => {
      const itemsProps = {
        ...defaultProps,
        items: [
          { id: '1', description: '', quantity: 1, unitPrice: 50, amount: 50 },
        ],
      }

      render(<LineItemsEditor {...itemsProps} />)

      expect(screen.getByPlaceholderText(/item description/i)).toBeInTheDocument()
    })

    it('all interactive elements are focusable', () => {
      const itemsProps = {
        ...defaultProps,
        items: [
          { id: '1', description: 'Test', quantity: 1, unitPrice: 50, amount: 50 },
        ],
      }

      render(<LineItemsEditor {...itemsProps} />)

      const inputs = screen.getAllByRole('spinbutton')
      const textInput = screen.getByDisplayValue('Test')
      const button = screen.getByRole('button', { name: /remove item/i })

      inputs.forEach(input => {
        expect(input).not.toHaveAttribute('tabindex', '-1')
      })
      expect(textInput).not.toHaveAttribute('tabindex', '-1')
      expect(button).not.toHaveAttribute('tabindex', '-1')
    })
  })

  describe('Responsive Design', () => {
    it('renders column headers for desktop', () => {
      render(<LineItemsEditor {...defaultProps} items={[
        { id: '1', description: 'Test', quantity: 1, unitPrice: 50, amount: 50 }
      ]} />)

      // Headers are in the DOM but hidden via CSS classes (hidden sm:grid)
      // On mobile, individual labels show instead, so multiple "Quantity" labels may exist
      expect(screen.getAllByText('Description').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Quantity').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Unit Price').length).toBeGreaterThan(0)
      // "Amount" appears in header and as mobile label "Amount:"
      expect(screen.getAllByText(/Amount/i).length).toBeGreaterThan(0)
    })
  })
})
