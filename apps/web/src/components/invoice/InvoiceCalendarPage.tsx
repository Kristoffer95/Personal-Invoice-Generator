'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isWeekend,
  addDays,
  isSameMonth,
} from 'date-fns'
import {
  Settings,
  FileDown,
  Save,
  RotateCcw,
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { useInvoiceStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  detectInvoicePeriod,
  generateWorkHoursForPeriod,
  type DetectedPeriod,
  type PeriodBatchType,
  getBatchPeriod,
} from '@/lib/period-detection'
import { PartyInfoForm } from './PartyInfoForm'
import { LineItemsEditor } from './LineItemsEditor'
import { BackgroundSelector } from './BackgroundSelector'
import { PageSizeSelector } from './PageSizeSelector'
import { InvoicePreview } from './InvoicePreview'
import type { Invoice, PageSizeKey, DailyWorkHours } from '@invoice-generator/shared-types'
import { CURRENCY_SYMBOLS } from '@invoice-generator/shared-types'

interface InvoiceCalendarPageProps {
  onExportPDF: (invoice: Invoice) => Promise<void>
}

interface ValidationErrors {
  invoiceNumber?: boolean
  fromName?: boolean
  toName?: boolean
}

export function InvoiceCalendarPage({ onExportPDF }: InvoiceCalendarPageProps) {
  const { toast } = useToast()
  const [isExporting, setIsExporting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [selectedPeriod, setSelectedPeriod] = useState<DetectedPeriod | null>(null)
  const [isManualOverride, setIsManualOverride] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<PeriodBatchType>('1st_batch')

  const {
    currentInvoice,
    scheduleConfig,
    backgroundDesigns,
    updateCurrentInvoice,
    updateFromInfo,
    updateToInfo,
    updateDayHours,
    toggleWorkday,
    setDailyWorkHours,
    addLineItem,
    updateLineItem,
    removeLineItem,
    setPageSize,
    setBackgroundDesign,
    setHourlyRate,
    updateScheduleConfig,
    saveInvoice,
    resetCurrentInvoice,
  } = useInvoiceStore()

  // Set issue date to today on mount if not already set
  useEffect(() => {
    if (!currentInvoice.issueDate) {
      const today = format(new Date(), 'yyyy-MM-dd')
      const dueDate = format(addDays(new Date(), 30), 'yyyy-MM-dd')
      updateCurrentInvoice({ issueDate: today, dueDate })
    }
  }, [currentInvoice.issueDate, updateCurrentInvoice])

  // Auto-detect period on mount and when schedule frequency changes
  useEffect(() => {
    if (!isManualOverride) {
      const detected = detectInvoicePeriod(scheduleConfig.frequency)
      setSelectedPeriod(detected)

      // Update invoice period
      updateCurrentInvoice({
        periodStart: detected.start,
        periodEnd: detected.end,
      })

      // Generate work hours for the period
      const workHours = generateWorkHoursForPeriod(
        detected.start,
        detected.end,
        scheduleConfig.defaultHoursPerDay
      )
      setDailyWorkHours(workHours)
    }
  }, [scheduleConfig.frequency, scheduleConfig.defaultHoursPerDay, isManualOverride, updateCurrentInvoice, setDailyWorkHours])

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (currentInvoice.periodStart) {
      return parseISO(currentInvoice.periodStart)
    }
    return new Date()
  })

  const hoursMap = useMemo(() => {
    const map = new Map<string, DailyWorkHours>()
    currentInvoice.dailyWorkHours?.forEach((d) => map.set(d.date, d))
    return map
  }, [currentInvoice.dailyWorkHours])

  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const isCurrentMonthToday = useMemo(() => {
    return isSameMonth(currentMonth, new Date())
  }, [currentMonth])

  // Track month changes to update period selection reactively
  const [prevMonth, setPrevMonth] = useState<Date | null>(null)

  useEffect(() => {
    // Skip if this is the initial render or month hasn't changed
    if (prevMonth === null) {
      setPrevMonth(currentMonth)
      return
    }

    // Check if month actually changed
    if (isSameMonth(currentMonth, prevMonth)) {
      return
    }

    setPrevMonth(currentMonth)

    // Update period selection to use the new month
    const period = getBatchPeriod(selectedBatch, currentMonth)
    setIsManualOverride(true)
    setSelectedPeriod(period)
    updateCurrentInvoice({
      periodStart: period.start,
      periodEnd: period.end,
    })
    const workHours = generateWorkHoursForPeriod(
      period.start,
      period.end,
      scheduleConfig.defaultHoursPerDay
    )
    setDailyWorkHours(workHours)
  }, [currentMonth, prevMonth, selectedBatch, scheduleConfig.defaultHoursPerDay, updateCurrentInvoice, setDailyWorkHours])

  const handlePreviousMonth = useCallback(() => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }, [])

  const handleNextMonth = useCallback(() => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }, [])

  const handleGoToToday = useCallback(() => {
    setCurrentMonth(new Date())
  }, [])

  const handleBatchSelect = useCallback((batch: PeriodBatchType) => {
    setSelectedBatch(batch)
    setIsManualOverride(true)
    // Use the currently displayed month as the reference for period selection
    const period = getBatchPeriod(batch, currentMonth)
    setSelectedPeriod(period)
    updateCurrentInvoice({
      periodStart: period.start,
      periodEnd: period.end,
    })

    // Generate work hours for the new period
    const workHours = generateWorkHoursForPeriod(
      period.start,
      period.end,
      scheduleConfig.defaultHoursPerDay
    )
    setDailyWorkHours(workHours)
  }, [currentMonth, scheduleConfig.defaultHoursPerDay, updateCurrentInvoice, setDailyWorkHours])

  const isInPeriod = useCallback((date: Date): boolean => {
    if (!currentInvoice.periodStart || !currentInvoice.periodEnd) return false
    const dateStr = format(date, 'yyyy-MM-dd')
    return dateStr >= currentInvoice.periodStart && dateStr <= currentInvoice.periodEnd
  }, [currentInvoice.periodStart, currentInvoice.periodEnd])

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

  const handlePreview = useCallback(() => {
    if (!validateInvoice()) {
      toast({
        title: 'Cannot preview',
        description: 'Please fill in required fields in Settings before previewing.',
        variant: 'destructive',
      })
      setShowSettings(true)
      return
    }
    setShowPreview(true)
  }, [validateInvoice, toast])

  const handleExport = useCallback(async () => {
    if (!validateInvoice()) {
      toast({
        title: 'Cannot export',
        description: 'Please fill in required fields in Settings before exporting.',
        variant: 'destructive',
      })
      setShowSettings(true)
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
  }, [validateInvoice, toast, updateCurrentInvoice, saveInvoice, onExportPDF])

  const handleReset = useCallback(() => {
    resetCurrentInvoice()
    setValidationErrors({})
    setIsManualOverride(false)
    toast({
      title: 'Form reset',
      description: 'Invoice form has been cleared.',
    })
  }, [resetCurrentInvoice, toast])

  const handleIssueDateChange = useCallback((dateStr: string) => {
    updateCurrentInvoice({ issueDate: dateStr })
    // Calculate due date (NET_30)
    const date = parseISO(dateStr)
    const dueDate = format(addDays(date, 30), 'yyyy-MM-dd')
    updateCurrentInvoice({ dueDate })
  }, [updateCurrentInvoice])

  // Summary calculations
  const totalHours = useMemo(() => {
    return (currentInvoice.dailyWorkHours || [])
      .filter((d) => d.isWorkday && d.hours > 0)
      .reduce((sum, d) => sum + d.hours, 0)
  }, [currentInvoice.dailyWorkHours])

  const totalDays = useMemo(() => {
    return (currentInvoice.dailyWorkHours || []).filter((d) => d.isWorkday && d.hours > 0).length
  }, [currentInvoice.dailyWorkHours])

  const subtotal = useMemo(() => {
    return totalHours * (currentInvoice.hourlyRate || 0)
  }, [totalHours, currentInvoice.hourlyRate])

  const currencySymbol = CURRENCY_SYMBOLS[currentInvoice.currency || 'USD']

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div>
            <h1 className="text-xl font-bold">Invoice Generator</h1>
            {selectedPeriod && (
              <p className="text-sm text-muted-foreground">
                {selectedPeriod.label}
                {selectedPeriod.isAutoDetected && !isManualOverride && (
                  <span className="ml-2 text-xs text-primary">(Auto-detected)</span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={handlePreview}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button size="sm" onClick={handleExport} disabled={isExporting}>
              <FileDown className="mr-2 h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="outline" size="icon" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Calendar */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Calendar */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5" />
                      Work Hours
                    </CardTitle>
                    <CardDescription>
                      Click on a day to edit hours. Toggle checkboxes to mark as workday.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={handlePreviousMonth}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[140px] text-center font-medium">
                      {format(currentMonth, 'MMMM yyyy')}
                    </span>
                    <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    {!isCurrentMonthToday && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGoToToday}
                        className="ml-2"
                      >
                        Today
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Period selector */}
                <div className="mb-4 flex flex-wrap items-center gap-4">
                  <Label className="text-sm text-muted-foreground">Period:</Label>
                  <RadioGroup
                    value={selectedBatch}
                    onValueChange={(value) => handleBatchSelect(value as PeriodBatchType)}
                    className="flex flex-row gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="1st_batch" id="period-1st" />
                      <Label htmlFor="period-1st" className="font-normal cursor-pointer">
                        1st Batch
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="2nd_batch" id="period-2nd" />
                      <Label htmlFor="period-2nd" className="font-normal cursor-pointer">
                        2nd Batch
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="whole_month" id="period-whole" />
                      <Label htmlFor="period-whole" className="font-normal cursor-pointer">
                        Whole Month
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="p-2 text-xs font-medium text-muted-foreground">
                      {day}
                    </div>
                  ))}

                  {/* Empty cells for days before the first of the month */}
                  {Array.from({ length: monthDays[0].getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="p-1" />
                  ))}

                  {monthDays.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd')
                    const dayData = hoursMap.get(dateStr)
                    const inPeriod = isInPeriod(day)
                    const weekend = isWeekend(day)
                    const isChecked = dayData?.isWorkday ?? false

                    return (
                      <div
                        key={dateStr}
                        className={cn(
                          'relative rounded-md border p-1.5 transition-colors min-h-[80px]',
                          inPeriod && 'bg-primary/5 border-primary/30',
                          weekend && !inPeriod && 'bg-muted/50',
                          !isChecked && inPeriod && 'bg-muted/30'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">{format(day, 'd')}</span>
                          {inPeriod && (
                            <button
                              type="button"
                              onClick={() => toggleWorkday(dateStr)}
                              className={cn(
                                'h-4 w-4 rounded-full border-2 transition-all flex items-center justify-center',
                                isChecked
                                  ? 'bg-primary border-primary text-primary-foreground'
                                  : 'border-muted-foreground/30 hover:border-muted-foreground/50'
                              )}
                              aria-label={isChecked ? 'Mark as non-working day' : 'Mark as working day'}
                            >
                              {isChecked && (
                                <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none">
                                  <path
                                    d="M2 6l3 3 5-6"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                        {inPeriod && (
                          <div className="mt-1.5">
                            <Input
                              type="number"
                              min={0}
                              max={24}
                              step={0.5}
                              value={dayData?.hours ?? 0}
                              onChange={(e) =>
                                updateDayHours(dateStr, parseFloat(e.target.value) || 0)
                              }
                              className={cn(
                                'h-7 px-1.5 text-xs text-center font-medium',
                                !isChecked && 'opacity-50'
                              )}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-4">
            {/* Quick Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{totalDays}</div>
                    <div className="text-xs text-muted-foreground">Working Days</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{totalHours.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">Total Hours</div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Rate</span>
                    <span>{currencySymbol}{currentInvoice.hourlyRate?.toFixed(2) || '0.00'}/hr</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-lg">{currencySymbol}{(currentInvoice.totalAmount || subtotal).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Settings */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Quick Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Hourly Rate</Label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {currencySymbol}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={currentInvoice.hourlyRate || ''}
                      onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                      className="pl-6"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hours/Day Default</Label>
                  <Input
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={scheduleConfig.defaultHoursPerDay}
                    onChange={(e) => updateScheduleConfig({ defaultHoursPerDay: parseFloat(e.target.value) || 8 })}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowSettings(true)}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  All Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Settings Sheet */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-hidden">
          <SheetHeader>
            <SheetTitle>Invoice Settings</SheetTitle>
            <SheetDescription>
              Configure invoice details, parties, and preferences
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-120px)] pr-4">
            <div className="space-y-6 py-4">
              {/* Invoice Info */}
              <div className="space-y-4">
                <h3 className="font-semibold">Invoice Details</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className={cn(validationErrors.invoiceNumber && 'text-destructive')}>
                      Invoice Number *
                    </Label>
                    <Input
                      value={currentInvoice.invoiceNumber || ''}
                      onChange={(e) => {
                        updateCurrentInvoice({ invoiceNumber: e.target.value })
                        if (e.target.value) setValidationErrors((prev) => ({ ...prev, invoiceNumber: false }))
                      }}
                      placeholder="INV-001"
                      className={cn(validationErrors.invoiceNumber && 'border-destructive')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Job Title / Description</Label>
                    <Input
                      value={currentInvoice.jobTitle || ''}
                      onChange={(e) => updateCurrentInvoice({ jobTitle: e.target.value })}
                      placeholder="e.g., Software Development"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Issue Date</Label>
                    <Input
                      type="date"
                      value={currentInvoice.issueDate || ''}
                      onChange={(e) => handleIssueDateChange(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Party Information */}
              <div className="space-y-4">
                <h3 className="font-semibold">From (Your Info)</h3>
                <PartyInfoForm
                  title=""
                  value={currentInvoice.from || {}}
                  onChange={updateFromInfo}
                  showNameError={validationErrors.fromName}
                  onNameChange={() => setValidationErrors((prev) => ({ ...prev, fromName: false }))}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold">Bill To (Client)</h3>
                <PartyInfoForm
                  title=""
                  value={currentInvoice.to || {}}
                  onChange={updateToInfo}
                  showNameError={validationErrors.toName}
                  onNameChange={() => setValidationErrors((prev) => ({ ...prev, toName: false }))}
                />
              </div>

              <Separator />

              {/* Additional Line Items */}
              <div className="space-y-4">
                <h3 className="font-semibold">Additional Line Items</h3>
                <LineItemsEditor
                  items={currentInvoice.lineItems || []}
                  currency={currentInvoice.currency || 'USD'}
                  onAdd={addLineItem}
                  onUpdate={updateLineItem}
                  onRemove={removeLineItem}
                />
              </div>

              <Separator />

              {/* Notes */}
              <div className="space-y-4">
                <h3 className="font-semibold">Notes & Terms</h3>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={currentInvoice.notes || ''}
                      onChange={(e) => updateCurrentInvoice({ notes: e.target.value })}
                      placeholder="Additional notes for the client..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Terms & Conditions</Label>
                    <Textarea
                      value={currentInvoice.terms || ''}
                      onChange={(e) => updateCurrentInvoice({ terms: e.target.value })}
                      placeholder="Payment terms and conditions..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Design */}
              <div className="space-y-4">
                <h3 className="font-semibold">Design</h3>
                <div className="grid gap-4 sm:grid-cols-2">
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
              </div>

              <Separator />

              {/* PDF Options */}
              <div className="space-y-4">
                <h3 className="font-semibold">PDF Options</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showDetailedHours"
                    checked={currentInvoice.showDetailedHours || false}
                    onCheckedChange={(checked) =>
                      updateCurrentInvoice({ showDetailedHours: checked as boolean })
                    }
                  />
                  <Label htmlFor="showDetailedHours" className="font-normal">
                    Show detailed per-day hours breakdown in PDF
                  </Label>
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

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
                backgroundDesign={backgroundDesigns.find((d) => d.id === currentInvoice.backgroundDesignId)}
              />
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
            <Button
              onClick={async () => {
                setShowPreview(false)
                await handleExport()
              }}
              disabled={isExporting}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
