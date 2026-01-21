import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Invoice,
  DailyWorkHours,
  LineItem,
  ScheduleConfig,
  BackgroundDesign,
  PageSizeKey,
  Currency,
  PaymentTerms,
  PartyInfo,
  BankDetails,
} from '@invoice-generator/shared-types'
import { calculateInvoiceTotals } from '@invoice-generator/shared-types'

interface InvoiceState {
  // Current invoice being edited
  currentInvoice: Partial<Invoice>

  // Schedule settings (persisted separately for reuse)
  scheduleConfig: ScheduleConfig

  // Available background designs
  backgroundDesigns: BackgroundDesign[]

  // Saved invoices
  savedInvoices: Invoice[]

  // Saved company profiles for quick fill
  savedFromProfiles: PartyInfo[]
  savedToProfiles: PartyInfo[]

  // Actions
  setCurrentInvoice: (invoice: Partial<Invoice>) => void
  updateCurrentInvoice: (updates: Partial<Invoice>) => void
  resetCurrentInvoice: () => void

  // Party info actions
  updateFromInfo: (info: Partial<PartyInfo>) => void
  updateToInfo: (info: Partial<PartyInfo>) => void
  updateBankDetails: (details: Partial<BankDetails>) => void

  // Work hours actions
  setDailyWorkHours: (hours: DailyWorkHours[]) => void
  updateDayHours: (date: string, hours: number, notes?: string) => void
  toggleWorkday: (date: string) => void
  setDefaultHoursForPeriod: (startDate: string, endDate: string, defaultHours: number) => void

  // Line items actions
  addLineItem: (item: Omit<LineItem, 'id' | 'amount'>) => void
  updateLineItem: (id: string, updates: Partial<LineItem>) => void
  removeLineItem: (id: string) => void

  // Design actions
  setPageSize: (size: PageSizeKey) => void
  setBackgroundDesign: (designId: string | undefined) => void

  // Financial settings
  setHourlyRate: (rate: number) => void
  setCurrency: (currency: Currency) => void
  setPaymentTerms: (terms: PaymentTerms) => void
  setDiscountPercent: (percent: number) => void
  setTaxPercent: (percent: number) => void

  // Schedule actions
  updateScheduleConfig: (config: Partial<ScheduleConfig>) => void

  // Save/Load actions
  saveInvoice: () => Invoice | null
  loadInvoice: (id: string) => void
  deleteInvoice: (id: string) => void

  // Profile actions
  saveFromProfile: (profile: PartyInfo) => void
  saveToProfile: (profile: PartyInfo) => void
  loadFromProfile: (index: number) => void
  loadToProfile: (index: number) => void

  // Recalculate totals
  recalculateTotals: () => void
}

const defaultPartyInfo: PartyInfo = {
  name: '',
  address: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  email: '',
  phone: '',
  taxId: '',
}

const defaultInvoice: Partial<Invoice> = {
  invoiceNumber: '',
  status: 'DRAFT',
  statusHistory: [],
  issueDate: new Date().toISOString().split('T')[0],
  from: { ...defaultPartyInfo },
  to: { ...defaultPartyInfo },
  hourlyRate: 0,
  defaultHoursPerDay: 8,
  dailyWorkHours: [],
  lineItems: [],
  totalDays: 0,
  totalHours: 0,
  subtotal: 0,
  discountPercent: 0,
  discountAmount: 0,
  taxPercent: 0,
  taxAmount: 0,
  totalAmount: 0,
  currency: 'USD',
  paymentTerms: 'NET_30',
  pageSize: 'A4',
  notes: '',
  terms: '',
  jobTitle: '',
  tags: [],
  isArchived: false,
  showDetailedHours: false,
  pdfTheme: 'light',
}

const defaultScheduleConfig: ScheduleConfig = {
  frequency: 'BOTH_15TH_AND_LAST',
  workdayType: 'WEEKDAYS_ONLY',
  defaultHoursPerDay: 8,
}

