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
      getArchivedInvoices: 'invoices:getArchivedInvoices',
      createInvoice: 'invoices:createInvoice',
      updateInvoice: 'invoices:updateInvoice',
      removeInvoice: 'invoices:removeInvoice',
      duplicateInvoice: 'invoices:duplicateInvoice',
      moveToFolder: 'invoices:moveToFolder',
      updateStatus: 'invoices:updateStatus',
      archiveInvoice: 'invoices:archiveInvoice',
      unarchiveInvoice: 'invoices:unarchiveInvoice',
      bulkArchiveInvoices: 'invoices:bulkArchiveInvoices',
      bulkUpdateStatus: 'invoices:bulkUpdateStatus',
    },
  },
}))

// Import after mocks
import { useInvoices, useRecentInvoices, useInvoice, useUnfiledInvoices, useArchivedInvoices, useInvoiceMutations } from './use-invoices'

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

describe('useArchivedInvoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.queryReturns = {}
  })

  it('should return archived invoices', () => {
    const mockInvoices = [
      { _id: 'invoice_1', invoiceNumber: 'INV-001', isArchived: true, archivedAt: '2024-01-15' },
      { _id: 'invoice_2', invoiceNumber: 'INV-002', isArchived: true, archivedAt: '2024-01-16' },
    ]
    mockState.queryReturns['invoices:getArchivedInvoices'] = mockInvoices

    const { result } = renderHook(() => useArchivedInvoices())

    expect(result.current.isLoading).toBe(false)
    expect(result.current.invoices).toHaveLength(2)
  })

  it('should return empty array when loading', () => {
    mockState.queryReturns['invoices:getArchivedInvoices'] = undefined

    const { result } = renderHook(() => useArchivedInvoices())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.invoices).toEqual([])
  })
})

describe('useInvoices - new filtering options', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.queryReturns = {}
  })

  it('should filter by multiple statuses', () => {
    const mockInvoices = [
      { _id: 'invoice_1', invoiceNumber: 'INV-001', status: 'TO_SEND' },
      { _id: 'invoice_2', invoiceNumber: 'INV-002', status: 'SENT' },
    ]
    mockState.queryReturns['invoices:listInvoices'] = mockInvoices

    const { result } = renderHook(() =>
      useInvoices({ statuses: ['TO_SEND', 'SENT'] })
    )

    expect(result.current.invoices).toHaveLength(2)
  })

  it('should filter by archived status', () => {
    const mockInvoices = [
      { _id: 'invoice_1', invoiceNumber: 'INV-001', isArchived: false },
    ]
    mockState.queryReturns['invoices:listInvoices'] = mockInvoices

    const { result } = renderHook(() => useInvoices({ isArchived: false }))

    expect(result.current.invoices).toHaveLength(1)
  })

  it('should filter by tags', () => {
    const mockInvoices = [
      { _id: 'invoice_1', invoiceNumber: 'INV-001', tags: ['tag1', 'tag2'] },
    ]
    mockState.queryReturns['invoices:listInvoices'] = mockInvoices

    const { result } = renderHook(() =>
      useInvoices({ tags: ['tag1' as any] })
    )

    expect(result.current.invoices).toHaveLength(1)
  })

  it('should filter by date range', () => {
    const mockInvoices = [
      { _id: 'invoice_1', invoiceNumber: 'INV-001', issueDate: '2024-06-15' },
    ]
    mockState.queryReturns['invoices:listInvoices'] = mockInvoices

    const { result } = renderHook(() =>
      useInvoices({ dateFrom: '2024-01-01', dateTo: '2024-12-31' })
    )

    expect(result.current.invoices).toHaveLength(1)
  })

  it('should filter by amount range', () => {
    const mockInvoices = [
      { _id: 'invoice_1', invoiceNumber: 'INV-001', totalAmount: 5000 },
    ]
    mockState.queryReturns['invoices:listInvoices'] = mockInvoices

    const { result } = renderHook(() =>
      useInvoices({ amountMin: 1000, amountMax: 10000 })
    )

    expect(result.current.invoices).toHaveLength(1)
  })

  it('should filter by search query', () => {
    const mockInvoices = [
      { _id: 'invoice_1', invoiceNumber: 'INV-001', to: { name: 'Test Client' } },
    ]
    mockState.queryReturns['invoices:listInvoices'] = mockInvoices

    const { result } = renderHook(() =>
      useInvoices({ searchQuery: 'Test' })
    )

    expect(result.current.invoices).toHaveLength(1)
  })
})

describe('useInvoiceMutations', () => {
  it('should return all mutation functions including new ones', () => {
    const { result } = renderHook(() => useInvoiceMutations())

    expect(result.current.createInvoice).toBeDefined()
    expect(result.current.updateInvoice).toBeDefined()
    expect(result.current.deleteInvoice).toBeDefined()
    expect(result.current.duplicateInvoice).toBeDefined()
    expect(result.current.moveToFolder).toBeDefined()
    expect(result.current.updateStatus).toBeDefined()
    // New mutation functions
    expect(result.current.archiveInvoice).toBeDefined()
    expect(result.current.unarchiveInvoice).toBeDefined()
    expect(result.current.bulkArchiveInvoices).toBeDefined()
    expect(result.current.bulkUpdateStatus).toBeDefined()
  })
})
