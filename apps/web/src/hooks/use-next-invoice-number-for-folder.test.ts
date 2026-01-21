import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Use vi.hoisted to ensure the mock object is created before vi.mock is hoisted
const mockState = vi.hoisted(() => ({
  queryReturns: {} as Record<string, unknown>
}))

// Mock convex/react
vi.mock('convex/react', () => ({
  useQuery: (query: string, args?: unknown) => {
    // Return the mock value regardless of args for simplicity
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
      getArchivedInvoices: 'invoices:getArchivedInvoices',
      archiveInvoice: 'invoices:archiveInvoice',
      unarchiveInvoice: 'invoices:unarchiveInvoice',
      bulkArchiveInvoices: 'invoices:bulkArchiveInvoices',
      bulkDeleteInvoices: 'invoices:bulkDeleteInvoices',
      bulkUpdateStatus: 'invoices:bulkUpdateStatus',
      toggleMoveLock: 'invoices:toggleMoveLock',
      bulkMoveToFolder: 'invoices:bulkMoveToFolder',
      quickCreateInvoice: 'invoices:quickCreateInvoice',
      getNextBillingPeriod: 'invoices:getNextBillingPeriod',
      getNextInvoiceNumberForFolder: 'invoices:getNextInvoiceNumberForFolder',
    },
  },
}))

// Import after mocks
import { useNextInvoiceNumberForFolder } from './use-invoices'

describe('useNextInvoiceNumberForFolder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear all mock returns
    mockState.queryReturns = {}
  })

  describe('loading state', () => {
    it('should return loading state when query is undefined', () => {
      mockState.queryReturns['invoices:getNextInvoiceNumberForFolder'] = undefined

      const { result } = renderHook(() => useNextInvoiceNumberForFolder(undefined))

      expect(result.current.isLoading).toBe(true)
      expect(result.current.number).toBe(1)
      expect(result.current.formatted).toBe('001')
    })
  })

  describe('with invoice number data', () => {
    it('should return formatted invoice number without prefix for first invoice', () => {
      mockState.queryReturns['invoices:getNextInvoiceNumberForFolder'] = {
        number: 1,
        formatted: '001',
      }

      const { result } = renderHook(() => useNextInvoiceNumberForFolder('folder_123' as any))

      expect(result.current.isLoading).toBe(false)
      expect(result.current.number).toBe(1)
      expect(result.current.formatted).toBe('001')
    })

    it('should return incremented invoice number based on folder invoices', () => {
      mockState.queryReturns['invoices:getNextInvoiceNumberForFolder'] = {
        number: 10,
        formatted: 'INV-010',
      }

      const { result } = renderHook(() => useNextInvoiceNumberForFolder('folder_456' as any))

      expect(result.current.isLoading).toBe(false)
      expect(result.current.number).toBe(10)
      expect(result.current.formatted).toBe('INV-010')
    })

    it('should handle unfiled invoices (undefined folderId)', () => {
      mockState.queryReturns['invoices:getNextInvoiceNumberForFolder'] = {
        number: 5,
        formatted: '005',
      }

      const { result } = renderHook(() => useNextInvoiceNumberForFolder(undefined))

      expect(result.current.isLoading).toBe(false)
      expect(result.current.number).toBe(5)
      expect(result.current.formatted).toBe('005')
    })

    it('should return formatted invoice number with prefix', () => {
      mockState.queryReturns['invoices:getNextInvoiceNumberForFolder'] = {
        number: 42,
        formatted: 'INV-042',
      }

      const { result } = renderHook(() => useNextInvoiceNumberForFolder('folder_789' as any))

      expect(result.current.number).toBe(42)
      expect(result.current.formatted).toBe('INV-042')
    })
  })
})
