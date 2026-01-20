import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { ConvexReactClient } from 'convex/react'
import { ConvexProvider } from 'convex/react'
import React from 'react'

// Mock the Convex client
vi.mock('convex/react', async () => {
  const actual = await vi.importActual('convex/react')
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(() => vi.fn()),
  }
})

import { useQuery, useMutation } from 'convex/react'
import {
  useTags,
  useInvoiceTags,
  useFolderTags,
  useTag,
  useInvoicesByTag,
  useFoldersByTag,
  useTagMutations,
} from './use-tags'

describe('use-tags hooks', () => {
  const mockUseQuery = useQuery as ReturnType<typeof vi.fn>
  const mockUseMutation = useMutation as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useTags', () => {
    it('returns empty array and loading state when data is undefined', () => {
      mockUseQuery.mockReturnValue(undefined)

      const { result } = renderHook(() => useTags())

      expect(result.current.tags).toEqual([])
      expect(result.current.isLoading).toBe(true)
    })

    it('returns tags when data is available', () => {
      const mockTags = [
        { _id: '1', name: 'Tag 1', type: 'invoice', color: '#ff0000' },
        { _id: '2', name: 'Tag 2', type: 'folder', color: '#00ff00' },
      ]
      mockUseQuery.mockReturnValue(mockTags)

      const { result } = renderHook(() => useTags())

      expect(result.current.tags).toEqual(mockTags)
      expect(result.current.isLoading).toBe(false)
    })

    it('filters by type when provided', () => {
      const mockTags = [{ _id: '1', name: 'Invoice Tag', type: 'invoice' }]
      mockUseQuery.mockReturnValue(mockTags)

      const { result } = renderHook(() => useTags('invoice'))

      expect(result.current.tags).toEqual(mockTags)
    })
  })

  describe('useInvoiceTags', () => {
    it('returns invoice-applicable tags', () => {
      const mockTags = [
        { _id: '1', name: 'Invoice Tag', type: 'invoice' },
        { _id: '2', name: 'Both Tag', type: 'both' },
      ]
      mockUseQuery.mockReturnValue(mockTags)

      const { result } = renderHook(() => useInvoiceTags())

      expect(result.current.tags).toEqual(mockTags)
    })
  })

  describe('useFolderTags', () => {
    it('returns folder-applicable tags', () => {
      const mockTags = [
        { _id: '1', name: 'Folder Tag', type: 'folder' },
        { _id: '2', name: 'Both Tag', type: 'both' },
      ]
      mockUseQuery.mockReturnValue(mockTags)

      const { result } = renderHook(() => useFolderTags())

      expect(result.current.tags).toEqual(mockTags)
    })
  })

  describe('useTag', () => {
    it('returns null when tagId is undefined', () => {
      mockUseQuery.mockReturnValue(null)

      const { result } = renderHook(() => useTag(undefined))

      expect(result.current.tag).toBeNull()
    })

    it('returns tag when tagId is provided', () => {
      const mockTag = { _id: '1', name: 'Test Tag', type: 'invoice' }
      mockUseQuery.mockReturnValue(mockTag)

      const { result } = renderHook(() => useTag('1' as any))

      expect(result.current.tag).toEqual(mockTag)
    })
  })

  describe('useInvoicesByTag', () => {
    it('returns invoices with the specified tag', () => {
      const mockInvoices = [
        { _id: '1', invoiceNumber: 'INV-001', tags: ['tag1'] },
        { _id: '2', invoiceNumber: 'INV-002', tags: ['tag1'] },
      ]
      mockUseQuery.mockReturnValue(mockInvoices)

      const { result } = renderHook(() => useInvoicesByTag('tag1' as any))

      expect(result.current.invoices).toEqual(mockInvoices)
    })
  })

  describe('useFoldersByTag', () => {
    it('returns folders with the specified tag', () => {
      const mockFolders = [
        { _id: '1', name: 'Folder 1', tags: ['tag1'] },
        { _id: '2', name: 'Folder 2', tags: ['tag1'] },
      ]
      mockUseQuery.mockReturnValue(mockFolders)

      const { result } = renderHook(() => useFoldersByTag('tag1' as any))

      expect(result.current.folders).toEqual(mockFolders)
    })
  })

  describe('useTagMutations', () => {
    it('returns all tag mutation functions', () => {
      const mockMutation = vi.fn()
      mockUseMutation.mockReturnValue(mockMutation)

      const { result } = renderHook(() => useTagMutations())

      expect(result.current).toHaveProperty('createTag')
      expect(result.current).toHaveProperty('updateTag')
      expect(result.current).toHaveProperty('removeTag')
      expect(result.current).toHaveProperty('addTagToInvoice')
      expect(result.current).toHaveProperty('removeTagFromInvoice')
      expect(result.current).toHaveProperty('addTagToFolder')
      expect(result.current).toHaveProperty('removeTagFromFolder')
    })
  })
})
