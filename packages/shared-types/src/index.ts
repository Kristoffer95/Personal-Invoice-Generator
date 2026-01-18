import { z } from 'zod'

// Page size definitions with dimensions in mm
export const PAGE_SIZES = {
  A4: { width: 210, height: 297, label: 'A4' },
  LETTER: { width: 215.9, height: 279.4, label: 'Letter' },
  LEGAL: { width: 215.9, height: 355.6, label: 'Legal' },
  LONG: { width: 215.9, height: 330.2, label: 'Long Bond (8.5" x 13")' },
  SHORT: { width: 215.9, height: 266.7, label: 'Short Bond (8.5" x 10.5")' },
  A5: { width: 148, height: 210, label: 'A5' },
  B5: { width: 176, height: 250, label: 'B5' },
} as const

export type PageSizeKey = keyof typeof PAGE_SIZES
export type PageSize = (typeof PAGE_SIZES)[PageSizeKey]

export const pageSizeSchema = z.enum(['A4', 'LETTER', 'LEGAL', 'LONG', 'SHORT', 'A5', 'B5'])

// Invoice background design
export const backgroundDesignSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string().optional(),
  backgroundColor: z.string().optional(),
  borderColor: z.string().optional(),
  accentColor: z.string().optional(),
})

export type BackgroundDesign = z.infer<typeof backgroundDesignSchema>

// Work hours for a specific day
export const dailyWorkHoursSchema = z.object({
  date: z.string(), // ISO date string YYYY-MM-DD
  hours: z.number().min(0).max(24),
  isWorkday: z.boolean(),
  notes: z.string().optional(),
})

export type DailyWorkHours = z.infer<typeof dailyWorkHoursSchema>

// Schedule frequency options
export const scheduleFrequencySchema = z.enum([
  'EVERY_15TH', // Every 15th of the month
  'EVERY_LAST_DAY', // Every last day of the month
  'BOTH_15TH_AND_LAST', // Both 15th and last day
  'CUSTOM', // Manual date selection
])

export type ScheduleFrequency = z.infer<typeof scheduleFrequencySchema>

// Days to include in calculation
export const workdayTypeSchema = z.enum([
  'WEEKDAYS_ONLY', // Monday to Friday
  'ALL_DAYS', // Every day
  'CUSTOM', // Custom selected days
])

export type WorkdayType = z.infer<typeof workdayTypeSchema>

// Invoice schedule configuration
export const scheduleConfigSchema = z.object({
  frequency: scheduleFrequencySchema,
  workdayType: workdayTypeSchema,
  customDates: z.array(z.string()).optional(), // ISO date strings for custom selection
  defaultHoursPerDay: z.number().min(0).max(24).default(8),
})

export type ScheduleConfig = z.infer<typeof scheduleConfigSchema>

// Currency options
export const currencySchema = z.enum(['USD', 'EUR', 'GBP', 'PHP', 'JPY', 'AUD', 'CAD', 'SGD'])
export type Currency = z.infer<typeof currencySchema>

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  PHP: '₱',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  SGD: 'S$',
}

// Line item for additional items/deductions
export const lineItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  amount: z.number(),
})

export type LineItem = z.infer<typeof lineItemSchema>

// Payment terms
export const paymentTermsSchema = z.enum([
  'DUE_ON_RECEIPT',
  'NET_7',
  'NET_15',
  'NET_30',
  'NET_45',
  'NET_60',
  'CUSTOM',
])

export type PaymentTerms = z.infer<typeof paymentTermsSchema>

export const PAYMENT_TERMS_LABELS: Record<PaymentTerms, string> = {
  DUE_ON_RECEIPT: 'Due on Receipt',
  NET_7: 'Net 7 Days',
  NET_15: 'Net 15 Days',
  NET_30: 'Net 30 Days',
  NET_45: 'Net 45 Days',
  NET_60: 'Net 60 Days',
  CUSTOM: 'Custom',
}

// Company/Client information
export const partyInfoSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  taxId: z.string().optional(),
  logo: z.string().optional(), // URL or base64
})

export type PartyInfo = z.infer<typeof partyInfoSchema>

// Bank details for payment
export const bankDetailsSchema = z.object({
  bankName: z.string().optional(),
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  routingNumber: z.string().optional(),
  swiftCode: z.string().optional(),
  iban: z.string().optional(),
})

export type BankDetails = z.infer<typeof bankDetailsSchema>

