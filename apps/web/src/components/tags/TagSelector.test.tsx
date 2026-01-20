import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock the hooks
const mockInvoiceTags = [
  { _id: 'tag_1', name: 'Urgent', color: '#ef4444' },
  { _id: 'tag_2', name: 'Client A', color: '#3b82f6' },
]

const mockFolderTags = [
  { _id: 'tag_3', name: 'Projects', color: '#22c55e' },
  { _id: 'tag_4', name: 'Archive', color: '#6b7280' },
]

vi.mock('@/hooks/use-tags', () => ({
  useInvoiceTags: () => ({
    tags: mockInvoiceTags,
    isLoading: false,
  }),
  useFolderTags: () => ({
    tags: mockFolderTags,
    isLoading: false,
  }),
}))

import { TagSelector, TagBadgeList } from './TagSelector'

describe('TagSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('for invoices', () => {
    it('renders with no selected tags', () => {
      const onChange = vi.fn()
      render(<TagSelector selectedTags={[]} onChange={onChange} type="invoice" />)
      expect(screen.getByText('Select tags...')).toBeInTheDocument()
    })

    it('shows count when tags are selected', () => {
      const onChange = vi.fn()
      render(<TagSelector selectedTags={['tag_1'] as any} onChange={onChange} type="invoice" />)
      expect(screen.getByText('1 tag selected')).toBeInTheDocument()
    })

    it('shows plural count for multiple tags', () => {
      const onChange = vi.fn()
      render(<TagSelector selectedTags={['tag_1', 'tag_2'] as any} onChange={onChange} type="invoice" />)
      expect(screen.getByText('2 tags selected')).toBeInTheDocument()
    })

    it('opens dropdown on click', async () => {
      const onChange = vi.fn()
      render(<TagSelector selectedTags={[]} onChange={onChange} type="invoice" />)

      const trigger = screen.getByRole('combobox')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByText('Urgent')).toBeInTheDocument()
        expect(screen.getByText('Client A')).toBeInTheDocument()
      })
    })

    it('filters tags by search', async () => {
      const onChange = vi.fn()
      render(<TagSelector selectedTags={[]} onChange={onChange} type="invoice" />)

      // Open dropdown
      const trigger = screen.getByRole('combobox')
      fireEvent.click(trigger)

      // Type in search
      const searchInput = await screen.findByPlaceholderText('Search tags...')
      fireEvent.change(searchInput, { target: { value: 'Urgent' } })

      // Only Urgent should be visible
      expect(screen.getByText('Urgent')).toBeInTheDocument()
      expect(screen.queryByText('Client A')).not.toBeInTheDocument()
    })

    it('selects a tag when clicked', async () => {
      const onChange = vi.fn()
      render(<TagSelector selectedTags={[]} onChange={onChange} type="invoice" />)

      // Open dropdown
      const trigger = screen.getByRole('combobox')
      fireEvent.click(trigger)

      // Click a tag
      const urgentTag = await screen.findByText('Urgent')
      fireEvent.click(urgentTag)

      expect(onChange).toHaveBeenCalledWith(['tag_1'])
    })

    it('deselects a tag when clicked again', async () => {
      const onChange = vi.fn()
      render(<TagSelector selectedTags={['tag_1'] as any} onChange={onChange} type="invoice" />)

      // Open dropdown
      const trigger = screen.getByRole('combobox')
      fireEvent.click(trigger)

      // Wait for dropdown to open and find the tag in the options list
      await waitFor(() => {
        // Find all "Urgent" text - one in badge, one in dropdown options
        const urgentElements = screen.getAllByText('Urgent')
        expect(urgentElements.length).toBeGreaterThanOrEqual(1)
      })

      // Click on the tag option in the dropdown (not the badge)
      const urgentElements = screen.getAllByText('Urgent')
      // The option in dropdown is a button element
      const urgentOption = urgentElements.find(el =>
        el.closest('button[type="button"]')?.className.includes('w-full')
      )

      if (urgentOption) {
        fireEvent.click(urgentOption)
      }

      expect(onChange).toHaveBeenCalledWith([])
    })

    it('shows selected tags as badges', () => {
      const onChange = vi.fn()
      render(<TagSelector selectedTags={['tag_1'] as any} onChange={onChange} type="invoice" />)

      // Should show badge below the selector
      const badges = screen.getAllByText('Urgent')
      expect(badges.length).toBeGreaterThanOrEqual(1)
    })

    it('removes tag when badge X is clicked', () => {
      const onChange = vi.fn()
      render(<TagSelector selectedTags={['tag_1'] as any} onChange={onChange} type="invoice" />)

      // Find and click the X button
      const removeButtons = screen.getAllByRole('button')
      const xButton = removeButtons.find(btn => btn.querySelector('svg'))

      if (xButton) {
        fireEvent.click(xButton)
        expect(onChange).toHaveBeenCalledWith([])
      }
    })

    it('is disabled when disabled prop is true', () => {
      const onChange = vi.fn()
      render(<TagSelector selectedTags={[]} onChange={onChange} type="invoice" disabled />)

      const trigger = screen.getByRole('combobox')
      expect(trigger).toBeDisabled()
    })
  })

  describe('for folders', () => {
    it('shows folder tags', async () => {
      const onChange = vi.fn()
      render(<TagSelector selectedTags={[]} onChange={onChange} type="folder" />)

      const trigger = screen.getByRole('combobox')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByText('Projects')).toBeInTheDocument()
        expect(screen.getByText('Archive')).toBeInTheDocument()
      })
    })

    it('does not show invoice tags', async () => {
      const onChange = vi.fn()
      render(<TagSelector selectedTags={[]} onChange={onChange} type="folder" />)

      const trigger = screen.getByRole('combobox')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.queryByText('Urgent')).not.toBeInTheDocument()
        expect(screen.queryByText('Client A')).not.toBeInTheDocument()
      })
    })
  })
})

describe('TagBadgeList', () => {
  it('renders nothing when no tags', () => {
    const { container } = render(<TagBadgeList tagIds={[]} type="invoice" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders badges for valid tag IDs', () => {
    render(<TagBadgeList tagIds={['tag_1'] as any} type="invoice" />)
    expect(screen.getByText('Urgent')).toBeInTheDocument()
  })

  it('renders multiple badges', () => {
    render(<TagBadgeList tagIds={['tag_1', 'tag_2'] as any} type="invoice" />)
    expect(screen.getByText('Urgent')).toBeInTheDocument()
    expect(screen.getByText('Client A')).toBeInTheDocument()
  })

  it('applies tag colors to badges', () => {
    render(<TagBadgeList tagIds={['tag_1'] as any} type="invoice" />)
    const badge = screen.getByText('Urgent')
    expect(badge).toHaveStyle({ color: '#ef4444' })
  })

  it('uses folder tags when type is folder', () => {
    render(<TagBadgeList tagIds={['tag_3'] as any} type="folder" />)
    expect(screen.getByText('Projects')).toBeInTheDocument()
  })
})
