import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PartyInfoForm } from './PartyInfoForm'
import type { PartyInfo } from '@invoice-generator/shared-types'

describe('PartyInfoForm', () => {
  const user = userEvent.setup()

  const defaultProps = {
    title: 'From (Your Info)',
    value: {} as Partial<PartyInfo>,
    onChange: vi.fn(),
    showNameError: false,
    onNameChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders with title in a card', () => {
      render(<PartyInfoForm {...defaultProps} />)

      expect(screen.getByText('From (Your Info)')).toBeInTheDocument()
    })

    it('renders without card when no title is provided', () => {
      render(<PartyInfoForm {...defaultProps} title="" />)

      expect(screen.queryByText('From (Your Info)')).not.toBeInTheDocument()
      // Form fields should still be present
      expect(screen.getByLabelText(/name \/ company/i)).toBeInTheDocument()
    })

    it('renders all form fields', () => {
      render(<PartyInfoForm {...defaultProps} />)

      expect(screen.getByLabelText(/name \/ company/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/city/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/state \/ province/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/postal code/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/country/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
    })

    it('renders required indicator for name field', () => {
      render(<PartyInfoForm {...defaultProps} />)

      expect(screen.getByText(/name \/ company \*/i)).toBeInTheDocument()
    })
  })

  describe('Values', () => {
    it('displays provided values', () => {
      const value: Partial<PartyInfo> = {
        name: 'Test Company',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
        email: 'test@example.com',
        phone: '+1 555-123-4567',
      }

      render(<PartyInfoForm {...defaultProps} value={value} />)

      expect(screen.getByDisplayValue('Test Company')).toBeInTheDocument()
      expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument()
      expect(screen.getByDisplayValue('New York')).toBeInTheDocument()
      expect(screen.getByDisplayValue('NY')).toBeInTheDocument()
      expect(screen.getByDisplayValue('10001')).toBeInTheDocument()
      expect(screen.getByDisplayValue('USA')).toBeInTheDocument()
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
      expect(screen.getByDisplayValue('+1 555-123-4567')).toBeInTheDocument()
    })

    it('handles empty/undefined values gracefully', () => {
      render(<PartyInfoForm {...defaultProps} value={{}} />)

      const nameInput = screen.getByLabelText(/name \/ company/i)
      expect(nameInput).toHaveValue('')
    })
  })

  describe('User Interactions', () => {
    it('calls onChange when name is updated', async () => {
      render(<PartyInfoForm {...defaultProps} />)

      const nameInput = screen.getByLabelText(/name \/ company/i)
      await user.type(nameInput, 'New Company')

      expect(defaultProps.onChange).toHaveBeenCalledWith({ name: 'N' })
    })

    it('calls onChange when address is updated', async () => {
      render(<PartyInfoForm {...defaultProps} />)

      const addressInput = screen.getByLabelText(/address/i)
      await user.type(addressInput, '456 Oak Ave')

      expect(defaultProps.onChange).toHaveBeenCalledWith({ address: '4' })
    })

    it('calls onChange when city is updated', async () => {
      render(<PartyInfoForm {...defaultProps} />)

      const cityInput = screen.getByLabelText(/city/i)
      await user.type(cityInput, 'Boston')

      expect(defaultProps.onChange).toHaveBeenCalledWith({ city: 'B' })
    })

    it('calls onChange when state is updated', async () => {
      render(<PartyInfoForm {...defaultProps} />)

      const stateInput = screen.getByLabelText(/state \/ province/i)
      await user.type(stateInput, 'MA')

      expect(defaultProps.onChange).toHaveBeenCalledWith({ state: 'M' })
    })

    it('calls onChange when postal code is updated', async () => {
      render(<PartyInfoForm {...defaultProps} />)

      const postalInput = screen.getByLabelText(/postal code/i)
      await user.type(postalInput, '02101')

      expect(defaultProps.onChange).toHaveBeenCalledWith({ postalCode: '0' })
    })

    it('calls onChange when country is updated', async () => {
      render(<PartyInfoForm {...defaultProps} />)

      const countryInput = screen.getByLabelText(/country/i)
      await user.type(countryInput, 'USA')

      expect(defaultProps.onChange).toHaveBeenCalledWith({ country: 'U' })
    })

    it('calls onChange when email is updated', async () => {
      render(<PartyInfoForm {...defaultProps} />)

      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'a')

      expect(defaultProps.onChange).toHaveBeenCalledWith({ email: 'a' })
    })

    it('calls onChange when phone is updated', async () => {
      render(<PartyInfoForm {...defaultProps} />)

      const phoneInput = screen.getByLabelText(/phone/i)
      await user.type(phoneInput, '1')

      expect(defaultProps.onChange).toHaveBeenCalledWith({ phone: '1' })
    })
  })

  describe('Name Field Callbacks', () => {
    it('calls onNameChange when name is entered with a value', async () => {
      render(<PartyInfoForm {...defaultProps} />)

      const nameInput = screen.getByLabelText(/name \/ company/i)
      await user.type(nameInput, 'Company')

      expect(defaultProps.onNameChange).toHaveBeenCalled()
    })

    it('does not call onNameChange when onNameChange is not provided', async () => {
      const props = { ...defaultProps, onNameChange: undefined }
      render(<PartyInfoForm {...props} />)

      const nameInput = screen.getByLabelText(/name \/ company/i)
      await user.type(nameInput, 'Company')

      // Should not throw error
      expect(defaultProps.onChange).toHaveBeenCalled()
    })
  })

  describe('Validation Error Display', () => {
    it('shows error styling when showNameError is true', () => {
      render(<PartyInfoForm {...defaultProps} showNameError={true} />)

      expect(screen.getByText('Name is required')).toBeInTheDocument()
    })

    it('applies destructive styling to name label when showNameError is true', () => {
      render(<PartyInfoForm {...defaultProps} showNameError={true} />)

      const nameLabel = screen.getByText(/name \/ company \*/i)
      expect(nameLabel).toHaveClass('text-destructive')
    })

    it('does not show error when showNameError is false', () => {
      render(<PartyInfoForm {...defaultProps} showNameError={false} />)

      expect(screen.queryByText('Name is required')).not.toBeInTheDocument()
    })
  })

  describe('Placeholders', () => {
    it('has correct placeholders for all fields', () => {
      render(<PartyInfoForm {...defaultProps} />)

      expect(screen.getByPlaceholderText(/company or individual name/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/street address/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText('City')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('State')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('12345')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Country')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/email@example.com/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/\+1 \(555\) 123-4567/i)).toBeInTheDocument()
    })
  })

  describe('Input Types', () => {
    it('email input has type="email"', () => {
      render(<PartyInfoForm {...defaultProps} />)

      const emailInput = screen.getByLabelText(/email/i)
      expect(emailInput).toHaveAttribute('type', 'email')
    })

    it('phone input has type="tel"', () => {
      render(<PartyInfoForm {...defaultProps} />)

      const phoneInput = screen.getByLabelText(/phone/i)
      expect(phoneInput).toHaveAttribute('type', 'tel')
    })
  })

  describe('Accessibility', () => {
    it('all inputs have associated labels', () => {
      render(<PartyInfoForm {...defaultProps} />)

      const labels = screen.getAllByText(/name|address|city|state|postal|country|email|phone/i)
      expect(labels.length).toBeGreaterThanOrEqual(8)
    })

    it('inputs are keyboard accessible', async () => {
      render(<PartyInfoForm {...defaultProps} />)

      const nameInput = screen.getByLabelText(/name \/ company/i)
      nameInput.focus()

      expect(document.activeElement).toBe(nameInput)

      // Tab through fields
      await user.tab()
      expect(document.activeElement).toBeInstanceOf(HTMLInputElement)
    })

    it('all inputs have unique ids', () => {
      render(<PartyInfoForm {...defaultProps} />)

      const inputs = screen.getAllByRole('textbox')
      const ids = inputs.map(input => input.getAttribute('id'))
      const uniqueIds = new Set(ids)

      expect(uniqueIds.size).toBe(ids.length)
    })

    it('uses form title for generating unique ids', () => {
      render(<PartyInfoForm {...defaultProps} title="From" />)

      expect(screen.getByLabelText(/name \/ company/i)).toHaveAttribute('id', 'From-name')
    })
  })

  describe('Different Titles', () => {
    it('renders correctly with "Bill To" title', () => {
      render(<PartyInfoForm {...defaultProps} title="Bill To (Client)" />)

      expect(screen.getByText('Bill To (Client)')).toBeInTheDocument()
    })

    it('generates correct ids for "Bill To" form', () => {
      render(<PartyInfoForm {...defaultProps} title="Bill To" />)

      expect(screen.getByLabelText(/name \/ company/i)).toHaveAttribute('id', 'Bill To-name')
    })
  })

  describe('Edge Cases', () => {
    it('handles null values in the value prop', () => {
      const value = {
        name: null as unknown as string,
        address: null as unknown as string,
      }

      render(<PartyInfoForm {...defaultProps} value={value} />)

      const nameInput = screen.getByLabelText(/name \/ company/i)
      expect(nameInput).toHaveValue('')
    })

    it('handles clearing input fields', async () => {
      const value = { name: 'Test Company' }
      render(<PartyInfoForm {...defaultProps} value={value} />)

      const nameInput = screen.getByLabelText(/name \/ company/i)
      await user.clear(nameInput)

      expect(defaultProps.onChange).toHaveBeenLastCalledWith({ name: '' })
    })

    it('handles rapid input changes', async () => {
      render(<PartyInfoForm {...defaultProps} />)

      const nameInput = screen.getByLabelText(/name \/ company/i)
      await user.type(nameInput, 'ABCDEF', { delay: 1 })

      expect(defaultProps.onChange).toHaveBeenCalledTimes(6)
    })
  })
})
