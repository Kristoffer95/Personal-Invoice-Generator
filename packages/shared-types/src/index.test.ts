import { describe, it, expect } from 'vitest'
import {
  calculateInvoiceTotals,
  generateBillingPeriodDates,
  getBillingPeriodStart,
  getBillingPeriodEnd,
  invoiceSchema,
  partyInfoSchema,
  dailyWorkHoursSchema,
  PAGE_SIZES,
  CURRENCY_SYMBOLS,
  PAYMENT_TERMS_LABELS,
} from './index'

describe('calculateInvoiceTotals', () => {
  it('calculates totals for work hours correctly', () => {
    const invoice = {
      hourlyRate: 50,
      dailyWorkHours: [
        { date: '2024-01-01', hours: 8, isWorkday: true },
        { date: '2024-01-02', hours: 6, isWorkday: true },
        { date: '2024-01-03', hours: 0, isWorkday: false },
      ],
      lineItems: [],
      discountPercent: 0,
      taxPercent: 0,
    }

    const result = calculateInvoiceTotals(invoice)

    expect(result.totalDays).toBe(2)
    expect(result.totalHours).toBe(14)
    expect(result.subtotal).toBe(700) // 14 * 50
    expect(result.totalAmount).toBe(700)
  })

  it('calculates discount correctly', () => {
    const invoice = {
      hourlyRate: 100,
      dailyWorkHours: [{ date: '2024-01-01', hours: 10, isWorkday: true }],
      lineItems: [],
      discountPercent: 10,
      taxPercent: 0,
    }

    const result = calculateInvoiceTotals(invoice)

    expect(result.subtotal).toBe(1000)
    expect(result.discountAmount).toBe(100)
    expect(result.totalAmount).toBe(900)
  })

  it('calculates tax correctly', () => {
    const invoice = {
      hourlyRate: 100,
      dailyWorkHours: [{ date: '2024-01-01', hours: 10, isWorkday: true }],
      lineItems: [],
      discountPercent: 0,
      taxPercent: 10,
    }

    const result = calculateInvoiceTotals(invoice)

    expect(result.subtotal).toBe(1000)
    expect(result.taxAmount).toBe(100)
    expect(result.totalAmount).toBe(1100)
  })

  it('calculates discount and tax together', () => {
    const invoice = {
      hourlyRate: 100,
      dailyWorkHours: [{ date: '2024-01-01', hours: 10, isWorkday: true }],
      lineItems: [],
      discountPercent: 10,
      taxPercent: 10,
    }

    const result = calculateInvoiceTotals(invoice)

    expect(result.subtotal).toBe(1000)
    expect(result.discountAmount).toBe(100)
    // Tax is applied after discount: (1000 - 100) * 0.10 = 90
    expect(result.taxAmount).toBe(90)
    expect(result.totalAmount).toBe(990) // 1000 - 100 + 90
  })

  it('includes line items in subtotal', () => {
    const invoice = {
      hourlyRate: 50,
      dailyWorkHours: [{ date: '2024-01-01', hours: 8, isWorkday: true }],
      lineItems: [
        { id: '1', description: 'Item 1', quantity: 2, unitPrice: 50, amount: 100 },
        { id: '2', description: 'Item 2', quantity: 1, unitPrice: 200, amount: 200 },
      ],
      discountPercent: 0,
      taxPercent: 0,
    }

    const result = calculateInvoiceTotals(invoice)

    expect(result.subtotal).toBe(700) // (8 * 50) + 100 + 200
    expect(result.totalAmount).toBe(700)
  })

  it('handles empty work hours', () => {
    const invoice = {
      hourlyRate: 50,
      dailyWorkHours: [],
      lineItems: [],
      discountPercent: 0,
      taxPercent: 0,
    }

    const result = calculateInvoiceTotals(invoice)

    expect(result.totalDays).toBe(0)
    expect(result.totalHours).toBe(0)
    expect(result.subtotal).toBe(0)
    expect(result.totalAmount).toBe(0)
  })

  it('ignores non-workdays in calculation', () => {
    const invoice = {
      hourlyRate: 50,
      dailyWorkHours: [
        { date: '2024-01-01', hours: 8, isWorkday: true },
        { date: '2024-01-02', hours: 8, isWorkday: false },
      ],
      lineItems: [],
      discountPercent: 0,
      taxPercent: 0,
    }

    const result = calculateInvoiceTotals(invoice)

    expect(result.totalDays).toBe(1)
    expect(result.totalHours).toBe(8)
  })
})

describe('generateBillingPeriodDates', () => {
  it('generates weekdays only', () => {
    const startDate = new Date('2024-01-01') // Monday
    const endDate = new Date('2024-01-07') // Sunday

    const dates = generateBillingPeriodDates(startDate, endDate, 'WEEKDAYS_ONLY')

    expect(dates).toHaveLength(5) // Mon-Fri
    expect(dates).toContain('2024-01-01')
    expect(dates).toContain('2024-01-05')
    expect(dates).not.toContain('2024-01-06') // Saturday
    expect(dates).not.toContain('2024-01-07') // Sunday
  })

  it('generates all days', () => {
    const startDate = new Date('2024-01-01')
    const endDate = new Date('2024-01-07')

    const dates = generateBillingPeriodDates(startDate, endDate, 'ALL_DAYS')

    expect(dates).toHaveLength(7)
  })

  it('generates custom dates', () => {
    const startDate = new Date('2024-01-01')
    const endDate = new Date('2024-01-07')
    const customDates = ['2024-01-02', '2024-01-04']

    const dates = generateBillingPeriodDates(startDate, endDate, 'CUSTOM', customDates)

    expect(dates).toHaveLength(2)
    expect(dates).toEqual(['2024-01-02', '2024-01-04'])
  })
})

