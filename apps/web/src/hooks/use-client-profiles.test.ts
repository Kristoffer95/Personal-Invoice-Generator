import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock convex/react
const mockUseQuery = vi.fn()
const mockUseMutation = vi.fn()
vi.mock('convex/react', () => ({
  useQuery: (query: unknown, args?: unknown) => {
    if (args === 'skip') return undefined
    return mockUseQuery()
  },
  useMutation: () => mockUseMutation(),
}))

// Mock the API import
vi.mock('@invoice-generator/backend/convex/_generated/api', () => ({
  api: {
    clientProfiles: {
      listClients: 'clientProfiles:listClients',
      getClient: 'clientProfiles:getClient',
      searchClients: 'clientProfiles:searchClients',
      createClient: 'clientProfiles:createClient',
      updateClient: 'clientProfiles:updateClient',
      removeClient: 'clientProfiles:removeClient',
      upsertFromInvoice: 'clientProfiles:upsertFromInvoice',
    },
  },
}))

// Import after mocks
import { useClientProfiles, useClientProfile, useClientSearch, useClientMutations } from './use-client-profiles'

describe('useClientProfiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loading state', () => {
    it('should return loading state when query is undefined', () => {
      mockUseQuery.mockReturnValue(undefined)

      const { result } = renderHook(() => useClientProfiles())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.clients).toEqual([])
    })
  })

  describe('with client data', () => {
    it('should return clients list', () => {
      const mockClients = [
        {
          _id: 'client_1',
          name: 'Acme Corp',
          email: 'contact@acme.com',
          phone: '+1234567890',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          _id: 'client_2',
          name: 'Tech Inc',
          email: 'info@tech.com',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]
      mockUseQuery.mockReturnValue(mockClients)

      const { result } = renderHook(() => useClientProfiles())

      expect(result.current.isLoading).toBe(false)
      expect(result.current.clients).toHaveLength(2)
      expect(result.current.clients[0].name).toBe('Acme Corp')
      expect(result.current.clients[1].name).toBe('Tech Inc')
    })
  })
})

describe('useClientProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return null when clientId is undefined', () => {
    const { result } = renderHook(() => useClientProfile(undefined))

    expect(result.current.client).toBeNull()
    expect(result.current.isLoading).toBe(true)
  })

  it('should return client when found', () => {
    const mockClient = {
      _id: 'client_1',
      name: 'Acme Corp',
      email: 'contact@acme.com',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    mockUseQuery.mockReturnValue(mockClient)

    const { result } = renderHook(() => useClientProfile('client_1' as any))

    expect(result.current.client).toEqual(mockClient)
    expect(result.current.isLoading).toBe(false)
  })
})

describe('useClientSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should skip query when search query is empty', () => {
    const { result } = renderHook(() => useClientSearch(''))

    expect(result.current.clients).toEqual([])
    expect(result.current.isLoading).toBe(true)
  })

  it('should return matching clients', () => {
    const mockClients = [
      { _id: 'client_1', name: 'Acme Corp', email: 'contact@acme.com' },
    ]
    mockUseQuery.mockReturnValue(mockClients)

    const { result } = renderHook(() => useClientSearch('Acme'))

    expect(result.current.isLoading).toBe(false)
    expect(result.current.clients).toHaveLength(1)
    expect(result.current.clients[0].name).toBe('Acme Corp')
  })
})

describe('useClientMutations', () => {
  it('should return all mutation functions', () => {
    mockUseMutation.mockReturnValue(vi.fn())

    const { result } = renderHook(() => useClientMutations())

    expect(result.current.createClient).toBeDefined()
    expect(result.current.updateClient).toBeDefined()
    expect(result.current.deleteClient).toBeDefined()
    expect(result.current.upsertFromInvoice).toBeDefined()
  })
})
