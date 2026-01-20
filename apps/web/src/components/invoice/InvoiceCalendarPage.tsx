'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
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
  DollarSign,
  ChevronUp,
  User,
  FolderOpen,
  Cloud,
  CloudOff,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
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
import { useUserProfile, useNextInvoiceNumber } from '@/hooks/use-user-profile'
import { useInvoice, useInvoiceMutations } from '@/hooks/use-invoices'
import { useClientMutations } from '@/hooks/use-client-profiles'
import type { Invoice, PageSizeKey, DailyWorkHours } from '@invoice-generator/shared-types'
import { CURRENCY_SYMBOLS } from '@invoice-generator/shared-types'
import type { Id } from '@invoice-generator/backend/convex/_generated/dataModel'

interface InvoiceCalendarPageProps {
  onExportPDF: (invoice: Invoice) => Promise<void>
}

interface ValidationErrors {
  invoiceNumber?: boolean
  fromName?: boolean
  toName?: boolean
  hourlyRate?: boolean
  defaultHoursPerDay?: boolean
}

export function InvoiceCalendarPage({ onExportPDF }: InvoiceCalendarPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isExporting, setIsExporting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showMobileQuickSettings, setShowMobileQuickSettings] = useState(false)
  const [showMobileSummary, setShowMobileSummary] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [selectedPeriod, setSelectedPeriod] = useState<DetectedPeriod | null>(null)
  const [isManualOverride, setIsManualOverride] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<PeriodBatchType>('1st_batch')
  const [isSavingToCloud, setIsSavingToCloud] = useState(false)
  const [hasAppliedProfile, setHasAppliedProfile] = useState(false)
  const [hasLoadedInvoice, setHasLoadedInvoice] = useState(false)

  // Get Convex hooks for cloud sync
  const { data: profileData, user: authUser, profile: userProfile } = useUserProfile()
  const { formatted: nextInvoiceNumber, incrementNumber } = useNextInvoiceNumber()
  const { createInvoice, updateInvoice } = useInvoiceMutations()
  const { upsertFromInvoice: saveClientFromInvoice } = useClientMutations()

  // Get invoice ID and folder ID from URL params
  const invoiceIdParam = searchParams.get('invoiceId')
  const folderIdParam = searchParams.get('folderId')
  const { invoice: loadedInvoice } = useInvoice(invoiceIdParam as Id<'invoices'> | undefined)

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
    setCurrentInvoice,
  } = useInvoiceStore()

  // Load invoice from URL param (for editing existing invoice)
  useEffect(() => {
    if (loadedInvoice && !hasLoadedInvoice) {
      setHasLoadedInvoice(true)
      // Convert Convex invoice to local format
      setCurrentInvoice({
        id: loadedInvoice._id,
        invoiceNumber: loadedInvoice.invoiceNumber,
        status: loadedInvoice.status,
        issueDate: loadedInvoice.issueDate,
        dueDate: loadedInvoice.dueDate,
        periodStart: loadedInvoice.periodStart,
        periodEnd: loadedInvoice.periodEnd,
        from: loadedInvoice.from,
        to: loadedInvoice.to,
        hourlyRate: loadedInvoice.hourlyRate,
        defaultHoursPerDay: loadedInvoice.defaultHoursPerDay,
        dailyWorkHours: loadedInvoice.dailyWorkHours,
        totalDays: loadedInvoice.totalDays,
        totalHours: loadedInvoice.totalHours,
        subtotal: loadedInvoice.subtotal,
        lineItems: loadedInvoice.lineItems,
        discountPercent: loadedInvoice.discountPercent,
        discountAmount: loadedInvoice.discountAmount,
        taxPercent: loadedInvoice.taxPercent,
        taxAmount: loadedInvoice.taxAmount,
        totalAmount: loadedInvoice.totalAmount,
        currency: loadedInvoice.currency,
        paymentTerms: loadedInvoice.paymentTerms,
        customPaymentTerms: loadedInvoice.customPaymentTerms,
        bankDetails: loadedInvoice.bankDetails,
        notes: loadedInvoice.notes,
        terms: loadedInvoice.terms,
        jobTitle: loadedInvoice.jobTitle,
        showDetailedHours: loadedInvoice.showDetailedHours,
        pdfTheme: loadedInvoice.pdfTheme,
        backgroundDesignId: loadedInvoice.backgroundDesignId,
        pageSize: loadedInvoice.pageSize,
      })
      setIsManualOverride(true)
    }
  }, [loadedInvoice, hasLoadedInvoice, setCurrentInvoice])

  // Auto-fill from user profile for new invoices
  useEffect(() => {
    if (profileData && authUser && userProfile && !hasAppliedProfile && !invoiceIdParam) {
      setHasAppliedProfile(true)

      // Build the name from profile or user data
      const displayName = userProfile.displayName
        || userProfile.businessName
        || `${authUser.firstName ?? ''} ${authUser.lastName ?? ''}`.trim()
        || authUser.email

      // Only update if we have meaningful data and the from name is empty
      if (displayName && !currentInvoice.from?.name) {
        updateFromInfo({
          name: displayName,
          address: userProfile.address ?? '',
          city: userProfile.city ?? '',
          state: userProfile.state ?? '',
          postalCode: userProfile.postalCode ?? '',
          country: userProfile.country ?? '',
          email: userProfile.email ?? authUser.email ?? '',
          phone: userProfile.phone ?? '',
          taxId: userProfile.taxId ?? '',
        })

        // Also apply bank details if available
        if (userProfile.bankDetails) {
          updateCurrentInvoice({
            bankDetails: userProfile.bankDetails,
          })
        }
      }
    }
  }, [profileData, authUser, userProfile, hasAppliedProfile, invoiceIdParam, currentInvoice.from?.name, updateFromInfo, updateCurrentInvoice])

  // Auto-generate invoice number from profile settings
  useEffect(() => {
    if (nextInvoiceNumber && !currentInvoice.invoiceNumber && !invoiceIdParam) {
      updateCurrentInvoice({ invoiceNumber: nextInvoiceNumber })
    }
  }, [nextInvoiceNumber, currentInvoice.invoiceNumber, invoiceIdParam, updateCurrentInvoice])

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
    // Hourly Rate is required and must be greater than 0
    if (!currentInvoice.hourlyRate || currentInvoice.hourlyRate <= 0) {
      errors.hourlyRate = true
      hasErrors = true
    }
    // Default Hours/Day is required and must be greater than 0
    if (!scheduleConfig.defaultHoursPerDay || scheduleConfig.defaultHoursPerDay <= 0) {
      errors.defaultHoursPerDay = true
      hasErrors = true
    }

    setValidationErrors(errors)
    return !hasErrors
  }, [currentInvoice.invoiceNumber, currentInvoice.from?.name, currentInvoice.to?.name, currentInvoice.hourlyRate, scheduleConfig.defaultHoursPerDay])

  // Save to cloud (Convex)
  const handleSaveToCloud = useCallback(async () => {
    if (!validateInvoice()) {
      toast({
        title: 'Cannot save to cloud',
        description: 'Please fill in required fields.',
        variant: 'destructive',
      })
      return
    }

    setIsSavingToCloud(true)
    try {
      const invoiceData = {
        folderId: folderIdParam ? (folderIdParam as Id<'invoiceFolders'>) : undefined,
        invoiceNumber: currentInvoice.invoiceNumber!,
        status: currentInvoice.status ?? 'DRAFT',
        issueDate: currentInvoice.issueDate ?? format(new Date(), 'yyyy-MM-dd'),
        dueDate: currentInvoice.dueDate,
        periodStart: currentInvoice.periodStart,
        periodEnd: currentInvoice.periodEnd,
        from: currentInvoice.from!,
        to: currentInvoice.to!,
        hourlyRate: currentInvoice.hourlyRate ?? 0,
        defaultHoursPerDay: currentInvoice.defaultHoursPerDay ?? 8,
        dailyWorkHours: currentInvoice.dailyWorkHours ?? [],
        totalDays: currentInvoice.totalDays ?? 0,
        totalHours: currentInvoice.totalHours ?? 0,
        subtotal: currentInvoice.subtotal ?? 0,
        lineItems: currentInvoice.lineItems ?? [],
        discountPercent: currentInvoice.discountPercent ?? 0,
        discountAmount: currentInvoice.discountAmount ?? 0,
        taxPercent: currentInvoice.taxPercent ?? 0,
        taxAmount: currentInvoice.taxAmount ?? 0,
        totalAmount: currentInvoice.totalAmount ?? 0,
        currency: currentInvoice.currency ?? 'USD',
        paymentTerms: currentInvoice.paymentTerms ?? 'NET_30',
        customPaymentTerms: currentInvoice.customPaymentTerms,
        bankDetails: currentInvoice.bankDetails,
        notes: currentInvoice.notes,
        terms: currentInvoice.terms,
        jobTitle: currentInvoice.jobTitle,
        showDetailedHours: currentInvoice.showDetailedHours ?? false,
        pdfTheme: currentInvoice.pdfTheme ?? 'light',
        backgroundDesignId: currentInvoice.backgroundDesignId,
        pageSize: currentInvoice.pageSize ?? 'A4',
      }

      if (invoiceIdParam) {
        // Update existing invoice
        await updateInvoice({
          invoiceId: invoiceIdParam as Id<'invoices'>,
          ...invoiceData,
        })
        toast({
          title: 'Invoice updated',
          description: `Invoice #${currentInvoice.invoiceNumber} has been updated.`,
        })
      } else {
        // Create new invoice
        await createInvoice(invoiceData)
        // Increment the invoice number counter
        await incrementNumber()
        // Save client profile for reuse
        if (currentInvoice.to?.name) {
          await saveClientFromInvoice(currentInvoice.to)
        }
        toast({
          title: 'Invoice saved to cloud',
          description: `Invoice #${currentInvoice.invoiceNumber} has been saved.`,
        })
      }
    } catch (error) {
      toast({
        title: 'Error saving to cloud',
        description: 'Failed to save invoice. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingToCloud(false)
    }
  }, [
    validateInvoice,
    currentInvoice,
    invoiceIdParam,
    folderIdParam,
    createInvoice,
    updateInvoice,
    incrementNumber,
    saveClientFromInvoice,
    toast,
  ])

  const handleSave = useCallback(() => {
    const saved = saveInvoice()
    if (saved) {
      toast({
        title: 'Invoice saved locally',
        description: `Invoice #${saved.invoiceNumber} has been saved.`,
      })
    } else {
      toast({
        title: 'Cannot save invoice',
        description: 'Please fill in required fields (invoice number, from, to, hourly rate, hours/day).',
        variant: 'destructive',
      })
    }
  }, [saveInvoice, toast])

  const handlePreview = useCallback(() => {
    if (!validateInvoice()) {
      toast({
        title: 'Cannot preview',
        description: 'Please fill in required fields: Invoice Number, From/To names, Hourly Rate, and Hours/Day.',
        variant: 'destructive',
      })
      // Show quick settings on mobile if rate/hours are missing
      if (validationErrors.hourlyRate || validationErrors.defaultHoursPerDay) {
        setShowMobileQuickSettings(true)
      } else {
        setShowSettings(true)
      }
      return
    }
    setShowPreview(true)
  }, [validateInvoice, toast, validationErrors.hourlyRate, validationErrors.defaultHoursPerDay])

  const handleExport = useCallback(async () => {
    if (!validateInvoice()) {
      toast({
        title: 'Cannot export',
        description: 'Please fill in required fields: Invoice Number, From/To names, Hourly Rate, and Hours/Day.',
        variant: 'destructive',
      })
      // Show quick settings on mobile if rate/hours are missing
      if (validationErrors.hourlyRate || validationErrors.defaultHoursPerDay) {
        setShowMobileQuickSettings(true)
      } else {
        setShowSettings(true)
      }
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

  // Mobile UI handlers - optimized with useCallback
  const toggleMobileQuickSettings = useCallback(() => {
    setShowMobileQuickSettings(prev => !prev)
  }, [])

  const openMobileSummary = useCallback(() => {
    setShowMobileSummary(true)
  }, [])

  const closeMobileSummaryAndOpenSettings = useCallback(() => {
    setShowMobileSummary(false)
    setShowSettings(true)
  }, [])

  const closeMobileSummaryAndPreview = useCallback(() => {
    setShowMobileSummary(false)
    handlePreview()
  }, [handlePreview])

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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => router.push('/invoices')}>
                    <FolderOpen className="mr-1.5 h-4 w-4 sm:mr-2" />
                    <span className="hidden md:inline">Invoices</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View all invoices</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="mr-1.5 h-4 w-4 sm:mr-2" />
              <span className="hidden md:inline">Reset</span>
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveToCloud}
                    disabled={isSavingToCloud}
                  >
                    {isSavingToCloud ? (
                      <CloudOff className="mr-1.5 h-4 w-4 animate-pulse sm:mr-2" />
                    ) : (
                      <Cloud className="mr-1.5 h-4 w-4 sm:mr-2" />
                    )}
                    <span className="hidden md:inline">{isSavingToCloud ? 'Saving...' : 'Save'}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save to cloud</TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => router.push('/profile')}>
                    <User className="h-4 w-4" />
                    <span className="sr-only">Profile</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Profile settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="outline" size="icon" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4" />
              <span className="sr-only">Settings</span>
            </Button>
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
          {/* Mobile header actions - minimal */}
          <div className="flex items-center gap-1 sm:hidden">
            <ThemeToggle />
            <Button variant="outline" size="icon" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4" />
              <span className="sr-only">Settings</span>
            </Button>
            <UserButton afterSignOutUrl="/sign-in" />
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
                  <Label className={cn('text-xs', validationErrors.hourlyRate && 'text-destructive')}>
                    Hourly Rate *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground sm:text-sm">
                      {currencySymbol}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={currentInvoice.hourlyRate || ''}
                      onChange={(e) => {
                        setHourlyRate(parseFloat(e.target.value) || 0)
                        if (parseFloat(e.target.value) > 0) {
                          setValidationErrors(prev => ({ ...prev, hourlyRate: false }))
                        }
                      }}
                      className={cn('h-9 pl-6 text-sm', validationErrors.hourlyRate && 'border-destructive')}
                      placeholder="0.00"
                    />
                  </div>
                  {validationErrors.hourlyRate && (
                    <p className="text-xs text-destructive">Required</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className={cn('text-xs', validationErrors.defaultHoursPerDay && 'text-destructive')}>
                    Hours/Day Default *
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={scheduleConfig.defaultHoursPerDay}
                    onChange={(e) => {
                      updateScheduleConfig({ defaultHoursPerDay: parseFloat(e.target.value) || 8 })
                      if (parseFloat(e.target.value) > 0) {
                        setValidationErrors(prev => ({ ...prev, defaultHoursPerDay: false }))
                      }
                    }}
                    className={cn('h-9 text-sm', validationErrors.defaultHoursPerDay && 'border-destructive')}
                  />
                  {validationErrors.defaultHoursPerDay && (
                    <p className="text-xs text-destructive">Required</p>
                  )}
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
        {/* Quick Settings Panel - Expandable */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-300 ease-in-out',
            showMobileQuickSettings ? 'mb-3 max-h-48 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className={cn(
            'rounded-lg border bg-card p-3',
            (validationErrors.hourlyRate || validationErrors.defaultHoursPerDay) && 'border-destructive'
          )}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className={cn('text-xs', validationErrors.hourlyRate ? 'text-destructive' : 'text-muted-foreground')}>
                  Hourly Rate *
                </Label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {currencySymbol}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={currentInvoice.hourlyRate || ''}
                    onChange={(e) => {
                      setHourlyRate(parseFloat(e.target.value) || 0)
                      if (parseFloat(e.target.value) > 0) {
                        setValidationErrors(prev => ({ ...prev, hourlyRate: false }))
                      }
                    }}
                    className={cn('h-9 pl-6', validationErrors.hourlyRate && 'border-destructive')}
                    placeholder="0.00"
                    inputMode="decimal"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className={cn('text-xs', validationErrors.defaultHoursPerDay ? 'text-destructive' : 'text-muted-foreground')}>
                  Hours/Day *
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={24}
                  step={0.5}
                  value={scheduleConfig.defaultHoursPerDay}
                  onChange={(e) => {
                    updateScheduleConfig({ defaultHoursPerDay: parseFloat(e.target.value) || 8 })
                    if (parseFloat(e.target.value) > 0) {
                      setValidationErrors(prev => ({ ...prev, defaultHoursPerDay: false }))
                    }
                  }}
                  className={cn('h-9', validationErrors.defaultHoursPerDay && 'border-destructive')}
                  inputMode="decimal"
                />
              </div>
            </div>
            {(validationErrors.hourlyRate || validationErrors.defaultHoursPerDay) && (
              <p className="mt-2 text-xs text-destructive">Please fill in required fields</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          {/* Left side: Quick Settings toggle + Summary */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleMobileQuickSettings}
              className={cn(
                'h-8 gap-1 px-2',
                showMobileQuickSettings && 'bg-accent'
              )}
              aria-expanded={showMobileQuickSettings}
              aria-label={showMobileQuickSettings ? 'Hide quick settings' : 'Show quick settings'}
            >
              <DollarSign className="h-3.5 w-3.5" />
              <ChevronUp
                className={cn(
                  'h-3 w-3 transition-transform duration-200',
                  !showMobileQuickSettings && 'rotate-180'
                )}
              />
            </Button>
            {/* Summary info - compact, tappable to show full summary */}
            <button
              type="button"
              onClick={openMobileSummary}
              className="flex items-center gap-2 rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-accent active:bg-accent"
              aria-label="View full summary"
            >
              <span>
                <span className="text-muted-foreground">{totalDays}d</span>
                <span className="mx-0.5 text-muted-foreground">/</span>
                <span className="font-semibold">{currencySymbol}{(currentInvoice.totalAmount || subtotal).toFixed(0)}</span>
              </span>
            </button>
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={handleReset} className="h-8 w-8 p-0">
              <RotateCcw className="h-4 w-4" />
              <span className="sr-only">Reset</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveToCloud}
              disabled={isSavingToCloud}
              className="h-8 w-8 p-0"
            >
              {isSavingToCloud ? (
                <CloudOff className="h-4 w-4 animate-pulse" />
              ) : (
                <Cloud className="h-4 w-4" />
              )}
              <span className="sr-only">Save to cloud</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handlePreview} className="h-8 w-8 p-0">
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

      {/* Mobile Summary Sheet */}
      <Sheet open={showMobileSummary} onOpenChange={setShowMobileSummary}>
        <SheetContent side="bottom" className="max-h-[70vh] rounded-t-xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-lg">Invoice Summary</SheetTitle>
            <SheetDescription className="text-xs">
              {selectedPeriod?.label}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4">
            {/* Work Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border bg-card p-3 text-center">
                <div className="text-2xl font-bold">{totalDays}</div>
                <div className="text-xs text-muted-foreground">Working Days</div>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <div className="text-2xl font-bold">{totalHours.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Total Hours</div>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="rounded-lg border bg-card p-3">
              <h4 className="mb-2 text-sm font-semibold">Breakdown</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hourly Rate</span>
                  <span>{currencySymbol}{currentInvoice.hourlyRate?.toFixed(2) || '0.00'}/hr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hours × Rate</span>
                  <span>{currencySymbol}{subtotal.toFixed(2)}</span>
                </div>
                {(currentInvoice.lineItems?.length ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Line Items ({currentInvoice.lineItems?.length})</span>
                    <span>
                      {currencySymbol}
                      {(currentInvoice.lineItems?.reduce((sum, item) => sum + item.amount, 0) || 0).toFixed(2)}
                    </span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-lg">{currencySymbol}{(currentInvoice.totalAmount || subtotal).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={closeMobileSummaryAndOpenSettings}
              >
                <Settings className="mr-2 h-4 w-4" />
                All Settings
              </Button>
              <Button
                className="flex-1"
                onClick={closeMobileSummaryAndPreview}
              >
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

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
        <DialogContent className="flex h-[95vh] w-[95vw] max-w-[95vw] flex-col sm:h-[90vh] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl">
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
