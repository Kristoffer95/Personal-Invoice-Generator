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
      <CardHeader className="pb-2 sm:pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-sm sm:text-base">Additional Items</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Add extra charges or deductions to the invoice
            </CardDescription>
          </div>
          <Button onClick={handleAddItem} size="sm" className="h-8 w-full text-xs sm:h-9 sm:w-auto sm:text-sm">
            <Plus className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
            Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground sm:py-8 sm:text-sm">
            No additional items. Click &quot;Add Item&quot; to add charges or deductions.
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {/* Header - Desktop only */}
            <div className="hidden grid-cols-12 gap-2 text-xs font-medium text-muted-foreground sm:grid sm:text-sm">
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
                className="grid grid-cols-1 gap-2 rounded-md border p-2.5 sm:grid-cols-12 sm:items-center sm:rounded-lg sm:border-0 sm:p-0"
              >
                <div className="sm:col-span-5">
                  <Label className="text-xs sm:hidden">Description</Label>
                  <Input
                    value={item.description}
                    onChange={(e) =>
                      onUpdate(item.id, { description: e.target.value })
                    }
                    placeholder="Item description"
                    className="h-8 text-xs sm:h-9 sm:text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:col-span-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs sm:hidden">Quantity</Label>
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
                      className="h-8 text-right text-xs sm:h-9 sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs sm:hidden">Unit Price</Label>
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
                      className="h-8 text-right text-xs sm:h-9 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between sm:col-span-2">
                  <span className="text-xs text-muted-foreground sm:hidden">Amount:</span>
                  <span className="text-sm font-medium sm:w-full sm:text-right sm:text-base">
                    {formatAmount(item.amount)}
                  </span>
                </div>
                <div className="flex justify-end sm:col-span-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(item.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Total */}
            <div className="flex justify-end border-t pt-3 sm:pt-4">
              <div className="text-right">
                <div className="text-xs text-muted-foreground sm:text-sm">Items Total</div>
                <div className="text-base font-bold sm:text-lg">{formatAmount(total)}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
