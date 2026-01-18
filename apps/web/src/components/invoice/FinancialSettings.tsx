'use client'

import { DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Currency } from '@invoice-generator/shared-types'
import { CURRENCY_SYMBOLS } from '@invoice-generator/shared-types'

interface FinancialSettingsProps {
  hourlyRate: number
  currency: Currency
  onHourlyRateChange: (rate: number) => void
  onCurrencyChange: (currency: Currency) => void
}

const currencies: Currency[] = ['USD', 'EUR', 'GBP', 'PHP', 'JPY', 'AUD', 'CAD', 'SGD']

export function FinancialSettings({
  hourlyRate,
  currency,
  onHourlyRateChange,
  onCurrencyChange,
}: FinancialSettingsProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Rates & Currency
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly Rate</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {CURRENCY_SYMBOLS[currency]}
                </span>
                <Input
                  id="hourlyRate"
                  type="number"
                  min={0}
                  step={0.01}
                  value={hourlyRate || ''}
                  onChange={(e) => onHourlyRateChange(parseFloat(e.target.value) || 0)}
                  className="pl-8"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={onCurrencyChange}>
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CURRENCY_SYMBOLS[c]} {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
