import { describe, it, expect } from 'vitest'
import {
  detectInvoicePeriod,
  generateWorkHoursForPeriod,
  calculateWorkTotals,
  getPeriodOptions,
  getBatchPeriod,
  type PeriodBatchType,
} from './period-detection'

describe('detectInvoicePeriod', () => {
  describe('BOTH_15TH_AND_LAST frequency', () => {
    it('returns 1st-15th when today is after 15th', () => {
      // Jan 19 -> should return Jan 1-15
      const today = new Date(2024, 0, 19) // Jan 19, 2024
      const result = detectInvoicePeriod('BOTH_15TH_AND_LAST', today)

      expect(result.start).toBe('2024-01-01')
      expect(result.end).toBe('2024-01-15')
      expect(result.isAutoDetected).toBe(true)
    })

    it('returns 16th-end of previous month when today is before 16th', () => {
      // Jan 10 -> should return Dec 16-31 of previous year
      const today = new Date(2024, 0, 10) // Jan 10, 2024
      const result = detectInvoicePeriod('BOTH_15TH_AND_LAST', today)

      expect(result.start).toBe('2023-12-16')
      expect(result.end).toBe('2023-12-31')
      expect(result.isAutoDetected).toBe(true)
    })

    it('returns correct period at edge case day 16', () => {
      const today = new Date(2024, 1, 16) // Feb 16, 2024
      const result = detectInvoicePeriod('BOTH_15TH_AND_LAST', today)

      expect(result.start).toBe('2024-02-01')
      expect(result.end).toBe('2024-02-15')
    })

    it('returns correct period at edge case day 15', () => {
      const today = new Date(2024, 1, 15) // Feb 15, 2024
      const result = detectInvoicePeriod('BOTH_15TH_AND_LAST', today)

      expect(result.start).toBe('2024-01-16')
      expect(result.end).toBe('2024-01-31')
    })
  })

  describe('EVERY_15TH frequency', () => {
    it('returns 1st-15th of current month when past 15th', () => {
      const today = new Date(2024, 2, 20) // Mar 20, 2024
      const result = detectInvoicePeriod('EVERY_15TH', today)

      expect(result.start).toBe('2024-03-01')
      expect(result.end).toBe('2024-03-15')
    })

    it('returns 1st-15th of previous month when before 16th', () => {
      const today = new Date(2024, 2, 10) // Mar 10, 2024
      const result = detectInvoicePeriod('EVERY_15TH', today)

      expect(result.start).toBe('2024-02-01')
      expect(result.end).toBe('2024-02-15')
    })
  })

  describe('EVERY_LAST_DAY frequency', () => {
    it('returns 16th-end of current month when past 16th', () => {
      const today = new Date(2024, 2, 20) // Mar 20, 2024
      const result = detectInvoicePeriod('EVERY_LAST_DAY', today)

      expect(result.start).toBe('2024-03-16')
      expect(result.end).toBe('2024-03-31')
    })

    it('returns 16th-end of previous month when before 16th', () => {
      const today = new Date(2024, 2, 10) // Mar 10, 2024
      const result = detectInvoicePeriod('EVERY_LAST_DAY', today)

      expect(result.start).toBe('2024-02-16')
      expect(result.end).toBe('2024-02-29') // 2024 is leap year
    })
  })

  describe('CUSTOM frequency', () => {
    it('returns full current month', () => {
      const today = new Date(2024, 2, 15) // Mar 15, 2024
      const result = detectInvoicePeriod('CUSTOM', today)

      expect(result.start).toBe('2024-03-01')
      expect(result.end).toBe('2024-03-31')
    })
  })
})

describe('generateWorkHoursForPeriod', () => {
  it('generates work hours with weekdays checked and weekends unchecked', () => {
    // Jan 1-7 2024: Mon, Tue, Wed, Thu, Fri, Sat, Sun
    const result = generateWorkHoursForPeriod('2024-01-01', '2024-01-07', 8)

    expect(result).toHaveLength(7)

    // Weekdays (Mon-Fri) are checked
    const weekdays = result.filter((d) => d.isWorkday)
    expect(weekdays).toHaveLength(5)
    expect(weekdays.every((d) => d.hours === 8)).toBe(true)

    // Weekend (Sat-Sun) are unchecked but still have hours
    const weekends = result.filter((d) => !d.isWorkday)
    expect(weekends).toHaveLength(2)
    expect(weekends.every((d) => d.hours === 8)).toBe(true) // Same hours as weekdays
  })

  it('all days get the same default hours', () => {
    const result = generateWorkHoursForPeriod('2024-01-01', '2024-01-07', 8)

    expect(result).toHaveLength(7)
    // All days should have 8 hours
    expect(result.every((d) => d.hours === 8)).toBe(true)
  })

  it('uses custom hours per day for all days', () => {
    const result = generateWorkHoursForPeriod('2024-01-01', '2024-01-03', 6)

    // All days get custom hours
    expect(result.every((d) => d.hours === 6)).toBe(true)
  })
})

