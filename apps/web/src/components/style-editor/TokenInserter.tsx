'use client'

import { useState } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Code, Search } from 'lucide-react'
import { ALLOWED_TOKENS } from '@invoice-generator/shared-types'
import { cn } from '@/lib/utils'

interface TokenInserterProps {
  onInsert: (token: string) => void
}

// Custom labels for tokens that need clearer descriptions
const TOKEN_LABELS: Record<string, string> = {
  from_name: 'From Name (contact only)',
  from_company: 'From Company (company only)',
  from_name_or_company: 'From Name or Company (name priority)',
  from_company_or_name: 'From Company or Name (company priority)',
  to_name: 'To Name (contact only)',
  to_company: 'To Company (company only)',
  to_name_or_company: 'To Name or Company (name priority)',
  to_company_or_name: 'To Company or Name (company priority)',
}

const TOKEN_CATEGORIES: Record<string, { label: string; tokens: string[] }> = {
  invoice: {
    label: 'Invoice',
    tokens: ['invoice_number', 'issue_date', 'due_date', 'billing_period'],
  },
  from: {
    label: 'From (Sender)',
    tokens: [
      'from_name',
      'from_company',
      'from_name_or_company',
      'from_company_or_name',
      'from_address',
      'from_city',
      'from_state',
      'from_postal_code',
      'from_country',
      'from_email',
      'from_phone',
      'from_tax_id',
    ],
  },
  to: {
    label: 'To (Client)',
    tokens: [
      'to_name',
      'to_company',
      'to_name_or_company',
      'to_company_or_name',
      'to_address',
      'to_city',
      'to_state',
      'to_postal_code',
      'to_country',
      'to_email',
      'to_phone',
      'to_tax_id',
    ],
  },
  financial: {
    label: 'Financial',
    tokens: [
      'total_hours',
      'total_days',
      'hourly_rate',
      'subtotal',
      'discount_percent',
      'discount_amount',
      'tax_percent',
      'tax_amount',
      'total_amount',
      'currency_symbol',
      'currency_code',
    ],
  },
  other: {
    label: 'Other',
    tokens: ['job_title', 'notes', 'terms', 'payment_terms'],
  },
}

function formatTokenLabel(token: string): string {
  // Use custom label if available
  if (TOKEN_LABELS[token]) {
    return TOKEN_LABELS[token]
  }
  // Default formatting for other tokens
  return token
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function TokenInserter({ onInsert }: TokenInserterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleInsert = (token: string) => {
    onInsert(token)
    setIsOpen(false)
    setSearchQuery('')
  }

  const filteredCategories = Object.entries(TOKEN_CATEGORIES).reduce(
    (acc, [key, category]) => {
      const filteredTokens = category.tokens.filter(
        (token) =>
          token.toLowerCase().includes(searchQuery.toLowerCase()) ||
          formatTokenLabel(token).toLowerCase().includes(searchQuery.toLowerCase())
      )
      if (filteredTokens.length > 0) {
        acc[key] = { ...category, tokens: filteredTokens }
      }
      return acc
    },
    {} as typeof TOKEN_CATEGORIES
  )

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Code className="mr-2 h-4 w-4" />
          Insert Token
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tokens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8"
            />
          </div>
        </div>

        <ScrollArea className="h-64">
          <div className="p-2 space-y-3">
            {Object.entries(filteredCategories).map(([key, category]) => (
              <div key={key}>
                <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase text-muted-foreground">
                  {category.label}
                </p>
                <div className="space-y-0.5">
                  {category.tokens.map((token) => (
                    <button
                      key={token}
                      onClick={() => handleInsert(token)}
                      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                    >
                      <span>{formatTokenLabel(token)}</span>
                      <code className="text-[10px] text-muted-foreground">
                        {`{{${token}}}`}
                      </code>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {Object.keys(filteredCategories).length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No tokens found
              </p>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-2">
          <p className="text-[10px] text-muted-foreground">
            Tokens are replaced with actual values when generating PDF
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
