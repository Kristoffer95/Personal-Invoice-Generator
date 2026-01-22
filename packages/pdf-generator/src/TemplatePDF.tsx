import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'

// Style type for @react-pdf/renderer
type PdfStyle = ReturnType<typeof StyleSheet.create>[string]
import { format, parseISO } from 'date-fns'
import type {
  Invoice,
  InvoiceTemplate,
  TemplateElement,
  AllowedToken,
  Currency,
  PageSizeKey,
} from '@invoice-generator/shared-types'
import {
  PAGE_SIZES,
  CURRENCY_SYMBOLS,
  ALLOWED_TOKENS,
  sanitizeForPdf,
} from '@invoice-generator/shared-types'

interface TemplatePDFProps {
  template: InvoiceTemplate
  invoice: Invoice
}

// Helper functions
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

// Build token values from invoice
function buildTokenValues(invoice: Invoice): Record<AllowedToken, string> {
  const currency = invoice.currency as Currency

  return {
    invoice_number: invoice.invoiceNumber ?? '',
    issue_date: formatDate(invoice.issueDate),
    due_date: formatDate(invoice.dueDate),
    billing_period:
      invoice.periodStart && invoice.periodEnd
        ? `${formatDate(invoice.periodStart)} - ${formatDate(invoice.periodEnd)}`
        : '',
    from_name: invoice.from?.name ?? '',
    from_address: invoice.from?.address ?? '',
    from_city: invoice.from?.city ?? '',
    from_state: invoice.from?.state ?? '',
    from_postal_code: invoice.from?.postalCode ?? '',
    from_country: invoice.from?.country ?? '',
    from_email: invoice.from?.email ?? '',
    from_phone: invoice.from?.phone ?? '',
    from_tax_id: invoice.from?.taxId ?? '',
    to_name: invoice.to?.name ?? '',
    to_address: invoice.to?.address ?? '',
    to_city: invoice.to?.city ?? '',
    to_state: invoice.to?.state ?? '',
    to_postal_code: invoice.to?.postalCode ?? '',
    to_country: invoice.to?.country ?? '',
    to_email: invoice.to?.email ?? '',
    to_phone: invoice.to?.phone ?? '',
    to_tax_id: invoice.to?.taxId ?? '',
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
    job_title: invoice.jobTitle ?? '',
    notes: invoice.notes ?? '',
    terms: invoice.terms ?? '',
    payment_terms: invoice.paymentTerms ?? '',
  }
}

// Interpolate tokens in content
function interpolateTokens(
  content: string,
  tokenValues: Record<AllowedToken, string>
): string {
  return content.replace(/\{\{(\w+)\}\}/g, (matchStr, token) => {
    if (!ALLOWED_TOKENS.includes(token as AllowedToken)) {
      return ''
    }
    const value = tokenValues[token as AllowedToken]
    return sanitizeForPdf(value ?? '')
  })
}

// Map fontFamily to react-pdf font
function mapFontFamily(fontFamily: string | undefined): string {
  const fontMap: Record<string, string> = {
    Helvetica: 'Helvetica',
    'Helvetica-Bold': 'Helvetica-Bold',
    'Helvetica-Oblique': 'Helvetica-Oblique',
    'Helvetica-BoldOblique': 'Helvetica-BoldOblique',
    'Times-Roman': 'Times-Roman',
    'Times-Bold': 'Times-Bold',
    'Times-Italic': 'Times-Italic',
    'Times-BoldItalic': 'Times-BoldItalic',
    Courier: 'Courier',
    'Courier-Bold': 'Courier-Bold',
    'Courier-Oblique': 'Courier-Oblique',
    'Courier-BoldOblique': 'Courier-BoldOblique',
  }
  return fontMap[fontFamily ?? 'Helvetica'] ?? 'Helvetica'
}

