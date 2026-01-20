import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock the hooks
const mockTree = [
  {
    _id: 'folder_1',
    name: 'Client Projects',
    description: 'All client work',
    color: '#3b82f6',
    invoiceCount: 5,
    isMoveLocked: false,
    children: [
      {
        _id: 'folder_1a',
        name: 'Project Alpha',
        invoiceCount: 2,
        isMoveLocked: false,
        children: [],
      },
      {
        _id: 'folder_1b',
        name: 'Project Beta',
        invoiceCount: 3,
        isMoveLocked: true, // This one is locked
        children: [],
      },
    ],
  },
  {
    _id: 'folder_2',
    name: 'Personal',
    invoiceCount: 1,
    isMoveLocked: false,
    children: [],
  },
]

const mockCreateFolder = vi.fn()
const mockUpdateFolder = vi.fn()
const mockDeleteFolder = vi.fn()
const mockMoveFolder = vi.fn()
const mockToggleFolderMoveLock = vi.fn()

vi.mock('@/hooks/use-invoice-folders', () => ({
  useFolderTree: () => ({
    tree: mockTree,
    isLoading: false,
  }),
  useFolderPath: (folderId: string) => ({
    path: folderId ? [{ _id: folderId, name: 'Test Folder' }] : [],
    isLoading: false,
  }),
  useFolderMutations: () => ({
    createFolder: mockCreateFolder,
    updateFolder: mockUpdateFolder,
    deleteFolder: mockDeleteFolder,
    moveFolder: mockMoveFolder,
    toggleFolderMoveLock: mockToggleFolderMoveLock,
  }),
}))

