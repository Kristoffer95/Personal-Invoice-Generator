import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BackgroundSelector } from './BackgroundSelector'
import type { BackgroundDesign } from '@invoice-generator/shared-types'

describe('BackgroundSelector', () => {
  const user = userEvent.setup()

  const mockDesigns: BackgroundDesign[] = [
    { id: 'minimal', name: 'Minimal', backgroundColor: '#ffffff' },
    { id: 'professional', name: 'Professional Blue', accentColor: '#1a1a2e', borderColor: '#0f3460' },
    { id: 'modern', name: 'Modern Gray', backgroundColor: '#f8fafc', accentColor: '#334155' },
    { id: 'elegant', name: 'Elegant', backgroundColor: '#faf5ff', accentColor: '#6b21a8' },
  ]

  const defaultProps = {
    designs: mockDesigns,
    selectedId: undefined,
    onSelect: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the card with title', () => {
      render(<BackgroundSelector {...defaultProps} />)

      expect(screen.getByText('Invoice Design')).toBeInTheDocument()
    })

    it('renders the description', () => {
      render(<BackgroundSelector {...defaultProps} />)

      expect(screen.getByText(/choose a background design/i)).toBeInTheDocument()
    })

    it('renders all design options', () => {
      render(<BackgroundSelector {...defaultProps} />)

      expect(screen.getByRole('button', { name: /select minimal design/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /select professional blue design/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /select modern gray design/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /select elegant design/i })).toBeInTheDocument()
    })

    it('shows "no design selected" when no design is selected', () => {
      render(<BackgroundSelector {...defaultProps} />)

      expect(screen.getByText(/no design selected/i)).toBeInTheDocument()
    })

    it('shows selected design name when a design is selected', () => {
      render(<BackgroundSelector {...defaultProps} selectedId="minimal" />)

      expect(screen.getByText('Selected: Minimal')).toBeInTheDocument()
    })
  })

  describe('Selection', () => {
    it('calls onSelect with design id when design is clicked', async () => {
      render(<BackgroundSelector {...defaultProps} />)

      const minimalButton = screen.getByRole('button', { name: /select minimal design/i })
      await user.click(minimalButton)

      expect(defaultProps.onSelect).toHaveBeenCalledWith('minimal')
    })

    it('calls onSelect with undefined when clicking already selected design (deselect)', async () => {
      render(<BackgroundSelector {...defaultProps} selectedId="minimal" />)

      const minimalButton = screen.getByRole('button', { name: /select minimal design/i })
      await user.click(minimalButton)

      expect(defaultProps.onSelect).toHaveBeenCalledWith(undefined)
    })

    it('calls onSelect with new design id when clicking different design', async () => {
      render(<BackgroundSelector {...defaultProps} selectedId="minimal" />)

      const professionalButton = screen.getByRole('button', { name: /select professional blue design/i })
      await user.click(professionalButton)

      expect(defaultProps.onSelect).toHaveBeenCalledWith('professional')
    })
  })

  describe('Visual States', () => {
    it('shows check indicator on selected design', () => {
      render(<BackgroundSelector {...defaultProps} selectedId="minimal" />)

      // The check icon should be present
      const minimalButton = screen.getByRole('button', { name: /select minimal design/i })
      const checkIcon = minimalButton.querySelector('svg')

      // There should be an SVG (the check mark) in the selected button
      expect(checkIcon).toBeInTheDocument()
    })

    it('applies selected styling to selected design', () => {
      render(<BackgroundSelector {...defaultProps} selectedId="minimal" />)

      const minimalButton = screen.getByRole('button', { name: /select minimal design/i })
      expect(minimalButton).toHaveClass('border-primary')
    })

    it('applies muted border to unselected designs', () => {
      render(<BackgroundSelector {...defaultProps} selectedId="minimal" />)

      const professionalButton = screen.getByRole('button', { name: /select professional blue design/i })
      expect(professionalButton).toHaveClass('border-muted')
    })

    it('applies background color from design', () => {
      render(<BackgroundSelector {...defaultProps} />)

      const minimalButton = screen.getByRole('button', { name: /select minimal design/i })
      expect(minimalButton).toHaveStyle({ backgroundColor: '#ffffff' })
    })

    it('applies default background color when not specified', () => {
      const designsWithoutBg = [
        { id: 'test', name: 'Test', accentColor: '#000000' },
      ]

      render(<BackgroundSelector {...defaultProps} designs={designsWithoutBg} />)

      const testButton = screen.getByRole('button', { name: /select test design/i })
      expect(testButton).toHaveStyle({ backgroundColor: '#ffffff' })
    })
  })

  describe('Accessibility', () => {
    it('all design buttons have aria-label', () => {
      render(<BackgroundSelector {...defaultProps} />)

      mockDesigns.forEach(design => {
        const button = screen.getByRole('button', { name: new RegExp(`select ${design.name} design`, 'i') })
        expect(button).toHaveAttribute('aria-label', `Select ${design.name} design`)
      })
    })

    it('selected design has aria-pressed true', () => {
      render(<BackgroundSelector {...defaultProps} selectedId="minimal" />)

      const minimalButton = screen.getByRole('button', { name: /select minimal design/i })
      expect(minimalButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('unselected designs have aria-pressed false', () => {
      render(<BackgroundSelector {...defaultProps} selectedId="minimal" />)

      const professionalButton = screen.getByRole('button', { name: /select professional blue design/i })
      expect(professionalButton).toHaveAttribute('aria-pressed', 'false')
    })

    it('buttons are keyboard focusable', async () => {
      render(<BackgroundSelector {...defaultProps} />)

      const minimalButton = screen.getByRole('button', { name: /select minimal design/i })
      minimalButton.focus()

      expect(document.activeElement).toBe(minimalButton)
    })

    it('can select design with keyboard', async () => {
      render(<BackgroundSelector {...defaultProps} />)

      const minimalButton = screen.getByRole('button', { name: /select minimal design/i })
      minimalButton.focus()
      await user.keyboard('{Enter}')

      expect(defaultProps.onSelect).toHaveBeenCalledWith('minimal')
    })
  })

  describe('Border Color Display', () => {
    it('renders border decoration when borderColor is specified', () => {
      render(<BackgroundSelector {...defaultProps} selectedId={undefined} />)

      // The professional design has a borderColor
      const professionalButton = screen.getByRole('button', { name: /select professional blue design/i })

      // Check for the border element inside
      const borderElement = professionalButton.querySelector('[style*="border-color"]')
      expect(borderElement).toBeInTheDocument()
    })

    it('does not render border decoration when borderColor is not specified', () => {
      const designsWithoutBorder = [
        { id: 'minimal', name: 'Minimal', backgroundColor: '#ffffff' },
      ]

      render(<BackgroundSelector {...defaultProps} designs={designsWithoutBorder} />)

      const minimalButton = screen.getByRole('button', { name: /select minimal design/i })

      // Should not have a border decoration element with explicit border-color
      const borderElement = minimalButton.querySelector('[class*="border-l-"]')
      expect(borderElement).toBeNull()
    })
  })

  describe('Empty Designs', () => {
    it('handles empty designs array', () => {
      render(<BackgroundSelector {...defaultProps} designs={[]} />)

      expect(screen.getByText(/no design selected/i)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /select/i })).not.toBeInTheDocument()
    })
  })

  describe('Design Preview Elements', () => {
    it('renders preview elements inside each button', () => {
      render(<BackgroundSelector {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        // Each button should have some internal structure for preview
        const previewElements = button.querySelectorAll('div')
        expect(previewElements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Selected Design Name Display', () => {
    it.each(mockDesigns)('displays correct name for $name when selected', (design) => {
      render(<BackgroundSelector {...defaultProps} selectedId={design.id} />)

      expect(screen.getByText(`Selected: ${design.name}`)).toBeInTheDocument()
    })

    it('handles selectedId that does not exist in designs', () => {
      render(<BackgroundSelector {...defaultProps} selectedId="nonexistent" />)

      // Should not crash and should show something (could be "Selected: " or empty)
      expect(screen.queryByText('Selected: Minimal')).not.toBeInTheDocument()
    })
  })
})