// Render text element
function renderTextElement(
  element: TemplateElement,
  tokenValues: Record<AllowedToken, string>
) {
  const { fontStyle, position, content, padding, backgroundColor, border, opacity } = element
  const interpolatedContent = interpolateTokens(content || '', tokenValues)

  const style: PdfStyle = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: position.width,
    height: position.height,
    fontFamily: mapFontFamily(fontStyle?.fontFamily),
    fontSize: fontStyle?.fontSize ?? 12,
    color: fontStyle?.color ?? '#333333',
    textAlign: fontStyle?.textAlign ?? 'left',
    lineHeight: fontStyle?.lineHeight ?? 1.2,
    letterSpacing: fontStyle?.letterSpacing ?? 0,
    padding: padding ?? 0,
    opacity: opacity ?? 1,
  }

  if (backgroundColor) {
    style.backgroundColor = backgroundColor
  }

  if (border && border.width > 0) {
    style.borderWidth = border.width
    style.borderColor = border.color
    style.borderStyle = border.style
    style.borderRadius = border.radius
  }

  // Handle text decoration
  if (fontStyle?.textDecoration === 'underline') {
    style.textDecoration = 'underline'
  } else if (fontStyle?.textDecoration === 'line-through') {
    style.textDecoration = 'line-through'
  }

  // Handle text transform
  let displayContent = interpolatedContent
  if (fontStyle?.textTransform === 'uppercase') {
    displayContent = interpolatedContent.toUpperCase()
  } else if (fontStyle?.textTransform === 'lowercase') {
    displayContent = interpolatedContent.toLowerCase()
  } else if (fontStyle?.textTransform === 'capitalize') {
    displayContent = interpolatedContent
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <View key={element.id} style={style}>
      <Text>{displayContent}</Text>
    </View>
  )
}

// Render work hours table
function renderWorkHoursTable(
  element: TemplateElement,
  invoice: Invoice,
  tokenValues: Record<AllowedToken, string>
) {
  const { position, tableStyle } = element
  const workDays = invoice.dailyWorkHours.filter((d) => d.isWorkday && d.hours > 0)

  if (workDays.length === 0) {
    return null
  }

  const headerBg = tableStyle?.headerBackgroundColor ?? '#1a1a2e'
  const headerText = tableStyle?.headerTextColor ?? '#ffffff'
  const borderColor = tableStyle?.borderColor ?? '#e0e0e0'
  const altRowBg = tableStyle?.alternateRowBackgroundColor ?? '#f8fafc'
  const currency = invoice.currency as Currency

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      left: position.x,
      top: position.y,
      width: position.width,
    },
    header: {
      flexDirection: 'row',
      backgroundColor: headerBg,
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    headerCell: {
      color: headerText,
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
    },
    row: {
      flexDirection: 'row',
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: borderColor,
    },
    cell: {
      fontSize: 9,
      color: '#333333',
    },
    colDate: { width: '20%' },
    colDesc: { width: '40%' },
    colHours: { width: '15%', textAlign: 'right' },
    colRate: { width: '15%', textAlign: 'right' },
    colAmount: { width: '15%', textAlign: 'right' },
  })

  return (
    <View key={element.id} style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerCell, styles.colDate]}>Date</Text>
        <Text style={[styles.headerCell, styles.colDesc]}>Description</Text>
        <Text style={[styles.headerCell, styles.colHours]}>Hours</Text>
        <Text style={[styles.headerCell, styles.colRate]}>Rate</Text>
        <Text style={[styles.headerCell, styles.colAmount]}>Amount</Text>
      </View>
      {workDays.map((day, idx) => (
        <View
          key={day.date}
          style={[styles.row, idx % 2 === 1 ? { backgroundColor: altRowBg } : {}]}
        >
          <Text style={[styles.cell, styles.colDate]}>{formatDate(day.date)}</Text>
          <Text style={[styles.cell, styles.colDesc]}>{day.notes || 'Work performed'}</Text>
          <Text style={[styles.cell, styles.colHours]}>{day.hours.toFixed(1)}</Text>
          <Text style={[styles.cell, styles.colRate]}>
            {CURRENCY_SYMBOLS[currency]}{formatNumber(invoice.hourlyRate)}
          </Text>
          <Text style={[styles.cell, styles.colAmount]}>
            {CURRENCY_SYMBOLS[currency]}{formatNumber(day.hours * invoice.hourlyRate)}
          </Text>
        </View>
      ))}
    </View>
  )
}

