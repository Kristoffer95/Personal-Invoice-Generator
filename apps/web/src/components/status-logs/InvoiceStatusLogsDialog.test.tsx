import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";

// Mock data
const mockStatusLogs = [
  {
    _id: "log_1",
    _creationTime: Date.now(),
    userId: "user_1" as Id<"users">,
    invoiceId: "invoice_1" as Id<"invoices">,
    invoiceNumber: "INV-001",
    folderId: "folder_1" as Id<"invoiceFolders">,
    folderName: "Client Projects",
    previousStatus: undefined,
    newStatus: "DRAFT" as const,
    notes: "Invoice created",
    changedAt: Date.now() - 86400000, // 1 day ago
    changedAtStr: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    _id: "log_2",
    _creationTime: Date.now(),
    userId: "user_1" as Id<"users">,
    invoiceId: "invoice_1" as Id<"invoices">,
    invoiceNumber: "INV-001",
    folderId: "folder_1" as Id<"invoiceFolders">,
    folderName: "Client Projects",
    previousStatus: "DRAFT" as const,
    newStatus: "SENT" as const,
    notes: "Sent to client via email",
    changedAt: Date.now() - 3600000, // 1 hour ago
    changedAtStr: new Date(Date.now() - 3600000).toISOString(),
  },
];

// Mock use-status-logs hook
const mockUseInvoiceStatusLogs = vi.fn(() => ({
  logs: mockStatusLogs,
  isLoading: false,
}));

vi.mock("@/hooks/use-status-logs", () => ({
  useInvoiceStatusLogs: (invoiceId: Id<"invoices"> | undefined) =>
    mockUseInvoiceStatusLogs(invoiceId),
}));

// Import after mocks
import { InvoiceStatusLogsDialog } from "./InvoiceStatusLogsDialog";

