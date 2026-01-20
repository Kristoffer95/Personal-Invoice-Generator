import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock data
const mockInvoices = [
  {
    _id: "invoice_1",
    invoiceNumber: "INV-001",
    status: "DRAFT" as const,
    totalAmount: 1000,
    currency: "USD" as const,
    issueDate: "2024-01-15",
    to: { name: "Client A" },
    folderId: "folder_1",
    isArchived: false,
    isMoveLocked: false,
    tags: [],
  },
  {
    _id: "invoice_2",
    invoiceNumber: "INV-002",
    status: "SENT" as const,
    totalAmount: 2500,
    currency: "USD" as const,
    issueDate: "2024-01-20",
    to: { name: "Client B" },
    folderId: undefined,
    isArchived: false,
    isMoveLocked: true,
    tags: [],
  },
  {
    _id: "invoice_3",
    invoiceNumber: "INV-003",
    status: "PAID" as const,
    totalAmount: 3500,
    currency: "USD" as const,
    issueDate: "2024-01-25",
    to: { name: "Client C" },
    folderId: "folder_2",
    isArchived: false,
    isMoveLocked: false,
    tags: [],
  },
];

const mockFolderTree = [
  {
    _id: "folder_1",
    name: "Client Projects",
    invoiceCount: 2,
    children: [
      {
        _id: "folder_1a",
        name: "Project Alpha",
        invoiceCount: 1,
        children: [],
      },
    ],
  },
  {
    _id: "folder_2",
    name: "Personal",
    invoiceCount: 1,
    children: [],
  },
];

const mockUnfiledInvoices = [mockInvoices[1]];
const mockArchivedInvoices: typeof mockInvoices = [];

// Mock functions
const mockDeleteInvoice = vi.fn().mockResolvedValue("invoice_1");
const mockDuplicateInvoice = vi.fn().mockResolvedValue("invoice_new_123");
const mockUpdateStatus = vi.fn().mockResolvedValue("invoice_1");
const mockArchiveInvoice = vi.fn().mockResolvedValue("invoice_1");
const mockUnarchiveInvoice = vi.fn().mockResolvedValue("invoice_1");
const mockBulkArchiveInvoices = vi.fn().mockResolvedValue(undefined);
const mockBulkDeleteInvoices = vi.fn().mockResolvedValue(3);
const mockBulkUpdateStatus = vi.fn().mockResolvedValue(undefined);
const mockMoveToFolder = vi.fn().mockResolvedValue("invoice_1");
const mockToggleMoveLock = vi.fn().mockResolvedValue("invoice_1");
const mockBulkMoveToFolder = vi.fn().mockResolvedValue({ moved: 2, locked: 0 });
const mockToggleFolderMoveLock = vi.fn().mockResolvedValue("folder_1");
const mockCreateFolder = vi.fn().mockResolvedValue("folder_new");
const mockUpdateFolder = vi.fn().mockResolvedValue("folder_1");
const mockDeleteFolder = vi.fn().mockResolvedValue("folder_1");
const mockMoveFolder = vi.fn().mockResolvedValue("folder_1");
const mockToast = vi.fn();
const mockRouterPush = vi.fn();
const mockIncrementNumber = vi.fn().mockResolvedValue(undefined);

// Mock clerk
vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <div data-testid="user-button">User</div>,
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

// Mock hooks
const mockQuickCreateInvoice = vi.fn().mockResolvedValue({
  invoiceId: "invoice_new_123",
  periodStart: "2024-02-01",
  periodEnd: "2024-02-15",
  batchType: "first",
});

