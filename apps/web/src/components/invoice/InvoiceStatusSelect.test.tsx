import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InvoiceStatusSelect, InvoiceStatusBadge } from './InvoiceStatusSelect'

describe('InvoiceStatusBadge', () => {
  it('renders the correct status label', () => {
    render(<InvoiceStatusBadge status="DRAFT" />)
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('renders different statuses correctly', () => {
    const { rerender } = render(<InvoiceStatusBadge status="PAID" />)
    expect(screen.getByText('Paid')).toBeInTheDocument()

    rerender(<InvoiceStatusBadge status="SENT" />)
    expect(screen.getByText('Sent')).toBeInTheDocument()

    rerender(<InvoiceStatusBadge status="OVERDUE" />)
    expect(screen.getByText('Overdue')).toBeInTheDocument()
  })

  it('applies the correct color classes based on status', () => {
    render(<InvoiceStatusBadge status="PAID" />)
    const badge = screen.getByText('Paid')
    expect(badge.className).toContain('bg-green')
  })
})

describe('InvoiceStatusSelect', () => {
  it('renders with the current status', () => {
    const onChange = vi.fn()
    render(<InvoiceStatusSelect value="DRAFT" onChange={onChange} />)
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('can be disabled', () => {
    const onChange = vi.fn()
    render(<InvoiceStatusSelect value="DRAFT" onChange={onChange} disabled />)
    const trigger = screen.getByRole('combobox')
    expect(trigger).toBeDisabled()
  })

  it('renders all status options', async () => {
    const onChange = vi.fn()
    render(<InvoiceStatusSelect value="DRAFT" onChange={onChange} showNotes={false} />)

    // Open the select
    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    // Check that status options are available
    expect(await screen.findByText('To Send')).toBeInTheDocument()
    expect(await screen.findByText('Sent')).toBeInTheDocument()
    expect(await screen.findByText('Paid')).toBeInTheDocument()
    expect(await screen.findByText('Overdue')).toBeInTheDocument()
  })

  it('calls onChange when status is selected without notes', async () => {
    const onChange = vi.fn()
    render(<InvoiceStatusSelect value="DRAFT" onChange={onChange} showNotes={false} />)

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    const paidOption = await screen.findByRole('option', { name: /paid/i })
    fireEvent.click(paidOption)

    expect(onChange).toHaveBeenCalledWith('PAID')
  })

  it('shows notes dialog when showNotes is true', async () => {
    const onChange = vi.fn()
    render(<InvoiceStatusSelect value="DRAFT" onChange={onChange} showNotes />)

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    const paidOption = await screen.findByRole('option', { name: /paid/i })
    fireEvent.click(paidOption)

    // Dialog should appear - wait for dialog content
    await waitFor(() => {
      // Look for notes label which is unique to the dialog
      expect(screen.getByText('Notes (optional)')).toBeInTheDocument()
    })
  })

  it('cancels status change when dialog is cancelled', async () => {
    const onChange = vi.fn()
    render(<InvoiceStatusSelect value="DRAFT" onChange={onChange} showNotes />)

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    const paidOption = await screen.findByRole('option', { name: /paid/i })
    fireEvent.click(paidOption)

    // Wait for dialog content
    await waitFor(() => {
      expect(screen.getByText('Notes (optional)')).toBeInTheDocument()
    })

    // Cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelButton)

    expect(onChange).not.toHaveBeenCalled()
  })

  it('confirms status change with notes', async () => {
    const onChange = vi.fn()
    render(<InvoiceStatusSelect value="DRAFT" onChange={onChange} showNotes />)

    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)

    const paidOption = await screen.findByRole('option', { name: /paid/i })
    fireEvent.click(paidOption)

    // Wait for dialog content
    await waitFor(() => {
      expect(screen.getByText('Notes (optional)')).toBeInTheDocument()
    })

    // Add notes
    const notesInput = screen.getByPlaceholderText(/add a note/i)
    fireEvent.change(notesInput, { target: { value: 'Payment received' } })

    // Confirm - find the button that says "Update Status"
    const confirmButton = screen.getByRole('button', { name: /update status/i })
    fireEvent.click(confirmButton)

    expect(onChange).toHaveBeenCalledWith('PAID', 'Payment received')
  })
})
