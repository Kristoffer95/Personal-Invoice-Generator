import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from './toast'

// Helper component to render a toast with all its parts
function TestToast({
  title = 'Test Title',
  description = 'Test Description',
  variant = 'default' as const,
  onClose,
}: {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
  onClose?: () => void
}) {
  return (
    <ToastProvider>
      <Toast variant={variant} open={true} onOpenChange={onClose} data-testid="toast">
        <div className="grid gap-1">
          <ToastTitle>{title}</ToastTitle>
          <ToastDescription>{description}</ToastDescription>
        </div>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  )
}

describe('Toast Component', () => {
  describe('ToastClose', () => {
    it('should render the close button visibly', () => {
      render(<TestToast />)

      const closeButton = screen.getByRole('button', { name: /close notification/i })
      expect(closeButton).toBeInTheDocument()
      expect(closeButton).toBeVisible()
    })

    it('should have proper aria-label for screen readers', () => {
      render(<TestToast />)

      const closeButton = screen.getByRole('button', { name: /close notification/i })
      expect(closeButton).toHaveAttribute('aria-label', 'Close notification')
    })

    it('should have aria-hidden on the X icon', () => {
      render(<TestToast />)

      const closeButton = screen.getByRole('button', { name: /close notification/i })
      const icon = closeButton.querySelector('svg')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })

    it('should be focusable (no negative tabindex)', () => {
      render(<TestToast />)

      const closeButton = screen.getByRole('button', { name: /close notification/i })
      expect(closeButton).not.toHaveAttribute('tabindex', '-1')
    })

    it('should close the toast when clicked', () => {
      const onClose = vi.fn()
      render(<TestToast onClose={onClose} />)

      const closeButton = screen.getByRole('button', { name: /close notification/i })
      fireEvent.click(closeButton)

      expect(onClose).toHaveBeenCalledWith(false)
    })

    it('should have keyboard-accessible close button', () => {
      render(<TestToast />)

      const closeButton = screen.getByRole('button', { name: /close notification/i })
      // The button should be of type button and focusable
      expect(closeButton.tagName).toBe('BUTTON')
      expect(closeButton).not.toHaveAttribute('disabled')
    })
  })

  describe('Toast Variants', () => {
    it('should apply default styles for default variant', () => {
      render(<TestToast variant="default" />)

      // The toast should be present
      const toast = screen.getByRole('status')
      expect(toast).toBeInTheDocument()
    })

    it('should apply destructive styles for destructive variant', () => {
      render(<TestToast variant="destructive" />)

      const toast = screen.getByTestId('toast')
      // Destructive variant should have the destructive class in the class list
      expect(toast.className).toContain('destructive')
    })

    it('should render close button visible for destructive variant', () => {
      render(<TestToast variant="destructive" />)

      const closeButton = screen.getByRole('button', { name: /close notification/i })
      expect(closeButton).toBeInTheDocument()
      expect(closeButton).toBeVisible()
    })
  })

  describe('Toast Content', () => {
    it('should render the title', () => {
      render(<TestToast title="Error Title" />)

      expect(screen.getByText('Error Title')).toBeInTheDocument()
    })

    it('should render the description', () => {
      render(<TestToast description="Error description text" />)

      expect(screen.getByText('Error description text')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper role for toast container', () => {
      render(<TestToast />)

      const toast = screen.getByRole('status')
      expect(toast).toBeInTheDocument()
    })

    it('should not have opacity-0 class on close button (always visible)', () => {
      render(<TestToast />)

      const closeButton = screen.getByRole('button', { name: /close notification/i })
      expect(closeButton).not.toHaveClass('opacity-0')
    })

    it('should have focus ring classes for keyboard navigation', () => {
      render(<TestToast />)

      const closeButton = screen.getByRole('button', { name: /close notification/i })
      // Check that the button has focus ring classes
      expect(closeButton.className).toContain('focus:ring')
    })

    it('should have transition-colors for smooth visual feedback', () => {
      render(<TestToast />)

      const closeButton = screen.getByRole('button', { name: /close notification/i })
      expect(closeButton.className).toContain('transition-colors')
    })
  })
})

describe('ToastAction Component', () => {
  it('should render an action button when provided', () => {
    render(
      <ToastProvider>
        <Toast open={true}>
          <div className="grid gap-1">
            <ToastTitle>With Action</ToastTitle>
          </div>
          <ToastAction altText="Undo action">Undo</ToastAction>
          <ToastClose />
        </Toast>
        <ToastViewport />
      </ToastProvider>
    )

    expect(screen.getByText('Undo')).toBeInTheDocument()
  })
})

describe('ToastViewport', () => {
  it('should render the viewport container', () => {
    render(
      <ToastProvider>
        <ToastViewport data-testid="toast-viewport" />
      </ToastProvider>
    )

    expect(screen.getByTestId('toast-viewport')).toBeInTheDocument()
  })
})