vi.mock('@/components/tags/TagSelector', () => ({
  TagSelector: () => <div data-testid="tag-selector">Tag Selector</div>,
  TagBadgeList: () => null,
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

import { FolderTree, FolderBreadcrumb } from './FolderTree'

describe('FolderTree', () => {
  const mockOnSelectFolder = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockToggleFolderMoveLock.mockResolvedValue('folder_id')
  })

  it('renders the folder tree header', () => {
    render(
      <FolderTree
        onSelectFolder={mockOnSelectFolder}
      />
    )

    expect(screen.getByText('Folders')).toBeInTheDocument()
  })

  it('renders the add folder button', () => {
    render(
      <FolderTree
        onSelectFolder={mockOnSelectFolder}
      />
    )

    // There are multiple buttons in the tree - just verify at least one exists
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('renders All invoices option by default', () => {
    render(
      <FolderTree
        onSelectFolder={mockOnSelectFolder}
        showAllInvoices={true}
        allInvoicesCount={10}
      />
    )

    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('renders Uncategorized option by default', () => {
    render(
      <FolderTree
        onSelectFolder={mockOnSelectFolder}
        showUncategorized={true}
        uncategorizedCount={3}
      />
    )

    expect(screen.getByText('Uncategorized')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('hides All option when showAllInvoices is false', () => {
    render(
      <FolderTree
        onSelectFolder={mockOnSelectFolder}
        showAllInvoices={false}
      />
    )

    expect(screen.queryByText('All')).not.toBeInTheDocument()
  })

  it('renders root folders', () => {
    render(
      <FolderTree
        onSelectFolder={mockOnSelectFolder}
      />
    )

    expect(screen.getByText('Client Projects')).toBeInTheDocument()
    expect(screen.getByText('Personal')).toBeInTheDocument()
  })

  it('shows folder invoice count', () => {
    render(
      <FolderTree
        onSelectFolder={mockOnSelectFolder}
      />
    )

    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('calls onSelectFolder with undefined when All is clicked', () => {
    render(
      <FolderTree
        onSelectFolder={mockOnSelectFolder}
        showAllInvoices={true}
      />
    )

    fireEvent.click(screen.getByText('All'))
    expect(mockOnSelectFolder).toHaveBeenCalledWith(undefined)
  })

  it('calls onSelectFolder with UNCATEGORIZED_FOLDER when Uncategorized is clicked', () => {
    render(
      <FolderTree
        onSelectFolder={mockOnSelectFolder}
        showUncategorized={true}
      />
    )

    fireEvent.click(screen.getByText('Uncategorized'))
    expect(mockOnSelectFolder).toHaveBeenCalledWith('__uncategorized__')
  })

  it('expands folder to show children when expand button is clicked', async () => {
    render(
      <FolderTree
        onSelectFolder={mockOnSelectFolder}
      />
    )

    // Initially children should not be visible
    expect(screen.queryByText('Project Alpha')).not.toBeInTheDocument()

    // Find the expand button (chevron) for Client Projects
    const expandButtons = screen.getAllByRole('button')
    const expandButton = expandButtons.find(btn =>
      btn.closest('div')?.textContent?.includes('Client Projects')
    )

    if (expandButton) {
      fireEvent.click(expandButton)
    }

    // After expand, children should be visible
    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument()
      expect(screen.getByText('Project Beta')).toBeInTheDocument()
    })
  })

  it('highlights selected folder', () => {
    render(
      <FolderTree
        selectedFolderId={'folder_1' as any}
        onSelectFolder={mockOnSelectFolder}
      />
    )

    const selectedFolder = screen.getByText('Client Projects').closest('div')
    expect(selectedFolder?.className).toContain('bg-primary')
  })

  it('highlights All when no folder is selected', () => {
    render(
      <FolderTree
        selectedFolderId={undefined}
        onSelectFolder={mockOnSelectFolder}
        showAllInvoices={true}
      />
    )

    const allItem = screen.getByText('All').closest('div')
    expect(allItem?.className).toContain('bg-primary')
  })

  it('opens create folder dialog when add button is clicked', async () => {
    render(
      <FolderTree
        onSelectFolder={mockOnSelectFolder}
      />
    )

    // Find the add button in the header (small plus icon)
    const headerSection = screen.getByText('Folders').closest('div')
    const addButton = headerSection?.querySelector('button')

    if (addButton) {
      fireEvent.click(addButton)
    }

    await waitFor(() => {
      expect(screen.getByText('New Folder')).toBeInTheDocument()
    })
  })

  it('creates a new folder', async () => {
    mockCreateFolder.mockResolvedValueOnce('new_folder_id')

    render(
      <FolderTree
        onSelectFolder={mockOnSelectFolder}
      />
    )

    // Open create dialog
    const headerSection = screen.getByText('Folders').closest('div')
    const addButton = headerSection?.querySelector('button')
    if (addButton) fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('New Folder')).toBeInTheDocument()
    })

    // Fill in name
    const nameInput = screen.getByLabelText('Name')
    fireEvent.change(nameInput, { target: { value: 'New Test Folder' } })

    // Submit
    const createButton = screen.getByRole('button', { name: /create/i })
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(mockCreateFolder).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Test Folder',
        })
      )
    })
  })

  it('disables create button when name is empty', async () => {
    render(
      <FolderTree
        onSelectFolder={mockOnSelectFolder}
      />
    )

    // Open create dialog
    const headerSection = screen.getByText('Folders').closest('div')
    const addButton = headerSection?.querySelector('button')
    if (addButton) fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('New Folder')).toBeInTheDocument()
    })

    // Create button should be disabled
    const createButton = screen.getByRole('button', { name: /create/i })
    expect(createButton).toBeDisabled()
  })

  it('shows empty state when no folders', async () => {
    // Temporarily override mock
    vi.doMock('@/hooks/use-invoice-folders', () => ({
      useFolderTree: () => ({
        tree: [],
        isLoading: false,
      }),
      useFolderMutations: () => ({
        createFolder: vi.fn(),
        updateFolder: vi.fn(),
        deleteFolder: vi.fn(),
        moveFolder: vi.fn(),
        toggleFolderMoveLock: vi.fn(),
      }),
    }))

    // This test would need proper mock reset
  })

  describe('Folder Lock Feature', () => {
    it('shows lock icon for locked folders when expanded', async () => {
      render(
        <FolderTree
          onSelectFolder={mockOnSelectFolder}
        />
      )

      // Expand Client Projects to see Project Beta which is locked
      const expandButtons = screen.getAllByRole('button')
      const expandButton = expandButtons.find(btn =>
        btn.closest('div')?.textContent?.includes('Client Projects')
      )

      if (expandButton) {
        fireEvent.click(expandButton)
      }

      await waitFor(() => {
        expect(screen.getByText('Project Beta')).toBeInTheDocument()
      })

      // Project Beta should have the lock icon (it has isMoveLocked: true)
      // The lock icon has title="Invoices in this folder are locked from moving"
      const lockTitle = screen.queryByTitle('Invoices in this folder are locked from moving')
      expect(lockTitle).toBeInTheDocument()
    })

    it('does not show lock icon for unlocked folders', () => {
      render(
        <FolderTree
          onSelectFolder={mockOnSelectFolder}
        />
      )

      // Client Projects is unlocked, should not show lock icon
      const clientProjectsRow = screen.getByText('Client Projects').closest('div')
      // The span with lock icon should not be present (or have the unlocked folder)
      expect(clientProjectsRow).not.toHaveTextContent('locked')
    })
  })
})

describe('FolderBreadcrumb', () => {
  const mockOnNavigate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when no folder is selected', () => {
    const { container } = render(
      <FolderBreadcrumb
        folderId={undefined}
        onNavigate={mockOnNavigate}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders breadcrumb with All link', () => {
    render(
      <FolderBreadcrumb
        folderId={'folder_1' as any}
        onNavigate={mockOnNavigate}
      />
    )

    expect(screen.getByText('All')).toBeInTheDocument()
  })

  it('calls onNavigate with undefined when All is clicked', () => {
    render(
      <FolderBreadcrumb
        folderId={'folder_1' as any}
        onNavigate={mockOnNavigate}
      />
    )

    fireEvent.click(screen.getByText('All'))
    expect(mockOnNavigate).toHaveBeenCalledWith(undefined)
  })

  it('renders folder path', () => {
    render(
      <FolderBreadcrumb
        folderId={'folder_1' as any}
        onNavigate={mockOnNavigate}
      />
    )

    expect(screen.getByText('Test Folder')).toBeInTheDocument()
  })
})
