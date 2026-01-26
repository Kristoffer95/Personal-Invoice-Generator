import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'

// Font registration is handled in fonts.ts with embedded base64 TTF fonts
// for reliable @react-pdf/renderer compatibility (woff2 has known issues)

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
  CalculatedPosition,
  TableContentData,
} from '@invoice-generator/shared-types'
import {
  PAGE_SIZES,
  CURRENCY_SYMBOLS,
  ALLOWED_TOKENS,
  sanitizeForPdf,
  calculateElementPositions,
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

// Map fontFamily + fontWeight + fontStyle to react-pdf font
function mapFontFamily(
  fontFamily: string | undefined,
  fontWeight?: 'normal' | 'bold',
  fontStyle?: 'normal' | 'italic'
): string {
  const base = fontFamily ?? 'Helvetica'
  const isBold = fontWeight === 'bold'
  const isItalic = fontStyle === 'italic'

  // Handle Helvetica family
  if (base === 'Helvetica' || base.startsWith('Helvetica')) {
    if (isBold && isItalic) return 'Helvetica-BoldOblique'
    if (isBold) return 'Helvetica-Bold'
    if (isItalic) return 'Helvetica-Oblique'
    return 'Helvetica'
  }

  // Handle Times family
  if (base === 'Times-Roman' || base.startsWith('Times')) {
    if (isBold && isItalic) return 'Times-BoldItalic'
    if (isBold) return 'Times-Bold'
    if (isItalic) return 'Times-Italic'
    return 'Times-Roman'
  }

  // Handle Courier family
  if (base === 'Courier' || base.startsWith('Courier')) {
    if (isBold && isItalic) return 'Courier-BoldOblique'
    if (isBold) return 'Courier-Bold'
    if (isItalic) return 'Courier-Oblique'
    return 'Courier'
  }

  // Handle Geist family (custom fonts - bold variant available)
  if (base === 'Geist' || base === 'Geist Sans' || base === 'GeistSans') {
    // Geist only has Regular and Bold (no italic variants registered)
    if (isBold) return 'Geist-Bold'
    return 'Geist'
  }

  // Handle Geist Mono family
  if (base === 'Geist Mono' || base === 'GeistMono') {
    // Geist Mono only has Regular and Bold (no italic variants registered)
    if (isBold) return 'Geist Mono-Bold'
    return 'Geist Mono'
  }

  // Fallback to the base font
  return base
}

// Render text element
function renderTextElement(
  element: TemplateElement,
  tokenValues: Record<AllowedToken, string>,
  margins: { top: number; left: number },
  calculatedPosition: CalculatedPosition
) {
  const { fontStyle, padding, backgroundColor, border, opacity } = element

  // Ensure content is always a string (handle undefined, null, or non-string values)
  const rawContent = typeof element.content === 'string' ? element.content : ''
  const interpolatedContent = interpolateTokens(rawContent, tokenValues)

  // Auto-hide text elements when all tokens resolve to empty (unless showWhenEmpty is true)
  const isEmpty = !interpolatedContent || interpolatedContent.trim() === ''
  if (isEmpty && !element.showWhenEmpty) {
    if (process.env.NODE_ENV === 'development' || process.env.PDF_DEBUG === 'true') {
      console.log('[PDF DEBUG] Hiding empty text element:', {
        id: element.id,
        name: element.name,
        rawContent,
        showWhenEmpty: element.showWhenEmpty,
      })
    }
    return null
  }

  // DEBUG: Log element rendering details to trace token interpolation issues
  // Set PDF_DEBUG=true in environment to enable logging
  if (process.env.NODE_ENV === 'development' || process.env.PDF_DEBUG === 'true') {
    console.log('[PDF DEBUG] renderTextElement:', {
      id: element.id,
      name: element.name,
      contentRaw: element.content,
      contentType: typeof element.content,
      contentInterpolated: interpolatedContent,
      isEmpty: !interpolatedContent || interpolatedContent.trim() === '',
      visible: element.visible,
      zIndex: element.zIndex,
      calculatedPosition,
      fontStyle: {
        color: fontStyle?.color,
        fontSize: fontStyle?.fontSize,
        fontFamily: fontStyle?.fontFamily,
        letterSpacing: fontStyle?.letterSpacing,
      },
    })
  }

  // Use calculated position from layout engine
  const safePosition = {
    x: calculatedPosition.x,
    y: calculatedPosition.y,
    width: Math.max(calculatedPosition.width, 1),
    height: Math.max(calculatedPosition.height, 1),
  }

  // Container style (View)
  const containerStyle: PdfStyle = {
    position: 'absolute',
    left: safePosition.x + margins.left,
    top: safePosition.y + margins.top,
    width: safePosition.width,
    height: safePosition.height,
    padding: padding ?? 0,
    opacity: typeof opacity === 'number' && opacity >= 0 && opacity <= 1 ? opacity : 1,
  }

  // Validate fontSize to prevent @react-pdf/renderer issues with invalid values
  const safeFontSize = (fontStyle?.fontSize && fontStyle.fontSize > 0) ? fontStyle.fontSize : 12

  // Validate letterSpacing (must be a finite number)
  const safeLetterSpacing = (typeof fontStyle?.letterSpacing === 'number' && isFinite(fontStyle.letterSpacing))
    ? fontStyle.letterSpacing
    : 0

  // Validate lineHeight (must be positive)
  const safeLineHeight = (fontStyle?.lineHeight && fontStyle.lineHeight > 0) ? fontStyle.lineHeight : 1.2

  // Text style - must be applied directly to Text component for color to work
  // @react-pdf/renderer does not inherit color from parent View
  const textStyle: PdfStyle = {
    fontFamily: mapFontFamily(fontStyle?.fontFamily, fontStyle?.fontWeight, fontStyle?.fontStyle),
    fontSize: safeFontSize,
    color: fontStyle?.color || '#333333',
    textAlign: fontStyle?.textAlign ?? 'left',
    lineHeight: safeLineHeight,
    letterSpacing: safeLetterSpacing,
  }

  if (backgroundColor) {
    containerStyle.backgroundColor = backgroundColor
  }

  if (border && border.width > 0) {
    containerStyle.borderWidth = border.width
    containerStyle.borderColor = border.color
    containerStyle.borderStyle = border.style
    containerStyle.borderRadius = border.radius
  }

  // Handle text decoration - must be on Text component
  if (fontStyle?.textDecoration === 'underline') {
    textStyle.textDecoration = 'underline'
  } else if (fontStyle?.textDecoration === 'line-through') {
    textStyle.textDecoration = 'line-through'
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
    <View key={element.id} style={containerStyle}>
      <Text style={textStyle}>{displayContent}</Text>
    </View>
  )
}

// Render work hours table
function renderWorkHoursTable(
  element: TemplateElement,
  invoice: Invoice,
  margins: { top: number; left: number },
  calculatedPosition: CalculatedPosition
) {
  const { tableStyle } = element
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
      left: calculatedPosition.x + margins.left,
      top: calculatedPosition.y + margins.top,
      width: calculatedPosition.width,
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
  margins: { top: number; left: number },
  calculatedPosition: CalculatedPosition
) {
  const { tableStyle } = element

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
      left: calculatedPosition.x + margins.left,
      top: calculatedPosition.y + margins.top,
      width: calculatedPosition.width,
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
  margins: { top: number; left: number },
  calculatedPosition: CalculatedPosition
) {
  const { tableStyle } = element
  const headerBg = tableStyle?.headerBackgroundColor ?? '#1a1a2e'
  const headerText = tableStyle?.headerTextColor ?? '#ffffff'
  const borderColor = tableStyle?.borderColor ?? '#e0e0e0'
  const currency = invoice.currency as Currency

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      left: calculatedPosition.x + margins.left,
      top: calculatedPosition.y + margins.top,
      width: calculatedPosition.width,
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
function renderDivider(
  element: TemplateElement,
  margins: { top: number; left: number },
  calculatedPosition: CalculatedPosition
) {
  const { backgroundColor } = element

  return (
    <View
      key={element.id}
      style={{
        position: 'absolute',
        left: calculatedPosition.x + margins.left,
        top: calculatedPosition.y + margins.top,
        width: calculatedPosition.width,
        height: calculatedPosition.height,
        backgroundColor: backgroundColor ?? '#e0e0e0',
      }}
    />
  )
}

// Render rectangle
function renderRectangle(
  element: TemplateElement,
  margins: { top: number; left: number },
  calculatedPosition: CalculatedPosition
) {
  const { backgroundColor, border, opacity } = element

  const style: PdfStyle = {
    position: 'absolute',
    left: calculatedPosition.x + margins.left,
    top: calculatedPosition.y + margins.top,
    width: calculatedPosition.width,
    height: calculatedPosition.height,
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
function renderLogo(
  element: TemplateElement,
  invoice: Invoice,
  margins: { top: number; left: number },
  calculatedPosition: CalculatedPosition
) {
  const { objectFit } = element
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
        left: calculatedPosition.x + margins.left,
        top: calculatedPosition.y + margins.top,
        width: calculatedPosition.width,
        height: calculatedPosition.height,
        objectFit: objectFit ?? 'contain',
      }}
    />
  )
}

// Render layout container background only
// Children are rendered separately at their calculated positions
function renderLayoutContainerBackground(
  element: TemplateElement,
  margins: { top: number; left: number },
  calculatedPosition: CalculatedPosition
) {
  const { backgroundColor, border, opacity, padding, spacing, layoutConfig } = element

  // Apply margin (spacing) for Row containers
  // This creates visual gaps between Row containers when stacked
  const isRow = layoutConfig?.direction === 'row'
  const containerMargin = isRow && spacing ? spacing : { top: 0, right: 0, bottom: 0, left: 0 }

  const containerStyle: PdfStyle = {
    position: 'absolute',
    left: calculatedPosition.x + margins.left + containerMargin.left,
    top: calculatedPosition.y + margins.top + containerMargin.top,
    width: calculatedPosition.width - containerMargin.left - containerMargin.right,
    height: calculatedPosition.height - containerMargin.top - containerMargin.bottom,
    padding: padding ?? 0,
    opacity: opacity ?? 1,
  }

  if (backgroundColor) {
    containerStyle.backgroundColor = backgroundColor
  }

  // Only render borders for layout containers if they're NOT dashed
  // Dashed borders are editor-only visual indicators, not intended for PDF output
  // Solid and dotted borders are user-configured and should render normally
  if (border && border.width > 0 && border.style !== 'dashed') {
    containerStyle.borderWidth = border.width
    containerStyle.borderColor = border.color
    containerStyle.borderStyle = border.style
    containerStyle.borderRadius = border.radius
  }

  return <View key={element.id} style={containerStyle} />
}

// Main component
export function TemplatePDF({ template, invoice }: TemplatePDFProps) {
  const pageSize = PAGE_SIZES[template.pageSize as PageSizeKey] || PAGE_SIZES.A4
  const tokenValues = buildTokenValues(invoice)
  const margins = { top: template.margins.top, left: template.margins.left }

  // Calculate page dimensions in points
  const pageWidthPts = pageSize.width * 2.83465
  const pageHeightPts = pageSize.height * 2.83465

  // Build table content data for height estimation
  const workDays = invoice.dailyWorkHours.filter((d) => d.isWorkday && d.hours > 0)
  const tableContent: TableContentData = {
    workHoursRowCount: invoice.showDetailedHours ? workDays.length : 0,
    lineItemsRowCount: invoice.lineItems?.length ?? 0,
    // Summary table: subtotal, discount (if any), tax (if any), total
    summaryRowCount: 2 + (invoice.discountPercent > 0 ? 1 : 0) + (invoice.taxPercent > 0 ? 1 : 0),
  }

  // Calculate positions using layout engine for consistency with editor
  const calculatedPositions = calculateElementPositions(
    template.elements,
    template.margins,
    pageWidthPts,
    pageHeightPts,
    tableContent
  )

  // DEBUG: Log invoice data and token values
  if (process.env.NODE_ENV === 'development' || process.env.PDF_DEBUG === 'true') {
    console.log('[PDF DEBUG] TemplatePDF render:', {
      templateName: template.name,
      templateId: template.id,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      tokenValues: {
        invoice_number: tokenValues.invoice_number,
        from_name: tokenValues.from_name,
        to_name: tokenValues.to_name,
      },
      totalElements: template.elements.length,
      calculatedPositionsCount: calculatedPositions.size,
    })
  }

  // Sort elements by z-index, filter out hidden elements (visible defaults to true)
  const sortedElements = [...template.elements]
    .filter((el) => el.visible !== false)
    .sort((a, b) => a.zIndex - b.zIndex)

  // DEBUG: Log sorted elements with text elements highlighted
  if (process.env.NODE_ENV === 'development' || process.env.PDF_DEBUG === 'true') {
    console.log('[PDF DEBUG] Sorted text elements:', sortedElements
      .filter(el => el.type === 'text')
      .map(el => ({
        id: el.id,
        name: el.name,
        content: el.content,
        zIndex: el.zIndex,
        fontSize: el.fontStyle?.fontSize,
        color: el.fontStyle?.color,
        calculatedPosition: calculatedPositions.get(el.id),
      })))
  }

  const renderElement = (element: TemplateElement) => {
    // Get calculated position for this element
    const calcPos = calculatedPositions.get(element.id)
    if (!calcPos) {
      if (process.env.NODE_ENV === 'development' || process.env.PDF_DEBUG === 'true') {
        console.warn(`[PDF] No calculated position for element: ${element.id} (${element.name})`)
      }
      return null
    }

    switch (element.type) {
      case 'text':
        return renderTextElement(element, tokenValues, margins, calcPos)
      case 'table_work_hours':
        return invoice.showDetailedHours ? renderWorkHoursTable(element, invoice, margins, calcPos) : null
      case 'table_line_items':
        return renderLineItemsTable(element, invoice, margins, calcPos)
      case 'table_summary':
        return renderSummaryTable(element, invoice, margins, calcPos)
      case 'divider':
        return renderDivider(element, margins, calcPos)
      case 'rectangle':
        return renderRectangle(element, margins, calcPos)
      case 'logo':
        return renderLogo(element, invoice, margins, calcPos)
      case 'layout_container': {
        // Check if container should collapse (auto-height, empty, showWhenEmpty=false)
        const isAutoHeight = element.heightMode === 'auto'
        const hasChildren = template.elements.some(
          el => el.parentId === element.id && el.positionMode === 'relative' && el.visible !== false
        )
        const shouldHide = isAutoHeight && !hasChildren &&
          (element.showWhenEmpty === false || element.showWhenEmpty === undefined)

        if (shouldHide) {
          return null
        }
        return renderLayoutContainerBackground(element, margins, calcPos)
      }
      default:
        return null
    }
  }

  // Ensure backgroundColor has a fallback - if undefined, PDF defaults to white
  const resolvedBackgroundColor = template.backgroundColor || '#ffffff'

  return (
    <Document>
      <Page
        size={{
          width: pageWidthPts,
          height: pageHeightPts,
        }}
        style={{
          position: 'relative',
          backgroundColor: resolvedBackgroundColor,
          // Margins applied via element position offsets, not page padding
        }}
      >
        {sortedElements.map(renderElement)}
      </Page>
    </Document>
  )
}
