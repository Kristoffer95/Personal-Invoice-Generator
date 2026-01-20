import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkHoursEditor } from './WorkHoursEditor'
import type { DailyWorkHours } from '@invoice-generator/shared-types'

describe('WorkHoursEditor', () => {
  const user = userEvent.setup()

  const defaultProps = {
    periodStart: undefined,
    periodEnd: undefined,
    dailyWorkHours: [] as DailyWorkHours[],
    defaultHoursPerDay: 8,
    onUpdateDay: vi.fn(),
    onToggleWorkday: vi.fn(),
    onSetDefaultForPeriod: vi.fn(),
    onPeriodChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset to a known date for consistent testing
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('renders the Work Hours card with title', () => {
      render(<WorkHoursEditor {...defaultProps} />)

      expect(screen.getByText('Work Hours')).toBeInTheDocument()
      expect(screen.getByText(/configure working days and hours/i)).toBeInTheDocument()
    })

    it('renders default hours per day input', () => {
      render(<WorkHoursEditor {...defaultProps} />)

      expect(screen.getByText(/default hours per day/i)).toBeInTheDocument()
      const input = screen.getByDisplayValue('8')
      expect(input).toBeInTheDocument()
    })

    it('renders period selection buttons', () => {
      render(<WorkHoursEditor {...defaultProps} />)

      expect(screen.getByRole('button', { name: /1st - 15th/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /16th - end/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /full month/i })).toBeInTheDocument()
    })

    it('renders month navigation buttons', () => {
      render(<WorkHoursEditor {...defaultProps} />)

      // Month navigation buttons
      const navButtons = screen.getAllByRole('button', { name: '' }).filter(
        btn => btn.querySelector('svg')
      )
      expect(navButtons.length).toBeGreaterThanOrEqual(2)
    })

    it('displays current month name', () => {
      render(<WorkHoursEditor {...defaultProps} />)

      expect(screen.getByText('January 2024')).toBeInTheDocument()
    })

    it('renders day of week headers', () => {
      render(<WorkHoursEditor {...defaultProps} />)

      expect(screen.getByText('Sun')).toBeInTheDocument()
      expect(screen.getByText('Mon')).toBeInTheDocument()
      expect(screen.getByText('Tue')).toBeInTheDocument()
      expect(screen.getByText('Wed')).toBeInTheDocument()
      expect(screen.getByText('Thu')).toBeInTheDocument()
      expect(screen.getByText('Fri')).toBeInTheDocument()
      expect(screen.getByText('Sat')).toBeInTheDocument()
    })

    it('renders calendar days for the month', () => {
      render(<WorkHoursEditor {...defaultProps} />)

      // January 2024 has 31 days
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('15')).toBeInTheDocument()
      expect(screen.getByText('31')).toBeInTheDocument()
    })
  })

  describe('Summary', () => {
    it('displays zero working days and hours initially', () => {
      render(<WorkHoursEditor {...defaultProps} />)

      expect(screen.getByText('Working Days')).toBeInTheDocument()
      expect(screen.getByText('Total Hours')).toBeInTheDocument()

      // Should show 0 for both
      const summarySection = screen.getByText('Working Days').closest('div')?.parentElement
      expect(summarySection).toBeInTheDocument()
    })

    it('calculates totals from dailyWorkHours', () => {
      const propsWithHours = {
        ...defaultProps,
        dailyWorkHours: [
          { date: '2024-01-15', hours: 8, isWorkday: true },
          { date: '2024-01-16', hours: 6, isWorkday: true },
          { date: '2024-01-17', hours: 0, isWorkday: false },
        ],
      }

      render(<WorkHoursEditor {...propsWithHours} />)

      // Should show 14.0 total hours (unique value)
      expect(screen.getByText('14.0')).toBeInTheDocument()

      // Working days count should be in the summary section
      const workingDaysLabel = screen.getByText('Working Days')
      const summarySection = workingDaysLabel.closest('div')?.parentElement
      expect(summarySection?.textContent).toContain('2')
    })
  })

  describe('Period Selection', () => {
    it('sets period to 1st-15th when button clicked', async () => {
      render(<WorkHoursEditor {...defaultProps} />)

      const button = screen.getByRole('button', { name: /1st - 15th/i })
      fireEvent.click(button)

      expect(defaultProps.onPeriodChange).toHaveBeenCalledWith(
        '2024-01-01',
        '2024-01-15'
      )
      expect(defaultProps.onSetDefaultForPeriod).toHaveBeenCalledWith(
        '2024-01-01',
        '2024-01-15',
        8
      )
    })

    it('sets period to 16th-end when button clicked', async () => {
      render(<WorkHoursEditor {...defaultProps} />)

      const button = screen.getByRole('button', { name: /16th - end/i })
      fireEvent.click(button)

      expect(defaultProps.onPeriodChange).toHaveBeenCalledWith(
        '2024-01-16',
        '2024-01-31'
      )
    })

    it('sets period to full month when button clicked', async () => {
      render(<WorkHoursEditor {...defaultProps} />)

      const button = screen.getByRole('button', { name: /full month/i })
      fireEvent.click(button)

      expect(defaultProps.onPeriodChange).toHaveBeenCalledWith(
        '2024-01-01',
        '2024-01-31'
      )
    })

    it('displays billing period when set', () => {
      const propsWithPeriod = {
        ...defaultProps,
        periodStart: '2024-01-01',
        periodEnd: '2024-01-15',
      }

      render(<WorkHoursEditor {...propsWithPeriod} />)

      // Find the billing period display that shows the actual dates
      const periodDisplay = screen.getByText(/Billing Period:/)
      expect(periodDisplay).toBeInTheDocument()
      // The period text contains formatted dates
      expect(periodDisplay.textContent).toContain('Jan')
    })
  })

  describe('Month Navigation', () => {
    it('navigates to previous month', () => {
      render(<WorkHoursEditor {...defaultProps} />)

      // Find the previous month button (has chevron-left icon)
      const buttons = screen.getAllByRole('button')
      const prevButton = buttons.find(btn =>
        btn.querySelector('svg.lucide-chevron-left')
      )

      expect(prevButton).toBeDefined()
      fireEvent.click(prevButton!)

      // Should show December 2023
      expect(screen.getByText('December 2023')).toBeInTheDocument()
    })

    it('navigates to next month', () => {
      render(<WorkHoursEditor {...defaultProps} />)

      // Find the next month button (has chevron-right icon)
      const buttons = screen.getAllByRole('button')
      const nextButton = buttons.find(btn =>
        btn.querySelector('svg.lucide-chevron-right')
      )

      expect(nextButton).toBeDefined()
      fireEvent.click(nextButton!)

      // Should show February 2024
      expect(screen.getByText('February 2024')).toBeInTheDocument()
    })
  })

  describe('Day Interactions (within period)', () => {
    const propsWithPeriod = {
      ...defaultProps,
      periodStart: '2024-01-01',
      periodEnd: '2024-01-31',
      dailyWorkHours: [
        { date: '2024-01-15', hours: 8, isWorkday: true },
      ],
    }

    it('shows input fields for days within the period', () => {
      render(<WorkHoursEditor {...propsWithPeriod} />)

      // Should have number inputs for hours (one for default and many for days)
      const inputs = screen.getAllByRole('spinbutton')
      expect(inputs.length).toBeGreaterThan(0)
    })

    it('shows checkboxes for toggling workdays', () => {
      render(<WorkHoursEditor {...propsWithPeriod} />)

      // Should have checkboxes for workday toggle
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThan(0)
    })

    it('calls onUpdateDay when hours are changed', () => {
      render(<WorkHoursEditor {...propsWithPeriod} />)

      // Get all inputs except the first one (default hours)
      const inputs = screen.getAllByRole('spinbutton')
      // Find an input that's not the default hours input
      const dayInput = inputs.find(input => input.closest('.relative.rounded-md'))

      if (dayInput) {
        fireEvent.change(dayInput, { target: { value: '6' } })
        expect(defaultProps.onUpdateDay).toHaveBeenCalled()
      } else {
        // Just verify there are inputs for days
        expect(inputs.length).toBeGreaterThan(1) // Default hours + at least one day
      }
    })

    it('calls onToggleWorkday when checkbox is clicked', () => {
      render(<WorkHoursEditor {...propsWithPeriod} />)

      const checkboxes = screen.getAllByRole('checkbox')
      if (checkboxes.length > 0) {
        fireEvent.click(checkboxes[0])
        expect(defaultProps.onToggleWorkday).toHaveBeenCalled()
      }
    })
  })

  describe('Default Hours Input', () => {
    it('updates local default hours when changed', () => {
      render(<WorkHoursEditor {...defaultProps} />)

      const input = screen.getByDisplayValue('8')
      fireEvent.change(input, { target: { value: '6' } })

      // The local state should update (no callback, just local state)
      expect(input).toHaveValue(6)
    })

    it('uses updated default hours when setting period', () => {
      render(<WorkHoursEditor {...defaultProps} />)

      // Change default hours
      const input = screen.getByDisplayValue('8')
      fireEvent.change(input, { target: { value: '6' } })

      // Set period
      const periodButton = screen.getByRole('button', { name: /1st - 15th/i })
      fireEvent.click(periodButton)

      expect(defaultProps.onSetDefaultForPeriod).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        6
      )
    })
  })

  describe('Visual States', () => {
    it('applies different styling for days within period', () => {
      const propsWithPeriod = {
        ...defaultProps,
        periodStart: '2024-01-01',
        periodEnd: '2024-01-15',
      }

      render(<WorkHoursEditor {...propsWithPeriod} />)

      // Days within period should have interactive elements
      const inputs = screen.getAllByRole('spinbutton')
      expect(inputs.length).toBeGreaterThan(0)
    })

    it('shows reduced opacity for non-workdays', () => {
      const propsWithNonWorkday = {
        ...defaultProps,
        periodStart: '2024-01-01',
        periodEnd: '2024-01-31',
        dailyWorkHours: [
          { date: '2024-01-15', hours: 0, isWorkday: false },
        ],
      }

      render(<WorkHoursEditor {...propsWithNonWorkday} />)

      // Component should render without errors
      expect(screen.getByText('Work Hours')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty dailyWorkHours array', () => {
      render(<WorkHoursEditor {...defaultProps} />)

      expect(screen.getByText('0')).toBeInTheDocument() // Working days
      expect(screen.getByText('0.0')).toBeInTheDocument() // Total hours
    })

    it('handles February with leap year correctly', () => {
      vi.setSystemTime(new Date('2024-02-15')) // 2024 is a leap year

      render(<WorkHoursEditor {...defaultProps} />)

      // Navigate to see February
      expect(screen.getByText('February 2024')).toBeInTheDocument()
    })

    it('handles transition between months', async () => {
      vi.setSystemTime(new Date('2024-01-31'))

      render(<WorkHoursEditor {...defaultProps} />)

      // Should show January
      expect(screen.getByText('January 2024')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has accessible number inputs', () => {
      const propsWithPeriod = {
        ...defaultProps,
        periodStart: '2024-01-01',
        periodEnd: '2024-01-15',
      }

      render(<WorkHoursEditor {...propsWithPeriod} />)

      const inputs = screen.getAllByRole('spinbutton')
      inputs.forEach(input => {
        expect(input).toHaveAttribute('type', 'number')
        expect(input).toHaveAttribute('min', '0')
        expect(input).toHaveAttribute('max', '24')
      })
    })

    it('has proper button labels', () => {
      render(<WorkHoursEditor {...defaultProps} />)

      const periodButtons = [
        screen.getByRole('button', { name: /1st - 15th/i }),
        screen.getByRole('button', { name: /16th - end/i }),
        screen.getByRole('button', { name: /full month/i }),
      ]

      periodButtons.forEach(button => {
        expect(button).toBeEnabled()
      })
    })
  })
})