vi.mock("@/hooks/use-invoices", () => ({
  useInvoices: () => ({
    invoices: mockInvoices,
    isLoading: false,
  }),
  useUncategorizedInvoices: () => ({
    invoices: mockUnfiledInvoices,
    isLoading: false,
  }),
  useUnfiledInvoices: () => ({
    invoices: mockUnfiledInvoices,
    isLoading: false,
  }),
  useAllInvoicesCount: () => ({
    count: mockInvoices.length,
    isLoading: false,
  }),
  useArchivedInvoices: () => ({
    invoices: mockArchivedInvoices,
    isLoading: false,
  }),
  useInvoiceMutations: () => ({
    deleteInvoice: mockDeleteInvoice,
    duplicateInvoice: mockDuplicateInvoice,
    updateStatus: mockUpdateStatus,
    archiveInvoice: mockArchiveInvoice,
    unarchiveInvoice: mockUnarchiveInvoice,
    bulkArchiveInvoices: mockBulkArchiveInvoices,
    bulkDeleteInvoices: mockBulkDeleteInvoices,
    bulkUpdateStatus: mockBulkUpdateStatus,
    moveToFolder: mockMoveToFolder,
    toggleMoveLock: mockToggleMoveLock,
    bulkMoveToFolder: mockBulkMoveToFolder,
    quickCreateInvoice: mockQuickCreateInvoice,
  }),
  useNextBillingPeriod: () => ({
    period: null,
    isLoading: false,
  }),
}));

