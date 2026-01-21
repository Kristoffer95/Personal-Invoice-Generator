import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InvoiceNumberQuickEdit } from './InvoiceNumberQuickEdit'
import type { Id } from '@invoice-generator/backend/convex/_generated/dataModel'

// Mock the hooks
const mockUpdateInvoice = vi.fn()
const mockToast = vi.fn()

vi.mock('@/hooks/use-invoices', () => ({
  useInvoiceMutations: () => ({
    updateInvoice: mockUpdateInvoice,
  }),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

describe('InvoiceNumberQuickEdit', () => {
  const defaultProps = {
    invoiceId: 'invoice123' as Id<'invoices'>,
    currentNumber: 'INV-001',
    onUpdated: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateInvoice.mockResolvedValue(undefined)
  })

  describe('Rendering', () => {
    it('renders the edit trigger button', () => {
      render(<InvoiceNumberQuickEdit {...defaultProps} />)
      const trigger = screen.getByTitle('Edit invoice number')
      expect(trigger).toBeInTheDocument()
    })

    it('displays pencil icon in trigger', () => {
      render(<InvoiceNumberQuickEdit {...defaultProps} />)
      const trigger = screen.getByTitle('Edit invoice number')
      // The SVG should be inside the trigger
      expect(trigger.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('Popover Interaction', () => {
    it('opens popover when trigger is clicked', async () => {
      render(<InvoiceNumberQuickEdit {...defaultProps} />)

      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByText('Invoice Number')).toBeInTheDocument()
      })
    })

    it('displays current invoice number in input', async () => {
      render(<InvoiceNumberQuickEdit {...defaultProps} />)

      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        const input = screen.getByPlaceholderText('e.g., INV-001')
        expect(input).toHaveValue('INV-001')
      })
    })

    it('closes popover when X button is clicked', async () => {
      render(<InvoiceNumberQuickEdit {...defaultProps} />)

      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByText('Invoice Number')).toBeInTheDocument()
      })

      const cancelButton = screen.getByTitle('Cancel')
      fireEvent.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText('Invoice Number')).not.toBeInTheDocument()
      })
    })

    it('closes popover when Escape key is pressed', async () => {
      const user = userEvent.setup()
      render(<InvoiceNumberQuickEdit {...defaultProps} />)

      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByText('Invoice Number')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('e.g., INV-001')
      await user.type(input, '{Escape}')

      await waitFor(() => {
        expect(screen.queryByText('Invoice Number')).not.toBeInTheDocument()
      })
    })

    it('opens via keyboard (Enter key)', async () => {
      const user = userEvent.setup()
      render(<InvoiceNumberQuickEdit {...defaultProps} />)

      const trigger = screen.getByTitle('Edit invoice number')
      trigger.focus()
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText('Invoice Number')).toBeInTheDocument()
      })
    })

    it('opens via keyboard (Space key)', async () => {
      const user = userEvent.setup()
      render(<InvoiceNumberQuickEdit {...defaultProps} />)

      const trigger = screen.getByTitle('Edit invoice number')
      trigger.focus()
      await user.keyboard(' ')

      await waitFor(() => {
        expect(screen.getByText('Invoice Number')).toBeInTheDocument()
      })
    })
  })

  describe('Validation', () => {
    it('shows error for empty invoice number', async () => {
      const user = userEvent.setup()
      render(<InvoiceNumberQuickEdit {...defaultProps} />)

      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('e.g., INV-001')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('e.g., INV-001')
      await user.clear(input)

      const saveButton = screen.getByTitle('Save')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Invoice number is required')).toBeInTheDocument()
      })
      expect(mockUpdateInvoice).not.toHaveBeenCalled()
    })

    it('shows error for whitespace-only invoice number', async () => {
      const user = userEvent.setup()
      render(<InvoiceNumberQuickEdit {...defaultProps} />)

      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('e.g., INV-001')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('e.g., INV-001')
      await user.clear(input)
      await user.type(input, '   ')

      const saveButton = screen.getByTitle('Save')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Invoice number is required')).toBeInTheDocument()
      })
    })

    it('shows error for invalid characters', async () => {
      const user = userEvent.setup()
      render(<InvoiceNumberQuickEdit {...defaultProps} />)

      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('e.g., INV-001')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('e.g., INV-001')
      await user.clear(input)
      await user.type(input, 'INV@001#$%')

      const saveButton = screen.getByTitle('Save')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/can only contain letters, numbers, hyphens, and underscores/)).toBeInTheDocument()
      })
    })

    it('enforces max length on input element', async () => {
      render(<InvoiceNumberQuickEdit {...defaultProps} />)

      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        const input = screen.getByPlaceholderText('e.g., INV-001')
        // Verify that the HTML maxLength attribute is set to prevent long input
        expect(input).toHaveAttribute('maxLength', '50')
      })
    })

    it('allows valid invoice number formats', async () => {
      const user = userEvent.setup()
      render(<InvoiceNumberQuickEdit {...defaultProps} />)

      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('e.g., INV-001')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('e.g., INV-001')
      await user.clear(input)
      await user.type(input, 'INV-2024_001')

      const saveButton = screen.getByTitle('Save')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockUpdateInvoice).toHaveBeenCalledWith({
          invoiceId: 'invoice123',
          invoiceNumber: 'INV-2024_001',
        })
      })
    })

    it('clears error when user starts typing', async () => {
      const user = userEvent.setup()
      render(<InvoiceNumberQuickEdit {...defaultProps} />)

      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('e.g., INV-001')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('e.g., INV-001')
      await user.clear(input)

      const saveButton = screen.getByTitle('Save')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Invoice number is required')).toBeInTheDocument()
      })

      // Start typing to clear error
      await user.type(input, 'INV-002')

      await waitFor(() => {
        expect(screen.queryByText('Invoice number is required')).not.toBeInTheDocument()
      })
    })
  })

  describe('Submission', () => {
    it('does not submit if invoice number is unchanged', async () => {
      render(<InvoiceNumberQuickEdit {...defaultProps} />)

      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('e.g., INV-001')).toBeInTheDocument()
      })

      const saveButton = screen.getByTitle('Save')
      fireEvent.click(saveButton)

      // Should close without calling API
      await waitFor(() => {
        expect(screen.queryByText('Invoice Number')).not.toBeInTheDocument()
      })
      expect(mockUpdateInvoice).not.toHaveBeenCalled()
    })

    it('submits when Enter key is pressed', async () => {
      const user = userEvent.setup()
      render(<InvoiceNumberQuickEdit {...defaultProps} />)

      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('e.g., INV-001')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('e.g., INV-001')
      await user.clear(input)
      await user.type(input, 'INV-002{Enter}')

      await waitFor(() => {
        expect(mockUpdateInvoice).toHaveBeenCalledWith({
          invoiceId: 'invoice123',
          invoiceNumber: 'INV-002',
        })
      })
    })

    it('shows success toast on successful update', async () => {
      const user = userEvent.setup()
      render(<InvoiceNumberQuickEdit {...defaultProps} />)

      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('e.g., INV-001')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('e.g., INV-001')
      await user.clear(input)
      await user.type(input, 'INV-002')

      const saveButton = screen.getByTitle('Save')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Invoice number updated',
          description: 'Changed to INV-002',
        })
      })
    })

    it('calls onUpdated callback after successful update', async () => {
      const user = userEvent.setup()
      const onUpdated = vi.fn()
      render(<InvoiceNumberQuickEdit {...defaultProps} onUpdated={onUpdated} />)

      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('e.g., INV-001')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('e.g., INV-001')
      await user.clear(input)
      await user.type(input, 'INV-002')

      const saveButton = screen.getByTitle('Save')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(onUpdated).toHaveBeenCalled()
      })
    })

    it('closes popover on successful update', async () => {
      const user = userEvent.setup()
      render(<InvoiceNumberQuickEdit {...defaultProps} />)

      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('e.g., INV-001')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('e.g., INV-001')
      await user.clear(input)
      await user.type(input, 'INV-002')

      const saveButton = screen.getByTitle('Save')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.queryByText('Invoice Number')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('shows sanitized error toast on API failure', async () => {
      // Error message contains "already exists" - should be sanitized
      mockUpdateInvoice.mockRejectedValue(new Error('Invoice number already exists'))
      const user = userEvent.setup()
      render(<InvoiceNumberQuickEdit {...defaultProps} />)

      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('e.g., INV-001')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('e.g., INV-001')
      await user.clear(input)
      await user.type(input, 'INV-002')

      const saveButton = screen.getByTitle('Save')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Update failed',
          description: 'This invoice number is already in use. Please choose another.',
          variant: 'destructive',
        })
      })
    })

    it('displays error message in popover on API failure', async () => {
      mockUpdateInvoice.mockRejectedValue(new Error('Invoice number already exists in this folder'))
      const user = userEvent.setup()
      render(<InvoiceNumberQuickEdit {...defaultProps} />)

      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('e.g., INV-001')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('e.g., INV-001')
      await user.clear(input)
      await user.type(input, 'INV-002')

      const saveButton = screen.getByTitle('Save')
      fireEvent.click(saveButton)

      await waitFor(() => {
        // Error is sanitized to user-friendly message
        expect(screen.getByText('This invoice number is already in use. Please choose another.')).toBeInTheDocument()
      })
    })

    it('keeps popover open on API failure', async () => {
      mockUpdateInvoice.mockRejectedValue(new Error('Server error'))
      const user = userEvent.setup()
      render(<InvoiceNumberQuickEdit {...defaultProps} />)

      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('e.g., INV-001')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('e.g., INV-001')
      await user.clear(input)
      await user.type(input, 'INV-002')

      const saveButton = screen.getByTitle('Save')
      fireEvent.click(saveButton)

      await waitFor(() => {
        // Error is sanitized to generic message
        expect(screen.getByText('Failed to update invoice number')).toBeInTheDocument()
      })
      // Popover should still be open
      expect(screen.getByText('Invoice Number')).toBeInTheDocument()
    })

    it('handles non-Error rejection', async () => {
      mockUpdateInvoice.mockRejectedValue('Unknown error')
      const user = userEvent.setup()
      render(<InvoiceNumberQuickEdit {...defaultProps} />)

      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('e.g., INV-001')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('e.g., INV-001')
      await user.clear(input)
      await user.type(input, 'INV-002')

      const saveButton = screen.getByTitle('Save')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Update failed',
          description: 'Failed to update invoice number',
          variant: 'destructive',
        })
      })
    })
  })

  describe('Input Behavior', () => {
    it('trims whitespace from input', async () => {
      const user = userEvent.setup()
      render(<InvoiceNumberQuickEdit {...defaultProps} />)

      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('e.g., INV-001')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('e.g., INV-001')
      await user.clear(input)
      await user.type(input, '  INV-002  ')

      const saveButton = screen.getByTitle('Save')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockUpdateInvoice).toHaveBeenCalledWith({
          invoiceId: 'invoice123',
          invoiceNumber: 'INV-002',
        })
      })
    })

    it('resets input to current number when popover reopens', async () => {
      const user = userEvent.setup()
      render(<InvoiceNumberQuickEdit {...defaultProps} />)

      // Open popover and modify input
      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('e.g., INV-001')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('e.g., INV-001')
      await user.clear(input)
      await user.type(input, 'MODIFIED')

      // Close without saving
      const cancelButton = screen.getByTitle('Cancel')
      fireEvent.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText('Invoice Number')).not.toBeInTheDocument()
      })

      // Reopen
      fireEvent.click(trigger)

      await waitFor(() => {
        const reopenedInput = screen.getByPlaceholderText('e.g., INV-001')
        expect(reopenedInput).toHaveValue('INV-001')
      })
    })

    it('has autocomplete disabled', async () => {
      render(<InvoiceNumberQuickEdit {...defaultProps} />)

      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        const input = screen.getByPlaceholderText('e.g., INV-001')
        expect(input).toHaveAttribute('autocomplete', 'off')
      })
    })

    it('has spellcheck disabled', async () => {
      render(<InvoiceNumberQuickEdit {...defaultProps} />)

      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        const input = screen.getByPlaceholderText('e.g., INV-001')
        expect(input).toHaveAttribute('spellcheck', 'false')
      })
    })
  })

  describe('Accessibility', () => {
    it('trigger has proper ARIA attributes', () => {
      render(<InvoiceNumberQuickEdit {...defaultProps} />)
      const trigger = screen.getByTitle('Edit invoice number')
      expect(trigger).toHaveAttribute('role', 'button')
      expect(trigger).toHaveAttribute('tabIndex', '0')
    })

    it('input is visible and interactive when popover opens', async () => {
      render(<InvoiceNumberQuickEdit {...defaultProps} />)

      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        const input = screen.getByPlaceholderText('e.g., INV-001')
        expect(input).toBeInTheDocument()
        expect(input).not.toBeDisabled()
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles very short invoice numbers', async () => {
      const user = userEvent.setup()
      render(<InvoiceNumberQuickEdit {...defaultProps} currentNumber="1" />)

      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        const input = screen.getByPlaceholderText('e.g., INV-001')
        expect(input).toHaveValue('1')
      })

      const input = screen.getByPlaceholderText('e.g., INV-001')
      await user.clear(input)
      await user.type(input, '2')

      const saveButton = screen.getByTitle('Save')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockUpdateInvoice).toHaveBeenCalledWith({
          invoiceId: 'invoice123',
          invoiceNumber: '2',
        })
      })
    })

    it('handles numeric-only invoice numbers', async () => {
      const user = userEvent.setup()
      render(<InvoiceNumberQuickEdit {...defaultProps} currentNumber="001" />)

      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('e.g., INV-001')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('e.g., INV-001')
      await user.clear(input)
      await user.type(input, '002')

      const saveButton = screen.getByTitle('Save')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockUpdateInvoice).toHaveBeenCalledWith({
          invoiceId: 'invoice123',
          invoiceNumber: '002',
        })
      })
    })

    it('handles invoice numbers with underscores', async () => {
      const user = userEvent.setup()
      render(<InvoiceNumberQuickEdit {...defaultProps} />)

      const trigger = screen.getByTitle('Edit invoice number')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('e.g., INV-001')).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('e.g., INV-001')
      await user.clear(input)
      await user.type(input, 'INV_2024_001')

      const saveButton = screen.getByTitle('Save')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockUpdateInvoice).toHaveBeenCalledWith({
          invoiceId: 'invoice123',
          invoiceNumber: 'INV_2024_001',
        })
      })
    })
  })
})
