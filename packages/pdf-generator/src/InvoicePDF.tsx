import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
} from '@react-pdf/renderer'
import { format, parseISO } from 'date-fns'
import type {
  Invoice,
  PageSizeKey,
  Currency,
  BackgroundDesign,
} from '@invoice-generator/shared-types'
import { PAGE_SIZES, CURRENCY_SYMBOLS } from '@invoice-generator/shared-types'
import { styles, colors } from './styles'

interface InvoicePDFProps {
  invoice: Invoice
  backgroundDesign?: BackgroundDesign
}

function formatCurrency(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency]
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return `${symbol}${formatted}`
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM dd, yyyy')
  } catch {
    return dateStr
  }
}

export function InvoicePDF({ invoice, backgroundDesign }: InvoicePDFProps) {
  const pageSize = PAGE_SIZES[invoice.pageSize as PageSizeKey] || PAGE_SIZES.A4
  const currency = invoice.currency

  // Filter work days that have hours logged
  const workDays = invoice.dailyWorkHours.filter(d => d.isWorkday && d.hours > 0)

  // Check if we should show detailed per-day hours (default: false for compact 1-page layout)
  const showDetailedHours = invoice.showDetailedHours ?? false

  const pageStyles = {
    ...styles.page,
    ...(backgroundDesign?.backgroundColor ? { backgroundColor: backgroundDesign.backgroundColor } : {}),
  }

  return (
    <Document>
      <Page
        size={{ width: pageSize.width * 2.83465, height: pageSize.height * 2.83465 }} // Convert mm to points
        style={pageStyles}
      >
        {/* Background image if provided */}
        {backgroundDesign?.imageUrl && (
          <Image
            src={backgroundDesign.imageUrl}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.1,
            }}
          />
        )}


        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {invoice.from.logo && (
              <Image src={invoice.from.logo} style={styles.logo} />
            )}
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>#{invoice.invoiceNumber}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.partyName, { marginBottom: 8 }]}>{invoice.from.name}</Text>
            {invoice.from.address && <Text style={styles.partyDetail}>{invoice.from.address}</Text>}
            {(invoice.from.city || invoice.from.state || invoice.from.postalCode) && (
              <Text style={styles.partyDetail}>
                {[invoice.from.city, invoice.from.state, invoice.from.postalCode].filter(Boolean).join(', ')}
              </Text>
            )}
            {invoice.from.country && <Text style={styles.partyDetail}>{invoice.from.country}</Text>}
            {invoice.from.email && <Text style={styles.partyDetail}>{invoice.from.email}</Text>}
            {invoice.from.phone && <Text style={styles.partyDetail}>{invoice.from.phone}</Text>}
            {invoice.from.taxId && <Text style={styles.partyDetail}>Tax ID: {invoice.from.taxId}</Text>}
          </View>
        </View>

        {/* Bill To Section */}
        <View style={styles.partiesSection}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Bill To</Text>
            <Text style={styles.partyName}>{invoice.to.name}</Text>
            {invoice.to.address && <Text style={styles.partyDetail}>{invoice.to.address}</Text>}
            {(invoice.to.city || invoice.to.state || invoice.to.postalCode) && (
              <Text style={styles.partyDetail}>
                {[invoice.to.city, invoice.to.state, invoice.to.postalCode].filter(Boolean).join(', ')}
              </Text>
            )}
            {invoice.to.country && <Text style={styles.partyDetail}>{invoice.to.country}</Text>}
            {invoice.to.email && <Text style={styles.partyDetail}>{invoice.to.email}</Text>}
            {invoice.to.phone && <Text style={styles.partyDetail}>{invoice.to.phone}</Text>}
            {invoice.to.taxId && <Text style={styles.partyDetail}>Tax ID: {invoice.to.taxId}</Text>}
          </View>
        </View>

        {/* Dates Section */}
        <View style={styles.datesSection}>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>Issue Date</Text>
            <Text style={styles.dateValue}>{formatDate(invoice.issueDate)}</Text>
          </View>
          {invoice.dueDate && (
            <View style={styles.dateBox}>
              <Text style={styles.dateLabel}>Due Date</Text>
              <Text style={styles.dateValue}>{formatDate(invoice.dueDate)}</Text>
            </View>
          )}
          {invoice.periodStart && invoice.periodEnd && (
            <View style={styles.dateBox}>
              <Text style={styles.dateLabel}>Billing Period</Text>
              <Text style={styles.dateValue}>
                {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
              </Text>
            </View>
          )}
        </View>


        {/* Work Hours Table - only shown if showDetailedHours is true */}
        {showDetailedHours && workDays.length > 0 && (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colDate]}>Date</Text>
              <Text style={[styles.tableHeaderCell, styles.colDescription]}>Description</Text>
              <Text style={[styles.tableHeaderCell, styles.colHours]}>Hours</Text>
              <Text style={[styles.tableHeaderCell, styles.colRate]}>Rate</Text>
              <Text style={[styles.tableHeaderCell, styles.colAmount]}>Amount</Text>
            </View>
            {workDays.map((day, index) => (
              <View
                key={day.date}
                style={index % 2 === 1 ? [styles.tableRow, styles.tableRowAlternate] : styles.tableRow}
              >
                <Text style={[styles.tableCell, styles.colDate]}>{formatDate(day.date)}</Text>
                <Text style={[styles.tableCell, styles.colDescription]}>
                  {day.notes || 'Work performed'}
                </Text>
                <Text style={[styles.tableCell, styles.colHours]}>{day.hours.toFixed(1)}</Text>
                <Text style={[styles.tableCell, styles.colRate]}>
                  {formatCurrency(invoice.hourlyRate, currency)}
                </Text>
                <Text style={[styles.tableCell, styles.colAmount]}>
                  {formatCurrency(day.hours * invoice.hourlyRate, currency)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Items Table - includes work hours and additional line items */}
        {(workDays.length > 0 || invoice.lineItems.length > 0) && (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colDescription]}>Item</Text>
              <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
              <Text style={[styles.tableHeaderCell, styles.colRate]}>Unit Price</Text>
              <Text style={[styles.tableHeaderCell, styles.colAmount]}>Amount</Text>
            </View>

            {/* Work Hours Row - shows job title/description with hours breakdown */}
            {workDays.length > 0 && (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colDescription]}>
                  {invoice.jobTitle || 'Professional Services'} ({invoice.totalDays} days, {invoice.totalHours.toFixed(1)} hrs)
                </Text>
                <Text style={[styles.tableCell, styles.colQty]}>{invoice.totalHours.toFixed(1)}</Text>
                <Text style={[styles.tableCell, styles.colRate]}>
                  {formatCurrency(invoice.hourlyRate, currency)}/hr
                </Text>
                <Text style={[styles.tableCell, styles.colAmount]}>
                  {formatCurrency(invoice.totalHours * invoice.hourlyRate, currency)}
                </Text>
              </View>
            )}

            {/* Additional Line Items */}
            {invoice.lineItems.map((item, index) => (
              <View
                key={item.id}
                style={(workDays.length > 0 ? index + 1 : index) % 2 === 1 ? [styles.tableRow, styles.tableRowAlternate] : styles.tableRow}
              >
                <Text style={[styles.tableCell, styles.colDescription]}>{item.description}</Text>
                <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
                <Text style={[styles.tableCell, styles.colRate]}>
                  {formatCurrency(item.unitPrice, currency)}
                </Text>
                <Text style={[styles.tableCell, styles.colAmount]}>
                  {formatCurrency(item.amount, currency)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Summary Section */}
        <View style={styles.summarySection}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatCurrency(invoice.subtotal, currency)}</Text>
            </View>

            {invoice.discountPercent > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount ({invoice.discountPercent}%)</Text>
                <Text style={[styles.summaryValue, { color: colors.success }]}>
                  -{formatCurrency(invoice.discountAmount, currency)}
                </Text>
              </View>
            )}

            <View style={styles.summaryDivider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL DUE</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.totalAmount, currency)}</Text>
            </View>
          </View>
        </View>

        {/* Footer Section */}
        <View style={styles.footer}>
          {/* Bank Details */}
          {invoice.bankDetails && (
            <View style={styles.bankDetails}>
              <Text style={styles.footerTitle}>Payment Information</Text>
              {invoice.bankDetails.bankName && (
                <View style={styles.bankDetailRow}>
                  <Text style={styles.bankDetailLabel}>Bank Name:</Text>
                  <Text style={styles.bankDetailValue}>{invoice.bankDetails.bankName}</Text>
                </View>
              )}
              {invoice.bankDetails.accountName && (
                <View style={styles.bankDetailRow}>
                  <Text style={styles.bankDetailLabel}>Account Name:</Text>
                  <Text style={styles.bankDetailValue}>{invoice.bankDetails.accountName}</Text>
                </View>
              )}
              {invoice.bankDetails.accountNumber && (
                <View style={styles.bankDetailRow}>
                  <Text style={styles.bankDetailLabel}>Account Number:</Text>
                  <Text style={styles.bankDetailValue}>{invoice.bankDetails.accountNumber}</Text>
                </View>
              )}
              {invoice.bankDetails.routingNumber && (
                <View style={styles.bankDetailRow}>
                  <Text style={styles.bankDetailLabel}>Routing Number:</Text>
                  <Text style={styles.bankDetailValue}>{invoice.bankDetails.routingNumber}</Text>
                </View>
              )}
              {invoice.bankDetails.swiftCode && (
                <View style={styles.bankDetailRow}>
                  <Text style={styles.bankDetailLabel}>SWIFT Code:</Text>
                  <Text style={styles.bankDetailValue}>{invoice.bankDetails.swiftCode}</Text>
                </View>
              )}
              {invoice.bankDetails.iban && (
                <View style={styles.bankDetailRow}>
                  <Text style={styles.bankDetailLabel}>IBAN:</Text>
                  <Text style={styles.bankDetailValue}>{invoice.bankDetails.iban}</Text>
                </View>
              )}
            </View>
          )}

          {/* Notes */}
          {invoice.notes && (
            <View style={styles.footerSection}>
              <Text style={styles.footerTitle}>Notes</Text>
              <Text style={styles.footerText}>{invoice.notes}</Text>
            </View>
          )}

          {/* Terms */}
          {invoice.terms && (
            <View style={styles.footerSection}>
              <Text style={styles.footerTitle}>Terms & Conditions</Text>
              <Text style={styles.footerText}>{invoice.terms}</Text>
            </View>
          )}
        </View>

        {/* Page Number */}
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  )
}