describe("InvoiceStatusLogsDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseInvoiceStatusLogs.mockReturnValue({
      logs: mockStatusLogs,
      isLoading: false,
    });
  });

  describe("Dialog Trigger", () => {
    it("renders default trigger button", () => {
      render(
        <InvoiceStatusLogsDialog
          invoiceId={"invoice_1" as Id<"invoices">}
          invoiceNumber="INV-001"
        />
      );

      expect(screen.getByText("View Logs")).toBeInTheDocument();
    });

    it("renders custom trigger when provided", () => {
      render(
        <InvoiceStatusLogsDialog
          invoiceId={"invoice_1" as Id<"invoices">}
          invoiceNumber="INV-001"
          trigger={<button>Custom Trigger</button>}
        />
      );

      expect(screen.getByText("Custom Trigger")).toBeInTheDocument();
    });
  });

  describe("Dialog Open/Close", () => {
    it("opens dialog when trigger is clicked", async () => {
      const user = userEvent.setup();
      render(
        <InvoiceStatusLogsDialog
          invoiceId={"invoice_1" as Id<"invoices">}
          invoiceNumber="INV-001"
        />
      );

      await user.click(screen.getByText("View Logs"));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByText("Status History")).toBeInTheDocument();
      });
    });

    it("shows invoice number in dialog title", async () => {
      const user = userEvent.setup();
      render(
        <InvoiceStatusLogsDialog
          invoiceId={"invoice_1" as Id<"invoices">}
          invoiceNumber="INV-001"
        />
      );

      await user.click(screen.getByText("View Logs"));

      await waitFor(() => {
        expect(screen.getByText("- INV-001")).toBeInTheDocument();
      });
    });

    it("closes dialog when close button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <InvoiceStatusLogsDialog
          invoiceId={"invoice_1" as Id<"invoices">}
          invoiceNumber="INV-001"
        />
      );

      await user.click(screen.getByText("View Logs"));

      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Find and click close button
      const closeButton = screen.getByRole("button", { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });
  });

  describe("Loading State", () => {
    it("shows loading skeletons when data is loading", async () => {
      mockUseInvoiceStatusLogs.mockReturnValue({
        logs: [],
        isLoading: true,
      });

      const user = userEvent.setup();
      render(
        <InvoiceStatusLogsDialog
          invoiceId={"invoice_1" as Id<"invoices">}
          invoiceNumber="INV-001"
        />
      );

      await user.click(screen.getByText("View Logs"));

      await waitFor(() => {
        const skeletons = document.querySelectorAll(".animate-pulse");
        expect(skeletons.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Empty State", () => {
    it("shows empty state when no logs exist", async () => {
      mockUseInvoiceStatusLogs.mockReturnValue({
        logs: [],
        isLoading: false,
      });

      const user = userEvent.setup();
      render(
        <InvoiceStatusLogsDialog
          invoiceId={"invoice_1" as Id<"invoices">}
          invoiceNumber="INV-001"
        />
      );

      await user.click(screen.getByText("View Logs"));

      await waitFor(() => {
        expect(screen.getByText("No status history available")).toBeInTheDocument();
      });
    });
  });

  describe("Log Entries Display", () => {
    it("displays all log entries", async () => {
      const user = userEvent.setup();
      render(
        <InvoiceStatusLogsDialog
          invoiceId={"invoice_1" as Id<"invoices">}
          invoiceNumber="INV-001"
        />
      );

      await user.click(screen.getByText("View Logs"));

      await waitFor(() => {
        // Should show status badges (may be multiple as transitions show both previous and new status)
        expect(screen.getAllByText("Draft").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Sent").length).toBeGreaterThan(0);
      });
    });

    it("shows status transitions correctly", async () => {
      const user = userEvent.setup();
      render(
        <InvoiceStatusLogsDialog
          invoiceId={"invoice_1" as Id<"invoices">}
          invoiceNumber="INV-001"
        />
      );

      await user.click(screen.getByText("View Logs"));

      await waitFor(() => {
        // Should show "Created as" for first entry without previousStatus
        expect(screen.getByText("Created as")).toBeInTheDocument();
      });
    });

    it("displays notes for log entries", async () => {
      const user = userEvent.setup();
      render(
        <InvoiceStatusLogsDialog
          invoiceId={"invoice_1" as Id<"invoices">}
          invoiceNumber="INV-001"
        />
      );

      await user.click(screen.getByText("View Logs"));

      await waitFor(() => {
        expect(screen.getByText("Invoice created")).toBeInTheDocument();
        expect(screen.getByText("Sent to client via email")).toBeInTheDocument();
      });
    });

    it("shows formatted timestamps", async () => {
      const user = userEvent.setup();
      render(
        <InvoiceStatusLogsDialog
          invoiceId={"invoice_1" as Id<"invoices">}
          invoiceNumber="INV-001"
        />
      );

      await user.click(screen.getByText("View Logs"));

      await waitFor(() => {
        // Should show relative time like "1 day ago" or "1 hour ago" (multiple entries)
        expect(screen.getAllByText(/ago/).length).toBeGreaterThan(0);
      });
    });

    it("displays total log count", async () => {
      const user = userEvent.setup();
      render(
        <InvoiceStatusLogsDialog
          invoiceId={"invoice_1" as Id<"invoices">}
          invoiceNumber="INV-001"
        />
      );

      await user.click(screen.getByText("View Logs"));

      await waitFor(() => {
        expect(screen.getByText("2 status changes recorded")).toBeInTheDocument();
      });
    });
  });

  describe("Timeline Display", () => {
    it("shows timeline with proper visual indicators", async () => {
      const user = userEvent.setup();
      render(
        <InvoiceStatusLogsDialog
          invoiceId={"invoice_1" as Id<"invoices">}
          invoiceNumber="INV-001"
        />
      );

      await user.click(screen.getByText("View Logs"));

      await waitFor(() => {
        // Timeline should have visual elements (relative positioning for timeline)
        const dialog = screen.getByRole("dialog");
        const timelineItems = dialog.querySelectorAll(".relative.pl-8");
        expect(timelineItems.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Query Behavior", () => {
    it("fetches logs when dialog is opened", async () => {
      const user = userEvent.setup();

      render(
        <InvoiceStatusLogsDialog
          invoiceId={"invoice_1" as Id<"invoices">}
          invoiceNumber="INV-001"
        />
      );

      // Open dialog
      await user.click(screen.getByText("View Logs"));

      await waitFor(() => {
        // After opening, query should be called with the invoiceId
        expect(mockUseInvoiceStatusLogs).toHaveBeenCalled();
      });
    });
  });

  describe("Accessibility", () => {
    it("has proper dialog role and title", async () => {
      const user = userEvent.setup();
      render(
        <InvoiceStatusLogsDialog
          invoiceId={"invoice_1" as Id<"invoices">}
          invoiceNumber="INV-001"
        />
      );

      await user.click(screen.getByText("View Logs"));

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(dialog).toBeInTheDocument();
      });
    });

    it("has a descriptive dialog description", async () => {
      const user = userEvent.setup();
      render(
        <InvoiceStatusLogsDialog
          invoiceId={"invoice_1" as Id<"invoices">}
          invoiceNumber="INV-001"
        />
      );

      await user.click(screen.getByText("View Logs"));

      await waitFor(() => {
        expect(
          screen.getByText("Complete history of status changes for this invoice")
        ).toBeInTheDocument();
      });
    });
  });
});
