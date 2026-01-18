'use client'

import { useState, useCallback } from 'react'
import { format, addDays, parseISO } from 'date-fns'
import { FileDown, Save, RotateCcw, Calendar as CalendarIcon, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useInvoiceStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { PartyInfoForm } from './PartyInfoForm'
import { WorkHoursEditor } from './WorkHoursEditor'
import { LineItemsEditor } from './LineItemsEditor'
import { ScheduleConfig } from './ScheduleConfig'
import { BackgroundSelector } from './BackgroundSelector'
import { FinancialSettings } from './FinancialSettings'
import { PageSizeSelector } from './PageSizeSelector'
import { InvoiceSummary } from './InvoiceSummary'
import { InvoicePreview } from './InvoicePreview'
import type { Invoice, PageSizeKey } from '@invoice-generator/shared-types'

interface InvoiceFormProps {
  onExportPDF: (invoice: Invoice) => Promise<void>
}

export interface ValidationErrors {
  invoiceNumber?: boolean
  fromName?: boolean
  toName?: boolean
}

export function InvoiceForm({ onExportPDF }: InvoiceFormProps) {
  const { toast } = useToast()
  const [isExporting, setIsExporting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})

  const {
    currentInvoice,
    scheduleConfig,
    backgroundDesigns,
    updateCurrentInvoice,
    updateFromInfo,
    updateToInfo,
    updateDayHours,
    toggleWorkday,
    setDefaultHoursForPeriod,
    addLineItem,
    updateLineItem,
    removeLineItem,
    setPageSize,
    setBackgroundDesign,
    setHourlyRate,
    setCurrency,
    updateScheduleConfig,
    saveInvoice,
    resetCurrentInvoice,
  } = useInvoiceStore()

  const [customDates, setCustomDates] = useState<string[]>(
    scheduleConfig.customDates || []
  )

  const handlePeriodChange = useCallback((start: string, end: string) => {
    updateCurrentInvoice({
      periodStart: start,
      periodEnd: end,
    })
  }, [updateCurrentInvoice])

  const handleIssueDateChange = useCallback((date: Date | undefined) => {
    if (date) {
      const issueDate = format(date, 'yyyy-MM-dd')
      updateCurrentInvoice({ issueDate })

      // Calculate due date based on payment terms
      const terms = currentInvoice.paymentTerms || 'NET_30'
      let daysToAdd = 0
      if (terms === 'NET_7') daysToAdd = 7
      else if (terms === 'NET_15') daysToAdd = 15
      else if (terms === 'NET_30') daysToAdd = 30
      else if (terms === 'NET_45') daysToAdd = 45
      else if (terms === 'NET_60') daysToAdd = 60

      if (daysToAdd > 0) {
        const dueDate = format(addDays(date, daysToAdd), 'yyyy-MM-dd')
        updateCurrentInvoice({ dueDate })
      }
    }
  }, [updateCurrentInvoice, currentInvoice.paymentTerms])

  const handleSave = useCallback(() => {
    const saved = saveInvoice()
    if (saved) {
      toast({
        title: 'Invoice saved',
        description: `Invoice #${saved.invoiceNumber} has been saved.`,
      })
    } else {
      toast({
        title: 'Cannot save invoice',
        description: 'Please fill in required fields (invoice number, from, to).',
        variant: 'destructive',
      })
    }
  }, [saveInvoice, toast])

  const validateInvoice = useCallback((): boolean => {
    const errors: ValidationErrors = {}
    let hasErrors = false

    if (!currentInvoice.invoiceNumber) {
      errors.invoiceNumber = true
      hasErrors = true
    }
    if (!currentInvoice.from?.name) {
      errors.fromName = true
      hasErrors = true
    }
    if (!currentInvoice.to?.name) {
      errors.toName = true
      hasErrors = true
    }

    setValidationErrors(errors)
    return !hasErrors
  }, [currentInvoice.invoiceNumber, currentInvoice.from?.name, currentInvoice.to?.name])

  const handlePreview = useCallback(() => {
    if (!validateInvoice()) {
      toast({
        title: 'Cannot preview',
        description: 'Please fill in required fields (marked in red) before previewing.',
        variant: 'destructive',
      })
      return
    }
    setShowPreview(true)
  }, [validateInvoice, toast])

  const handleExport = useCallback(async () => {
    if (!validateInvoice()) {
      toast({
        title: 'Cannot export',
        description: 'Please fill in required fields (marked in red) before exporting.',
        variant: 'destructive',
      })
      return
    }

    setIsExporting(true)
    try {
      const saved = saveInvoice()
      if (saved) {
        await onExportPDF(saved)
        toast({
          title: 'PDF exported',
          description: 'Your invoice has been downloaded.',
        })
      }
    } catch {
      toast({
        title: 'Export failed',
        description: 'There was an error exporting the PDF.',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }, [validateInvoice, toast, saveInvoice, onExportPDF])

  const handleReset = useCallback(() => {
    resetCurrentInvoice()
    setValidationErrors({})
    toast({
      title: 'Form reset',
      description: 'Invoice form has been cleared.',
    })
  }, [resetCurrentInvoice, toast])

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoice Generator</h1>
          <p className="text-muted-foreground">
            Create and export professional invoices
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button variant="outline" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
          <Button variant="outline" onClick={handlePreview}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            <FileDown className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="hours">Work Hours</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Invoice Info */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Invoice Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber" className={cn(validationErrors.invoiceNumber && 'text-destructive')}>
                    Invoice Number *
                  </Label>
                  <Input
                    id="invoiceNumber"
                    value={currentInvoice.invoiceNumber || ''}
                    onChange={(e) => {
                      updateCurrentInvoice({ invoiceNumber: e.target.value })
                      if (e.target.value) {
                        setValidationErrors(prev => ({ ...prev, invoiceNumber: false }))
                      }
                    }}
                    placeholder="INV-001"
                    className={cn(validationErrors.invoiceNumber && 'border-destructive focus-visible:ring-destructive')}
                  />
                  {validationErrors.invoiceNumber && (
                    <p className="text-xs text-destructive">Invoice number is required</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Issue Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !currentInvoice.issueDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {currentInvoice.issueDate
                          ? format(parseISO(currentInvoice.issueDate), 'PPP')
                          : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={
                          currentInvoice.issueDate
                            ? parseISO(currentInvoice.issueDate)
                            : undefined
                        }
                        onSelect={handleIssueDateChange}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !currentInvoice.dueDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {currentInvoice.dueDate
                          ? format(parseISO(currentInvoice.dueDate), 'PPP')
                          : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={
                          currentInvoice.dueDate
                            ? parseISO(currentInvoice.dueDate)
                            : undefined
                        }
                        onSelect={(date) =>
                          date &&
                          updateCurrentInvoice({
                            dueDate: format(date, 'yyyy-MM-dd'),
                          })
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title / Description</Label>
                  <Input
                    id="jobTitle"
                    value={currentInvoice.jobTitle || ''}
                    onChange={(e) =>
                      updateCurrentInvoice({ jobTitle: e.target.value })
                    }
                    placeholder="e.g., Software Development Services"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={currentInvoice.notes || ''}
                    onChange={(e) =>
                      updateCurrentInvoice({ notes: e.target.value })
                    }
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="terms">Terms & Conditions</Label>
                  <Textarea
                    id="terms"
                    value={currentInvoice.terms || ''}
                    onChange={(e) =>
                      updateCurrentInvoice({ terms: e.target.value })
                    }
                    placeholder="Payment terms and conditions..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showDetailedHours"
                    checked={currentInvoice.showDetailedHours || false}
                    onChange={(e) =>
                      updateCurrentInvoice({ showDetailedHours: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="showDetailedHours" className="font-normal">
                    Show detailed per-day hours breakdown in PDF
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Party Information */}
            <div className="space-y-6 lg:col-span-2">
              <PartyInfoForm
                title="From (Your Info)"
                value={currentInvoice.from || {}}
                onChange={updateFromInfo}
                showNameError={validationErrors.fromName}
                onNameChange={() => setValidationErrors(prev => ({ ...prev, fromName: false }))}
              />
              <PartyInfoForm
                title="Bill To (Client)"
                value={currentInvoice.to || {}}
                onChange={updateToInfo}
                showNameError={validationErrors.toName}
                onNameChange={() => setValidationErrors(prev => ({ ...prev, toName: false }))}
              />
            </div>
          </div>
        </TabsContent>

        {/* Work Hours Tab */}
        <TabsContent value="hours" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <WorkHoursEditor
                periodStart={currentInvoice.periodStart}
                periodEnd={currentInvoice.periodEnd}
                dailyWorkHours={currentInvoice.dailyWorkHours || []}
                defaultHoursPerDay={currentInvoice.defaultHoursPerDay || 8}
                onUpdateDay={updateDayHours}
                onToggleWorkday={toggleWorkday}
                onSetDefaultForPeriod={setDefaultHoursForPeriod}
                onPeriodChange={handlePeriodChange}
              />
            </div>
            <div className="space-y-6">
              <ScheduleConfig
                config={scheduleConfig}
                onUpdate={updateScheduleConfig}
                customDates={customDates}
                onCustomDatesChange={setCustomDates}
              />
              <InvoiceSummary
                currency={currentInvoice.currency || 'USD'}
                totalDays={currentInvoice.totalDays || 0}
                totalHours={currentInvoice.totalHours || 0}
                hourlyRate={currentInvoice.hourlyRate || 0}
                subtotal={currentInvoice.subtotal || 0}
                totalAmount={currentInvoice.totalAmount || 0}
              />
            </div>
          </div>
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <LineItemsEditor
                items={currentInvoice.lineItems || []}
                currency={currentInvoice.currency || 'USD'}
                onAdd={addLineItem}
                onUpdate={updateLineItem}
                onRemove={removeLineItem}
              />
            </div>
            <InvoiceSummary
              currency={currentInvoice.currency || 'USD'}
              totalDays={currentInvoice.totalDays || 0}
              totalHours={currentInvoice.totalHours || 0}
              hourlyRate={currentInvoice.hourlyRate || 0}
              subtotal={currentInvoice.subtotal || 0}
              totalAmount={currentInvoice.totalAmount || 0}
            />
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <FinancialSettings
                hourlyRate={currentInvoice.hourlyRate || 0}
                currency={currentInvoice.currency || 'USD'}
                onHourlyRateChange={setHourlyRate}
                onCurrencyChange={setCurrency}
              />
            </div>
            <InvoiceSummary
              currency={currentInvoice.currency || 'USD'}
              totalDays={currentInvoice.totalDays || 0}
              totalHours={currentInvoice.totalHours || 0}
              hourlyRate={currentInvoice.hourlyRate || 0}
              subtotal={currentInvoice.subtotal || 0}
              totalAmount={currentInvoice.totalAmount || 0}
            />
          </div>
        </TabsContent>

        {/* Design Tab */}
        <TabsContent value="design" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <BackgroundSelector
              designs={backgroundDesigns}
              selectedId={currentInvoice.backgroundDesignId}
              onSelect={setBackgroundDesign}
            />
            <PageSizeSelector
              selectedSize={(currentInvoice.pageSize as PageSizeKey) || 'A4'}
              onSelect={setPageSize}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {showPreview && (
              <InvoicePreview
                invoice={currentInvoice as Invoice}
                backgroundDesign={backgroundDesigns.find(d => d.id === currentInvoice.backgroundDesignId)}
              />
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
            <Button onClick={async () => {
              setShowPreview(false)
              await handleExport()
            }} disabled={isExporting}>
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