describe('calculateWorkTotals', () => {
  it('calculates total days and hours correctly', () => {
    const hours = [
      { date: '2024-01-01', hours: 8, isWorkday: true },
      { date: '2024-01-02', hours: 6, isWorkday: true },
      { date: '2024-01-03', hours: 0, isWorkday: false },
      { date: '2024-01-04', hours: 8, isWorkday: true },
    ]

    const result = calculateWorkTotals(hours)

    expect(result.totalDays).toBe(3)
    expect(result.totalHours).toBe(22)
  })

  it('excludes days marked as not workday', () => {
    const hours = [
      { date: '2024-01-01', hours: 8, isWorkday: false },
      { date: '2024-01-02', hours: 8, isWorkday: true },
    ]

    const result = calculateWorkTotals(hours)

    expect(result.totalDays).toBe(1)
    expect(result.totalHours).toBe(8)
  })

  it('excludes days with zero hours', () => {
    const hours = [
      { date: '2024-01-01', hours: 0, isWorkday: true },
      { date: '2024-01-02', hours: 8, isWorkday: true },
    ]

    const result = calculateWorkTotals(hours)

    expect(result.totalDays).toBe(1)
    expect(result.totalHours).toBe(8)
  })
})

describe('getPeriodOptions', () => {
  it('returns 6 period options', () => {
    const options = getPeriodOptions(new Date(2024, 0, 15))
    expect(options).toHaveLength(6)
  })

  it('includes current month 1st-15th', () => {
    const options = getPeriodOptions(new Date(2024, 0, 15))
    const option = options.find((o) => o.label.includes('1st - 15th Jan'))
    expect(option).toBeDefined()
    expect(option?.start).toBe('2024-01-01')
    expect(option?.end).toBe('2024-01-15')
  })

  it('includes current month 16th-end', () => {
    const options = getPeriodOptions(new Date(2024, 0, 15))
    const option = options.find((o) => o.label.includes('16th') && o.label.includes('Jan 2024'))
    expect(option).toBeDefined()
    expect(option?.start).toBe('2024-01-16')
    expect(option?.end).toBe('2024-01-31')
  })

  it('includes full month option', () => {
    const options = getPeriodOptions(new Date(2024, 0, 15))
    const option = options.find((o) => o.label === 'Full January 2024')
    expect(option).toBeDefined()
    expect(option?.start).toBe('2024-01-01')
    expect(option?.end).toBe('2024-01-31')
  })

  it('includes previous month options', () => {
    const options = getPeriodOptions(new Date(2024, 1, 15)) // Feb 15
    const prevFullMonth = options.find((o) => o.label === 'Full January 2024')
    expect(prevFullMonth).toBeDefined()
  })

  it('all options have isAutoDetected set to false', () => {
    const options = getPeriodOptions()
    expect(options.every((o) => o.isAutoDetected === false)).toBe(true)
  })
})

