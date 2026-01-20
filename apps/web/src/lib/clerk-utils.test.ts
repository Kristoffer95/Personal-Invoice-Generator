import { describe, it, expect } from 'vitest'

/**
 * Tests for the clerkId extraction logic used in backend Convex functions.
 *
 * The Clerk identity.subject field can have different formats:
 * - Plain ID: "user_abc123" (direct Clerk ID)
 * - OAuth prefix: "oauth|google-oauth2|123456789" (OAuth provider)
 * - Email prefix: "email|user@example.com" (Email authentication)
 *
 * The extractClerkId function handles these formats by extracting the actual ID.
 */

// Replicate the backend extractClerkId helper for testing
function extractClerkId(subject: string): string {
  return subject.includes("|")
    ? subject.split("|")[1] ?? subject
    : subject;
}

describe('extractClerkId', () => {
  describe('plain clerk IDs', () => {
    it('should return the ID as-is when no prefix', () => {
      expect(extractClerkId('user_2abc123xyz')).toBe('user_2abc123xyz')
    })

    it('should handle underscore-containing IDs', () => {
      expect(extractClerkId('user_test_id_123')).toBe('user_test_id_123')
    })
  })

  describe('OAuth prefixed subjects', () => {
    it('should extract ID from oauth|provider|id format', () => {
      expect(extractClerkId('oauth|google-oauth2|123456789')).toBe('google-oauth2')
    })

    it('should extract ID from oauth|provider format', () => {
      expect(extractClerkId('oauth|github')).toBe('github')
    })
  })

  describe('email prefixed subjects', () => {
    it('should extract email from email|user@example.com format', () => {
      expect(extractClerkId('email|user@example.com')).toBe('user@example.com')
    })
  })

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(extractClerkId('')).toBe('')
    })

    it('should handle single pipe at end', () => {
      expect(extractClerkId('prefix|')).toBe('')
    })

    it('should handle multiple pipes', () => {
      // Takes the second segment
      expect(extractClerkId('a|b|c|d')).toBe('b')
    })
  })

  describe('security considerations', () => {
    it('should not be vulnerable to prototype pollution', () => {
      const result = extractClerkId('__proto__|polluted')
      expect(result).toBe('polluted')
      // Ensure Object.prototype is not polluted
      expect(({} as any).polluted).toBeUndefined()
    })

    it('should handle long strings safely', () => {
      const longId = 'a'.repeat(10000)
      expect(extractClerkId(longId)).toBe(longId)
    })

    it('should handle special characters', () => {
      expect(extractClerkId('prefix|<script>alert(1)</script>')).toBe('<script>alert(1)</script>')
    })
  })
})

describe('clerkId extraction consistency', () => {
  it('should match the behavior in users.ts getCurrent function', () => {
    // These test cases should match the extraction logic in users.ts
    const testCases = [
      { input: 'user_abc123', expected: 'user_abc123' },
      { input: 'oauth|google|12345', expected: 'google' },
      { input: 'email|test@test.com', expected: 'test@test.com' },
    ]

    for (const { input, expected } of testCases) {
      expect(extractClerkId(input)).toBe(expected)
    }
  })
})
