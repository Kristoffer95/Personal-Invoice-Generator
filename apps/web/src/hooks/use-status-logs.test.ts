import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
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
    changedAt: Date.now() - 3600000, // 1 hour ago
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
    changedAt: Date.now() - 1800000, // 30 minutes ago
    changedAtStr: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    _id: "log_3",
    _creationTime: Date.now(),
    userId: "user_1" as Id<"users">,
    invoiceId: "invoice_2" as Id<"invoices">,
    invoiceNumber: "INV-002",
    folderId: undefined,
    folderName: undefined,
    previousStatus: undefined,
    newStatus: "DRAFT" as const,
    notes: "Invoice created",
    changedAt: Date.now() - 86400000, // 1 day ago
    changedAtStr: new Date(Date.now() - 86400000).toISOString(),
  },
];

const mockStats = {
  totalChanges: 3,
  byStatus: { DRAFT: 1, TO_SEND: 1, SENT: 1 },
  recentActivity: mockStatusLogs,
};

// Mock Convex hooks
vi.mock("convex/react", () => ({
  useQuery: vi.fn((_, args) => {
    // Return different data based on the query
    if (args?.invoiceId) {
      return mockStatusLogs.filter(log => log.invoiceId === args.invoiceId);
    }
    return { logs: mockStatusLogs, nextCursor: null };
  }),
  useMutation: vi.fn(() => vi.fn().mockResolvedValue("log_new")),
}));

// Mock Convex API
vi.mock("@invoice-generator/backend/convex/_generated/api", () => ({
  api: {
    statusLogs: {
      listStatusLogs: "listStatusLogs",
      getInvoiceStatusLogs: "getInvoiceStatusLogs",
      getStatusLogStats: "getStatusLogStats",
      createStatusLog: "createStatusLog",
      deleteLogsForInvoice: "deleteLogsForInvoice",
    },
  },
}));

// Import after mocks
import { useQuery, useMutation } from "convex/react";
import {
  useStatusLogs,
  useInvoiceStatusLogs,
  useStatusLogStats,
  useStatusLogMutations,
  invalidateStatusLogCache,
} from "./use-status-logs";

describe("use-status-logs hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateStatusLogCache();
  });

  describe("useStatusLogs", () => {
    it("returns logs from the query", () => {
      const mockUseQuery = vi.mocked(useQuery);
      mockUseQuery.mockReturnValue({ logs: mockStatusLogs, nextCursor: null });

      const { result } = renderHook(() => useStatusLogs());

      expect(result.current.logs).toHaveLength(3);
      expect(result.current.hasMore).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it("handles loading state when query is undefined", () => {
      const mockUseQuery = vi.mocked(useQuery);
      mockUseQuery.mockReturnValue(undefined);

      const { result } = renderHook(() => useStatusLogs());

      expect(result.current.logs).toHaveLength(0);
      expect(result.current.isLoading).toBe(true);
    });

    it("passes filter options to the query", () => {
      const mockUseQuery = vi.mocked(useQuery);
      mockUseQuery.mockReturnValue({ logs: mockStatusLogs, nextCursor: null });

      const filterOptions = {
        folderId: "folder_1" as Id<"invoiceFolders">,
        status: "SENT" as const,
        searchQuery: "INV",
      };

      renderHook(() => useStatusLogs(filterOptions));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        filterOptions
      );
    });

    it("indicates when there are more results", () => {
      const mockUseQuery = vi.mocked(useQuery);
      mockUseQuery.mockReturnValue({
        logs: mockStatusLogs,
        nextCursor: Date.now() - 100000,
      });

      const { result } = renderHook(() => useStatusLogs());

      expect(result.current.hasMore).toBe(true);
      expect(result.current.nextCursor).toBeTruthy();
    });

    it("returns empty array when query returns empty results", () => {
      const mockUseQuery = vi.mocked(useQuery);
      mockUseQuery.mockReturnValue({ logs: [], nextCursor: null });

      const { result } = renderHook(() => useStatusLogs());

      expect(result.current.logs).toHaveLength(0);
      expect(result.current.hasMore).toBe(false);
    });
  });

  describe("useInvoiceStatusLogs", () => {
    it("returns logs for a specific invoice", () => {
      const invoiceLogs = mockStatusLogs.filter(log => log.invoiceId === "invoice_1");
      const mockUseQuery = vi.mocked(useQuery);
      mockUseQuery.mockReturnValue(invoiceLogs);

      const { result } = renderHook(() =>
        useInvoiceStatusLogs("invoice_1" as Id<"invoices">)
      );

      expect(result.current.logs).toHaveLength(2);
      expect(result.current.isLoading).toBe(false);
    });

    it("skips query when invoiceId is undefined", () => {
      const mockUseQuery = vi.mocked(useQuery);

      renderHook(() => useInvoiceStatusLogs(undefined));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        "skip"
      );
    });

    it("handles loading state correctly", () => {
      const mockUseQuery = vi.mocked(useQuery);
      mockUseQuery.mockReturnValue(undefined);

      const { result } = renderHook(() =>
        useInvoiceStatusLogs("invoice_1" as Id<"invoices">)
      );

      expect(result.current.logs).toHaveLength(0);
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe("useStatusLogStats", () => {
    it("returns statistics about status logs", () => {
      const mockUseQuery = vi.mocked(useQuery);
      mockUseQuery.mockReturnValue(mockStats);

      const { result } = renderHook(() => useStatusLogStats());

      expect(result.current.stats.totalChanges).toBe(3);
      expect(result.current.stats.byStatus).toEqual({ DRAFT: 1, TO_SEND: 1, SENT: 1 });
      expect(result.current.isLoading).toBe(false);
    });

    it("returns default stats when query is loading", () => {
      const mockUseQuery = vi.mocked(useQuery);
      mockUseQuery.mockReturnValue(undefined);

      const { result } = renderHook(() => useStatusLogStats());

      expect(result.current.stats.totalChanges).toBe(0);
      expect(result.current.stats.byStatus).toEqual({});
      expect(result.current.isLoading).toBe(true);
    });

    it("passes date filter options to the query", () => {
      const mockUseQuery = vi.mocked(useQuery);
      mockUseQuery.mockReturnValue(mockStats);

      const dateFrom = Date.now() - 86400000;
      const dateTo = Date.now();

      renderHook(() => useStatusLogStats({ dateFrom, dateTo }));

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        { dateFrom, dateTo }
      );
    });
  });

  describe("useStatusLogMutations", () => {
    it("returns mutation functions", () => {
      const { result } = renderHook(() => useStatusLogMutations());

      expect(typeof result.current.createStatusLog).toBe("function");
      expect(typeof result.current.deleteLogsForInvoice).toBe("function");
    });

    it("wraps mutations with cache invalidation", async () => {
      const mockMutation = vi.fn().mockResolvedValue("log_1");
      const mockUseMutation = vi.mocked(useMutation);
      mockUseMutation.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useStatusLogMutations());

      await result.current.createStatusLog({
        invoiceId: "invoice_1" as Id<"invoices">,
        invoiceNumber: "INV-001",
        newStatus: "SENT" as const,
      });

      expect(mockMutation).toHaveBeenCalled();
    });
  });

  describe("invalidateStatusLogCache", () => {
    it("clears the cache without error", () => {
      // Should not throw
      expect(() => invalidateStatusLogCache()).not.toThrow();
    });
  });
});