describe('getBatchPeriod', () => {
  describe('1st_batch', () => {
    it('returns 1st-15th of current month', () => {
      const refDate = new Date(2024, 0, 20) // Jan 20, 2024
      const result = getBatchPeriod('1st_batch', refDate)

      expect(result.start).toBe('2024-01-01')
      expect(result.end).toBe('2024-01-15')
      expect(result.label).toBe('1st Batch (1-15 Jan)')
      expect(result.isAutoDetected).toBe(false)
    })

    it('handles different months correctly', () => {
      const refDate = new Date(2024, 5, 10) // June 10, 2024
      const result = getBatchPeriod('1st_batch', refDate)

      expect(result.start).toBe('2024-06-01')
      expect(result.end).toBe('2024-06-15')
      expect(result.label).toBe('1st Batch (1-15 Jun)')
    })

    it('updates correctly when navigating to a different month (reactivity test)', () => {
      // Simulate starting in January
      const janResult = getBatchPeriod('1st_batch', new Date(2024, 0, 15))
      expect(janResult.start).toBe('2024-01-01')
      expect(janResult.end).toBe('2024-01-15')

      // Navigate to February - should return Feb 1-15
      const febResult = getBatchPeriod('1st_batch', new Date(2024, 1, 15))
      expect(febResult.start).toBe('2024-02-01')
      expect(febResult.end).toBe('2024-02-15')
      expect(febResult.label).toBe('1st Batch (1-15 Feb)')

      // Navigate to December - should return Dec 1-15
      const decResult = getBatchPeriod('1st_batch', new Date(2024, 11, 15))
      expect(decResult.start).toBe('2024-12-01')
      expect(decResult.end).toBe('2024-12-15')
      expect(decResult.label).toBe('1st Batch (1-15 Dec)')
    })
  })

  describe('2nd_batch', () => {
    it('returns 16th-end of current month', () => {
      const refDate = new Date(2024, 0, 20) // Jan 20, 2024
      const result = getBatchPeriod('2nd_batch', refDate)

      expect(result.start).toBe('2024-01-16')
      expect(result.end).toBe('2024-01-31')
      expect(result.label).toBe('2nd Batch (16-31 Jan)')
      expect(result.isAutoDetected).toBe(false)
    })

    it('handles February correctly (leap year)', () => {
      const refDate = new Date(2024, 1, 20) // Feb 20, 2024 (leap year)
      const result = getBatchPeriod('2nd_batch', refDate)

      expect(result.start).toBe('2024-02-16')
      expect(result.end).toBe('2024-02-29')
      expect(result.label).toBe('2nd Batch (16-29 Feb)')
    })

    it('handles February correctly (non-leap year)', () => {
      const refDate = new Date(2023, 1, 20) // Feb 20, 2023 (non-leap year)
      const result = getBatchPeriod('2nd_batch', refDate)

      expect(result.start).toBe('2023-02-16')
      expect(result.end).toBe('2023-02-28')
      expect(result.label).toBe('2nd Batch (16-28 Feb)')
    })

    it('handles months with 30 days', () => {
      const refDate = new Date(2024, 3, 20) // April 20, 2024
      const result = getBatchPeriod('2nd_batch', refDate)

      expect(result.start).toBe('2024-04-16')
      expect(result.end).toBe('2024-04-30')
      expect(result.label).toBe('2nd Batch (16-30 Apr)')
    })

    it('updates correctly when navigating to a different month (reactivity test)', () => {
      // Start in January
      const janResult = getBatchPeriod('2nd_batch', new Date(2024, 0, 15))
      expect(janResult.start).toBe('2024-01-16')
      expect(janResult.end).toBe('2024-01-31')

      // Navigate to March - should return Mar 16-31
      const marResult = getBatchPeriod('2nd_batch', new Date(2024, 2, 15))
      expect(marResult.start).toBe('2024-03-16')
      expect(marResult.end).toBe('2024-03-31')
      expect(marResult.label).toBe('2nd Batch (16-31 Mar)')

      // Navigate to April (30 days) - should return Apr 16-30
      const aprResult = getBatchPeriod('2nd_batch', new Date(2024, 3, 15))
      expect(aprResult.start).toBe('2024-04-16')
      expect(aprResult.end).toBe('2024-04-30')
      expect(aprResult.label).toBe('2nd Batch (16-30 Apr)')
    })
  })

  describe('whole_month', () => {
    it('returns full month', () => {
      const refDate = new Date(2024, 0, 20) // Jan 20, 2024
      const result = getBatchPeriod('whole_month', refDate)

      expect(result.start).toBe('2024-01-01')
      expect(result.end).toBe('2024-01-31')
      expect(result.label).toBe('Whole Month (January)')
      expect(result.isAutoDetected).toBe(false)
    })

    it('handles February in leap year', () => {
      const refDate = new Date(2024, 1, 15) // Feb 15, 2024 (leap year)
      const result = getBatchPeriod('whole_month', refDate)

      expect(result.start).toBe('2024-02-01')
      expect(result.end).toBe('2024-02-29')
      expect(result.label).toBe('Whole Month (February)')
    })

    it('handles months with 30 days', () => {
      const refDate = new Date(2024, 10, 15) // Nov 15, 2024
      const result = getBatchPeriod('whole_month', refDate)

      expect(result.start).toBe('2024-11-01')
      expect(result.end).toBe('2024-11-30')
      expect(result.label).toBe('Whole Month (November)')
    })

    it('updates correctly when navigating to a different month (reactivity test)', () => {
      // Start in January
      const janResult = getBatchPeriod('whole_month', new Date(2024, 0, 15))
      expect(janResult.start).toBe('2024-01-01')
      expect(janResult.end).toBe('2024-01-31')
      expect(janResult.label).toBe('Whole Month (January)')

      // Navigate to February (leap year)
      const febResult = getBatchPeriod('whole_month', new Date(2024, 1, 15))
      expect(febResult.start).toBe('2024-02-01')
      expect(febResult.end).toBe('2024-02-29')
      expect(febResult.label).toBe('Whole Month (February)')

      // Navigate to next year January
      const nextYearResult = getBatchPeriod('whole_month', new Date(2025, 0, 15))
      expect(nextYearResult.start).toBe('2025-01-01')
      expect(nextYearResult.end).toBe('2025-01-31')
      expect(nextYearResult.label).toBe('Whole Month (January)')
    })
  })

  describe('type safety', () => {
    it('accepts all valid batch types', () => {
      const batchTypes: PeriodBatchType[] = ['1st_batch', '2nd_batch', 'whole_month']

      batchTypes.forEach((batchType) => {
        const result = getBatchPeriod(batchType)
        expect(result).toHaveProperty('start')
        expect(result).toHaveProperty('end')
        expect(result).toHaveProperty('label')
        expect(result).toHaveProperty('isAutoDetected')
      })
    })
  })
})