vi.mock("@/hooks/use-invoice-folders", () => ({
  useFolderTree: () => ({
    tree: mockFolderTree,
    isLoading: false,
  }),
  useFolderPath: () => ({
    path: [],
    isLoading: false,
  }),
  useFolderMutations: () => ({
    createFolder: mockCreateFolder,
    updateFolder: mockUpdateFolder,
    deleteFolder: mockDeleteFolder,
    moveFolder: mockMoveFolder,
    toggleFolderMoveLock: mockToggleFolderMoveLock,
  }),
  useFolderWithClientProfiles: () => ({
    folder: null,
    clientProfiles: [],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

vi.mock("@/hooks/use-user-profile", () => ({
  useNextInvoiceNumber: () => ({
    formatted: "INV-004",
    incrementNumber: mockIncrementNumber,
  }),
}));

// Mock components that are not under test
vi.mock("@/components/ui/theme-toggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">Theme</div>,
}));

vi.mock("@/components/folders/FolderTree", () => ({
  FolderTree: ({ onSelectFolder }: { onSelectFolder: (id: string | undefined) => void }) => (
    <div data-testid="folder-tree">
      <button onClick={() => onSelectFolder(undefined)}>All</button>
      <button onClick={() => onSelectFolder("__uncategorized__")}>Uncategorized</button>
      <button onClick={() => onSelectFolder("folder_1")}>Client Projects</button>
    </div>
  ),
  FolderBreadcrumb: () => <div data-testid="folder-breadcrumb" />,
  UNCATEGORIZED_FOLDER: "__uncategorized__",
}));

vi.mock("@/components/invoice/InvoiceFilters", () => ({
  InvoiceFilters: () => <div data-testid="invoice-filters" />,
  defaultFilters: {
    statuses: [],
    tags: [],
    dateFrom: "",
    dateTo: "",
    amountMin: undefined,
    amountMax: undefined,
    searchQuery: "",
    showArchived: false,
  },
}));

vi.mock("@/components/invoice/InvoiceStatusSelect", () => ({
  InvoiceStatusSelect: ({ value, onChange }: { value: string; onChange: (status: string) => void }) => (
    <select
      data-testid="status-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="DRAFT">Draft</option>
      <option value="SENT">Sent</option>
      <option value="PAID">Paid</option>
    </select>
  ),
  InvoiceStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

vi.mock("@/components/invoice/InvoicePreviewPopover", () => ({
  InvoicePreviewPopover: () => <div data-testid="invoice-preview" />,
}));

vi.mock("@/components/tags/TagSelector", () => ({
  TagBadgeList: () => null,
}));

vi.mock("@/components/tags/TagManager", () => ({
  TagManager: () => <div data-testid="tag-manager" />,
}));

vi.mock("@/components/analytics/AnalyticsDashboard", () => ({
  AnalyticsDashboard: () => <div data-testid="analytics-dashboard" />,
}));

vi.mock("@/components/status-logs/StatusLogList", () => ({
  StatusLogList: () => <div data-testid="status-log-list" />,
}));

vi.mock("@/components/status-logs/InvoiceStatusLogsDialog", () => ({
  InvoiceStatusLogsDialog: ({ invoiceId, trigger }: { invoiceId: string; trigger: React.ReactNode }) => (
    <div data-testid={`status-logs-dialog-${invoiceId}`}>{trigger}</div>
  ),
}));

vi.mock("@/components/clients/ClientManager", () => ({
  ClientManager: () => <div data-testid="client-manager" />,
}));

const mockCreateClient = vi.fn().mockResolvedValue("client_new_123");

vi.mock("@/hooks/use-client-profiles", () => ({
  useClientProfiles: () => ({
    clients: [],
    isLoading: false,
  }),
  useClientMutations: () => ({
    createClient: mockCreateClient,
    updateClient: vi.fn(),
    deleteClient: vi.fn(),
    upsertFromInvoice: vi.fn(),
  }),
}));

// Import component after mocks
import InvoicesPage from "./page";

// Helper function to find the dropdown trigger for an invoice
// The dropdown trigger is a ghost button with size "icon" and class h-8 w-8
const findDropdownTriggerForInvoice = (invoiceNumber: string): HTMLElement | null => {
  const invoiceText = screen.getByText(invoiceNumber);
  // The invoice card is a Card component which renders as a div
  const invoiceCard = invoiceText.closest("[class*='rounded-lg']");
  if (!invoiceCard) return null;

  // Find all buttons in the card
  const buttons = invoiceCard.querySelectorAll("button");

  // The dropdown trigger button has these characteristics:
  // - It has class containing "h-8" and "w-8" (ghost icon button)
  // - It's the last button in the row (after status select)
  // - It contains an SVG element
  const dropdownButton = Array.from(buttons).find((btn) => {
    const hasIconSize = btn.className.includes("h-8") && btn.className.includes("w-8");
    const hasSvg = btn.querySelector("svg") !== null;
    return hasIconSize && hasSvg;
  });

  return dropdownButton as HTMLElement | null;
};

describe("InvoicesPage - Move and Lock Functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Move Invoice Menu Option", () => {
    it("renders move to folder option in dropdown menu", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const menuButton = findDropdownTriggerForInvoice("INV-001");
      expect(menuButton).toBeTruthy();

      if (menuButton) {
        await user.click(menuButton);
      }

      await waitFor(() => {
        expect(screen.getByText("Move to Folder")).toBeInTheDocument();
      });
    });

    it("disables move option for locked invoices", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const menuButton = findDropdownTriggerForInvoice("INV-002");
      expect(menuButton).toBeTruthy();

      if (menuButton) {
        await user.click(menuButton);
      }

      await waitFor(() => {
        const moveMenuItem = screen.getByText("Move to Folder").closest("[role='menuitem']");
        expect(moveMenuItem).toHaveAttribute("aria-disabled", "true");
      });
    });
  });

  describe("Lock/Unlock Menu Option", () => {
    it("shows Lock Moving option for unlocked invoices", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const menuButton = findDropdownTriggerForInvoice("INV-001");
      if (menuButton) {
        await user.click(menuButton);
      }

      await waitFor(() => {
        expect(screen.getByText("Lock Moving")).toBeInTheDocument();
      });
    });

    it("shows Unlock Moving option for locked invoices", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const menuButton = findDropdownTriggerForInvoice("INV-002");
      if (menuButton) {
        await user.click(menuButton);
      }

      await waitFor(() => {
        expect(screen.getByText("Unlock Moving")).toBeInTheDocument();
      });
    });

    it("calls toggleMoveLock when lock option is clicked", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const menuButton = findDropdownTriggerForInvoice("INV-001");
      if (menuButton) {
        await user.click(menuButton);
      }

      await waitFor(() => {
        expect(screen.getByText("Lock Moving")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Lock Moving"));

      await waitFor(() => {
        expect(mockToggleMoveLock).toHaveBeenCalledWith({
          invoiceId: "invoice_1",
          isMoveLocked: true,
        });
      });
    });

    it("calls toggleMoveLock to unlock when unlock option is clicked", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const menuButton = findDropdownTriggerForInvoice("INV-002");
      if (menuButton) {
        await user.click(menuButton);
      }

      await waitFor(() => {
        expect(screen.getByText("Unlock Moving")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Unlock Moving"));

      await waitFor(() => {
        expect(mockToggleMoveLock).toHaveBeenCalledWith({
          invoiceId: "invoice_2",
          isMoveLocked: false,
        });
      });
    });
  });

  describe("Lock Icon Display", () => {
    it("displays lock icon for locked invoices", () => {
      render(<InvoicesPage />);

      const lockedInvoiceText = screen.getByText("INV-002");
      const lockedInvoiceCard = lockedInvoiceText.closest("[class*='rounded-lg']") || lockedInvoiceText.closest("[class*='card']");

      const lockIcon = lockedInvoiceCard?.querySelector("[title='Move locked']");
      expect(lockIcon).toBeInTheDocument();
    });

    it("does not display lock icon for unlocked invoices", () => {
      render(<InvoicesPage />);

      const unlockedInvoiceText = screen.getByText("INV-001");
      const unlockedInvoiceCard = unlockedInvoiceText.closest("[class*='rounded-lg']") || unlockedInvoiceText.closest("[class*='card']");

      const lockIcon = unlockedInvoiceCard?.querySelector("[title='Move locked']");
      expect(lockIcon).not.toBeInTheDocument();
    });
  });

  describe("Move Dialog - Single Invoice", () => {
    it("opens move dialog when move option is clicked", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const menuButton = findDropdownTriggerForInvoice("INV-001");
      if (menuButton) {
        await user.click(menuButton);
      }

      await waitFor(() => {
        expect(screen.getByText("Move to Folder")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Move to Folder"));

      await waitFor(() => {
        expect(screen.getByText("Move Invoice")).toBeInTheDocument();
        expect(screen.getByText(/Select a folder for "INV-001"/)).toBeInTheDocument();
      });
    });

    it("shows folder options in move dialog", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const menuButton = findDropdownTriggerForInvoice("INV-001");
      if (menuButton) {
        await user.click(menuButton);
      }

      await waitFor(() => {
        expect(screen.getByText("Move to Folder")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Move to Folder"));

      await waitFor(() => {
        // Dialog should show folder options
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        // The dialog has "Uncategorized" button for moving to no folder
        const dialogContent = screen.getByRole("dialog");
        expect(dialogContent).toHaveTextContent("Uncategorized");
        expect(dialogContent).toHaveTextContent("Client Projects");
        expect(dialogContent).toHaveTextContent("Project Alpha");
        expect(dialogContent).toHaveTextContent("Personal");
      });
    });

    it("closes dialog when cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const menuButton = findDropdownTriggerForInvoice("INV-001");
      if (menuButton) {
        await user.click(menuButton);
      }

      await waitFor(() => {
        expect(screen.getByText("Move to Folder")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Move to Folder"));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("calls moveToFolder when confirm button is clicked", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const menuButton = findDropdownTriggerForInvoice("INV-001");
      if (menuButton) {
        await user.click(menuButton);
      }

      await waitFor(() => {
        expect(screen.getByText("Move to Folder")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Move to Folder"));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Select a different folder (Personal) - find it within the dialog
      const dialog = screen.getByRole("dialog");
      const personalButton = Array.from(dialog.querySelectorAll("button")).find(
        (btn) => btn.textContent?.includes("Personal")
      );
      if (personalButton) {
        await user.click(personalButton);
      }

      // Click Move button
      const moveButton = screen.getByRole("button", { name: "Move" });
      await user.click(moveButton);

      await waitFor(() => {
        expect(mockMoveToFolder).toHaveBeenCalledWith({
          invoiceId: "invoice_1",
          folderId: "folder_2",
        });
      });
    });

    it("can move invoice to uncategorized", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const menuButton = findDropdownTriggerForInvoice("INV-001");
      if (menuButton) {
        await user.click(menuButton);
      }

      await waitFor(() => {
        expect(screen.getByText("Move to Folder")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Move to Folder"));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Select Uncategorized option within the dialog
      const dialog = screen.getByRole("dialog");
      const uncategorizedButton = Array.from(dialog.querySelectorAll("button")).find(
        (btn) => btn.textContent?.includes("Uncategorized")
      );
      if (uncategorizedButton) {
        await user.click(uncategorizedButton);
      }

      // Click Move button
      const moveButton = screen.getByRole("button", { name: "Move" });
      await user.click(moveButton);

      await waitFor(() => {
        expect(mockMoveToFolder).toHaveBeenCalledWith({
          invoiceId: "invoice_1",
          folderId: undefined,
        });
      });
    });

    it("shows disabled move option for locked invoices", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const menuButton = findDropdownTriggerForInvoice("INV-002");
      if (menuButton) {
        await user.click(menuButton);
      }

      await waitFor(() => {
        const moveMenuItem = screen.getByText("Move to Folder").closest("[role='menuitem']");
        expect(moveMenuItem).toHaveAttribute("aria-disabled", "true");
      });
    });
  });

  describe("Bulk Move Functionality", () => {
    it("shows bulk move button when invoices are selected", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const checkboxes = screen.getAllByRole("checkbox");
      const firstInvoiceCheckbox = checkboxes[1]; // Skip the select all checkbox

      await user.click(firstInvoiceCheckbox);

      await waitFor(() => {
        expect(screen.getByText("1 selected")).toBeInTheDocument();
        // Find the Move button in the bulk actions bar
        const moveButtons = screen.getAllByRole("button", { name: /move/i });
        expect(moveButtons.length).toBeGreaterThan(0);
      });
    });

    it("opens bulk move dialog when bulk move button is clicked", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[1]); // First invoice
      await user.click(checkboxes[2]); // Second invoice

      await waitFor(() => {
        expect(screen.getByText("2 selected")).toBeInTheDocument();
      });

      // Find the bulk move button (it has FolderInput icon and "Move" text)
      const bulkActionsBar = screen.getByText("2 selected").closest("div");
      const moveButton = bulkActionsBar?.querySelector("button");
      if (moveButton) {
        // Get the actual Move button by finding buttons with text "Move"
        const buttons = screen.getAllByRole("button");
        const bulkMoveButton = buttons.find((btn) => btn.textContent === "Move");
        if (bulkMoveButton) {
          await user.click(bulkMoveButton);
        }
      }

      await waitFor(() => {
        expect(screen.getByText("Move 2 Invoice(s)")).toBeInTheDocument();
        expect(screen.getByText("Select a destination folder for the selected invoices")).toBeInTheDocument();
      });
    });

    it("calls bulkMoveToFolder when bulk move is confirmed", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[1]);
      await user.click(checkboxes[3]); // Skip locked invoice at index 2

      await waitFor(() => {
        expect(screen.getByText("2 selected")).toBeInTheDocument();
      });

      // Click bulk move button
      const buttons = screen.getAllByRole("button");
      const bulkMoveButton = buttons.find((btn) => btn.textContent === "Move");
      if (bulkMoveButton) {
        await user.click(bulkMoveButton);
      }

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Select a folder
      const dialog = screen.getByRole("dialog");
      const personalButton = Array.from(dialog.querySelectorAll("button")).find(
        (btn) => btn.textContent?.includes("Personal")
      );
      if (personalButton) {
        await user.click(personalButton);
      }

      // Confirm move - find the dialog's Move button
      const dialogButtons = dialog.querySelectorAll("button");
      const confirmMoveButton = Array.from(dialogButtons).find(
        (btn) => btn.textContent === "Move"
      );
      if (confirmMoveButton) {
        await user.click(confirmMoveButton);
      }

      await waitFor(() => {
        expect(mockBulkMoveToFolder).toHaveBeenCalledWith({
          invoiceIds: expect.arrayContaining(["invoice_1", "invoice_3"]),
          folderId: "folder_2",
        });
      });
    });

    it("clears selection after successful bulk move", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[1]);

      await waitFor(() => {
        expect(screen.getByText("1 selected")).toBeInTheDocument();
      });

      // Open and confirm bulk move
      const buttons = screen.getAllByRole("button");
      const bulkMoveButton = buttons.find((btn) => btn.textContent === "Move");
      if (bulkMoveButton) {
        await user.click(bulkMoveButton);
      }

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Confirm move
      const dialog = screen.getByRole("dialog");
      const dialogButtons = dialog.querySelectorAll("button");
      const confirmMoveButton = Array.from(dialogButtons).find(
        (btn) => btn.textContent === "Move"
      );
      if (confirmMoveButton) {
        await user.click(confirmMoveButton);
      }

      await waitFor(() => {
        expect(screen.queryByText("1 selected")).not.toBeInTheDocument();
      });
    });

    it("shows toast message for partially locked bulk moves", async () => {
      mockBulkMoveToFolder.mockResolvedValueOnce({ moved: 1, locked: 1 });

      const user = userEvent.setup();
      render(<InvoicesPage />);

      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[1]);
      await user.click(checkboxes[2]);

      await waitFor(() => {
        expect(screen.getByText("2 selected")).toBeInTheDocument();
      });

      // Open bulk move dialog
      const buttons = screen.getAllByRole("button");
      const bulkMoveButton = buttons.find((btn) => btn.textContent === "Move");
      if (bulkMoveButton) {
        await user.click(bulkMoveButton);
      }

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Confirm move
      const dialog = screen.getByRole("dialog");
      const dialogButtons = dialog.querySelectorAll("button");
      const confirmMoveButton = Array.from(dialogButtons).find(
        (btn) => btn.textContent === "Move"
      );
      if (confirmMoveButton) {
        await user.click(confirmMoveButton);
      }

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "1 invoice(s) moved",
            description: "1 invoice(s) were locked and could not be moved",
          })
        );
      });
    });
  });

  describe("Move Dialog Folder Selection", () => {
    it("highlights currently selected folder in move dialog", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const menuButton = findDropdownTriggerForInvoice("INV-001");
      if (menuButton) {
        await user.click(menuButton);
      }

      await waitFor(() => {
        expect(screen.getByText("Move to Folder")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Move to Folder"));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // The current folder (Client Projects / folder_1) should be highlighted
      const dialog = screen.getByRole("dialog");
      const clientProjectsButton = Array.from(dialog.querySelectorAll("button")).find(
        (btn) => btn.textContent?.includes("Client Projects")
      );

      expect(clientProjectsButton?.className).toContain("bg-primary");
    });

    it("shows nested folders with indentation", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const menuButton = findDropdownTriggerForInvoice("INV-001");
      if (menuButton) {
        await user.click(menuButton);
      }

      await waitFor(() => {
        expect(screen.getByText("Move to Folder")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Move to Folder"));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Check that Project Alpha (nested folder) exists
      const dialog = screen.getByRole("dialog");
      const projectAlphaButton = Array.from(dialog.querySelectorAll("button")).find(
        (btn) => btn.textContent?.includes("Project Alpha")
      );
      expect(projectAlphaButton).toBeTruthy();

      // Nested folders should have padding-left style for indentation
      expect(projectAlphaButton?.style.paddingLeft).toBeTruthy();
    });

    it("allows selecting nested folders as move target", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const menuButton = findDropdownTriggerForInvoice("INV-003");
      if (menuButton) {
        await user.click(menuButton);
      }

      await waitFor(() => {
        expect(screen.getByText("Move to Folder")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Move to Folder"));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Select nested folder
      const dialog = screen.getByRole("dialog");
      const projectAlphaButton = Array.from(dialog.querySelectorAll("button")).find(
        (btn) => btn.textContent?.includes("Project Alpha")
      );
      if (projectAlphaButton) {
        await user.click(projectAlphaButton);
      }

      // Confirm move
      const dialogButtons = dialog.querySelectorAll("button");
      const confirmMoveButton = Array.from(dialogButtons).find(
        (btn) => btn.textContent === "Move"
      );
      if (confirmMoveButton) {
        await user.click(confirmMoveButton);
      }

      await waitFor(() => {
        expect(mockMoveToFolder).toHaveBeenCalledWith({
          invoiceId: "invoice_3",
          folderId: "folder_1a",
        });
      });
    });
  });

  describe("Select All Checkbox", () => {
    it("selects all invoices when select all checkbox is clicked", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const checkboxes = screen.getAllByRole("checkbox");
      const selectAllCheckbox = checkboxes[0];

      await user.click(selectAllCheckbox);

      await waitFor(() => {
        expect(screen.getByText("3 selected")).toBeInTheDocument();
      });
    });

    it("deselects all when clicking select all with all selected", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[0]);

      await waitFor(() => {
        expect(screen.getByText("3 selected")).toBeInTheDocument();
      });

      await user.click(checkboxes[0]);

      await waitFor(() => {
        expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
      });
    });
  });

  describe("Toast Notifications", () => {
    it("shows success toast after successful move", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const menuButton = findDropdownTriggerForInvoice("INV-001");
      if (menuButton) {
        await user.click(menuButton);
      }

      await waitFor(() => {
        expect(screen.getByText("Move to Folder")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Move to Folder"));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Confirm move
      const dialog = screen.getByRole("dialog");
      const dialogButtons = dialog.querySelectorAll("button");
      const confirmMoveButton = Array.from(dialogButtons).find(
        (btn) => btn.textContent === "Move"
      );
      if (confirmMoveButton) {
        await user.click(confirmMoveButton);
      }

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({ title: "Invoice moved" });
      });
    });

    it("shows success toast after toggling lock", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const menuButton = findDropdownTriggerForInvoice("INV-001");
      if (menuButton) {
        await user.click(menuButton);
      }

      await waitFor(() => {
        expect(screen.getByText("Lock Moving")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Lock Moving"));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({ title: "Invoice locked" });
      });
    });

    it("shows error toast when move fails", async () => {
      mockMoveToFolder.mockRejectedValueOnce(new Error("Move failed"));

      const user = userEvent.setup();
      render(<InvoicesPage />);

      const menuButton = findDropdownTriggerForInvoice("INV-001");
      if (menuButton) {
        await user.click(menuButton);
      }

      await waitFor(() => {
        expect(screen.getByText("Move to Folder")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Move to Folder"));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Confirm move
      const dialog = screen.getByRole("dialog");
      const dialogButtons = dialog.querySelectorAll("button");
      const confirmMoveButton = Array.from(dialogButtons).find(
        (btn) => btn.textContent === "Move"
      );
      if (confirmMoveButton) {
        await user.click(confirmMoveButton);
      }

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Move failed",
          variant: "destructive",
        });
      });
    });
  });

  describe("Bulk Delete Functionality", () => {
    it("shows bulk delete button when invoices are selected", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const checkboxes = screen.getAllByRole("checkbox");
      const firstInvoiceCheckbox = checkboxes[1];

      await user.click(firstInvoiceCheckbox);

      await waitFor(() => {
        expect(screen.getByText("1 selected")).toBeInTheDocument();
        // Find the Delete button in the bulk actions bar
        const deleteButton = screen.getByRole("button", { name: /delete/i });
        expect(deleteButton).toBeInTheDocument();
      });
    });

    it("opens bulk delete confirmation dialog when delete button is clicked", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[1]);
      await user.click(checkboxes[2]);

      await waitFor(() => {
        expect(screen.getByText("2 selected")).toBeInTheDocument();
      });

      // Find and click the Delete button
      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText(/Delete 2 Invoice\(s\)\?/)).toBeInTheDocument();
        expect(screen.getByText(/This will permanently delete the selected invoices/)).toBeInTheDocument();
      });
    });

    it("calls bulkDeleteInvoices when bulk delete is confirmed", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[1]);
      await user.click(checkboxes[3]);

      await waitFor(() => {
        expect(screen.getByText("2 selected")).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Confirm delete
      const dialog = screen.getByRole("dialog");
      const confirmDeleteButton = Array.from(dialog.querySelectorAll("button")).find(
        (btn) => btn.textContent?.includes("Delete 2 Invoice(s)")
      );
      if (confirmDeleteButton) {
        await user.click(confirmDeleteButton);
      }

      await waitFor(() => {
        expect(mockBulkDeleteInvoices).toHaveBeenCalledWith({
          invoiceIds: expect.arrayContaining(["invoice_1", "invoice_3"]),
        });
      });
    });

    it("closes dialog when cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[1]);

      await waitFor(() => {
        expect(screen.getByText("1 selected")).toBeInTheDocument();
      });

      // Click delete button to open dialog
      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Click cancel
      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText(/Delete 1 Invoice\(s\)\?/)).not.toBeInTheDocument();
      });
    });

    it("clears selection after successful bulk delete", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[1]);

      await waitFor(() => {
        expect(screen.getByText("1 selected")).toBeInTheDocument();
      });

      // Open and confirm bulk delete
      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Confirm delete
      const dialog = screen.getByRole("dialog");
      const confirmDeleteButton = Array.from(dialog.querySelectorAll("button")).find(
        (btn) => btn.textContent?.includes("Delete 1 Invoice(s)")
      );
      if (confirmDeleteButton) {
        await user.click(confirmDeleteButton);
      }

      await waitFor(() => {
        expect(screen.queryByText("1 selected")).not.toBeInTheDocument();
      });
    });
  });

  describe("New Invoice Button in All Folder", () => {
    it("opens new client form dialog when clicking New Invoice in All folder view", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      // Ensure we're in "All" folder (default)
      const folderTree = screen.getByTestId("folder-tree");
      const allButton = folderTree.querySelector("button");
      if (allButton) {
        await user.click(allButton);
      }

      // Click New Invoice button
      const newInvoiceButton = screen.getByRole("button", { name: /new invoice/i });
      await user.click(newInvoiceButton);

      await waitFor(() => {
        expect(screen.getByText("Create New Client")).toBeInTheDocument();
        expect(screen.getByText(/Enter client details to create a new invoice/)).toBeInTheDocument();
      });
    });

    it("opens new client form dialog when clicking New Invoice in Uncategorized folder", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      // Navigate to Uncategorized folder
      const folderTree = screen.getByTestId("folder-tree");
      const buttons = folderTree.querySelectorAll("button");
      const uncategorizedButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes("Uncategorized")
      );
      if (uncategorizedButton) {
        await user.click(uncategorizedButton);
      }

      // Click New Invoice button
      const newInvoiceButton = screen.getByRole("button", { name: /new invoice/i });
      await user.click(newInvoiceButton);

      await waitFor(() => {
        expect(screen.getByText("Create New Client")).toBeInTheDocument();
      });
    });

    it("shows form fields in new client dialog", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      // Click New Invoice button (we're in "All" view by default)
      const newInvoiceButton = screen.getByRole("button", { name: /new invoice/i });
      await user.click(newInvoiceButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/contact name/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/company or business name/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/client@example.com/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/\+1 \(555\) 123-4567/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/123 main street/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/new york/i)).toBeInTheDocument();
      });
    });

    it("calls createClient when form is submitted", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      // Click New Invoice button
      const newInvoiceButton = screen.getByRole("button", { name: /new invoice/i });
      await user.click(newInvoiceButton);

      await waitFor(() => {
        expect(screen.getByText("Create New Client")).toBeInTheDocument();
      });

      // Fill in the form
      const nameInput = screen.getByPlaceholderText(/contact name/i);
      const companyInput = screen.getByPlaceholderText(/company or business name/i);
      const emailInput = screen.getByPlaceholderText(/client@example.com/i);

      await user.type(nameInput, "John Doe");
      await user.type(companyInput, "Acme Corp");
      await user.type(emailInput, "john@acme.com");

      // Submit the form
      const createButton = screen.getByRole("button", { name: /create & continue/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockCreateClient).toHaveBeenCalledWith({
          name: "John Doe",
          companyName: "Acme Corp",
          email: "john@acme.com",
          address: undefined,
          city: undefined,
          state: undefined,
          postalCode: undefined,
          country: undefined,
          phone: undefined,
        });
      });
    });

    it("shows validation error when name is empty", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      // Click New Invoice button
      const newInvoiceButton = screen.getByRole("button", { name: /new invoice/i });
      await user.click(newInvoiceButton);

      await waitFor(() => {
        expect(screen.getByText("Create New Client")).toBeInTheDocument();
      });

      // Try to submit without filling name
      const createButton = screen.getByRole("button", { name: /create & continue/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Name required",
          description: "Please enter a client name",
          variant: "destructive",
        });
      });
    });

    it("redirects to home page after creating client", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      // Click New Invoice button
      const newInvoiceButton = screen.getByRole("button", { name: /new invoice/i });
      await user.click(newInvoiceButton);

      await waitFor(() => {
        expect(screen.getByText("Create New Client")).toBeInTheDocument();
      });

      // Fill in the form
      const nameInput = screen.getByPlaceholderText(/contact name/i);
      await user.type(nameInput, "Test Client");

      // Submit the form
      const createButton = screen.getByRole("button", { name: /create & continue/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockRouterPush).toHaveBeenCalledWith("/");
      });
    });

    it("closes dialog when cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(<InvoicesPage />);

      // Click New Invoice button
      const newInvoiceButton = screen.getByRole("button", { name: /new invoice/i });
      await user.click(newInvoiceButton);

      await waitFor(() => {
        expect(screen.getByText("Create New Client")).toBeInTheDocument();
      });

      // Click cancel
      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText("Create New Client")).not.toBeInTheDocument();
      });
    });
  });
});
