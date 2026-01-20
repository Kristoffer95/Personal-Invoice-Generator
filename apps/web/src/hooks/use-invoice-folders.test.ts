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
      getFolderWithClientProfiles: 'invoiceFolders:getFolderWithClientProfiles',
      getChildren: 'invoiceFolders:getChildren',
      getFolderTree: 'invoiceFolders:getFolderTree',
      getFolderPath: 'invoiceFolders:getFolderPath',
      createFolder: 'invoiceFolders:createFolder',
      updateFolder: 'invoiceFolders:updateFolder',
      removeFolder: 'invoiceFolders:removeFolder',
      moveFolder: 'invoiceFolders:moveFolder',
      toggleFolderMoveLock: 'invoiceFolders:toggleFolderMoveLock',
    },
  },
}))

// Import after mocks
import { useInvoiceFolders, useInvoiceFolder, useFolderWithClientProfiles, useFolderChildren, useFolderTree, useFolderPath, useFolderMutations } from './use-invoice-folders'

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

describe('useFolderTree', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.queryReturns = {}
  })

  it('should return nested folder tree structure', () => {
    const mockTree = [
      {
        _id: 'folder_1',
        name: 'Root Folder',
        invoiceCount: 5,
        children: [
          {
            _id: 'folder_2',
            name: 'Subfolder 1',
            parentId: 'folder_1',
            invoiceCount: 3,
            children: [],
          },
        ],
      },
    ]
    mockState.queryReturns['invoiceFolders:getFolderTree'] = mockTree

    const { result } = renderHook(() => useFolderTree())

    expect(result.current.isLoading).toBe(false)
    expect(result.current.tree).toHaveLength(1)
    expect(result.current.tree[0].children).toHaveLength(1)
  })

  it('should return empty array when loading', () => {
    mockState.queryReturns['invoiceFolders:getFolderTree'] = undefined

    const { result } = renderHook(() => useFolderTree())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.tree).toEqual([])
  })
})

describe('useFolderPath', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.queryReturns = {}
  })

  it('should return folder breadcrumb path', () => {
    const mockPath = [
      { _id: 'folder_1', name: 'Root' },
      { _id: 'folder_2', name: 'Subfolder' },
      { _id: 'folder_3', name: 'Current' },
    ]
    mockState.queryReturns['invoiceFolders:getFolderPath'] = mockPath

    const { result } = renderHook(() => useFolderPath('folder_3' as any))

    expect(result.current.isLoading).toBe(false)
    expect(result.current.path).toHaveLength(3)
    expect(result.current.path[0].name).toBe('Root')
    expect(result.current.path[2].name).toBe('Current')
  })

  it('should return empty array when folderId is undefined', () => {
    mockState.queryReturns['invoiceFolders:getFolderPath'] = undefined

    const { result } = renderHook(() => useFolderPath(undefined))

    expect(result.current.path).toEqual([])
  })
})

describe('useInvoiceFolders with filters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.queryReturns = {}
  })

  it('should filter folders by tags', () => {
    const mockFolders = [
      { _id: 'folder_1', name: 'Tagged Folder', tags: ['tag1'], invoiceCount: 2 },
    ]
    mockState.queryReturns['invoiceFolders:listWithCounts'] = mockFolders

    const { result } = renderHook(() =>
      useInvoiceFolders({ tags: ['tag1' as any] })
    )

    expect(result.current.folders).toHaveLength(1)
  })

  it('should filter folders by search query', () => {
    const mockFolders = [
      { _id: 'folder_1', name: 'Client A Projects', invoiceCount: 5 },
    ]
    mockState.queryReturns['invoiceFolders:listWithCounts'] = mockFolders

    const { result } = renderHook(() =>
      useInvoiceFolders({ searchQuery: 'Client' })
    )

    expect(result.current.folders).toHaveLength(1)
  })
})

