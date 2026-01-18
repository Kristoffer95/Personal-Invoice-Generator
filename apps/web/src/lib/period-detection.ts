import {
  startOfMonth,
  endOfMonth,
  format,
  isWeekend,
  eachDayOfInterval,
  getDate,
} from 'date-fns'
import type { ScheduleFrequency, DailyWorkHours } from '@invoice-generator/shared-types'

export interface DetectedPeriod {
  start: string
  end: string
  label: string
  isAutoDetected: boolean
}

export type PeriodBatchType = '1st_batch' | '2nd_batch' | 'whole_month'

/**
 * Get period based on batch type (1st batch, 2nd batch, or whole month)
 * for the current month
 */
export function getBatchPeriod(
  batchType: PeriodBatchType,
  referenceDate: Date = new Date()
): DetectedPeriod {
  const currentYear = referenceDate.getFullYear()
  const currentMonth = referenceDate.getMonth()

  if (batchType === '1st_batch') {
    const start = new Date(currentYear, currentMonth, 1)
    const end = new Date(currentYear, currentMonth, 15)
    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
      label: `1st Batch (1-15 ${format(start, 'MMM')})`,
      isAutoDetected: false,
    }
  } else if (batchType === '2nd_batch') {
    const start = new Date(currentYear, currentMonth, 16)
    const end = endOfMonth(new Date(currentYear, currentMonth, 1))
    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
      label: `2nd Batch (16-${getDate(end)} ${format(start, 'MMM')})`,
      isAutoDetected: false,
    }
  } else {
    const start = startOfMonth(referenceDate)
    const end = endOfMonth(referenceDate)
    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
      label: `Whole Month (${format(start, 'MMMM')})`,
      isAutoDetected: false,
    }
  }
}

/**
 * Detects the appropriate invoice period based on:
 * - Today's date
 * - Schedule frequency (15th, last day, or both)
 *
 * Logic:
 * - If frequency is BOTH_15TH_AND_LAST:
 *   - If today is 1-15, period is 16th of previous month to end of previous month
 *   - If today is 16-end, period is 1st-15th of current month
 * - If frequency is EVERY_15TH:
 *   - Period is always 1st-15th of current month (or previous if we're past 15th)
 * - If frequency is EVERY_LAST_DAY:
 *   - Period is always 16th-end of previous month (or current if we're past month end)
 */
export function detectInvoicePeriod(
  frequency: ScheduleFrequency,
  today: Date = new Date()
): DetectedPeriod {
  const dayOfMonth = getDate(today)
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()

  if (frequency === 'BOTH_15TH_AND_LAST') {
    if (dayOfMonth >= 16) {
      // We're in the second half of the month
      // Invoice covers 1st-15th of current month
      const start = new Date(currentYear, currentMonth, 1)
      const end = new Date(currentYear, currentMonth, 15)
      return {
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd'),
        label: `1st - 15th ${format(start, 'MMM yyyy')}`,
        isAutoDetected: true,
      }
    } else {
      // We're in the first half of the month
      // Invoice covers 16th-end of previous month
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
      const start = new Date(prevYear, prevMonth, 16)
      const end = endOfMonth(new Date(prevYear, prevMonth, 1))
      return {
        start: format(start, 'yyyy-MM-dd'),
        end: format(end, 'yyyy-MM-dd'),
        label: `16th - ${getDate(end)}${getSuffix(getDate(end))} ${format(start, 'MMM yyyy')}`,
        isAutoDetected: true,
      }
    }
  } else if (frequency === 'EVERY_15TH') {
    // Period is always 1st-15th
    // If past 15th, use current month; otherwise previous month makes sense
    const targetMonth = dayOfMonth > 15 ? currentMonth : (currentMonth === 0 ? 11 : currentMonth - 1)
    const targetYear = dayOfMonth > 15 ? currentYear : (currentMonth === 0 ? currentYear - 1 : currentYear)
    const start = new Date(targetYear, targetMonth, 1)
    const end = new Date(targetYear, targetMonth, 15)
    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
      label: `1st - 15th ${format(start, 'MMM yyyy')}`,
      isAutoDetected: true,
    }
  } else if (frequency === 'EVERY_LAST_DAY') {
    // Period is always 16th-end
    // Use previous month if we're early in the month
    const targetMonth = dayOfMonth >= 16 ? currentMonth : (currentMonth === 0 ? 11 : currentMonth - 1)
    const targetYear = dayOfMonth >= 16 ? currentYear : (currentMonth === 0 ? currentYear - 1 : currentYear)
    const start = new Date(targetYear, targetMonth, 16)
    const end = endOfMonth(new Date(targetYear, targetMonth, 1))
    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
      label: `16th - ${getDate(end)}${getSuffix(getDate(end))} ${format(start, 'MMM yyyy')}`,
      isAutoDetected: true,
    }
  } else {
    // CUSTOM or MONTHLY - default to full current month
    const start = startOfMonth(today)
    const end = endOfMonth(today)
    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
      label: `Full ${format(start, 'MMMM yyyy')}`,
      isAutoDetected: true,
    }
  }
}

function getSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th'
  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

/**
 * Generate default work hours for a period.
 * All days get the same default hours, but weekends are unchecked (isWorkday = false)
 * so they don't count towards the total.
 */
export function generateWorkHoursForPeriod(
  startDate: string,
  endDate: string,
  defaultHoursPerDay: number
): DailyWorkHours[] {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const days = eachDayOfInterval({ start, end })

  return days.map((day) => {
    const isWeekday = !isWeekend(day)

    return {
      date: format(day, 'yyyy-MM-dd'),
      // All days get the same hours for display
      hours: defaultHoursPerDay,
      // Only weekdays are checked by default (count towards total)
      isWorkday: isWeekday,
    }
  })
}

/**
 * Calculate totals from work hours
 */
export function calculateWorkTotals(hours: DailyWorkHours[]): {
  totalDays: number
  totalHours: number
} {
  const workingDays = hours.filter((d) => d.isWorkday && d.hours > 0)
  return {
    totalDays: workingDays.length,
    totalHours: workingDays.reduce((sum, d) => sum + d.hours, 0),
  }
}

/**
 * Get available period options for manual override
 */
export function getPeriodOptions(referenceDate: Date = new Date()): DetectedPeriod[] {
  const currentYear = referenceDate.getFullYear()
  const currentMonth = referenceDate.getMonth()
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear

  const options: DetectedPeriod[] = []

  // Current month 1st-15th
  const curr1to15Start = new Date(currentYear, currentMonth, 1)
  const curr1to15End = new Date(currentYear, currentMonth, 15)
  options.push({
    start: format(curr1to15Start, 'yyyy-MM-dd'),
    end: format(curr1to15End, 'yyyy-MM-dd'),
    label: `1st - 15th ${format(curr1to15Start, 'MMM yyyy')}`,
    isAutoDetected: false,
  })

  // Current month 16th-end
  const curr16toEndStart = new Date(currentYear, currentMonth, 16)
  const curr16toEndEnd = endOfMonth(new Date(currentYear, currentMonth, 1))
  options.push({
    start: format(curr16toEndStart, 'yyyy-MM-dd'),
    end: format(curr16toEndEnd, 'yyyy-MM-dd'),
    label: `16th - ${getDate(curr16toEndEnd)}${getSuffix(getDate(curr16toEndEnd))} ${format(curr16toEndStart, 'MMM yyyy')}`,
    isAutoDetected: false,
  })

  // Previous month 1st-15th
  const prev1to15Start = new Date(prevYear, prevMonth, 1)
  const prev1to15End = new Date(prevYear, prevMonth, 15)
  options.push({
    start: format(prev1to15Start, 'yyyy-MM-dd'),
    end: format(prev1to15End, 'yyyy-MM-dd'),
    label: `1st - 15th ${format(prev1to15Start, 'MMM yyyy')}`,
    isAutoDetected: false,
  })

  // Previous month 16th-end
  const prev16toEndStart = new Date(prevYear, prevMonth, 16)
  const prev16toEndEnd = endOfMonth(new Date(prevYear, prevMonth, 1))
  options.push({
    start: format(prev16toEndStart, 'yyyy-MM-dd'),
    end: format(prev16toEndEnd, 'yyyy-MM-dd'),
    label: `16th - ${getDate(prev16toEndEnd)}${getSuffix(getDate(prev16toEndEnd))} ${format(prev16toEndStart, 'MMM yyyy')}`,
    isAutoDetected: false,
  })

  // Full current month
  const fullCurrStart = startOfMonth(referenceDate)
  const fullCurrEnd = endOfMonth(referenceDate)
  options.push({
    start: format(fullCurrStart, 'yyyy-MM-dd'),
    end: format(fullCurrEnd, 'yyyy-MM-dd'),
    label: `Full ${format(fullCurrStart, 'MMMM yyyy')}`,
    isAutoDetected: false,
  })

  // Full previous month
  const fullPrevStart = new Date(prevYear, prevMonth, 1)
  const fullPrevEnd = endOfMonth(fullPrevStart)
  options.push({
    start: format(fullPrevStart, 'yyyy-MM-dd'),
    end: format(fullPrevEnd, 'yyyy-MM-dd'),
    label: `Full ${format(fullPrevStart, 'MMMM yyyy')}`,
    isAutoDetected: false,
  })

  return options
}
