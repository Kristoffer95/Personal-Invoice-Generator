import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock convex/react
const mockUseQuery = vi.fn()
vi.mock('convex/react', () => ({
  useQuery: () => mockUseQuery(),
}))

// Mock the API import
vi.mock('@invoice-generator/backend/convex/_generated/api', () => ({
  api: {
    users: {
      getCurrent: 'users:getCurrent',
    },
  },
}))

// Import after mocks
import { useCurrentUser } from './use-current-user'

describe('useCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loading state', () => {
    it('should return loading state when query is undefined', () => {
      mockUseQuery.mockReturnValue(undefined)

      const { result } = renderHook(() => useCurrentUser())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeUndefined()
    })
  })

  describe('unauthenticated state', () => {
    it('should return unauthenticated when user is null', () => {
      mockUseQuery.mockReturnValue(null)

      const { result } = renderHook(() => useCurrentUser())

      expect(result.current.isLoading).toBe(false)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
    })
  })

  describe('authenticated state', () => {
    it('should return authenticated when user exists', () => {
      const mockUser = {
        _id: 'user_123',
        clerkId: 'clerk_123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        syncedAt: Date.now(),
        clerkCreatedAt: Date.now(),
        clerkUpdatedAt: Date.now(),
      }
      mockUseQuery.mockReturnValue(mockUser)

      const { result } = renderHook(() => useCurrentUser())

      expect(result.current.isLoading).toBe(false)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(mockUser)
    })

    it('should return user data with all fields', () => {
      const mockUser = {
        _id: 'user_456',
        clerkId: 'clerk_456',
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
        imageUrl: 'https://example.com/avatar.jpg',
        syncedAt: 1700000000000,
        clerkCreatedAt: 1699000000000,
        clerkUpdatedAt: 1699500000000,
        lastSignInAt: 1699900000000,
      }
      mockUseQuery.mockReturnValue(mockUser)

      const { result } = renderHook(() => useCurrentUser())

      expect(result.current.user?.email).toBe('jane@example.com')
      expect(result.current.user?.firstName).toBe('Jane')
      expect(result.current.user?.lastName).toBe('Smith')
      expect(result.current.user?.username).toBe('janesmith')
      expect(result.current.user?.imageUrl).toBe('https://example.com/avatar.jpg')
    })
  })

  describe('edge cases', () => {
    it('should handle user with minimal data', () => {
      const minimalUser = {
        _id: 'user_789',
        clerkId: 'clerk_789',
        email: 'minimal@example.com',
        syncedAt: Date.now(),
        clerkCreatedAt: Date.now(),
        clerkUpdatedAt: Date.now(),
      }
      mockUseQuery.mockReturnValue(minimalUser)

      const { result } = renderHook(() => useCurrentUser())

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user?.firstName).toBeUndefined()
      expect(result.current.user?.lastName).toBeUndefined()
      expect(result.current.user?.username).toBeUndefined()
      expect(result.current.user?.imageUrl).toBeUndefined()
    })
  })
})