// Render line items table
function renderLineItemsTable(
  element: TemplateElement,
  invoice: Invoice,
  tokenValues: Record<AllowedToken, string>
) {
  const { position, tableStyle } = element

  if (!invoice.lineItems || invoice.lineItems.length === 0) {
    return null
  }

  const headerBg = tableStyle?.headerBackgroundColor ?? '#1a1a2e'
  const headerText = tableStyle?.headerTextColor ?? '#ffffff'
  const borderColor = tableStyle?.borderColor ?? '#e0e0e0'
  const altRowBg = tableStyle?.alternateRowBackgroundColor ?? '#f8fafc'
  const currency = invoice.currency as Currency

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      left: position.x,
      top: position.y,
      width: position.width,
    },
    header: {
      flexDirection: 'row',
      backgroundColor: headerBg,
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    headerCell: {
      color: headerText,
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
    },
    row: {
      flexDirection: 'row',
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: borderColor,
    },
    cell: {
      fontSize: 9,
      color: '#333333',
    },
    colItem: { width: '50%' },
    colQty: { width: '15%', textAlign: 'right' },
    colPrice: { width: '20%', textAlign: 'right' },
    colAmount: { width: '15%', textAlign: 'right' },
  })

  return (
    <View key={element.id} style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerCell, styles.colItem]}>Item</Text>
        <Text style={[styles.headerCell, styles.colQty]}>Qty</Text>
        <Text style={[styles.headerCell, styles.colPrice]}>Unit Price</Text>
        <Text style={[styles.headerCell, styles.colAmount]}>Amount</Text>
      </View>
      {invoice.lineItems.map((item, idx) => (
        <View
          key={item.id}
          style={[styles.row, idx % 2 === 1 ? { backgroundColor: altRowBg } : {}]}
        >
          <Text style={[styles.cell, styles.colItem]}>{item.description}</Text>
          <Text style={[styles.cell, styles.colQty]}>{item.quantity}</Text>
          <Text style={[styles.cell, styles.colPrice]}>
            {CURRENCY_SYMBOLS[currency]}{formatNumber(item.unitPrice)}
          </Text>
          <Text style={[styles.cell, styles.colAmount]}>
            {CURRENCY_SYMBOLS[currency]}{formatNumber(item.amount)}
          </Text>
        </View>
      ))}
    </View>
  )
}

