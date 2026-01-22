import { describe, it, expect } from 'vitest'
import {
  sanitizeForPdf,
  interpolateTokens,
  validateTemplateImport,
  mmToPoints,
  pointsToMm,
  ALLOWED_TOKENS,
  invoiceTemplateSchema,
  templateElementSchema,
} from './template'

describe('template utilities', () => {
  describe('mmToPoints', () => {
    it('converts mm to points correctly', () => {
      expect(mmToPoints(210)).toBeCloseTo(595.28, 1) // A4 width
      expect(mmToPoints(297)).toBeCloseTo(841.89, 1) // A4 height
      expect(mmToPoints(0)).toBe(0)
    })
  })

  describe('pointsToMm', () => {
    it('converts points to mm correctly', () => {
      expect(pointsToMm(595.28)).toBeCloseTo(210, 0) // A4 width
      expect(pointsToMm(841.89)).toBeCloseTo(297, 0) // A4 height
      expect(pointsToMm(0)).toBe(0)
    })
  })

  describe('sanitizeForPdf', () => {
    it('removes script tags', () => {
      const input = 'Hello <script>alert("xss")</script> World'
      expect(sanitizeForPdf(input)).toBe('Hello  World')
    })

    it('removes HTML tags', () => {
      const input = '<div>Hello</div> <span>World</span>'
      expect(sanitizeForPdf(input)).toBe('Hello World')
    })

    it('removes javascript: protocol', () => {
      const input = 'Click javascript:alert(1)'
      expect(sanitizeForPdf(input)).toBe('Click alert(1)')
    })

    it('removes event handlers', () => {
      const input = 'Image onclick=alert(1)'
      expect(sanitizeForPdf(input)).toBe('Image alert(1)')
    })

    it('keeps normal text unchanged', () => {
      const input = 'Normal text with $100 and 50%'
      expect(sanitizeForPdf(input)).toBe('Normal text with $100 and 50%')
    })
  })

  describe('interpolateTokens', () => {
    const mockTokenValues: Record<typeof ALLOWED_TOKENS[number], string> = {
      invoice_number: 'INV-001',
      issue_date: 'Jan 15, 2024',
      due_date: 'Feb 15, 2024',
      billing_period: 'Jan 1 - Jan 15, 2024',
      from_name: 'My Company',
      from_address: '123 Main St',
      from_city: 'New York',
      from_state: 'NY',
      from_postal_code: '10001',
      from_country: 'USA',
      from_email: 'billing@company.com',
      from_phone: '+1 555 123 4567',
      from_tax_id: 'XX-1234567',
      to_name: 'Client Corp',
      to_address: '456 Oak Ave',
      to_city: 'Boston',
      to_state: 'MA',
      to_postal_code: '02101',
      to_country: 'USA',
      to_email: 'accounts@client.com',
      to_phone: '+1 555 987 6543',
      to_tax_id: 'YY-7654321',
      total_hours: '160.0',
      total_days: '20',
      hourly_rate: '75.00',
      subtotal: '12,000.00',
      discount_percent: '10',
      discount_amount: '1,200.00',
      tax_percent: '8',
      tax_amount: '864.00',
      total_amount: '11,664.00',
      currency_symbol: '$',
      currency_code: 'USD',
      job_title: 'Development Services',
      notes: 'Thank you!',
      terms: 'Net 30',
      payment_terms: 'NET_30',
    }

    it('replaces valid tokens', () => {
      const content = 'Invoice #{{invoice_number}}'
      const result = interpolateTokens(content, mockTokenValues)
      expect(result).toBe('Invoice #INV-001')
    })

    it('replaces multiple tokens', () => {
      const content = 'From: {{from_name}} ({{from_email}})'
      const result = interpolateTokens(content, mockTokenValues)
      expect(result).toBe('From: My Company (billing@company.com)')
    })

    it('removes invalid tokens', () => {
      const content = 'Value: {{invalid_token}}'
      const result = interpolateTokens(content, mockTokenValues)
      expect(result).toBe('Value: ')
    })

    it('handles mixed valid and invalid tokens', () => {
      const content = '{{from_name}} - {{invalid}} - {{to_name}}'
      const result = interpolateTokens(content, mockTokenValues)
      expect(result).toBe('My Company -  - Client Corp')
    })

    it('sanitizes token values', () => {
      const maliciousValues = {
        ...mockTokenValues,
        from_name: '<script>alert("xss")</script>Company',
      }
      const content = 'From: {{from_name}}'
      const result = interpolateTokens(content, maliciousValues)
      expect(result).toBe('From: Company')
    })

    it('handles content without tokens', () => {
      const content = 'Plain text without any tokens'
      const result = interpolateTokens(content, mockTokenValues)
      expect(result).toBe('Plain text without any tokens')
    })

    it('handles empty content', () => {
      const result = interpolateTokens('', mockTokenValues)
      expect(result).toBe('')
    })
  })

  describe('validateTemplateImport', () => {
    const validTemplate = {
      id: 'test-123',
      name: 'Test Template',
      pageSize: 'A4',
      orientation: 'portrait',
      margins: {
        top: 40,
        right: 40,
        bottom: 60,
        left: 40,
      },
      backgroundColor: '#ffffff',
      elements: [],
      isDefault: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    }

    it('validates a correct template', () => {
      const result = validateTemplateImport(validTemplate)
      expect(result).not.toBeNull()
      expect(result?.name).toBe('Test Template')
    })

    it('returns null for invalid template', () => {
      const invalid = {
        ...validTemplate,
        name: '', // Empty name
      }
      const result = validateTemplateImport(invalid)
      expect(result).toBeNull()
    })

    it('returns null for template with too many elements', () => {
      const elements = Array(101).fill({
        id: 'el-1',
        type: 'text',
        name: 'Test',
        position: { x: 0, y: 0, width: 100, height: 50 },
        content: '',
        padding: 0,
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      })
      const tooManyElements = {
        ...validTemplate,
        elements,
      }
      const result = validateTemplateImport(tooManyElements)
      expect(result).toBeNull()
    })

    it('returns null for non-object input', () => {
      expect(validateTemplateImport(null)).toBeNull()
      expect(validateTemplateImport('string')).toBeNull()
      expect(validateTemplateImport(123)).toBeNull()
    })
  })

  describe('templateElementSchema', () => {
    it('validates a text element', () => {
      const element = {
        id: 'el-1',
        type: 'text',
        name: 'Title',
        position: { x: 40, y: 40, width: 200, height: 40 },
        content: 'INVOICE {{invoice_number}}',
        padding: 0,
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      }

      const result = templateElementSchema.safeParse(element)
      expect(result.success).toBe(true)
    })

    it('validates a table element', () => {
      const element = {
        id: 'el-2',
        type: 'table_work_hours',
        name: 'Work Hours',
        position: { x: 40, y: 300, width: 515, height: 200 },
        content: '',
        tableStyle: {
          headerBackgroundColor: '#1a1a2e',
          headerTextColor: '#ffffff',
          rowBackgroundColor: '#ffffff',
          alternateRowBackgroundColor: '#f8fafc',
          borderColor: '#e0e0e0',
          showHeaderBorder: true,
          showRowBorders: true,
        },
        padding: 0,
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      }

      const result = templateElementSchema.safeParse(element)
      expect(result.success).toBe(true)
    })

    it('rejects element with invalid type', () => {
      const element = {
        id: 'el-1',
        type: 'invalid_type',
        name: 'Test',
        position: { x: 0, y: 0, width: 100, height: 50 },
        content: '',
        padding: 0,
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      }

      const result = templateElementSchema.safeParse(element)
      expect(result.success).toBe(false)
    })

    it('rejects element with position below minimum', () => {
      const element = {
        id: 'el-1',
        type: 'text',
        name: 'Test',
        position: { x: 0, y: 0, width: 5, height: 5 }, // Below minimum (10)
        content: '',
        padding: 0,
        opacity: 1,
        zIndex: 0,
        locked: false,
        visible: true,
      }

      const result = templateElementSchema.safeParse(element)
      expect(result.success).toBe(false)
    })
  })

  describe('invoiceTemplateSchema', () => {
    it('validates a complete template', () => {
      const template = {
        id: 'tpl-1',
        name: 'My Invoice Template',
        pageSize: 'A4',
        orientation: 'portrait',
        margins: {
          top: 40,
          right: 40,
          bottom: 60,
          left: 40,
        },
        backgroundColor: '#ffffff',
        elements: [
          {
            id: 'el-1',
            type: 'text',
            name: 'Title',
            position: { x: 40, y: 40, width: 200, height: 40 },
            content: 'INVOICE',
            padding: 0,
            opacity: 1,
            zIndex: 0,
            locked: false,
            visible: true,
          },
        ],
        isDefault: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }

      const result = invoiceTemplateSchema.safeParse(template)
      expect(result.success).toBe(true)
    })

    it('uses default values', () => {
      const minimal = {
        id: 'tpl-1',
        name: 'Minimal',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }

      const result = invoiceTemplateSchema.safeParse(minimal)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.pageSize).toBe('A4')
        expect(result.data.orientation).toBe('portrait')
        expect(result.data.elements).toEqual([])
      }
    })

    it('rejects template without name', () => {
      const noName = {
        id: 'tpl-1',
        name: '',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }

      const result = invoiceTemplateSchema.safeParse(noName)
      expect(result.success).toBe(false)
    })

    it('rejects invalid page size', () => {
      const invalidPageSize = {
        id: 'tpl-1',
        name: 'Test',
        pageSize: 'INVALID',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      }

      const result = invoiceTemplateSchema.safeParse(invalidPageSize)
      expect(result.success).toBe(false)
    })
  })

  describe('ALLOWED_TOKENS', () => {
    it('contains all expected invoice tokens', () => {
      expect(ALLOWED_TOKENS).toContain('invoice_number')
      expect(ALLOWED_TOKENS).toContain('issue_date')
      expect(ALLOWED_TOKENS).toContain('due_date')
    })

    it('contains all expected from tokens', () => {
      expect(ALLOWED_TOKENS).toContain('from_name')
      expect(ALLOWED_TOKENS).toContain('from_email')
      expect(ALLOWED_TOKENS).toContain('from_phone')
    })

    it('contains all expected to tokens', () => {
      expect(ALLOWED_TOKENS).toContain('to_name')
      expect(ALLOWED_TOKENS).toContain('to_email')
      expect(ALLOWED_TOKENS).toContain('to_phone')
    })

    it('contains all expected financial tokens', () => {
      expect(ALLOWED_TOKENS).toContain('total_amount')
      expect(ALLOWED_TOKENS).toContain('subtotal')
      expect(ALLOWED_TOKENS).toContain('currency_symbol')
    })
  })
})
