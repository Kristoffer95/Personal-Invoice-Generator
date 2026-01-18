import { describe, it, expect, beforeEach } from 'vitest'
import { useInvoiceStore } from './store'

describe('useInvoiceStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useInvoiceStore.setState({
      currentInvoice: {
        invoiceNumber: '',
        status: 'DRAFT',
        issueDate: new Date().toISOString().split('T')[0],
        from: {
          name: '',
          address: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
          email: '',
          phone: '',
          taxId: '',
        },
        to: {
          name: '',
          address: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
          email: '',
          phone: '',
          taxId: '',
        },
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
        showDetailedHours: false,
      },
      savedInvoices: [],
      savedFromProfiles: [],
      savedToProfiles: [],
    })
  })

  describe('updateCurrentInvoice', () => {
    it('updates invoice number', () => {
      const { updateCurrentInvoice } = useInvoiceStore.getState()

      updateCurrentInvoice({ invoiceNumber: 'INV-001' })

      expect(useInvoiceStore.getState().currentInvoice.invoiceNumber).toBe('INV-001')
    })

    it('updates multiple fields at once', () => {
      const { updateCurrentInvoice } = useInvoiceStore.getState()

      updateCurrentInvoice({
        invoiceNumber: 'INV-002',
        notes: 'Test notes',
      })

      const state = useInvoiceStore.getState()
      expect(state.currentInvoice.invoiceNumber).toBe('INV-002')
      expect(state.currentInvoice.notes).toBe('Test notes')
    })
  })

  describe('updateFromInfo', () => {
    it('updates from party info', () => {
      const { updateFromInfo } = useInvoiceStore.getState()

      updateFromInfo({ name: 'My Company', email: 'test@example.com' })

      const state = useInvoiceStore.getState()
      expect(state.currentInvoice.from?.name).toBe('My Company')
      expect(state.currentInvoice.from?.email).toBe('test@example.com')
    })
  })

  describe('updateToInfo', () => {
    it('updates to party info', () => {
      const { updateToInfo } = useInvoiceStore.getState()

      updateToInfo({ name: 'Client Company', city: 'New York' })

      const state = useInvoiceStore.getState()
      expect(state.currentInvoice.to?.name).toBe('Client Company')
      expect(state.currentInvoice.to?.city).toBe('New York')
    })
  })

  describe('setHourlyRate', () => {
    it('updates hourly rate and recalculates totals', () => {
      const { updateDayHours, setHourlyRate } = useInvoiceStore.getState()

      // First add some work hours
      updateDayHours('2024-01-01', 8)

      // Then set hourly rate
      setHourlyRate(50)

      const state = useInvoiceStore.getState()
      expect(state.currentInvoice.hourlyRate).toBe(50)
      expect(state.currentInvoice.totalHours).toBe(8)
      expect(state.currentInvoice.subtotal).toBe(400) // 8 * 50
    })
  })

  describe('updateDayHours', () => {
    it('adds new day hours', () => {
      const { updateDayHours } = useInvoiceStore.getState()

      updateDayHours('2024-01-01', 8, 'Test work')

      const state = useInvoiceStore.getState()
      expect(state.currentInvoice.dailyWorkHours).toHaveLength(1)
      expect(state.currentInvoice.dailyWorkHours?.[0]).toEqual({
        date: '2024-01-01',
        hours: 8,
        isWorkday: true,
        notes: 'Test work',
      })
    })

    it('updates existing day hours', () => {
      const { updateDayHours } = useInvoiceStore.getState()

      updateDayHours('2024-01-01', 8)
      updateDayHours('2024-01-01', 6, 'Updated')

      const state = useInvoiceStore.getState()
      expect(state.currentInvoice.dailyWorkHours).toHaveLength(1)
      expect(state.currentInvoice.dailyWorkHours?.[0].hours).toBe(6)
      expect(state.currentInvoice.dailyWorkHours?.[0].notes).toBe('Updated')
    })

    it('recalculates totals when hours change', () => {
      const { updateDayHours, setHourlyRate } = useInvoiceStore.getState()

      setHourlyRate(100)
      updateDayHours('2024-01-01', 8)
      updateDayHours('2024-01-02', 6)

      const state = useInvoiceStore.getState()
      expect(state.currentInvoice.totalDays).toBe(2)
      expect(state.currentInvoice.totalHours).toBe(14)
      expect(state.currentInvoice.subtotal).toBe(1400)
    })
  })

  describe('toggleWorkday', () => {
    it('toggles workday status', () => {
      const { updateDayHours, toggleWorkday } = useInvoiceStore.getState()

      updateDayHours('2024-01-01', 8)
      toggleWorkday('2024-01-01')

      const state = useInvoiceStore.getState()
      expect(state.currentInvoice.dailyWorkHours?.[0].isWorkday).toBe(false)
    })

    it('excludes toggled off days from calculation', () => {
      const { updateDayHours, toggleWorkday, setHourlyRate } = useInvoiceStore.getState()

      setHourlyRate(100)
      updateDayHours('2024-01-01', 8)
      updateDayHours('2024-01-02', 8)
      toggleWorkday('2024-01-01')

      const state = useInvoiceStore.getState()
      expect(state.currentInvoice.totalDays).toBe(1)
      expect(state.currentInvoice.totalHours).toBe(8)
      expect(state.currentInvoice.subtotal).toBe(800)
    })
  })

  describe('setDefaultHoursForPeriod', () => {
    it('sets default hours for a date range', () => {
      const { setDefaultHoursForPeriod } = useInvoiceStore.getState()

      setDefaultHoursForPeriod('2024-01-01', '2024-01-03', 8)

      const state = useInvoiceStore.getState()
      expect(state.currentInvoice.dailyWorkHours).toHaveLength(3)
    })

    it('skips weekends when setting weekday hours', () => {
      const { setDefaultHoursForPeriod } = useInvoiceStore.getState()

      // Jan 6-7 2024 is Saturday-Sunday
      setDefaultHoursForPeriod('2024-01-05', '2024-01-08', 8)

      const state = useInvoiceStore.getState()
      const weekend = state.currentInvoice.dailyWorkHours?.filter(
        (d) => d.date === '2024-01-06' || d.date === '2024-01-07'
      )
      expect(weekend?.every((d) => d.hours === 0)).toBe(true)
      expect(weekend?.every((d) => d.isWorkday === false)).toBe(true)
    })
  })

  describe('addLineItem', () => {
    it('adds a line item with calculated amount', () => {
      const { addLineItem } = useInvoiceStore.getState()

      addLineItem({
        description: 'Test Item',
        quantity: 2,
        unitPrice: 50,
      })

      const state = useInvoiceStore.getState()
      expect(state.currentInvoice.lineItems).toHaveLength(1)
      expect(state.currentInvoice.lineItems?.[0].amount).toBe(100)
    })

    it('includes line items in subtotal', () => {
      const { addLineItem, setHourlyRate, updateDayHours } = useInvoiceStore.getState()

      setHourlyRate(100)
      updateDayHours('2024-01-01', 8)
      addLineItem({ description: 'Extra', quantity: 1, unitPrice: 200 })

      const state = useInvoiceStore.getState()
      expect(state.currentInvoice.subtotal).toBe(1000) // 800 + 200
    })
  })

  describe('updateLineItem', () => {
    it('updates line item and recalculates amount', () => {
      const { addLineItem, updateLineItem } = useInvoiceStore.getState()

      addLineItem({ description: 'Test', quantity: 1, unitPrice: 100 })

      const state1 = useInvoiceStore.getState()
      const itemId = state1.currentInvoice.lineItems?.[0].id || ''

      updateLineItem(itemId, { quantity: 3 })

      const state2 = useInvoiceStore.getState()
      expect(state2.currentInvoice.lineItems?.[0].quantity).toBe(3)
      expect(state2.currentInvoice.lineItems?.[0].amount).toBe(300)
    })
  })

  describe('removeLineItem', () => {
    it('removes a line item', () => {
      const { addLineItem, removeLineItem } = useInvoiceStore.getState()

      addLineItem({ description: 'Test 1', quantity: 1, unitPrice: 100 })
      addLineItem({ description: 'Test 2', quantity: 1, unitPrice: 200 })

      const state1 = useInvoiceStore.getState()
      const itemId = state1.currentInvoice.lineItems?.[0].id || ''

      removeLineItem(itemId)

      const state2 = useInvoiceStore.getState()
      expect(state2.currentInvoice.lineItems).toHaveLength(1)
      expect(state2.currentInvoice.lineItems?.[0].description).toBe('Test 2')
    })
  })

  describe('setDiscountPercent', () => {
    it('applies discount and recalculates total', () => {
      const { setHourlyRate, updateDayHours, setDiscountPercent } = useInvoiceStore.getState()

      setHourlyRate(100)
      updateDayHours('2024-01-01', 10)
      setDiscountPercent(20)

      const state = useInvoiceStore.getState()
      expect(state.currentInvoice.subtotal).toBe(1000)
      expect(state.currentInvoice.discountAmount).toBe(200)
      expect(state.currentInvoice.totalAmount).toBe(800)
    })
  })

  describe('setTaxPercent', () => {
    it('applies tax and recalculates total', () => {
      const { setHourlyRate, updateDayHours, setTaxPercent } = useInvoiceStore.getState()

      setHourlyRate(100)
      updateDayHours('2024-01-01', 10)
      setTaxPercent(10)

      const state = useInvoiceStore.getState()
      expect(state.currentInvoice.subtotal).toBe(1000)
      expect(state.currentInvoice.taxAmount).toBe(100)
      expect(state.currentInvoice.totalAmount).toBe(1100)
    })
  })

  describe('saveInvoice', () => {
    it('saves a complete invoice', () => {
      const { updateCurrentInvoice, updateFromInfo, updateToInfo, saveInvoice } =
        useInvoiceStore.getState()

      updateCurrentInvoice({ invoiceNumber: 'INV-001' })
      updateFromInfo({ name: 'My Company' })
      updateToInfo({ name: 'Client' })

      const saved = saveInvoice()

      expect(saved).not.toBeNull()
      expect(saved?.invoiceNumber).toBe('INV-001')

      const state = useInvoiceStore.getState()
      expect(state.savedInvoices).toHaveLength(1)
    })

    it('returns null if required fields are missing', () => {
      const { saveInvoice } = useInvoiceStore.getState()

      const saved = saveInvoice()

      expect(saved).toBeNull()
    })

    it('updates existing invoice', () => {
      const { updateCurrentInvoice, updateFromInfo, updateToInfo, saveInvoice } =
        useInvoiceStore.getState()

      updateCurrentInvoice({ invoiceNumber: 'INV-001' })
      updateFromInfo({ name: 'My Company' })
      updateToInfo({ name: 'Client' })

      saveInvoice()

      updateCurrentInvoice({ notes: 'Updated' })
      saveInvoice()

      const state = useInvoiceStore.getState()
      expect(state.savedInvoices).toHaveLength(1)
      expect(state.savedInvoices[0].notes).toBe('Updated')
    })
  })

  describe('loadInvoice', () => {
    it('loads a saved invoice', () => {
      const { updateCurrentInvoice, updateFromInfo, updateToInfo, saveInvoice, loadInvoice, resetCurrentInvoice } =
        useInvoiceStore.getState()

      updateCurrentInvoice({ invoiceNumber: 'INV-001', notes: 'Test' })
      updateFromInfo({ name: 'My Company' })
      updateToInfo({ name: 'Client' })

      const saved = saveInvoice()
      resetCurrentInvoice()
      loadInvoice(saved?.id || '')

      const state = useInvoiceStore.getState()
      expect(state.currentInvoice.invoiceNumber).toBe('INV-001')
      expect(state.currentInvoice.notes).toBe('Test')
    })
  })

  describe('deleteInvoice', () => {
    it('deletes a saved invoice', () => {
      const { updateCurrentInvoice, updateFromInfo, updateToInfo, saveInvoice, deleteInvoice } =
        useInvoiceStore.getState()

      updateCurrentInvoice({ invoiceNumber: 'INV-001' })
      updateFromInfo({ name: 'My Company' })
      updateToInfo({ name: 'Client' })

      const saved = saveInvoice()
      deleteInvoice(saved?.id || '')

      const state = useInvoiceStore.getState()
      expect(state.savedInvoices).toHaveLength(0)
    })
  })

  describe('resetCurrentInvoice', () => {
    it('resets the current invoice', () => {
      const { updateCurrentInvoice, updateFromInfo, resetCurrentInvoice } = useInvoiceStore.getState()

      updateCurrentInvoice({ invoiceNumber: 'INV-001', notes: 'Test' })
      updateFromInfo({ name: 'My Company' })

      resetCurrentInvoice()

      const state = useInvoiceStore.getState()
      expect(state.currentInvoice.notes).toBe('')
      expect(state.currentInvoice.from?.name).toBe('')
    })
  })

  describe('setPageSize', () => {
    it('updates page size', () => {
      const { setPageSize } = useInvoiceStore.getState()

      setPageSize('LETTER')

      const state = useInvoiceStore.getState()
      expect(state.currentInvoice.pageSize).toBe('LETTER')
    })
  })

  describe('setCurrency', () => {
    it('updates currency', () => {
      const { setCurrency } = useInvoiceStore.getState()

      setCurrency('EUR')

      const state = useInvoiceStore.getState()
      expect(state.currentInvoice.currency).toBe('EUR')
    })
  })

  describe('setBackgroundDesign', () => {
    it('updates background design', () => {
      const { setBackgroundDesign } = useInvoiceStore.getState()

      setBackgroundDesign('professional')

      const state = useInvoiceStore.getState()
      expect(state.currentInvoice.backgroundDesignId).toBe('professional')
    })

    it('clears background design when undefined', () => {
      const { setBackgroundDesign } = useInvoiceStore.getState()

      setBackgroundDesign('professional')
      setBackgroundDesign(undefined)

      const state = useInvoiceStore.getState()
      expect(state.currentInvoice.backgroundDesignId).toBeUndefined()
    })
  })
})