// Main invoice schema
export const invoiceSchema = z.object({
  // Basic info
  id: z.string(),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).default('DRAFT'),

  // Dates
  issueDate: z.string(), // ISO date string
  dueDate: z.string().optional(),
  periodStart: z.string().optional(), // For timesheet invoices
  periodEnd: z.string().optional(),

  // Parties
  from: partyInfoSchema,
  to: partyInfoSchema,

  // Work hours tracking
  hourlyRate: z.number().min(0),
  defaultHoursPerDay: z.number().min(0).max(24).default(8),
  dailyWorkHours: z.array(dailyWorkHoursSchema).default([]),

  // Calculated totals (computed from work hours)
  totalDays: z.number().default(0),
  totalHours: z.number().default(0),
  subtotal: z.number().default(0),

  // Additional line items
  lineItems: z.array(lineItemSchema).default([]),

  // Discounts & taxes
  discountPercent: z.number().min(0).max(100).default(0),
  discountAmount: z.number().default(0),
  taxPercent: z.number().min(0).max(100).default(0),
  taxAmount: z.number().default(0),

  // Final amount
  totalAmount: z.number().default(0),

  // Currency & payment
  currency: currencySchema.default('USD'),
  paymentTerms: paymentTermsSchema.default('NET_30'),
  customPaymentTerms: z.string().optional(),
  bankDetails: bankDetailsSchema.optional(),

  // Additional fields
  notes: z.string().optional(),
  terms: z.string().optional(),
  jobTitle: z.string().optional(), // Job title/description for the invoice

  // Display settings
  showDetailedHours: z.boolean().default(false), // Show per-day hours breakdown
  pdfTheme: z.enum(['light', 'dark']).default('light'), // PDF color theme

  // Design settings
  backgroundDesignId: z.string().optional(),
  pageSize: pageSizeSchema.default('A4'),

  // Metadata
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Invoice = z.infer<typeof invoiceSchema>

// Form input type (before calculation)
export const invoiceFormSchema = invoiceSchema.omit({
  id: true,
  totalDays: true,
  totalHours: true,
  subtotal: true,
  discountAmount: true,
  taxAmount: true,
  totalAmount: true,
  createdAt: true,
  updatedAt: true,
})

export type InvoiceFormInput = z.infer<typeof invoiceFormSchema>

// Export config schema
export const exportConfigSchema = z.object({
  pageSize: pageSizeSchema,
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
  includeBackground: z.boolean().default(true),
  quality: z.enum(['draft', 'standard', 'high']).default('standard'),
})

export type ExportConfig = z.infer<typeof exportConfigSchema>

// Helper function to calculate invoice totals
export function calculateInvoiceTotals(invoice: Partial<Invoice>): Pick<Invoice, 'totalDays' | 'totalHours' | 'subtotal' | 'discountAmount' | 'taxAmount' | 'totalAmount'> {
  const workDays = invoice.dailyWorkHours?.filter(d => d.isWorkday && d.hours > 0) ?? []
  const totalDays = workDays.length
  const totalHours = workDays.reduce((sum, d) => sum + d.hours, 0)

  // Subtotal from hours
  const hourlySubtotal = totalHours * (invoice.hourlyRate ?? 0)

  // Add line items
  const lineItemsTotal = invoice.lineItems?.reduce((sum, item) => sum + item.amount, 0) ?? 0

  const subtotal = hourlySubtotal + lineItemsTotal

  // Apply discount
  const discountPercent = invoice.discountPercent ?? 0
  const discountAmount = subtotal * (discountPercent / 100)

  const afterDiscount = subtotal - discountAmount

  // Apply tax
  const taxPercent = invoice.taxPercent ?? 0
  const taxAmount = afterDiscount * (taxPercent / 100)

  const totalAmount = afterDiscount + taxAmount

  return {
    totalDays,
    totalHours,
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount,
  }
}

// Generate dates for a billing period
export function generateBillingPeriodDates(
  startDate: Date,
  endDate: Date,
  workdayType: WorkdayType,
  customDates?: string[]
): string[] {
  const dates: string[] = []
  const current = new Date(startDate)

  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0]
    const dayOfWeek = current.getDay()

    if (workdayType === 'ALL_DAYS') {
      dates.push(dateStr)
    } else if (workdayType === 'WEEKDAYS_ONLY') {
      // Monday (1) to Friday (5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        dates.push(dateStr)
      }
    } else if (workdayType === 'CUSTOM' && customDates) {
      if (customDates.includes(dateStr)) {
        dates.push(dateStr)
      }
    }

    current.setDate(current.getDate() + 1)
  }

  return dates
}

// Get billing period end date based on schedule
export function getBillingPeriodEnd(
  date: Date,
  frequency: ScheduleFrequency
): Date {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()

  if (frequency === 'EVERY_15TH' || (frequency === 'BOTH_15TH_AND_LAST' && day <= 15)) {
    // Period ends on 15th
    return new Date(year, month, 15)
  } else {
    // Period ends on last day of month
    return new Date(year, month + 1, 0)
  }
}

// Get billing period start date based on schedule
export function getBillingPeriodStart(
  date: Date,
  frequency: ScheduleFrequency
): Date {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()

  if (frequency === 'EVERY_15TH' || (frequency === 'BOTH_15TH_AND_LAST' && day <= 15)) {
    // Period starts on 1st
    return new Date(year, month, 1)
  } else {
    // Period starts on 16th
    return new Date(year, month, 16)
  }
}
