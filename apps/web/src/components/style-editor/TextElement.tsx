'use client'

import type { TemplateElement } from '@invoice-generator/shared-types'

interface TextElementProps {
  element: TemplateElement
}

// Preview tokens with placeholder values
const TOKEN_PREVIEWS: Record<string, string> = {
  invoice_number: 'INV-2024-001',
  issue_date: 'Jan 15, 2024',
  due_date: 'Feb 15, 2024',
  billing_period: 'Jan 1 - Jan 15, 2024',
  from_name: 'Your Company',
  from_address: '123 Business St',
  from_city: 'San Francisco',
  from_state: 'CA',
  from_postal_code: '94102',
  from_country: 'United States',
  from_email: 'billing@company.com',
  from_phone: '+1 (555) 123-4567',
  from_tax_id: 'XX-XXXXXXX',
  to_name: 'Client Company',
  to_address: '456 Client Ave',
  to_city: 'New York',
  to_state: 'NY',
  to_postal_code: '10001',
  to_country: 'United States',
  to_email: 'accounts@client.com',
  to_phone: '+1 (555) 987-6543',
  to_tax_id: 'YY-YYYYYYY',
  total_hours: '160',
  total_days: '20',
  hourly_rate: '75.00',
  subtotal: '12,000.00',
  discount_percent: '10',
  discount_amount: '1,200.00',
  tax_percent: '8',
  tax_amount: '864.00',
  total_amount: '11,664.00',
  currency_symbol: '$',
  currency_code: 'USD',
  job_title: 'Software Development Services',
  notes: 'Thank you for your business!',
  terms: 'Payment due within 30 days.',
  payment_terms: 'Net 30',
}

function interpolatePreviewTokens(content: string): string {
  return content.replace(/\{\{(\w+)\}\}/g, (match, token) => {
    return TOKEN_PREVIEWS[token] ?? match
  })
}

export function TextElement({ element }: TextElementProps) {
  const { fontStyle } = element
  const previewContent = interpolatePreviewTokens(element.content || '')

  // Map font style to CSS
  const textStyle: React.CSSProperties = {
    fontFamily: fontStyle?.fontFamily?.replace('-Bold', '').replace('-Oblique', '').replace('-BoldOblique', '').replace('-Italic', '') || 'Helvetica, Arial, sans-serif',
    fontSize: fontStyle?.fontSize ?? 12,
    fontWeight: fontStyle?.fontFamily?.includes('Bold') ? 'bold' : fontStyle?.fontWeight ?? 'normal',
    fontStyle: fontStyle?.fontFamily?.includes('Oblique') || fontStyle?.fontFamily?.includes('Italic') ? 'italic' : fontStyle?.fontStyle ?? 'normal',
    textAlign: fontStyle?.textAlign ?? 'left',
    textDecoration: fontStyle?.textDecoration === 'none' ? undefined : fontStyle?.textDecoration,
    textTransform: fontStyle?.textTransform === 'none' ? undefined : fontStyle?.textTransform,
    letterSpacing: fontStyle?.letterSpacing ? `${fontStyle.letterSpacing}px` : undefined,
    lineHeight: fontStyle?.lineHeight ?? 1.2,
    color: fontStyle?.color ?? '#333333',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    overflow: 'hidden',
  }

  return (
    <div className="w-full h-full" style={textStyle}>
      {previewContent}
    </div>
  )
}
