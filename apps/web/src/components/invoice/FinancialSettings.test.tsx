import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FinancialSettings } from './FinancialSettings'
import type { Currency } from '@invoice-generator/shared-types'

describe('FinancialSettings', () => {
  const user = userEvent.setup()

  const defaultProps = {
    hourlyRate: 50,
    currency: 'USD' as Currency,
    onHourlyRateChange: vi.fn(),
    onCurrencyChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the card with title', () => {
      render(<FinancialSettings {...defaultProps} />)

      expect(screen.getByText('Rates & Currency')).toBeInTheDocument()
    })

    it('renders hourly rate input', () => {
      render(<FinancialSettings {...defaultProps} />)

      expect(screen.getByLabelText(/hourly rate/i)).toBeInTheDocument()
    })

    it('renders currency selector', () => {
      render(<FinancialSettings {...defaultProps} />)

      expect(screen.getByLabelText(/currency/i)).toBeInTheDocument()
    })

    it('displays current hourly rate value', () => {
      render(<FinancialSettings {...defaultProps} />)

      const input = screen.getByLabelText(/hourly rate/i)
      expect(input).toHaveValue(50)
    })

    it('displays currency symbol for USD', () => {
      render(<FinancialSettings {...defaultProps} />)

      // The $ symbol should be visible before the input
      expect(screen.getByText('$')).toBeInTheDocument()
    })
  })

  describe('Hourly Rate Input', () => {
    it('calls onHourlyRateChange when value changes', () => {
      render(<FinancialSettings {...defaultProps} />)

      const input = screen.getByLabelText(/hourly rate/i)
      fireEvent.change(input, { target: { value: '75' } })

      expect(defaultProps.onHourlyRateChange).toHaveBeenCalledWith(75)
    })

    it('handles decimal hourly rates', () => {
      render(<FinancialSettings {...defaultProps} />)

      const input = screen.getByLabelText(/hourly rate/i)
      fireEvent.change(input, { target: { value: '75.50' } })

      expect(defaultProps.onHourlyRateChange).toHaveBeenCalledWith(75.50)
    })

    it('handles zero rate', () => {
      render(<FinancialSettings {...defaultProps} />)

      const input = screen.getByLabelText(/hourly rate/i)
      fireEvent.change(input, { target: { value: '' } })

      expect(defaultProps.onHourlyRateChange).toHaveBeenCalledWith(0)
    })

    it('has correct input attributes', () => {
      render(<FinancialSettings {...defaultProps} />)

      const input = screen.getByLabelText(/hourly rate/i)
      expect(input).toHaveAttribute('type', 'number')
      expect(input).toHaveAttribute('min', '0')
      expect(input).toHaveAttribute('step', '0.01')
    })

    it('has placeholder text', () => {
      render(<FinancialSettings {...defaultProps} hourlyRate={0} />)

      const input = screen.getByLabelText(/hourly rate/i)
      expect(input).toHaveAttribute('placeholder', '0.00')
    })
  })

  describe('Currency Selector', () => {
    it('displays current currency value', () => {
      render(<FinancialSettings {...defaultProps} />)

      // The select trigger should show the current value
      expect(screen.getByText(/\$ USD/)).toBeInTheDocument()
    })

    it('renders currency selector trigger', () => {
      render(<FinancialSettings {...defaultProps} />)

      // Just verify the trigger is present and accessible
      const trigger = screen.getByLabelText(/currency/i)
      expect(trigger).toBeInTheDocument()
      expect(trigger).toHaveAttribute('id', 'currency')
    })

    it('displays correct currency for EUR', () => {
      render(<FinancialSettings {...defaultProps} currency="EUR" />)

      // The select should show EUR
      expect(screen.getByText(/€ EUR/)).toBeInTheDocument()
    })

    it('displays correct currency for GBP', () => {
      render(<FinancialSettings {...defaultProps} currency="GBP" />)

      expect(screen.getByText(/£ GBP/)).toBeInTheDocument()
    })
  })

  describe('Currency Symbols', () => {
    it.each([
      ['USD', '$'],
      ['EUR', '€'],
      ['GBP', '£'],
      ['PHP', '₱'],
      ['JPY', '¥'],
      ['AUD', 'A$'],
      ['CAD', 'C$'],
      ['SGD', 'S$'],
    ] as const)('displays correct symbol for %s', (currency, symbol) => {
      render(<FinancialSettings {...defaultProps} currency={currency} />)

      // The symbol should appear in front of the input
      const symbolElements = screen.getAllByText(new RegExp(`^${symbol.replace('$', '\\$')}$`))
      expect(symbolElements.length).toBeGreaterThan(0)
    })
  })

  describe('Accessibility', () => {
    it('has accessible labels for all inputs', () => {
      render(<FinancialSettings {...defaultProps} />)

      expect(screen.getByLabelText(/hourly rate/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/currency/i)).toBeInTheDocument()
    })

    it('inputs are keyboard navigable', async () => {
      render(<FinancialSettings {...defaultProps} />)

      const hourlyRateInput = screen.getByLabelText(/hourly rate/i)
      hourlyRateInput.focus()

      expect(document.activeElement).toBe(hourlyRateInput)

      await user.tab()
      // Should move to currency select
      expect(document.activeElement).not.toBe(hourlyRateInput)
    })

    it('has proper id attributes for labels', () => {
      render(<FinancialSettings {...defaultProps} />)

      const hourlyRateInput = screen.getByLabelText(/hourly rate/i)
      expect(hourlyRateInput).toHaveAttribute('id', 'hourlyRate')

      const currencySelect = screen.getByLabelText(/currency/i)
      expect(currencySelect).toHaveAttribute('id', 'currency')
    })
  })

  describe('Edge Cases', () => {
    it('handles very large hourly rates', () => {
      render(<FinancialSettings {...defaultProps} />)

      const input = screen.getByLabelText(/hourly rate/i)
      fireEvent.change(input, { target: { value: '10000' } })

      expect(defaultProps.onHourlyRateChange).toHaveBeenCalledWith(10000)
    })

    it('handles empty input as zero', () => {
      render(<FinancialSettings {...defaultProps} />)

      const input = screen.getByLabelText(/hourly rate/i)
      fireEvent.change(input, { target: { value: '' } })

      // When input is cleared, it should call with 0
      expect(defaultProps.onHourlyRateChange).toHaveBeenCalledWith(0)
    })

    it('displays empty input when hourlyRate is 0', () => {
      render(<FinancialSettings {...defaultProps} hourlyRate={0} />)

      const input = screen.getByLabelText(/hourly rate/i)
      expect(input).toHaveValue(null)
    })
  })

  describe('Visual Elements', () => {
    it('renders dollar sign icon in card header', () => {
      render(<FinancialSettings {...defaultProps} />)

      // The DollarSign icon should be in the header
      const header = screen.getByText('Rates & Currency').closest('div')
      expect(header?.querySelector('svg')).toBeInTheDocument()
    })
  })
})