// Render summary table
function renderSummaryTable(
  element: TemplateElement,
  invoice: Invoice,
  tokenValues: Record<AllowedToken, string>
) {
  const { position, tableStyle } = element
  const headerBg = tableStyle?.headerBackgroundColor ?? '#1a1a2e'
  const headerText = tableStyle?.headerTextColor ?? '#ffffff'
  const borderColor = tableStyle?.borderColor ?? '#e0e0e0'
  const currency = invoice.currency as Currency

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      left: position.x,
      top: position.y,
      width: position.width,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: borderColor,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      paddingHorizontal: 8,
      backgroundColor: headerBg,
    },
    label: {
      fontSize: 9,
      color: '#666666',
    },
    value: {
      fontSize: 9,
      fontFamily: 'Helvetica-Bold',
      color: '#333333',
    },
    totalLabel: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: headerText,
    },
    totalValue: {
      fontSize: 12,
      fontFamily: 'Helvetica-Bold',
      color: headerText,
    },
  })

  return (
    <View key={element.id} style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Subtotal</Text>
        <Text style={styles.value}>
          {CURRENCY_SYMBOLS[currency]}{formatNumber(invoice.subtotal)}
        </Text>
      </View>
      {invoice.discountPercent > 0 && (
        <View style={styles.row}>
          <Text style={styles.label}>Discount ({invoice.discountPercent}%)</Text>
          <Text style={[styles.value, { color: '#22c55e' }]}>
            -{CURRENCY_SYMBOLS[currency]}{formatNumber(invoice.discountAmount)}
          </Text>
        </View>
      )}
      {invoice.taxPercent > 0 && (
        <View style={styles.row}>
          <Text style={styles.label}>Tax ({invoice.taxPercent}%)</Text>
          <Text style={styles.value}>
            {CURRENCY_SYMBOLS[currency]}{formatNumber(invoice.taxAmount)}
          </Text>
        </View>
      )}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>TOTAL</Text>
        <Text style={styles.totalValue}>
          {CURRENCY_SYMBOLS[currency]}{formatNumber(invoice.totalAmount)}
        </Text>
      </View>
    </View>
  )
}

// Render divider
function renderDivider(element: TemplateElement) {
  const { position, backgroundColor } = element

  return (
    <View
      key={element.id}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: position.width,
        height: position.height,
        backgroundColor: backgroundColor ?? '#e0e0e0',
      }}
    />
  )
}

// Render rectangle
function renderRectangle(element: TemplateElement) {
  const { position, backgroundColor, border, opacity } = element

  const style: PdfStyle = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: position.width,
    height: position.height,
    opacity: opacity ?? 1,
  }

  if (backgroundColor) {
    style.backgroundColor = backgroundColor
  }

  if (border && border.width > 0) {
    style.borderWidth = border.width
    style.borderColor = border.color
    style.borderStyle = border.style
    style.borderRadius = border.radius
  }

  return <View key={element.id} style={style} />
}

// Render logo
function renderLogo(element: TemplateElement, invoice: Invoice) {
  const { position, objectFit } = element
  const logoUrl = element.logoUrl || invoice.from?.logo

  if (!logoUrl) {
    return null
  }

  return (
    <Image
      key={element.id}
      src={logoUrl}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: position.width,
        height: position.height,
        objectFit: objectFit ?? 'contain',
      }}
    />
  )
}

// Main component
export function TemplatePDF({ template, invoice }: TemplatePDFProps) {
  const pageSize = PAGE_SIZES[template.pageSize as PageSizeKey] || PAGE_SIZES.A4
  const tokenValues = buildTokenValues(invoice)

  // Sort elements by z-index
  const sortedElements = [...template.elements]
    .filter((el) => el.visible)
    .sort((a, b) => a.zIndex - b.zIndex)

  const renderElement = (element: TemplateElement) => {
    switch (element.type) {
      case 'text':
        return renderTextElement(element, tokenValues)
      case 'table_work_hours':
        return renderWorkHoursTable(element, invoice, tokenValues)
      case 'table_line_items':
        return renderLineItemsTable(element, invoice, tokenValues)
      case 'table_summary':
        return renderSummaryTable(element, invoice, tokenValues)
      case 'divider':
        return renderDivider(element)
      case 'rectangle':
        return renderRectangle(element)
      case 'logo':
        return renderLogo(element, invoice)
      default:
        return null
    }
  }

  return (
    <Document>
      <Page
        size={{
          width: pageSize.width * 2.83465,
          height: pageSize.height * 2.83465,
        }}
        style={{
          position: 'relative',
          backgroundColor: template.backgroundColor,
          paddingTop: template.margins.top,
          paddingRight: template.margins.right,
          paddingBottom: template.margins.bottom,
          paddingLeft: template.margins.left,
        }}
      >
        {sortedElements.map(renderElement)}
      </Page>
    </Document>
  )
}
