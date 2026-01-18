'use client'

import { Calculator } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { Currency } from '@invoice-generator/shared-types'
import { CURRENCY_SYMBOLS } from '@invoice-generator/shared-types'

interface InvoiceSummaryProps {
  currency: Currency
  totalDays: number
  totalHours: number
  hourlyRate: number
  subtotal: number
  totalAmount: number
}

export function InvoiceSummary({
  currency,
  totalDays,
  totalHours,
  hourlyRate,
  subtotal,
  totalAmount,
}: InvoiceSummaryProps) {
  const symbol = CURRENCY_SYMBOLS[currency]

  const formatCurrency = (amount: number) => {
    return `${symbol}${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Invoice Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Work summary */}
        <div className="grid grid-cols-3 gap-4 rounded-lg bg-muted p-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{totalDays}</div>
            <div className="text-xs text-muted-foreground">Working Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Total Hours</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{formatCurrency(hourlyRate)}</div>
            <div className="text-xs text-muted-foreground">Hourly Rate</div>
          </div>
        </div>

        <Separator />

        {/* Line items */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Hours ({totalHours.toFixed(1)} x {formatCurrency(hourlyRate)})
            </span>
            <span>{formatCurrency(totalHours * hourlyRate)}</span>
          </div>

          <div className="flex justify-between font-medium">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
        </div>

        <Separator />

        {/* Total */}
        <div className="flex items-center justify-between rounded-lg bg-primary p-4 text-primary-foreground">
          <span className="text-lg font-semibold">Total Due</span>
          <span className="text-2xl font-bold">{formatCurrency(totalAmount)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
