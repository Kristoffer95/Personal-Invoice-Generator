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
    invoiceFolders: {
      listWithCounts: 'invoiceFolders:listWithCounts',
      getFolder: 'invoiceFolders:getFolder',
      getChildren: 'invoiceFolders:getChildren',
      createFolder: 'invoiceFolders:createFolder',
      updateFolder: 'invoiceFolders:updateFolder',
      removeFolder: 'invoiceFolders:removeFolder',
    },
  },
}))

// Import after mocks
import { useInvoiceFolders, useInvoiceFolder, useFolderChildren, useFolderMutations } from './use-invoice-folders'

describe('useInvoiceFolders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.queryReturns = {}
  })

  describe('loading state', () => {
    it('should return loading state when query is undefined', () => {
      mockState.queryReturns['invoiceFolders:listWithCounts'] = undefined

      const { result } = renderHook(() => useInvoiceFolders())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.folders).toEqual([])
    })
  })

  describe('with folder data', () => {
    it('should return folders with invoice counts', () => {
      const mockFolders = [
        {
          _id: 'folder_1',
          name: 'Client A',
          description: 'Invoices for Client A',
          color: '#3b82f6',
          invoiceCount: 5,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          _id: 'folder_2',
          name: 'Client B',
          invoiceCount: 3,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]
      mockState.queryReturns['invoiceFolders:listWithCounts'] = mockFolders

      const { result } = renderHook(() => useInvoiceFolders())

      expect(result.current.isLoading).toBe(false)
      expect(result.current.folders).toHaveLength(2)
      expect(result.current.folders[0].name).toBe('Client A')
      expect(result.current.folders[0].invoiceCount).toBe(5)
      expect(result.current.folders[1].invoiceCount).toBe(3)
    })
  })
})

describe('useInvoiceFolder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.queryReturns = {}
  })

  it('should return null when folderId is undefined', () => {
    mockState.queryReturns['invoiceFolders:getFolder'] = undefined

    const { result } = renderHook(() => useInvoiceFolder(undefined))

    expect(result.current.folder).toBeNull()
    expect(result.current.isLoading).toBe(true)
  })

  it('should return folder when found', () => {
    const mockFolder = {
      _id: 'folder_1',
      name: 'Client A',
      description: 'Invoices for Client A',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    mockState.queryReturns['invoiceFolders:getFolder'] = mockFolder

    const { result } = renderHook(() => useInvoiceFolder('folder_1' as any))

    expect(result.current.folder).toEqual(mockFolder)
    expect(result.current.isLoading).toBe(false)
  })
})

describe('useFolderChildren', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.queryReturns = {}
  })

  it('should return child folders', () => {
    const mockChildren = [
      { _id: 'folder_2', name: 'Subfolder 1', parentId: 'folder_1' },
      { _id: 'folder_3', name: 'Subfolder 2', parentId: 'folder_1' },
    ]
    mockState.queryReturns['invoiceFolders:getChildren'] = mockChildren

    const { result } = renderHook(() => useFolderChildren('folder_1' as any))

    expect(result.current.isLoading).toBe(false)
    expect(result.current.children).toHaveLength(2)
  })
})

describe('useFolderMutations', () => {
  it('should return all mutation functions', () => {
    const { result } = renderHook(() => useFolderMutations())

    expect(result.current.createFolder).toBeDefined()
    expect(result.current.updateFolder).toBeDefined()
    expect(result.current.deleteFolder).toBeDefined()
  })
})
