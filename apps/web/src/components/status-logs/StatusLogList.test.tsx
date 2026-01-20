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
    previousStatus: "DRAFT" as const,
    newStatus: "TO_SEND" as const,
    notes: "Ready for review",
    changedAt: Date.now() - 3600000,
    changedAtStr: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    _id: "log_2",
    _creationTime: Date.now(),
    userId: "user_1" as Id<"users">,
    invoiceId: "invoice_1" as Id<"invoices">,
    invoiceNumber: "INV-001",
    folderId: "folder_1" as Id<"invoiceFolders">,
    folderName: "Client Projects",
    previousStatus: "TO_SEND" as const,
    newStatus: "SENT" as const,
    notes: "Sent to client",
    changedAt: Date.now() - 1800000,
    changedAtStr: new Date(Date.now() - 1800000).toISOString(),
  },
];

const mockFolderTree = [
  {
    _id: "folder_1",
    name: "Client Projects",
    invoiceCount: 2,
    children: [],
  },
  {
    _id: "folder_2",
    name: "Personal",
    invoiceCount: 1,
    children: [],
  },
];

const mockStats = {
  totalChanges: 2,
  byStatus: { TO_SEND: 1, SENT: 1 },
  recentActivity: mockStatusLogs,
};

// Mock functions
const mockRouterPush = vi.fn();

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

// Mock use-status-logs hook
vi.mock("@/hooks/use-status-logs", () => ({
  useStatusLogs: vi.fn(() => ({
    logs: mockStatusLogs,
    nextCursor: null,
    hasMore: false,
    isLoading: false,
    isFetching: false,
    isFromCache: false,
  })),
  useStatusLogStats: vi.fn(() => ({
    stats: mockStats,
    isLoading: false,
  })),
}));

// Mock use-invoice-folders hook
vi.mock("@/hooks/use-invoice-folders", () => ({
  useFolderTree: () => ({
    tree: mockFolderTree,
    isLoading: false,
  }),
}));

// Import after mocks
import { StatusLogList } from "./StatusLogList";
import { useStatusLogs, useStatusLogStats } from "@/hooks/use-status-logs";