const defaultBackgroundDesigns: BackgroundDesign[] = [
  { id: 'minimal', name: 'Minimal', backgroundColor: '#ffffff' },
  { id: 'professional', name: 'Professional Blue', accentColor: '#1a1a2e', borderColor: '#0f3460' },
  { id: 'modern', name: 'Modern Gray', backgroundColor: '#f8fafc', accentColor: '#334155' },
  { id: 'elegant', name: 'Elegant', backgroundColor: '#faf5ff', accentColor: '#6b21a8' },
  { id: 'corporate', name: 'Corporate', backgroundColor: '#f0f9ff', accentColor: '#0369a1' },
]

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export const useInvoiceStore = create<InvoiceState>()(
  persist(
    (set, get) => ({
      currentInvoice: { ...defaultInvoice },
      scheduleConfig: { ...defaultScheduleConfig },
      backgroundDesigns: defaultBackgroundDesigns,
      savedInvoices: [],
      savedFromProfiles: [],
      savedToProfiles: [],

      setCurrentInvoice: (invoice) => set({ currentInvoice: invoice }),

      updateCurrentInvoice: (updates) =>
        set((state) => ({
          currentInvoice: { ...state.currentInvoice, ...updates },
        })),

      resetCurrentInvoice: () =>
        set({
          currentInvoice: {
            ...defaultInvoice,
            invoiceNumber: `INV-${Date.now()}`,
            issueDate: new Date().toISOString().split('T')[0],
          },
        }),

      updateFromInfo: (info) =>
        set((state) => ({
          currentInvoice: {
            ...state.currentInvoice,
            from: { ...state.currentInvoice.from, ...info } as PartyInfo,
          },
        })),

      updateToInfo: (info) =>
        set((state) => ({
          currentInvoice: {
            ...state.currentInvoice,
            to: { ...state.currentInvoice.to, ...info } as PartyInfo,
          },
        })),

      updateBankDetails: (details) =>
        set((state) => ({
          currentInvoice: {
            ...state.currentInvoice,
            bankDetails: { ...state.currentInvoice.bankDetails, ...details },
          },
        })),

      setDailyWorkHours: (hours) =>
        set((state) => {
          const updatedInvoice = { ...state.currentInvoice, dailyWorkHours: hours }
          const totals = calculateInvoiceTotals(updatedInvoice)
          return { currentInvoice: { ...updatedInvoice, ...totals } }
        }),

      updateDayHours: (date, hours, notes) =>
        set((state) => {
          const existing = state.currentInvoice.dailyWorkHours || []
          const existingIndex = existing.findIndex((d) => d.date === date)
          let updated: DailyWorkHours[]

          if (existingIndex >= 0) {
            updated = existing.map((d, i) =>
              i === existingIndex ? { ...d, hours, notes: notes ?? d.notes } : d
            )
          } else {
            updated = [...existing, { date, hours, isWorkday: true, notes }]
          }

          const updatedInvoice = { ...state.currentInvoice, dailyWorkHours: updated }
          const totals = calculateInvoiceTotals(updatedInvoice)
          return { currentInvoice: { ...updatedInvoice, ...totals } }
        }),

      toggleWorkday: (date) =>
        set((state) => {
          const existing = state.currentInvoice.dailyWorkHours || []
          const updated = existing.map((d) =>
            d.date === date ? { ...d, isWorkday: !d.isWorkday } : d
          )
          const updatedInvoice = { ...state.currentInvoice, dailyWorkHours: updated }
          const totals = calculateInvoiceTotals(updatedInvoice)
          return { currentInvoice: { ...updatedInvoice, ...totals } }
        }),

      setDefaultHoursForPeriod: (startDate, endDate, defaultHours) =>
        set((state) => {
          const start = new Date(startDate)
          const end = new Date(endDate)
          const days: DailyWorkHours[] = []

          const current = new Date(start)
          while (current <= end) {
            const dateStr = current.toISOString().split('T')[0]
            const dayOfWeek = current.getDay()
            const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5

            const existing = state.currentInvoice.dailyWorkHours?.find(
              (d) => d.date === dateStr
            )

            days.push({
              date: dateStr,
              hours: existing?.hours ?? (isWeekday ? defaultHours : 0),
              isWorkday: existing?.isWorkday ?? isWeekday,
              notes: existing?.notes,
            })

            current.setDate(current.getDate() + 1)
          }

          const updatedInvoice = { ...state.currentInvoice, dailyWorkHours: days }
          const totals = calculateInvoiceTotals(updatedInvoice)
          return { currentInvoice: { ...updatedInvoice, ...totals } }
        }),

      addLineItem: (item) =>
        set((state) => {
          const newItem: LineItem = {
            id: generateId(),
            ...item,
            amount: item.quantity * item.unitPrice,
          }
          const updated = [...(state.currentInvoice.lineItems || []), newItem]
          const updatedInvoice = { ...state.currentInvoice, lineItems: updated }
          const totals = calculateInvoiceTotals(updatedInvoice)
          return { currentInvoice: { ...updatedInvoice, ...totals } }
        }),

      updateLineItem: (id, updates) =>
        set((state) => {
          const updated = (state.currentInvoice.lineItems || []).map((item) => {
            if (item.id !== id) return item
            const newItem = { ...item, ...updates }
            newItem.amount = newItem.quantity * newItem.unitPrice
            return newItem
          })
          const updatedInvoice = { ...state.currentInvoice, lineItems: updated }
          const totals = calculateInvoiceTotals(updatedInvoice)
          return { currentInvoice: { ...updatedInvoice, ...totals } }
        }),

      removeLineItem: (id) =>
        set((state) => {
          const updated = (state.currentInvoice.lineItems || []).filter(
            (item) => item.id !== id
          )
          const updatedInvoice = { ...state.currentInvoice, lineItems: updated }
          const totals = calculateInvoiceTotals(updatedInvoice)
          return { currentInvoice: { ...updatedInvoice, ...totals } }
        }),

      setPageSize: (size) =>
        set((state) => ({
          currentInvoice: { ...state.currentInvoice, pageSize: size },
        })),

      setBackgroundDesign: (designId) =>
        set((state) => ({
          currentInvoice: { ...state.currentInvoice, backgroundDesignId: designId },
        })),

      setHourlyRate: (rate) =>
        set((state) => {
          const updatedInvoice = { ...state.currentInvoice, hourlyRate: rate }
          const totals = calculateInvoiceTotals(updatedInvoice)
          return { currentInvoice: { ...updatedInvoice, ...totals } }
        }),

      setCurrency: (currency) =>
        set((state) => ({
          currentInvoice: { ...state.currentInvoice, currency },
        })),

      setPaymentTerms: (terms) =>
        set((state) => ({
          currentInvoice: { ...state.currentInvoice, paymentTerms: terms },
        })),

      setDiscountPercent: (percent) =>
        set((state) => {
          const updatedInvoice = { ...state.currentInvoice, discountPercent: percent }
          const totals = calculateInvoiceTotals(updatedInvoice)
          return { currentInvoice: { ...updatedInvoice, ...totals } }
        }),

      setTaxPercent: (percent) =>
        set((state) => {
          const updatedInvoice = { ...state.currentInvoice, taxPercent: percent }
          const totals = calculateInvoiceTotals(updatedInvoice)
          return { currentInvoice: { ...updatedInvoice, ...totals } }
        }),

      updateScheduleConfig: (config) =>
        set((state) => ({
          scheduleConfig: { ...state.scheduleConfig, ...config },
        })),

      saveInvoice: () => {
        const state = get()
        const current = state.currentInvoice

        if (!current.invoiceNumber || !current.from?.name || !current.to?.name) {
          return null
        }

        const now = new Date().toISOString()
        const invoice: Invoice = {
          id: current.id || generateId(),
          invoiceNumber: current.invoiceNumber,
          status: current.status || 'DRAFT',
          statusHistory: current.statusHistory || [],
          issueDate: current.issueDate || now.split('T')[0],
          dueDate: current.dueDate,
          periodStart: current.periodStart,
          periodEnd: current.periodEnd,
          sentAt: current.sentAt,
          paidAt: current.paidAt,
          viewedAt: current.viewedAt,
          from: current.from as PartyInfo,
          to: current.to as PartyInfo,
          hourlyRate: current.hourlyRate || 0,
          defaultHoursPerDay: current.defaultHoursPerDay || 8,
          dailyWorkHours: current.dailyWorkHours || [],
          totalDays: current.totalDays || 0,
          totalHours: current.totalHours || 0,
          subtotal: current.subtotal || 0,
          lineItems: current.lineItems || [],
          discountPercent: current.discountPercent || 0,
          discountAmount: current.discountAmount || 0,
          taxPercent: current.taxPercent || 0,
          taxAmount: current.taxAmount || 0,
          totalAmount: current.totalAmount || 0,
          currency: current.currency || 'USD',
          paymentTerms: current.paymentTerms || 'NET_30',
          customPaymentTerms: current.customPaymentTerms,
          bankDetails: current.bankDetails,
          notes: current.notes,
          terms: current.terms,
          jobTitle: current.jobTitle,
          tags: current.tags || [],
          isArchived: current.isArchived || false,
          archivedAt: current.archivedAt,
          showDetailedHours: current.showDetailedHours || false,
          pdfTheme: current.pdfTheme || 'light',
          backgroundDesignId: current.backgroundDesignId,
          pageSize: current.pageSize || 'A4',
          createdAt: current.createdAt || now,
          updatedAt: now,
        }

        set((state) => {
          const existing = state.savedInvoices.findIndex((i) => i.id === invoice.id)
          const updated =
            existing >= 0
              ? state.savedInvoices.map((i, idx) => (idx === existing ? invoice : i))
              : [...state.savedInvoices, invoice]
          return {
            savedInvoices: updated,
            currentInvoice: invoice,
          }
        })

        return invoice
      },

      loadInvoice: (id) =>
        set((state) => {
          const invoice = state.savedInvoices.find((i) => i.id === id)
          if (invoice) {
            return { currentInvoice: { ...invoice } }
          }
          return state
        }),

      deleteInvoice: (id) =>
        set((state) => ({
          savedInvoices: state.savedInvoices.filter((i) => i.id !== id),
        })),

      saveFromProfile: (profile) =>
        set((state) => ({
          savedFromProfiles: [...state.savedFromProfiles, profile],
        })),

      saveToProfile: (profile) =>
        set((state) => ({
          savedToProfiles: [...state.savedToProfiles, profile],
        })),

      loadFromProfile: (index) =>
        set((state) => {
          const profile = state.savedFromProfiles[index]
          if (profile) {
            return {
              currentInvoice: { ...state.currentInvoice, from: profile },
            }
          }
          return state
        }),

      loadToProfile: (index) =>
        set((state) => {
          const profile = state.savedToProfiles[index]
          if (profile) {
            return {
              currentInvoice: { ...state.currentInvoice, to: profile },
            }
          }
          return state
        }),

      recalculateTotals: () =>
        set((state) => {
          const totals = calculateInvoiceTotals(state.currentInvoice)
          return { currentInvoice: { ...state.currentInvoice, ...totals } }
        }),
    }),
    {
      name: 'invoice-storage',
      partialize: (state) => ({
        savedInvoices: state.savedInvoices,
        savedFromProfiles: state.savedFromProfiles,
        savedToProfiles: state.savedToProfiles,
        scheduleConfig: state.scheduleConfig,
      }),
    }
  )
)