describe('useFolderMutations', () => {
  it('should return all mutation functions including moveFolder', () => {
    const { result } = renderHook(() => useFolderMutations())

    expect(result.current.createFolder).toBeDefined()
    expect(result.current.updateFolder).toBeDefined()
    expect(result.current.deleteFolder).toBeDefined()
    expect(result.current.moveFolder).toBeDefined()
    expect(result.current.toggleFolderMoveLock).toBeDefined()
  })
})

describe('useFolderWithClientProfiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.queryReturns = {}
  })

  it('should return null when folderId is undefined', () => {
    const { result } = renderHook(() => useFolderWithClientProfiles(undefined))

    expect(result.current.folder).toBeNull()
    expect(result.current.clientProfiles).toEqual([])
    expect(result.current.isLoading).toBe(true)
  })

  it('should return folder with linked client profiles', () => {
    const mockClientProfiles = [
      {
        _id: 'client_1',
        name: 'Test Client Inc.',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
        email: 'client@test.com',
        phone: '555-1234',
        taxId: 'TAX-123',
      },
      {
        _id: 'client_2',
        name: 'Another Client',
        email: 'another@test.com',
      },
    ]

    const mockFolderWithProfiles = {
      _id: 'folder_1',
      name: 'Client A Projects',
      description: 'All invoices for Client A',
      color: '#3b82f6',
      clientProfileIds: ['client_1', 'client_2'],
      defaultHourlyRate: 75,
      defaultCurrency: 'USD',
      defaultPaymentTerms: 'NET_30',
      defaultJobTitle: 'Software Development',
      clientProfiles: mockClientProfiles,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    mockState.queryReturns['invoiceFolders:getFolderWithClientProfiles'] = mockFolderWithProfiles

    const { result } = renderHook(() => useFolderWithClientProfiles('folder_1' as any))

    expect(result.current.isLoading).toBe(false)
    expect(result.current.folder).toBeDefined()
    expect(result.current.folder?.name).toBe('Client A Projects')
    expect(result.current.folder?.defaultHourlyRate).toBe(75)
    expect(result.current.folder?.defaultCurrency).toBe('USD')
    expect(result.current.folder?.defaultPaymentTerms).toBe('NET_30')
    expect(result.current.folder?.defaultJobTitle).toBe('Software Development')
    expect(result.current.clientProfiles).toHaveLength(2)
    expect(result.current.clientProfiles[0]?.name).toBe('Test Client Inc.')
    expect(result.current.clientProfiles[0]?.email).toBe('client@test.com')
    expect(result.current.clientProfiles[1]?.name).toBe('Another Client')
  })

  it('should return folder without client profiles when none linked', () => {
    const mockFolderWithoutProfiles = {
      _id: 'folder_2',
      name: 'General Invoices',
      description: 'Unlinked folder',
      clientProfiles: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    mockState.queryReturns['invoiceFolders:getFolderWithClientProfiles'] = mockFolderWithoutProfiles

    const { result } = renderHook(() => useFolderWithClientProfiles('folder_2' as any))

    expect(result.current.isLoading).toBe(false)
    expect(result.current.folder).toBeDefined()
    expect(result.current.clientProfiles).toEqual([])
  })

  it('should return folder with default invoice settings', () => {
    const mockFolderWithDefaults = {
      _id: 'folder_3',
      name: 'Client B',
      defaultHourlyRate: 100,
      defaultCurrency: 'EUR',
      defaultPaymentTerms: 'NET_15',
      defaultJobTitle: 'Consulting',
      clientProfiles: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    mockState.queryReturns['invoiceFolders:getFolderWithClientProfiles'] = mockFolderWithDefaults

    const { result } = renderHook(() => useFolderWithClientProfiles('folder_3' as any))

    expect(result.current.isLoading).toBe(false)
    expect(result.current.folder?.defaultHourlyRate).toBe(100)
    expect(result.current.folder?.defaultCurrency).toBe('EUR')
    expect(result.current.folder?.defaultPaymentTerms).toBe('NET_15')
    expect(result.current.folder?.defaultJobTitle).toBe('Consulting')
  })
})