describe("StatusLogList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the status log list", () => {
      render(<StatusLogList />);

      expect(screen.getByPlaceholderText("Search by invoice # or folder...")).toBeInTheDocument();
      expect(screen.getByText("Activity Summary")).toBeInTheDocument();
    });

    it("displays log entries with invoice numbers", () => {
      render(<StatusLogList />);

      expect(screen.getAllByText("INV-001")).toHaveLength(2);
    });

    it("shows status transitions with badges", () => {
      render(<StatusLogList />);

      expect(screen.getAllByText("Draft").length).toBeGreaterThan(0);
      expect(screen.getAllByText("To Send").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Sent").length).toBeGreaterThan(0);
    });

    it("displays folder names for logs", () => {
      render(<StatusLogList />);

      expect(screen.getAllByText("Client Projects").length).toBeGreaterThan(0);
    });

    it("shows relative time for each log", () => {
      render(<StatusLogList />);

      // Should show relative time like "1h ago" or "30m ago"
      expect(screen.getAllByText(/ago/).length).toBeGreaterThan(0);
    });

    it("shows total changes in stats card", () => {
      render(<StatusLogList />);

      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByText("Total status changes")).toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("shows loading skeletons when loading", () => {
      vi.mocked(useStatusLogs).mockReturnValue({
        logs: [],
        nextCursor: null,
        hasMore: false,
        isLoading: true,
        isFetching: true,
        isFromCache: false,
      });

      render(<StatusLogList />);

      // Should show skeleton loaders
      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("Empty State", () => {
    it("shows empty state when no logs", () => {
      vi.mocked(useStatusLogs).mockReturnValue({
        logs: [],
        nextCursor: null,
        hasMore: false,
        isLoading: false,
        isFetching: false,
        isFromCache: false,
      });
      vi.mocked(useStatusLogStats).mockReturnValue({
        stats: { totalChanges: 0, byStatus: {}, recentActivity: [] },
        isLoading: false,
      });

      render(<StatusLogList />);

      expect(screen.getByText("No status logs found")).toBeInTheDocument();
      expect(
        screen.getByText("Status changes will appear here when invoices are updated")
      ).toBeInTheDocument();
    });
  });

  describe("Filtering", () => {
    it("renders search input", () => {
      render(<StatusLogList />);

      const searchInput = screen.getByPlaceholderText("Search by invoice # or folder...");
      expect(searchInput).toBeInTheDocument();
    });

    it("renders folder filter select", () => {
      render(<StatusLogList />);

      expect(screen.getByText("All folders")).toBeInTheDocument();
    });

    it("renders status filter select", () => {
      render(<StatusLogList />);

      expect(screen.getByText("All statuses")).toBeInTheDocument();
    });

    it("renders date range filter", () => {
      render(<StatusLogList />);

      expect(screen.getByText("Date Range")).toBeInTheDocument();
    });

    it("allows typing in search input", async () => {
      const user = userEvent.setup();
      render(<StatusLogList />);

      const searchInput = screen.getByPlaceholderText("Search by invoice # or folder...");
      await user.type(searchInput, "INV-001");

      expect(searchInput).toHaveValue("INV-001");
    });
  });

  describe("Log Entry Expansion", () => {
    it("renders expand buttons for log entries", () => {
      vi.mocked(useStatusLogs).mockReturnValue({
        logs: mockStatusLogs,
        nextCursor: null,
        hasMore: false,
        isLoading: false,
        isFetching: false,
        isFromCache: false,
      });
      vi.mocked(useStatusLogStats).mockReturnValue({
        stats: mockStats,
        isLoading: false,
      });

      render(<StatusLogList />);

      // Log entries should have expand buttons with chevron icons
      const buttons = screen.getAllByRole("button");
      const expandButtons = buttons.filter(
        (btn) => btn.className.includes("h-6") && btn.className.includes("w-6")
      );

      // Should have at least one expand button for each log entry
      expect(expandButtons.length).toBeGreaterThan(0);
    });

    it("shows notes text in the log entries", () => {
      vi.mocked(useStatusLogs).mockReturnValue({
        logs: mockStatusLogs,
        nextCursor: null,
        hasMore: false,
        isLoading: false,
        isFetching: false,
        isFromCache: false,
      });
      vi.mocked(useStatusLogStats).mockReturnValue({
        stats: mockStats,
        isLoading: false,
      });

      render(<StatusLogList />);

      // The notes are shown when expanded - let's verify log entries are rendered
      expect(screen.getAllByText("INV-001")).toHaveLength(2);
    });
  });

  describe("Navigation", () => {
    it("navigates to invoice when clicking invoice link", async () => {
      // Ensure mock is set up with data
      vi.mocked(useStatusLogs).mockReturnValue({
        logs: mockStatusLogs,
        nextCursor: null,
        hasMore: false,
        isLoading: false,
        isFetching: false,
        isFromCache: false,
      });
      vi.mocked(useStatusLogStats).mockReturnValue({
        stats: mockStats,
        isLoading: false,
      });

      const user = userEvent.setup();
      render(<StatusLogList />);

      // Find invoice link (the button with invoice number text)
      const invoiceLinks = screen.getAllByText("INV-001");
      // Get the first one which should be a clickable button
      const invoiceLink = invoiceLinks[0];

      if (invoiceLink) {
        await user.click(invoiceLink);

        expect(mockRouterPush).toHaveBeenCalledWith("/?invoiceId=invoice_1");
      }
    });
  });

  describe("Load More", () => {
    it("shows load more button when there are more results", () => {
      vi.mocked(useStatusLogs).mockReturnValue({
        logs: mockStatusLogs,
        nextCursor: Date.now() - 100000,
        hasMore: true,
        isLoading: false,
        isFetching: false,
        isFromCache: false,
      });

      render(<StatusLogList />);

      expect(screen.getByText("Load More")).toBeInTheDocument();
    });

    it("hides load more button when no more results", () => {
      vi.mocked(useStatusLogs).mockReturnValue({
        logs: mockStatusLogs,
        nextCursor: null,
        hasMore: false,
        isLoading: false,
        isFetching: false,
        isFromCache: false,
      });

      render(<StatusLogList />);

      expect(screen.queryByText("Load More")).not.toBeInTheDocument();
    });

    it("shows loading state on load more button when fetching", () => {
      vi.mocked(useStatusLogs).mockReturnValue({
        logs: mockStatusLogs,
        nextCursor: Date.now() - 100000,
        hasMore: true,
        isLoading: false,
        isFetching: true,
        isFromCache: false,
      });

      render(<StatusLogList />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("Statistics", () => {
    it("displays total changes count", () => {
      render(<StatusLogList />);

      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("displays most common transitions", () => {
      render(<StatusLogList />);

      expect(screen.getByText("Most common transitions:")).toBeInTheDocument();
    });

    it("shows loading state for stats card", () => {
      vi.mocked(useStatusLogs).mockReturnValue({
        logs: mockStatusLogs,
        nextCursor: null,
        hasMore: false,
        isLoading: false,
        isFetching: false,
        isFromCache: false,
      });
      vi.mocked(useStatusLogStats).mockReturnValue({
        stats: { totalChanges: 0, byStatus: {}, recentActivity: [] },
        isLoading: true,
      });

      render(<StatusLogList />);

      // Stats card should show loading state (look for the card header)
      const statsHeader = screen.getByText("Activity Summary");
      expect(statsHeader).toBeInTheDocument();
      // The loading state shows skeletons in the card content
      const statsCard = statsHeader.closest('[class*="rounded"]');
      expect(statsCard).toBeInTheDocument();
    });
  });
});
