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
import { ThemeToggle } from '@/components/ui/theme-toggle'
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
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      {/* Header - Responsive with mobile menu */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:px-4 md:px-6">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold sm:text-xl">Invoice Generator</h1>
            {selectedPeriod && (
              <p className="truncate text-xs text-muted-foreground sm:text-sm">
                {selectedPeriod.label}
                {selectedPeriod.isAutoDetected && !isManualOverride && (
                  <span className="ml-1 text-xs text-primary sm:ml-2">(Auto)</span>
                )}
              </p>
            )}
          </div>
          {/* Desktop action buttons */}
          <div className="hidden items-center gap-1.5 sm:flex sm:gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="mr-1.5 h-4 w-4 sm:mr-2" />
              <span className="hidden md:inline">Reset</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save className="mr-1.5 h-4 w-4 sm:mr-2" />
              <span className="hidden md:inline">Save</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handlePreview}>
              <Eye className="mr-1.5 h-4 w-4 sm:mr-2" />
              <span className="hidden md:inline">Preview</span>
            </Button>
            <Button size="sm" onClick={handleExport} disabled={isExporting}>
              <FileDown className="mr-1.5 h-4 w-4 sm:mr-2" />
              <span className="hidden md:inline">{isExporting ? 'Exporting...' : 'Export'}</span>
            </Button>
            <Separator orientation="vertical" className="mx-1 h-6" />
            <ThemeToggle />
            <Button variant="outline" size="icon" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4" />
              <span className="sr-only">Settings</span>
            </Button>
          </div>
          {/* Mobile header actions - minimal */}
          <div className="flex items-center gap-1 sm:hidden">
            <ThemeToggle />
            <Button variant="outline" size="icon" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4" />
              <span className="sr-only">Settings</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Calendar */}
      <main className="container mx-auto px-3 py-4 sm:px-4 sm:py-6 md:px-6">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {/* Calendar */}
          <div className="lg:col-span-3 xl:col-span-4 2xl:col-span-5">
            <Card>
              <CardHeader className="pb-3 sm:pb-4">
                {/* Mobile: Stack header elements */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      Work Hours
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Click on a day to edit hours. Toggle checkboxes to mark as workday.
                    </CardDescription>
                  </div>
                  {/* Month navigation */}
                  <div className="flex items-center justify-between gap-1 sm:justify-end sm:gap-2">
                    <Button variant="ghost" size="icon" onClick={handlePreviousMonth} className="h-8 w-8 sm:h-9 sm:w-9">
                      <ChevronLeft className="h-4 w-4" />
                      <span className="sr-only">Previous month</span>
                    </Button>
                    <span className="min-w-[100px] text-center text-sm font-medium sm:min-w-[140px] sm:text-base">
                      {format(currentMonth, 'MMM yyyy')}
                    </span>
                    <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8 sm:h-9 sm:w-9">
                      <ChevronRight className="h-4 w-4" />
                      <span className="sr-only">Next month</span>
                    </Button>
                    {!isCurrentMonthToday && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGoToToday}
                        className="ml-1 h-8 text-xs sm:ml-2 sm:h-9 sm:text-sm"
                      >
                        Today
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                {/* Period selector - responsive with wrapping */}
                <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                  <Label className="text-xs text-muted-foreground sm:text-sm">Period:</Label>
                  <RadioGroup
                    value={selectedBatch}
                    onValueChange={(value) => handleBatchSelect(value as PeriodBatchType)}
                    className="flex flex-row flex-wrap gap-3 sm:gap-4"
                  >
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <RadioGroupItem value="1st_batch" id="period-1st" className="h-4 w-4" />
                      <Label htmlFor="period-1st" className="cursor-pointer text-xs font-normal sm:text-sm">
                        1st Batch
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <RadioGroupItem value="2nd_batch" id="period-2nd" className="h-4 w-4" />
                      <Label htmlFor="period-2nd" className="cursor-pointer text-xs font-normal sm:text-sm">
                        2nd Batch
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <RadioGroupItem value="whole_month" id="period-whole" className="h-4 w-4" />
                      <Label htmlFor="period-whole" className="cursor-pointer text-xs font-normal sm:text-sm">
                        Whole Month
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Calendar grid - responsive with horizontal scroll on very small screens */}
                <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:overflow-visible sm:px-0">
                  <div className="grid min-w-[320px] grid-cols-7 gap-0.5 text-center sm:min-w-0 sm:gap-1">
                    {/* Day headers - abbreviated on mobile */}
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                      <div key={`${day}-${i}`} className="p-1 text-[10px] font-medium text-muted-foreground sm:hidden sm:p-2 sm:text-xs">
                        {day}
                      </div>
                    ))}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="hidden p-2 text-xs font-medium text-muted-foreground sm:block">
                        {day}
                      </div>
                    ))}

                    {/* Empty cells for days before the first of the month */}
                    {Array.from({ length: monthDays[0].getDay() }).map((_, i) => (
                      <div key={`empty-${i}`} className="p-0.5 sm:p-1" />
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
                            'calendar-cell',
                            inPeriod && 'bg-primary/5 border-primary/30',
                            weekend && !inPeriod && 'bg-muted/50',
                            !isChecked && inPeriod && 'bg-muted/30'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium sm:text-xs">{format(day, 'd')}</span>
                            {inPeriod && (
                              <button
                                type="button"
                                onClick={() => toggleWorkday(dateStr)}
                                className={cn(
                                  'flex h-4 w-4 items-center justify-center rounded-full border-2 transition-all sm:h-4 sm:w-4',
                                  isChecked
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-muted-foreground/30 hover:border-muted-foreground/50'
                                )}
                                aria-label={isChecked ? 'Mark as non-working day' : 'Mark as working day'}
                              >
                                {isChecked && (
                                  <svg className="h-2 w-2 sm:h-2.5 sm:w-2.5" viewBox="0 0 12 12" fill="none">
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
                            <div className="mt-1 sm:mt-1.5">
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
                                  'h-6 px-1 text-center text-[10px] font-medium sm:h-7 sm:px-1.5 sm:text-xs',
                                  !isChecked && 'opacity-50'
                                )}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar - Hidden on mobile (shown in action bar) */}
          <div className="hidden space-y-3 sm:block sm:space-y-4">
            {/* Quick Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold sm:text-2xl">{totalDays}</div>
                    <div className="text-[10px] text-muted-foreground sm:text-xs">Working Days</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold sm:text-2xl">{totalHours.toFixed(1)}</div>
                    <div className="text-[10px] text-muted-foreground sm:text-xs">Total Hours</div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Rate</span>
                    <span>{currencySymbol}{currentInvoice.hourlyRate?.toFixed(2) || '0.00'}/hr</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span className="text-sm sm:text-base">Total</span>
                  <span className="text-base sm:text-lg">{currencySymbol}{(currentInvoice.totalAmount || subtotal).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Settings */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm sm:text-base">Quick Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 sm:space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Hourly Rate</Label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground sm:text-sm">
                      {currencySymbol}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={currentInvoice.hourlyRate || ''}
                      onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                      className="h-9 pl-6 text-sm"
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
                    className="h-9 text-sm"
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

      {/* Mobile Action Bar - Fixed at bottom */}
      <div className="mobile-action-bar sm:hidden">
        <div className="flex items-center justify-between gap-2">
          {/* Summary info */}
          <div className="flex items-center gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Days:</span>{' '}
              <span className="font-semibold">{totalDays}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total:</span>{' '}
              <span className="font-semibold">{currencySymbol}{(currentInvoice.totalAmount || subtotal).toFixed(0)}</span>
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={handleSave} className="h-8 px-2.5">
              <Save className="h-4 w-4" />
              <span className="sr-only">Save</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handlePreview} className="h-8 px-2.5">
              <Eye className="h-4 w-4" />
              <span className="sr-only">Preview</span>
            </Button>
            <Button size="sm" onClick={handleExport} disabled={isExporting} className="h-8 px-3">
              <FileDown className="mr-1.5 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Settings Sheet */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent side="right" className="w-full overflow-hidden sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-lg sm:text-xl">Invoice Settings</SheetTitle>
            <SheetDescription className="text-xs sm:text-sm">
              Configure invoice details, parties, and preferences
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-100px)] pr-2 sm:h-[calc(100vh-120px)] sm:pr-4">
            <div className="space-y-4 py-3 sm:space-y-6 sm:py-4">
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
                <div className="space-y-2">
                  <Label>PDF Theme</Label>
                  <RadioGroup
                    value={currentInvoice.pdfTheme || 'light'}
                    onValueChange={(value) =>
                      updateCurrentInvoice({ pdfTheme: value as 'light' | 'dark' })
                    }
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="light" id="pdf-light" />
                      <Label htmlFor="pdf-light" className="font-normal">Light</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="dark" id="pdf-dark" />
                      <Label htmlFor="pdf-dark" className="font-normal">Dark</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Preview Dialog - Responsive with full screen on mobile */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="flex h-[95vh] w-[95vw] max-w-4xl flex-col sm:h-[90vh] sm:w-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Invoice Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {showPreview && (
              <InvoicePreview
                invoice={currentInvoice as Invoice}
                backgroundDesign={backgroundDesigns.find((d) => d.id === currentInvoice.backgroundDesignId)}
              />
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 border-t pt-3 sm:flex-row sm:justify-end sm:pt-4">
            <Button variant="outline" onClick={() => setShowPreview(false)} className="w-full sm:w-auto">
              Close
            </Button>
            <Button
              onClick={async () => {
                setShowPreview(false)
                await handleExport()
              }}
              disabled={isExporting}
              className="w-full sm:w-auto"
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