describe('getBillingPeriodStart', () => {
  it('returns 1st for EVERY_15TH', () => {
    const date = new Date('2024-01-10')
    const result = getBillingPeriodStart(date, 'EVERY_15TH')
    expect(result.getDate()).toBe(1)
  })

  it('returns 16th for EVERY_LAST_DAY', () => {
    const date = new Date('2024-01-20')
    const result = getBillingPeriodStart(date, 'EVERY_LAST_DAY')
    expect(result.getDate()).toBe(16)
  })

  it('handles BOTH_15TH_AND_LAST before 15th', () => {
    const date = new Date('2024-01-10')
    const result = getBillingPeriodStart(date, 'BOTH_15TH_AND_LAST')
    expect(result.getDate()).toBe(1)
  })

  it('handles BOTH_15TH_AND_LAST after 15th', () => {
    const date = new Date('2024-01-20')
    const result = getBillingPeriodStart(date, 'BOTH_15TH_AND_LAST')
    expect(result.getDate()).toBe(16)
  })
})

describe('getBillingPeriodEnd', () => {
  it('returns 15th for EVERY_15TH', () => {
    const date = new Date('2024-01-10')
    const result = getBillingPeriodEnd(date, 'EVERY_15TH')
    expect(result.getDate()).toBe(15)
  })

  it('returns last day for EVERY_LAST_DAY', () => {
    const date = new Date('2024-01-20')
    const result = getBillingPeriodEnd(date, 'EVERY_LAST_DAY')
    expect(result.getDate()).toBe(31) // January has 31 days
  })

  it('returns last day of February correctly', () => {
    const date = new Date('2024-02-20') // Leap year
    const result = getBillingPeriodEnd(date, 'EVERY_LAST_DAY')
    expect(result.getDate()).toBe(29)
  })
})

describe('Schema Validation', () => {
  describe('partyInfoSchema', () => {
    it('validates valid party info', () => {
      const validParty = {
        name: 'Test Company',
        email: 'test@example.com',
      }

      const result = partyInfoSchema.safeParse(validParty)
      expect(result.success).toBe(true)
    })

    it('requires name', () => {
      const invalidParty = {
        email: 'test@example.com',
      }

      const result = partyInfoSchema.safeParse(invalidParty)
      expect(result.success).toBe(false)
    })

    it('validates email format', () => {
      const invalidParty = {
        name: 'Test',
        email: 'not-an-email',
      }

      const result = partyInfoSchema.safeParse(invalidParty)
      expect(result.success).toBe(false)
    })

    it('allows empty string email', () => {
      const validParty = {
        name: 'Test',
        email: '',
      }

      const result = partyInfoSchema.safeParse(validParty)
      expect(result.success).toBe(true)
    })
  })

  describe('dailyWorkHoursSchema', () => {
    it('validates valid work hours', () => {
      const validHours = {
        date: '2024-01-01',
        hours: 8,
        isWorkday: true,
      }

      const result = dailyWorkHoursSchema.safeParse(validHours)
      expect(result.success).toBe(true)
    })

    it('rejects hours greater than 24', () => {
      const invalidHours = {
        date: '2024-01-01',
        hours: 25,
        isWorkday: true,
      }

      const result = dailyWorkHoursSchema.safeParse(invalidHours)
      expect(result.success).toBe(false)
    })

    it('rejects negative hours', () => {
      const invalidHours = {
        date: '2024-01-01',
        hours: -1,
        isWorkday: true,
      }

      const result = dailyWorkHoursSchema.safeParse(invalidHours)
      expect(result.success).toBe(false)
    })
  })
})

describe('Constants', () => {
  it('PAGE_SIZES has all expected sizes', () => {
    expect(PAGE_SIZES).toHaveProperty('A4')
    expect(PAGE_SIZES).toHaveProperty('LETTER')
    expect(PAGE_SIZES).toHaveProperty('LEGAL')
    expect(PAGE_SIZES).toHaveProperty('LONG')
    expect(PAGE_SIZES).toHaveProperty('SHORT')
    expect(PAGE_SIZES).toHaveProperty('A5')
    expect(PAGE_SIZES).toHaveProperty('B5')
  })

  it('PAGE_SIZES has correct dimensions for A4', () => {
    expect(PAGE_SIZES.A4.width).toBe(210)
    expect(PAGE_SIZES.A4.height).toBe(297)
  })

  it('CURRENCY_SYMBOLS has all expected currencies', () => {
    expect(CURRENCY_SYMBOLS.USD).toBe('$')
    expect(CURRENCY_SYMBOLS.EUR).toBe('€')
    expect(CURRENCY_SYMBOLS.GBP).toBe('£')
    expect(CURRENCY_SYMBOLS.PHP).toBe('₱')
    expect(CURRENCY_SYMBOLS.JPY).toBe('¥')
  })

  it('PAYMENT_TERMS_LABELS has all expected terms', () => {
    expect(PAYMENT_TERMS_LABELS.DUE_ON_RECEIPT).toBe('Due on Receipt')
    expect(PAYMENT_TERMS_LABELS.NET_30).toBe('Net 30 Days')
    expect(PAYMENT_TERMS_LABELS.CUSTOM).toBe('Custom')
  })
})
