import { useMemo, useCallback } from 'react'
import type { Invoice, Currency, AllowedToken } from '@invoice-generator/shared-types'
import {
  CURRENCY_SYMBOLS,
  ALLOWED_TOKENS,
  interpolateTokens as interpolate,
} from '@invoice-generator/shared-types'
import { format, parseISO } from 'date-fns'

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return ''
  try {
    return format(parseISO(dateStr), 'MMM dd, yyyy')
  } catch {
    return dateStr
  }
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export function useTemplateTokens(invoice: Invoice | Partial<Invoice>) {
  // Build token values from invoice data
  const tokenValues = useMemo((): Record<AllowedToken, string> => {
    const currency = (invoice.currency as Currency) || 'USD'

    return {
      // Invoice
      invoice_number: invoice.invoiceNumber ?? '',
      issue_date: formatDate(invoice.issueDate),
      due_date: formatDate(invoice.dueDate),
      billing_period:
        invoice.periodStart && invoice.periodEnd
          ? `${formatDate(invoice.periodStart)} - ${formatDate(invoice.periodEnd)}`
          : '',

      // From tokens
      from_name: invoice.from?.name ?? '',
      from_company: invoice.from?.companyName ?? '',
      from_name_or_company: invoice.from?.name || invoice.from?.companyName || '',
      from_company_or_name: invoice.from?.companyName || invoice.from?.name || '',
      from_address: invoice.from?.address ?? '',
      from_city: invoice.from?.city ?? '',
      from_state: invoice.from?.state ?? '',
      from_postal_code: invoice.from?.postalCode ?? '',
      from_country: invoice.from?.country ?? '',
      from_email: invoice.from?.email ?? '',
      from_phone: invoice.from?.phone ?? '',
      from_tax_id: invoice.from?.taxId ?? '',

      // To tokens
      to_name: invoice.to?.name ?? '',
      to_company: invoice.to?.companyName ?? '',
      to_name_or_company: invoice.to?.name || invoice.to?.companyName || '',
      to_company_or_name: invoice.to?.companyName || invoice.to?.name || '',
      to_address: invoice.to?.address ?? '',
      to_city: invoice.to?.city ?? '',
      to_state: invoice.to?.state ?? '',
      to_postal_code: invoice.to?.postalCode ?? '',
      to_country: invoice.to?.country ?? '',
      to_email: invoice.to?.email ?? '',
      to_phone: invoice.to?.phone ?? '',
      to_tax_id: invoice.to?.taxId ?? '',

      // Financial
      total_hours: (invoice.totalHours ?? 0).toFixed(1),
      total_days: String(invoice.totalDays ?? 0),
      hourly_rate: formatNumber(invoice.hourlyRate ?? 0),
      subtotal: formatNumber(invoice.subtotal ?? 0),
      discount_percent: String(invoice.discountPercent ?? 0),
      discount_amount: formatNumber(invoice.discountAmount ?? 0),
      tax_percent: String(invoice.taxPercent ?? 0),
      tax_amount: formatNumber(invoice.taxAmount ?? 0),
      total_amount: formatNumber(invoice.totalAmount ?? 0),
      currency_symbol: CURRENCY_SYMBOLS[currency],
      currency_code: currency,

      // Other
      job_title: invoice.jobTitle ?? '',
      notes: invoice.notes ?? '',
      terms: invoice.terms ?? '',
      payment_terms: invoice.paymentTerms ?? '',
    }
  }, [invoice])

  // Interpolate tokens in content
  const interpolateContent = useCallback(
    (content: string): string => {
      return interpolate(content, tokenValues)
    },
    [tokenValues]
  )

  // Get a single token value
  const getTokenValue = useCallback(
    (token: AllowedToken): string => {
      return tokenValues[token] ?? ''
    },
    [tokenValues]
  )

  // Check if a string contains valid tokens
  const hasTokens = useCallback((content: string): boolean => {
    const tokenPattern = /\{\{(\w+)\}\}/g
    let foundMatch
    while ((foundMatch = tokenPattern.exec(content)) !== null) {
      if (ALLOWED_TOKENS.includes(foundMatch[1] as AllowedToken)) {
        return true
      }
    }
    return false
  }, [])

  // Extract all tokens from content
  const extractTokens = useCallback((content: string): AllowedToken[] => {
    const tokens: AllowedToken[] = []
    const tokenPattern = /\{\{(\w+)\}\}/g
    let foundMatch
    while ((foundMatch = tokenPattern.exec(content)) !== null) {
      const token = foundMatch[1] as AllowedToken
      if (ALLOWED_TOKENS.includes(token) && !tokens.includes(token)) {
        tokens.push(token)
      }
    }
    return tokens
  }, [])

  return {
    tokenValues,
    interpolateContent,
    getTokenValue,
    hasTokens,
    extractTokens,
    allowedTokens: ALLOWED_TOKENS,
  }
}
