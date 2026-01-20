import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InvoiceSummary } from './InvoiceSummary'
import type { Currency } from '@invoice-generator/shared-types'

describe('InvoiceSummary', () => {
  const defaultProps = {
    currency: 'USD' as Currency,
    totalDays: 10,
    totalHours: 80,
    hourlyRate: 100,
    subtotal: 8000,
    totalAmount: 8800,
  }

  describe('Rendering', () => {
    it('renders the summary card with title', () => {
      render(<InvoiceSummary {...defaultProps} />)

      expect(screen.getByText('Invoice Summary')).toBeInTheDocument()
    })

    it('displays total days', () => {
      render(<InvoiceSummary {...defaultProps} />)

      expect(screen.getByText('Working Days')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()
    })

    it('displays total hours', () => {
      render(<InvoiceSummary {...defaultProps} />)

      expect(screen.getByText('Total Hours')).toBeInTheDocument()
      expect(screen.getByText('80.0')).toBeInTheDocument()
    })

    it('displays hourly rate with currency', () => {
      render(<InvoiceSummary {...defaultProps} />)

      expect(screen.getByText('Hourly Rate')).toBeInTheDocument()
      // Look for formatted rate
      expect(screen.getByText('$100.00')).toBeInTheDocument()
    })

    it('displays subtotal with currency', () => {
      render(<InvoiceSummary {...defaultProps} />)

      expect(screen.getByText('Subtotal')).toBeInTheDocument()
      // Amount appears multiple times (hours calculation and subtotal)
      const subtotalAmounts = screen.getAllByText('$8,000.00')
      expect(subtotalAmounts.length).toBeGreaterThanOrEqual(1)
    })

    it('displays total amount with currency', () => {
      render(<InvoiceSummary {...defaultProps} />)

      expect(screen.getByText('Total Due')).toBeInTheDocument()
      expect(screen.getByText('$8,800.00')).toBeInTheDocument()
    })
  })

  describe('Currency Formatting', () => {
    it.each([
      ['USD', '$'],
      ['EUR', '€'],
      ['GBP', '£'],
      ['PHP', '₱'],
      ['JPY', '¥'],
      ['AUD', 'A$'],
      ['CAD', 'C$'],
      ['SGD', 'S$'],
    ] as const)('formats amounts correctly for %s', (currency, expectedSymbol) => {
      render(<InvoiceSummary {...defaultProps} currency={currency} totalAmount={1000} />)

      // Should contain the currency symbol in the total
      expect(screen.getByText('Total Due').closest('div')?.textContent).toContain(expectedSymbol)
    })

    it('formats large numbers with commas', () => {
      render(<InvoiceSummary {...defaultProps} totalAmount={100000} />)

      expect(screen.getByText('$100,000.00')).toBeInTheDocument()
    })

    it('formats decimal amounts correctly', () => {
      render(<InvoiceSummary {...defaultProps} totalAmount={1234.56} />)

      expect(screen.getByText('$1,234.56')).toBeInTheDocument()
    })
  })

  describe('Zero Values', () => {
    it('handles zero days', () => {
      render(<InvoiceSummary {...defaultProps} totalDays={0} />)

      const workingDaysSection = screen.getByText('Working Days').closest('div')?.parentElement
      expect(workingDaysSection?.textContent).toContain('0')
    })

    it('handles zero hours', () => {
      render(<InvoiceSummary {...defaultProps} totalHours={0} />)

      expect(screen.getByText('0.0')).toBeInTheDocument()
    })

    it('handles zero hourly rate', () => {
      render(<InvoiceSummary {...defaultProps} hourlyRate={0} />)

      // $0.00 may appear multiple times
      const zeroAmounts = screen.getAllByText('$0.00')
      expect(zeroAmounts.length).toBeGreaterThanOrEqual(1)
    })

    it('handles zero subtotal', () => {
      render(<InvoiceSummary {...defaultProps} subtotal={0} />)

      // There should be a $0.00 somewhere for subtotal
      const subtotalSection = screen.getByText('Subtotal').closest('div')
      expect(subtotalSection?.textContent).toContain('$0.00')
    })

    it('handles zero total', () => {
      render(<InvoiceSummary {...defaultProps} totalAmount={0} />)

      // Total Due should show $0.00
      const totalSection = screen.getByText('Total Due').closest('div')
      expect(totalSection?.textContent).toContain('$0.00')
    })
  })

  describe('Decimal Hours', () => {
    it('handles decimal hours', () => {
      render(<InvoiceSummary {...defaultProps} totalHours={80.5} />)

      expect(screen.getByText('80.5')).toBeInTheDocument()
    })

    it('handles small decimal hours', () => {
      render(<InvoiceSummary {...defaultProps} totalHours={0.5} />)

      expect(screen.getByText('0.5')).toBeInTheDocument()
    })
  })

  describe('Decimal Rates', () => {
    it('handles decimal hourly rates', () => {
      render(<InvoiceSummary {...defaultProps} hourlyRate={75.50} />)

      expect(screen.getByText('$75.50')).toBeInTheDocument()
    })
  })

  describe('Visual Structure', () => {
    it('renders work summary section', () => {
      render(<InvoiceSummary {...defaultProps} />)

      expect(screen.getByText('Working Days')).toBeInTheDocument()
      expect(screen.getByText('Total Hours')).toBeInTheDocument()
      expect(screen.getByText('Hourly Rate')).toBeInTheDocument()
    })

    it('renders total with prominent styling', () => {
      render(<InvoiceSummary {...defaultProps} />)

      const totalLabel = screen.getByText('Total Due')
      // Total row should be in a primary-colored section
      const totalContainer = totalLabel.closest('div')
      expect(totalContainer).toHaveClass('bg-primary')
    })
  })

  describe('Hours Calculation Display', () => {
    it('displays hours multiplied by rate', () => {
      render(<InvoiceSummary {...defaultProps} />)

      // Should show "Hours (80.0 x $100.00)" in the muted text
      const hoursText = screen.getByText(/Hours \(/)
      expect(hoursText).toBeInTheDocument()
      expect(hoursText.textContent).toContain('80.0')
    })
  })

  describe('Edge Cases', () => {
    it('handles very large numbers', () => {
      render(
        <InvoiceSummary
          {...defaultProps}
          totalAmount={999999999.99}
          subtotal={999999999.99}
        />
      )

      // The value appears twice (subtotal and total)
      const largeAmounts = screen.getAllByText('$999,999,999.99')
      expect(largeAmounts.length).toBeGreaterThanOrEqual(1)
    })

    it('handles negative amounts (unlikely but possible)', () => {
      render(<InvoiceSummary {...defaultProps} totalAmount={-100} />)

      // Should still render (negative amount appears with minus sign)
      expect(screen.getByText('Total Due')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('uses semantic structure', () => {
      render(<InvoiceSummary {...defaultProps} />)

      // Should have proper text hierarchy
      expect(screen.getByText('Invoice Summary')).toBeInTheDocument()
      expect(screen.getByText('Total Due')).toBeInTheDocument()
    })

    it('has readable text for screen readers', () => {
      render(<InvoiceSummary {...defaultProps} />)

      // All labels should be visible
      expect(screen.getByText('Working Days')).toBeVisible()
      expect(screen.getByText('Total Hours')).toBeVisible()
      expect(screen.getByText('Hourly Rate')).toBeVisible()
      expect(screen.getByText('Subtotal')).toBeVisible()
      expect(screen.getByText('Total Due')).toBeVisible()
    })
  })

  describe('Calculator Icon', () => {
    it('renders calculator icon in header', () => {
      render(<InvoiceSummary {...defaultProps} />)

      const header = screen.getByText('Invoice Summary').closest('div')
      expect(header?.querySelector('svg')).toBeInTheDocument()
    })
  })
})
