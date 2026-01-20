import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock the Convex client
vi.mock('convex/react', async () => {
  const actual = await vi.importActual('convex/react')
  return {
    ...actual,
    useQuery: vi.fn(),
  }
})

import { useQuery } from 'convex/react'
import {
  useFolderAnalytics,
  useAllFoldersAnalytics,
  useGlobalAnalytics,
  useUnfiledAnalytics,
  useAnalyticsByStatus,
  useAnalyticsByClient,
  useMonthlyAnalytics,
} from './use-analytics'

describe('use-analytics hooks', () => {
  const mockUseQuery = useQuery as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useFolderAnalytics', () => {
    it('returns null analytics when folderId is undefined', () => {
      mockUseQuery.mockReturnValue(undefined)

      const { result } = renderHook(() => useFolderAnalytics(undefined))

      expect(result.current.analytics).toBeNull()
      expect(result.current.isLoading).toBe(true)
    })

    it('returns analytics when folderId is provided', () => {
      const mockAnalytics = {
        folderId: 'folder1',
        folderName: 'Test Folder',
        invoiceCount: 5,
        totalAmount: 10000,
        totalHours: 80,
        totalDays: 10,
        averageAmount: 2000,
        paidAmount: 6000,
        pendingAmount: 4000,
      }
      mockUseQuery.mockReturnValue(mockAnalytics)

      const { result } = renderHook(() => useFolderAnalytics('folder1' as any))

      expect(result.current.analytics).toEqual(mockAnalytics)
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('useAllFoldersAnalytics', () => {
    it('returns empty array and loading state when undefined', () => {
      mockUseQuery.mockReturnValue(undefined)

      const { result } = renderHook(() => useAllFoldersAnalytics())

      expect(result.current.analytics).toEqual([])
      expect(result.current.isLoading).toBe(true)
    })

    it('returns all folders analytics', () => {
      const mockAnalytics = [
        { folderId: 'folder1', folderName: 'Folder 1', invoiceCount: 3, totalAmount: 5000 },
        { folderId: 'folder2', folderName: 'Folder 2', invoiceCount: 7, totalAmount: 12000 },
      ]
      mockUseQuery.mockReturnValue(mockAnalytics)

      const { result } = renderHook(() => useAllFoldersAnalytics())

      expect(result.current.analytics).toEqual(mockAnalytics)
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('useGlobalAnalytics', () => {
    it('returns null when loading', () => {
      mockUseQuery.mockReturnValue(undefined)

      const { result } = renderHook(() => useGlobalAnalytics())

      expect(result.current.analytics).toBeNull()
      expect(result.current.isLoading).toBe(true)
    })

    it('returns global analytics', () => {
      const mockAnalytics = {
        invoiceCount: 100,
        totalAmount: 250000,
        totalHours: 2000,
        paidAmount: 200000,
        pendingAmount: 50000,
      }
      mockUseQuery.mockReturnValue(mockAnalytics)

      const { result } = renderHook(() => useGlobalAnalytics())

      expect(result.current.analytics).toEqual(mockAnalytics)
      expect(result.current.isLoading).toBe(false)
    })

    it('accepts includeArchived parameter', () => {
      mockUseQuery.mockReturnValue(null)

      renderHook(() => useGlobalAnalytics(true))

      expect(mockUseQuery).toHaveBeenCalled()
    })
  })

  describe('useUnfiledAnalytics', () => {
    it('returns unfiled invoices analytics', () => {
      const mockAnalytics = {
        invoiceCount: 15,
        totalAmount: 30000,
        paidAmount: 20000,
        pendingAmount: 10000,
      }
      mockUseQuery.mockReturnValue(mockAnalytics)

      const { result } = renderHook(() => useUnfiledAnalytics())

      expect(result.current.analytics).toEqual(mockAnalytics)
    })
  })

  describe('useAnalyticsByStatus', () => {
    it('returns analytics grouped by status', () => {
      const mockAnalytics = {
        DRAFT: { count: 10, totalAmount: 15000 },
        SENT: { count: 20, totalAmount: 40000 },
        PAID: { count: 50, totalAmount: 150000 },
        OVERDUE: { count: 5, totalAmount: 10000 },
      }
      mockUseQuery.mockReturnValue(mockAnalytics)

      const { result } = renderHook(() => useAnalyticsByStatus())

      expect(result.current.analytics).toEqual(mockAnalytics)
    })

    it('returns empty object when loading', () => {
      mockUseQuery.mockReturnValue(undefined)

      const { result } = renderHook(() => useAnalyticsByStatus())

      expect(result.current.analytics).toEqual({})
    })
  })

  describe('useAnalyticsByClient', () => {
    it('returns analytics grouped by client', () => {
      const mockAnalytics = [
        {
          clientName: 'Client A',
          invoiceCount: 10,
          totalAmount: 50000,
          paidAmount: 40000,
          pendingAmount: 10000,
        },
        {
          clientName: 'Client B',
          invoiceCount: 5,
          totalAmount: 25000,
          paidAmount: 25000,
          pendingAmount: 0,
        },
      ]
      mockUseQuery.mockReturnValue(mockAnalytics)

      const { result } = renderHook(() => useAnalyticsByClient())

      expect(result.current.analytics).toEqual(mockAnalytics)
    })
  })

  describe('useMonthlyAnalytics', () => {
    it('returns monthly analytics', () => {
      const mockAnalytics = [
        { month: '2024-01', invoiced: 10000, paid: 8000, hours: 80, count: 5 },
        { month: '2024-02', invoiced: 15000, paid: 12000, hours: 120, count: 8 },
        { month: '2024-03', invoiced: 12000, paid: 10000, hours: 100, count: 6 },
      ]
      mockUseQuery.mockReturnValue(mockAnalytics)

      const { result } = renderHook(() => useMonthlyAnalytics(2024))

      expect(result.current.analytics).toEqual(mockAnalytics)
    })

    it('returns empty array when loading', () => {
      mockUseQuery.mockReturnValue(undefined)

      const { result } = renderHook(() => useMonthlyAnalytics())

      expect(result.current.analytics).toEqual([])
    })
  })
})
