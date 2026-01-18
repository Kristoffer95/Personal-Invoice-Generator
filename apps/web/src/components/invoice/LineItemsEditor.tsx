'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { LineItem, Currency } from '@invoice-generator/shared-types'
import { CURRENCY_SYMBOLS } from '@invoice-generator/shared-types'

interface LineItemsEditorProps {
  items: LineItem[]
  currency: Currency
  onAdd: (item: Omit<LineItem, 'id' | 'amount'>) => void
  onUpdate: (id: string, updates: Partial<LineItem>) => void
  onRemove: (id: string) => void
}

export function LineItemsEditor({
  items,
  currency,
  onAdd,
  onUpdate,
  onRemove,
}: LineItemsEditorProps) {
  const symbol = CURRENCY_SYMBOLS[currency]

  const handleAddItem = () => {
    onAdd({
      description: '',
      quantity: 1,
      unitPrice: 0,
    })
  }

  const formatAmount = (amount: number) => {
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const total = items.reduce((sum, item) => sum + item.amount, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Additional Items</CardTitle>
            <CardDescription>
              Add extra charges or deductions to the invoice
            </CardDescription>
          </div>
          <Button onClick={handleAddItem} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No additional items. Click &quot;Add Item&quot; to add charges or deductions.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="hidden grid-cols-12 gap-2 text-sm font-medium text-muted-foreground sm:grid">
              <div className="col-span-5">Description</div>
              <div className="col-span-2 text-right">Quantity</div>
              <div className="col-span-2 text-right">Unit Price</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-1" />
            </div>

            {/* Items */}
            {items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-12 sm:items-center sm:border-0 sm:p-0"
              >
                <div className="sm:col-span-5">
                  <Label className="sm:hidden">Description</Label>
                  <Input
                    value={item.description}
                    onChange={(e) =>
                      onUpdate(item.id, { description: e.target.value })
                    }
                    placeholder="Item description"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="sm:hidden">Quantity</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={item.quantity}
                    onChange={(e) =>
                      onUpdate(item.id, {
                        quantity: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="text-right"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="sm:hidden">Unit Price</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.unitPrice}
                    onChange={(e) =>
                      onUpdate(item.id, {
                        unitPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="text-right"
                  />
                </div>
                <div className="flex items-center justify-between sm:col-span-2">
                  <span className="sm:hidden">Amount:</span>
                  <span className="font-medium sm:w-full sm:text-right">
                    {formatAmount(item.amount)}
                  </span>
                </div>
                <div className="flex justify-end sm:col-span-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(item.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Total */}
            <div className="flex justify-end border-t pt-4">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Items Total</div>
                <div className="text-lg font-bold">{formatAmount(total)}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
