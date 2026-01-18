'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { PartyInfo } from '@invoice-generator/shared-types'

interface PartyInfoFormProps {
  title: string
  value: Partial<PartyInfo>
  onChange: (info: Partial<PartyInfo>) => void
  showNameError?: boolean
  onNameChange?: () => void
}

export function PartyInfoForm({ title, value, onChange, showNameError, onNameChange }: PartyInfoFormProps) {
  const handleChange = (field: keyof PartyInfo, newValue: string) => {
    onChange({ [field]: newValue })
    if (field === 'name' && newValue && onNameChange) {
      onNameChange()
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={`${title}-name`} className={cn(showNameError && 'text-destructive')}>
              Name / Company *
            </Label>
            <Input
              id={`${title}-name`}
              value={value.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Company or individual name"
              className={cn(showNameError && 'border-destructive focus-visible:ring-destructive')}
            />
            {showNameError && (
              <p className="text-xs text-destructive">Name is required</p>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={`${title}-address`}>Address</Label>
            <Input
              id={`${title}-address`}
              value={value.address || ''}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Street address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${title}-city`}>City</Label>
            <Input
              id={`${title}-city`}
              value={value.city || ''}
              onChange={(e) => handleChange('city', e.target.value)}
              placeholder="City"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${title}-state`}>State / Province</Label>
            <Input
              id={`${title}-state`}
              value={value.state || ''}
              onChange={(e) => handleChange('state', e.target.value)}
              placeholder="State"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${title}-postalCode`}>Postal Code</Label>
            <Input
              id={`${title}-postalCode`}
              value={value.postalCode || ''}
              onChange={(e) => handleChange('postalCode', e.target.value)}
              placeholder="12345"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${title}-country`}>Country</Label>
            <Input
              id={`${title}-country`}
              value={value.country || ''}
              onChange={(e) => handleChange('country', e.target.value)}
              placeholder="Country"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${title}-email`}>Email</Label>
            <Input
              id={`${title}-email`}
              type="email"
              value={value.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="email@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${title}-phone`}>Phone</Label>
            <Input
              id={`${title}-phone`}
              type="tel"
              value={value.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor={`${title}-taxId`}>Tax ID / VAT Number</Label>
            <Input
              id={`${title}-taxId`}
              value={value.taxId || ''}
              onChange={(e) => handleChange('taxId', e.target.value)}
              placeholder="Tax identification number"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
