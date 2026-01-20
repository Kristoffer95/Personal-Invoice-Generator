import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScheduleConfig } from './ScheduleConfig'
import type { ScheduleConfig as ScheduleConfigType } from '@invoice-generator/shared-types'

describe('ScheduleConfig', () => {
  const user = userEvent.setup()

  const defaultConfig: ScheduleConfigType = {
    frequency: 'BOTH_15TH_AND_LAST',
    workdayType: 'WEEKDAYS_ONLY',
    defaultHoursPerDay: 8,
  }

  const defaultProps = {
    config: defaultConfig,
    onUpdate: vi.fn(),
    customDates: [] as string[],
    onCustomDatesChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the card with title', () => {
      render(<ScheduleConfig {...defaultProps} />)

      expect(screen.getByText('Invoice Schedule')).toBeInTheDocument()
    })

    it('renders the description', () => {
      render(<ScheduleConfig {...defaultProps} />)

      expect(screen.getByText(/configure when to create invoices/i)).toBeInTheDocument()
    })

    it('renders all frequency options', () => {
      render(<ScheduleConfig {...defaultProps} />)

      expect(screen.getByLabelText(/every 15th/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/every last day/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/both 15th and last day/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/custom dates/i)).toBeInTheDocument()
    })

    it('renders all workday type options', () => {
      render(<ScheduleConfig {...defaultProps} />)

      expect(screen.getByLabelText(/weekdays only/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/all days/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/custom selection/i)).toBeInTheDocument()
    })

    it('shows frequency section header', () => {
      render(<ScheduleConfig {...defaultProps} />)

      expect(screen.getByText('Invoice Frequency')).toBeInTheDocument()
    })

    it('shows days to include section header', () => {
      render(<ScheduleConfig {...defaultProps} />)

      expect(screen.getByText('Days to Include')).toBeInTheDocument()
    })
  })

  describe('Frequency Selection', () => {
    it('has BOTH_15TH_AND_LAST selected by default', () => {
      render(<ScheduleConfig {...defaultProps} />)

      const bothOption = screen.getByRole('radio', { name: /both 15th and last day/i })
      expect(bothOption).toBeChecked()
    })

    it('calls onUpdate when EVERY_15TH is selected', async () => {
      render(<ScheduleConfig {...defaultProps} />)

      await user.click(screen.getByLabelText(/every 15th/i))

      expect(defaultProps.onUpdate).toHaveBeenCalledWith({ frequency: 'EVERY_15TH' })
    })

    it('calls onUpdate when EVERY_LAST_DAY is selected', async () => {
      render(<ScheduleConfig {...defaultProps} />)

      await user.click(screen.getByLabelText(/every last day/i))

      expect(defaultProps.onUpdate).toHaveBeenCalledWith({ frequency: 'EVERY_LAST_DAY' })
    })

    it('calls onUpdate when CUSTOM is selected', async () => {
      render(<ScheduleConfig {...defaultProps} />)

      await user.click(screen.getByLabelText(/custom dates/i))

      expect(defaultProps.onUpdate).toHaveBeenCalledWith({ frequency: 'CUSTOM' })
    })

    it('shows correct description for EVERY_15TH', () => {
      render(<ScheduleConfig {...defaultProps} />)

      expect(screen.getByText(/generate invoice for days 1-15/i)).toBeInTheDocument()
    })

    it('shows correct description for EVERY_LAST_DAY', () => {
      render(<ScheduleConfig {...defaultProps} />)

      expect(screen.getByText(/generate invoice for days 16-end/i)).toBeInTheDocument()
    })

    it('shows correct description for BOTH', () => {
      render(<ScheduleConfig {...defaultProps} />)

      expect(screen.getByText(/generate two invoices per month/i)).toBeInTheDocument()
    })

    it('shows correct description for CUSTOM', () => {
      render(<ScheduleConfig {...defaultProps} />)

      expect(screen.getByText(/select specific dates from the calendar/i)).toBeInTheDocument()
    })
  })

  describe('Workday Type Selection', () => {
    it('has WEEKDAYS_ONLY selected by default', () => {
      render(<ScheduleConfig {...defaultProps} />)

      const weekdaysOption = screen.getByRole('radio', { name: /weekdays only/i })
      expect(weekdaysOption).toBeChecked()
    })

    it('calls onUpdate when ALL_DAYS is selected', async () => {
      render(<ScheduleConfig {...defaultProps} />)

      await user.click(screen.getByLabelText(/all days/i))

      expect(defaultProps.onUpdate).toHaveBeenCalledWith({ workdayType: 'ALL_DAYS' })
    })

    it('calls onUpdate when CUSTOM workday type is selected', async () => {
      render(<ScheduleConfig {...defaultProps} />)

      await user.click(screen.getByLabelText(/custom selection/i))

      expect(defaultProps.onUpdate).toHaveBeenCalledWith({ workdayType: 'CUSTOM' })
    })

    it('shows correct description for WEEKDAYS_ONLY', () => {
      render(<ScheduleConfig {...defaultProps} />)

      expect(screen.getByText(/monday through friday/i)).toBeInTheDocument()
    })

    it('shows correct description for ALL_DAYS', () => {
      render(<ScheduleConfig {...defaultProps} />)

      expect(screen.getByText(/every day including weekends/i)).toBeInTheDocument()
    })

    it('shows correct description for CUSTOM workday type', () => {
      render(<ScheduleConfig {...defaultProps} />)

      expect(screen.getByText(/manually select working days/i)).toBeInTheDocument()
    })
  })

  describe('Custom Dates', () => {
    it('shows date picker button when CUSTOM frequency is selected', () => {
      const customConfig: ScheduleConfigType = {
        ...defaultConfig,
        frequency: 'CUSTOM',
      }

      render(<ScheduleConfig {...defaultProps} config={customConfig} />)

      expect(screen.getByRole('button', { name: /pick dates/i })).toBeInTheDocument()
    })

    it('does not show date picker when frequency is not CUSTOM', () => {
      render(<ScheduleConfig {...defaultProps} />)

      expect(screen.queryByRole('button', { name: /pick dates/i })).not.toBeInTheDocument()
    })

    it('shows number of dates selected', () => {
      const customConfig: ScheduleConfigType = {
        ...defaultConfig,
        frequency: 'CUSTOM',
      }

      render(<ScheduleConfig {...defaultProps} config={customConfig} customDates={['2024-01-15', '2024-01-16']} />)

      expect(screen.getByText('2 dates selected')).toBeInTheDocument()
    })

    it('shows "Pick dates" when no dates are selected', () => {
      const customConfig: ScheduleConfigType = {
        ...defaultConfig,
        frequency: 'CUSTOM',
      }

      render(<ScheduleConfig {...defaultProps} config={customConfig} />)

      expect(screen.getByText('Pick dates')).toBeInTheDocument()
    })

    it('displays selected dates as badges', () => {
      const customConfig: ScheduleConfigType = {
        ...defaultConfig,
        frequency: 'CUSTOM',
      }

      render(<ScheduleConfig {...defaultProps} config={customConfig} customDates={['2024-01-15', '2024-01-16']} />)

      expect(screen.getByText('Jan 15')).toBeInTheDocument()
      expect(screen.getByText('Jan 16')).toBeInTheDocument()
    })

    it('shows "+X more" when more than 10 dates are selected', () => {
      const customConfig: ScheduleConfigType = {
        ...defaultConfig,
        frequency: 'CUSTOM',
      }

      const manyDates = Array.from({ length: 15 }, (_, i) => `2024-01-${String(i + 1).padStart(2, '0')}`)

      render(<ScheduleConfig {...defaultProps} config={customConfig} customDates={manyDates} />)

      expect(screen.getByText('+5 more')).toBeInTheDocument()
    })

    it('opens calendar when date picker button is clicked', async () => {
      const customConfig: ScheduleConfigType = {
        ...defaultConfig,
        frequency: 'CUSTOM',
      }

      render(<ScheduleConfig {...defaultProps} config={customConfig} />)

      await user.click(screen.getByRole('button', { name: /pick dates/i }))

      // Calendar should appear - popover opens
      await expect(screen.findByText('Select Dates')).resolves.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('frequency radio group is keyboard navigable', async () => {
      render(<ScheduleConfig {...defaultProps} />)

      const firstRadio = screen.getByRole('radio', { name: /every 15th/i })
      firstRadio.focus()

      expect(document.activeElement).toBe(firstRadio)
    })

    it('workday type radio group is keyboard navigable', async () => {
      render(<ScheduleConfig {...defaultProps} />)

      const firstRadio = screen.getByRole('radio', { name: /weekdays only/i })
      firstRadio.focus()

      expect(document.activeElement).toBe(firstRadio)
    })

    it('all radio buttons have associated labels', () => {
      render(<ScheduleConfig {...defaultProps} />)

      // Check frequency options
      expect(screen.getByLabelText(/every 15th/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/every last day/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/both 15th and last day/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/custom dates/i)).toBeInTheDocument()

      // Check workday type options
      expect(screen.getByLabelText(/weekdays only/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/all days/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/custom selection/i)).toBeInTheDocument()
    })

    it('has proper heading hierarchy', () => {
      render(<ScheduleConfig {...defaultProps} />)

      // Main title should be rendered as card title
      expect(screen.getByText('Invoice Schedule')).toBeInTheDocument()

      // Section headers
      expect(screen.getByText('Invoice Frequency')).toBeInTheDocument()
      expect(screen.getByText('Days to Include')).toBeInTheDocument()
    })
  })

  describe('Different Config States', () => {
    it('reflects EVERY_15TH selection in radio group', () => {
      const config: ScheduleConfigType = {
        ...defaultConfig,
        frequency: 'EVERY_15TH',
      }

      render(<ScheduleConfig {...defaultProps} config={config} />)

      expect(screen.getByRole('radio', { name: /every 15th/i })).toBeChecked()
      expect(screen.getByRole('radio', { name: /both 15th and last day/i })).not.toBeChecked()
    })

    it('reflects ALL_DAYS selection in radio group', () => {
      const config: ScheduleConfigType = {
        ...defaultConfig,
        workdayType: 'ALL_DAYS',
      }

      render(<ScheduleConfig {...defaultProps} config={config} />)

      expect(screen.getByRole('radio', { name: /all days/i })).toBeChecked()
      expect(screen.getByRole('radio', { name: /weekdays only/i })).not.toBeChecked()
    })
  })

  describe('Visual Elements', () => {
    it('renders calendar icon in card header', () => {
      render(<ScheduleConfig {...defaultProps} />)

      const header = screen.getByText('Invoice Schedule').closest('div')
      expect(header?.querySelector('svg')).toBeInTheDocument()
    })

    it('applies hover styles to radio options', () => {
      render(<ScheduleConfig {...defaultProps} />)

      // The hover class is on the container div that wraps the radio and label
      const every15thLabel = screen.getByText('Every 15th')
      const containerDiv = every15thLabel.closest('.rounded-lg')
      expect(containerDiv).toHaveClass('hover:bg-muted/50')
    })
  })
})
