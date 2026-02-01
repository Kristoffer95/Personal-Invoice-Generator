import { describe, it, expect } from 'vitest'
import { PREDEFINED_ELEMENTS, ELEMENT_CATEGORIES } from './predefined-elements'

describe('Predefined Elements', () => {
  describe('Element Categories', () => {
    it('should have layout category', () => {
      const layoutCategory = ELEMENT_CATEGORIES.find((c) => c.id === 'layout')
      expect(layoutCategory).toBeDefined()
      expect(layoutCategory?.name).toBe('Layout')
    })
  })

  describe('Canvas Container', () => {
    const canvasContainer = PREDEFINED_ELEMENTS.find((e) => e.id === 'layout-container-canvas')

    it('should exist in predefined elements', () => {
      expect(canvasContainer).toBeDefined()
    })

    it('should be in layout category', () => {
      expect(canvasContainer?.category).toBe('layout')
    })

    it('should have correct name and description', () => {
      expect(canvasContainer?.name).toBe('Canvas Container')
      expect(canvasContainer?.description).toBe('Full-page container')
    })

    it('should have Maximize2 icon for visual distinction', () => {
      expect(canvasContainer?.icon).toBe('Maximize2')
    })

    it('should have layout_container type', () => {
      expect(canvasContainer?.defaultElement.type).toBe('layout_container')
    })

    it('should have widthMode set to canvas', () => {
      expect(canvasContainer?.defaultElement.widthMode).toBe('canvas')
    })

    it('should have heightMode set to canvas', () => {
      expect(canvasContainer?.defaultElement.heightMode).toBe('canvas')
    })

    it('should have purple theme for visual distinction', () => {
      // Purple-600 (#9333ea) is used for the border
      expect(canvasContainer?.defaultElement.border?.color).toBe('#9333ea')
      // Light purple background
      expect(canvasContainer?.defaultElement.backgroundColor).toBe('rgba(147, 51, 234, 0.05)')
    })

    it('should have column layout direction by default', () => {
      expect(canvasContainer?.defaultElement.layoutConfig?.direction).toBe('column')
    })

    it('should have dashed border style', () => {
      expect(canvasContainer?.defaultElement.border?.style).toBe('dashed')
    })

    it('should have zero padding for full-page coverage', () => {
      expect(canvasContainer?.defaultElement.padding).toBe(0)
    })

    it('should have zero gap by default', () => {
      expect(canvasContainer?.defaultElement.layoutConfig?.gap).toBe(0)
    })
  })

  describe('Column Container', () => {
    const columnContainer = PREDEFINED_ELEMENTS.find((e) => e.id === 'layout-container-column')

    it('should exist and have blue theme', () => {
      expect(columnContainer).toBeDefined()
      expect(columnContainer?.defaultElement.border?.color).toBe('#3b82f6')
    })

    it('should have fixed width and height modes', () => {
      expect(columnContainer?.defaultElement.widthMode).toBe('fixed')
      expect(columnContainer?.defaultElement.heightMode).toBe('fixed')
    })
  })

  describe('Row Container', () => {
    const rowContainer = PREDEFINED_ELEMENTS.find((e) => e.id === 'layout-container-row')

    it('should exist and have green theme', () => {
      expect(rowContainer).toBeDefined()
      expect(rowContainer?.defaultElement.border?.color).toBe('#10b981')
    })

    it('should have fixed width and height modes', () => {
      expect(rowContainer?.defaultElement.widthMode).toBe('fixed')
      expect(rowContainer?.defaultElement.heightMode).toBe('fixed')
    })
  })

  describe('Layout containers visual distinction', () => {
    it('should have different colors for Column, Row, and Canvas containers', () => {
      const column = PREDEFINED_ELEMENTS.find((e) => e.id === 'layout-container-column')
      const row = PREDEFINED_ELEMENTS.find((e) => e.id === 'layout-container-row')
      const canvas = PREDEFINED_ELEMENTS.find((e) => e.id === 'layout-container-canvas')

      const columnColor = column?.defaultElement.border?.color
      const rowColor = row?.defaultElement.border?.color
      const canvasColor = canvas?.defaultElement.border?.color

      // All three should have different colors
      expect(columnColor).not.toBe(rowColor)
      expect(columnColor).not.toBe(canvasColor)
      expect(rowColor).not.toBe(canvasColor)

      // Verify expected colors: blue for column, green for row, purple for canvas
      expect(columnColor).toBe('#3b82f6')
      expect(rowColor).toBe('#10b981')
      expect(canvasColor).toBe('#9333ea')
    })
  })
})
