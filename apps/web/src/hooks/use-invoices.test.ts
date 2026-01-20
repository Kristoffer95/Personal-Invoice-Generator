import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Use vi.hoisted to ensure the mock object is created before vi.mock is hoisted
const mockState = vi.hoisted(() => ({
  queryReturns: {} as Record<string, unknown>
}))

// Mock convex/react
vi.mock('convex/react', () => ({
  useQuery: (query: string, args?: unknown) => {
    if (args === 'skip') return undefined
    return mockState.queryReturns[query]
  },
  useMutation: () => vi.fn(),
}))

// Mock the API import
vi.mock('@invoice-generator/backend/convex/_generated/api', () => ({
  api: {
    invoices: {
      listInvoices: 'invoices:listInvoices',
      listRecent: 'invoices:listRecent',
      getInvoice: 'invoices:getInvoice',
      getUnfiled: 'invoices:getUnfiled',
      createInvoice: 'invoices:createInvoice',
      updateInvoice: 'invoices:updateInvoice',
      removeInvoice: 'invoices:removeInvoice',
      duplicateInvoice: 'invoices:duplicateInvoice',
      moveToFolder: 'invoices:moveToFolder',
      updateStatus: 'invoices:updateStatus',
    },
  },
}))

// Import after mocks
import { useInvoices, useRecentInvoices, useInvoice, useUnfiledInvoices, useInvoiceMutations } from './use-invoices'

describe('useInvoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.queryReturns = {}
  })

  describe('loading state', () => {
    it('should return loading state when query is undefined', () => {
      mockState.queryReturns['invoices:listInvoices'] = undefined

      const { result } = renderHook(() => useInvoices())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.invoices).toEqual([])
    })
  })

  describe('with invoice data', () => {
    it('should return invoices list', () => {
      const mockInvoices = [
        {
          _id: 'invoice_1',
          invoiceNumber: 'INV-001',
          status: 'DRAFT',
          totalAmount: 1000,
          currency: 'USD',
          issueDate: '2024-01-15',
          to: { name: 'Client A' },
        },
        {
          _id: 'invoice_2',
          invoiceNumber: 'INV-002',
          status: 'PAID',
          totalAmount: 2500,
          currency: 'USD',
          issueDate: '2024-01-20',
          to: { name: 'Client B' },
        },
      ]
      mockState.queryReturns['invoices:listInvoices'] = mockInvoices

      const { result } = renderHook(() => useInvoices())

      expect(result.current.isLoading).toBe(false)
      expect(result.current.invoices).toHaveLength(2)
      expect(result.current.invoices[0].invoiceNumber).toBe('INV-001')
      expect(result.current.invoices[1].status).toBe('PAID')
    })

    it('should filter by folder ID', () => {
      const mockInvoices = [
        { _id: 'invoice_1', invoiceNumber: 'INV-001', folderId: 'folder_1' },
      ]
      mockState.queryReturns['invoices:listInvoices'] = mockInvoices

      const { result } = renderHook(() =>
        useInvoices({ folderId: 'folder_1' as any })
      )

      expect(result.current.invoices).toHaveLength(1)
    })

    it('should filter by status', () => {
      const mockInvoices = [
        { _id: 'invoice_1', invoiceNumber: 'INV-001', status: 'DRAFT' },
      ]
      mockState.queryReturns['invoices:listInvoices'] = mockInvoices

      const { result } = renderHook(() => useInvoices({ status: 'DRAFT' }))

      expect(result.current.invoices).toHaveLength(1)
      expect(result.current.invoices[0].status).toBe('DRAFT')
    })
  })
})

describe('useRecentInvoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.queryReturns = {}
  })

  it('should return recent invoices', () => {
    const mockInvoices = [
      { _id: 'invoice_1', invoiceNumber: 'INV-003', createdAt: Date.now() },
      { _id: 'invoice_2', invoiceNumber: 'INV-002', createdAt: Date.now() - 1000 },
    ]
    mockState.queryReturns['invoices:listRecent'] = mockInvoices

    const { result } = renderHook(() => useRecentInvoices(5))

    expect(result.current.isLoading).toBe(false)
    expect(result.current.invoices).toHaveLength(2)
  })
})

describe('useInvoice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.queryReturns = {}
  })

  it('should return null when invoiceId is undefined', () => {
    mockState.queryReturns['invoices:getInvoice'] = undefined

    const { result } = renderHook(() => useInvoice(undefined))

    expect(result.current.invoice).toBeNull()
    expect(result.current.isLoading).toBe(true)
  })

  it('should return invoice when found', () => {
    const mockInvoice = {
      _id: 'invoice_1',
      invoiceNumber: 'INV-001',
      status: 'DRAFT',
      totalAmount: 1000,
      from: { name: 'My Company' },
      to: { name: 'Client A' },
    }
    mockState.queryReturns['invoices:getInvoice'] = mockInvoice

    const { result } = renderHook(() => useInvoice('invoice_1' as any))

    expect(result.current.invoice).toEqual(mockInvoice)
    expect(result.current.isLoading).toBe(false)
  })
})

describe('useUnfiledInvoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.queryReturns = {}
  })

  it('should return unfiled invoices', () => {
    const mockInvoices = [
      { _id: 'invoice_1', invoiceNumber: 'INV-001', folderId: undefined },
    ]
    mockState.queryReturns['invoices:getUnfiled'] = mockInvoices

    const { result } = renderHook(() => useUnfiledInvoices())

    expect(result.current.isLoading).toBe(false)
    expect(result.current.invoices).toHaveLength(1)
  })
})

describe('useInvoiceMutations', () => {
  it('should return all mutation functions', () => {
    const { result } = renderHook(() => useInvoiceMutations())

    expect(result.current.createInvoice).toBeDefined()
    expect(result.current.updateInvoice).toBeDefined()
    expect(result.current.deleteInvoice).toBeDefined()
    expect(result.current.duplicateInvoice).toBeDefined()
    expect(result.current.moveToFolder).toBeDefined()
    expect(result.current.updateStatus).toBeDefined()
  })
})
