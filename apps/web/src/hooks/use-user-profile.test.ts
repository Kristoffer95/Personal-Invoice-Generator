import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Use vi.hoisted to ensure the mock object is created before vi.mock is hoisted
const mockState = vi.hoisted(() => ({
  queryReturns: {} as Record<string, unknown>
}))

// Mock convex/react
vi.mock('convex/react', () => ({
  useQuery: (query: string) => mockState.queryReturns[query],
  useMutation: () => vi.fn(),
}))

// Mock the API import
vi.mock('@invoice-generator/backend/convex/_generated/api', () => ({
  api: {
    userProfiles: {
      getProfile: 'userProfiles:getProfile',
      upsert: 'userProfiles:upsert',
      updateInvoiceNumbering: 'userProfiles:updateInvoiceNumbering',
      getNextInvoiceNumber: 'userProfiles:getNextInvoiceNumber',
      incrementInvoiceNumber: 'userProfiles:incrementInvoiceNumber',
    },
  },
}))

// Import after mocks
import { useUserProfile, useNextInvoiceNumber } from './use-user-profile'

describe('useUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear all mock returns
    mockState.queryReturns = {}
  })

  describe('loading state', () => {
    it('should return loading state when query is undefined', () => {
      mockState.queryReturns['userProfiles:getProfile'] = undefined

      const { result } = renderHook(() => useUserProfile())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.data).toBeUndefined()
      expect(result.current.user).toBeNull()
      expect(result.current.profile).toBeNull()
    })
  })

  describe('with user and profile data', () => {
    it('should return user and profile when available', () => {
      const mockData = {
        user: {
          _id: 'user_123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          imageUrl: 'https://example.com/avatar.jpg',
        },
        profile: {
          _id: 'profile_123',
          userId: 'user_123',
          displayName: 'John Doe',
          businessName: 'Johns Company',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
          email: 'john@company.com',
          phone: '+1234567890',
          taxId: '12-3456789',
          invoicePrefix: 'INV',
          nextInvoiceNumber: 5,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      }
      mockState.queryReturns['userProfiles:getProfile'] = mockData

      const { result } = renderHook(() => useUserProfile())

      expect(result.current.isLoading).toBe(false)
      expect(result.current.data).toEqual(mockData)
      expect(result.current.user).toEqual(mockData.user)
      expect(result.current.profile).toEqual(mockData.profile)
    })

    it('should return null profile when user exists but profile does not', () => {
      const mockData = {
        user: {
          _id: 'user_123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        profile: null,
      }
      mockState.queryReturns['userProfiles:getProfile'] = mockData

      const { result } = renderHook(() => useUserProfile())

      expect(result.current.user).toEqual(mockData.user)
      expect(result.current.profile).toBeNull()
    })
  })
})

describe('useNextInvoiceNumber', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear all mock returns
    mockState.queryReturns = {}
  })

  describe('loading state', () => {
    it('should return loading state when query is undefined', () => {
      mockState.queryReturns['userProfiles:getNextInvoiceNumber'] = undefined

      const { result } = renderHook(() => useNextInvoiceNumber())

      expect(result.current.isLoading).toBe(true)
    })
  })

  describe('with invoice number data', () => {
    it('should return formatted invoice number without prefix', () => {
      mockState.queryReturns['userProfiles:getNextInvoiceNumber'] = {
        prefix: '',
        number: 1,
        formatted: '001',
      }

      const { result } = renderHook(() => useNextInvoiceNumber())

      expect(result.current.isLoading).toBe(false)
      expect(result.current.prefix).toBe('')
      expect(result.current.number).toBe(1)
      expect(result.current.formatted).toBe('001')
    })

    it('should return formatted invoice number with prefix', () => {
      mockState.queryReturns['userProfiles:getNextInvoiceNumber'] = {
        prefix: 'INV',
        number: 42,
        formatted: 'INV-042',
      }

      const { result } = renderHook(() => useNextInvoiceNumber())

      expect(result.current.prefix).toBe('INV')
      expect(result.current.number).toBe(42)
      expect(result.current.formatted).toBe('INV-042')
    })
  })
})
