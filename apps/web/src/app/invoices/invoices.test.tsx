import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock clerk
vi.mock("@clerk/nextjs", () => ({
  UserButton: () => null,
}));

// Mock convex/react
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (query: unknown, args?: unknown) => {
    if (args === "skip") return undefined;
    return mockUseQuery(query);
  },
  useMutation: () => mockUseMutation(),
}));

// Mock the API import
vi.mock("@invoice-generator/backend/convex/_generated/api", () => ({
  api: {
    invoices: {
      listInvoices: "invoices:listInvoices",
      listRecent: "invoices:listRecent",
      getInvoice: "invoices:getInvoice",
      getUnfiled: "invoices:getUnfiled",
      createInvoice: "invoices:createInvoice",
      updateInvoice: "invoices:updateInvoice",
      removeInvoice: "invoices:removeInvoice",
      duplicateInvoice: "invoices:duplicateInvoice",
      moveToFolder: "invoices:moveToFolder",
      updateStatus: "invoices:updateStatus",
      getNextInvoiceNumberForFolder: "invoices:getNextInvoiceNumberForFolder",
    },
    invoiceFolders: {
      listWithCounts: "invoiceFolders:listWithCounts",
      getFolder: "invoiceFolders:getFolder",
      getChildren: "invoiceFolders:getChildren",
      createFolder: "invoiceFolders:createFolder",
      updateFolder: "invoiceFolders:updateFolder",
      removeFolder: "invoiceFolders:removeFolder",
    },
    userProfiles: {
      getNextInvoiceNumber: "userProfiles:getNextInvoiceNumber",
      incrementInvoiceNumber: "userProfiles:incrementInvoiceNumber",
      getProfile: "userProfiles:getProfile",
      upsert: "userProfiles:upsert",
    },
  },
}));

// Import after mocks
import { useFolderMutations } from "@/hooks/use-invoice-folders";
import { useInvoiceMutations } from "@/hooks/use-invoices";

describe("Folder Creation Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useFolderMutations - createFolder", () => {
    it("should successfully create a folder with auto-provisioning", async () => {
      const mockCreateFolder = vi.fn().mockResolvedValue("folder_new_123");
      mockUseMutation.mockReturnValue(mockCreateFolder);

      const { result } = renderHook(() => useFolderMutations());

      await act(async () => {
        const folderId = await result.current.createFolder({ name: "New Client Folder" });
        expect(folderId).toBe("folder_new_123");
      });

      expect(mockCreateFolder).toHaveBeenCalledWith({ name: "New Client Folder" });
    });

    it("should handle folder creation failure gracefully", async () => {
      const mockCreateFolder = vi.fn().mockRejectedValue(new Error("Failed to create folder"));
      mockUseMutation.mockReturnValue(mockCreateFolder);

      const { result } = renderHook(() => useFolderMutations());

      await expect(
        result.current.createFolder({ name: "Test Folder" })
      ).rejects.toThrow("Failed to create folder");
    });

    it("should handle unauthorized error", async () => {
      const mockCreateFolder = vi.fn().mockRejectedValue(new Error("Unauthorized"));
      mockUseMutation.mockReturnValue(mockCreateFolder);

      const { result } = renderHook(() => useFolderMutations());

      await expect(
        result.current.createFolder({ name: "Test Folder" })
      ).rejects.toThrow("Unauthorized");
    });
  });

  describe("useFolderMutations - updateFolder", () => {
    it("should successfully update a folder", async () => {
      const mockUpdateFolder = vi.fn().mockResolvedValue("folder_123");
      mockUseMutation.mockReturnValue(mockUpdateFolder);

      const { result } = renderHook(() => useFolderMutations());

      await act(async () => {
        const folderId = await result.current.updateFolder({
          folderId: "folder_123" as any,
          name: "Updated Name",
        });
        expect(folderId).toBe("folder_123");
      });
    });
  });

  describe("useFolderMutations - deleteFolder", () => {
    it("should successfully delete a folder", async () => {
      const mockDeleteFolder = vi.fn().mockResolvedValue("folder_123");
      mockUseMutation.mockReturnValue(mockDeleteFolder);

      const { result } = renderHook(() => useFolderMutations());

      await act(async () => {
        const folderId = await result.current.deleteFolder({
          folderId: "folder_123" as any,
        });
        expect(folderId).toBe("folder_123");
      });
    });
  });
});

describe("Invoice Saving Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useInvoiceMutations - createInvoice", () => {
    it("should successfully create an invoice with auto-provisioning", async () => {
      const mockCreateInvoice = vi.fn().mockResolvedValue("invoice_new_123");
      mockUseMutation.mockReturnValue(mockCreateInvoice);

      const { result } = renderHook(() => useInvoiceMutations());

      const invoiceData = {
        invoiceNumber: "INV-001",
        status: "DRAFT" as const,
        issueDate: "2024-01-15",
        from: { name: "My Company" },
        to: { name: "Client A" },
        hourlyRate: 100,
        defaultHoursPerDay: 8,
        dailyWorkHours: [],
        totalDays: 0,
        totalHours: 0,
        subtotal: 0,
        lineItems: [],
        discountPercent: 0,
        discountAmount: 0,
        taxPercent: 0,
        taxAmount: 0,
        totalAmount: 0,
        currency: "USD" as const,
        paymentTerms: "NET_30" as const,
        showDetailedHours: false,
        pdfTheme: "light" as const,
        pageSize: "A4" as const,
      };

      await act(async () => {
        const invoiceId = await result.current.createInvoice(invoiceData);
        expect(invoiceId).toBe("invoice_new_123");
      });
    });

    it("should handle invoice creation failure", async () => {
      const mockCreateInvoice = vi.fn().mockRejectedValue(new Error("Failed to create invoice"));
      mockUseMutation.mockReturnValue(mockCreateInvoice);

      const { result } = renderHook(() => useInvoiceMutations());

      await expect(
        result.current.createInvoice({} as any)
      ).rejects.toThrow("Failed to create invoice");
    });
  });

  describe("useInvoiceMutations - updateInvoice", () => {
    it("should successfully update an invoice", async () => {
      const mockUpdateInvoice = vi.fn().mockResolvedValue("invoice_123");
      mockUseMutation.mockReturnValue(mockUpdateInvoice);

      const { result } = renderHook(() => useInvoiceMutations());

      await act(async () => {
        const invoiceId = await result.current.updateInvoice({
          invoiceId: "invoice_123" as any,
          status: "SENT",
        });
        expect(invoiceId).toBe("invoice_123");
      });
    });

    it("should handle update failure when invoice not found", async () => {
      const mockUpdateInvoice = vi.fn().mockRejectedValue(new Error("Invoice not found"));
      mockUseMutation.mockReturnValue(mockUpdateInvoice);

      const { result } = renderHook(() => useInvoiceMutations());

      await expect(
        result.current.updateInvoice({
          invoiceId: "invalid_id" as any,
          status: "SENT",
        })
      ).rejects.toThrow("Invoice not found");
    });
  });

  describe("useInvoiceMutations - updateStatus", () => {
    it("should successfully update invoice status", async () => {
      const mockUpdateStatus = vi.fn().mockResolvedValue("invoice_123");
      mockUseMutation.mockReturnValue(mockUpdateStatus);

      const { result } = renderHook(() => useInvoiceMutations());

      await act(async () => {
        const invoiceId = await result.current.updateStatus({
          invoiceId: "invoice_123" as any,
          status: "PAID",
        });
        expect(invoiceId).toBe("invoice_123");
      });
    });
  });

  describe("useInvoiceMutations - moveToFolder", () => {
    it("should successfully move invoice to folder", async () => {
      const mockMoveToFolder = vi.fn().mockResolvedValue("invoice_123");
      mockUseMutation.mockReturnValue(mockMoveToFolder);

      const { result } = renderHook(() => useInvoiceMutations());

      await act(async () => {
        const invoiceId = await result.current.moveToFolder({
          invoiceId: "invoice_123" as any,
          folderId: "folder_456" as any,
        });
        expect(invoiceId).toBe("invoice_123");
      });
    });

    it("should handle moving to unfiled (no folder)", async () => {
      const mockMoveToFolder = vi.fn().mockResolvedValue("invoice_123");
      mockUseMutation.mockReturnValue(mockMoveToFolder);

      const { result } = renderHook(() => useInvoiceMutations());

      await act(async () => {
        const invoiceId = await result.current.moveToFolder({
          invoiceId: "invoice_123" as any,
          folderId: undefined,
        });
        expect(invoiceId).toBe("invoice_123");
      });
    });
  });

  describe("useInvoiceMutations - duplicateInvoice", () => {
    it("should successfully duplicate an invoice", async () => {
      const mockDuplicateInvoice = vi.fn().mockResolvedValue("invoice_new_456");
      mockUseMutation.mockReturnValue(mockDuplicateInvoice);

      const { result } = renderHook(() => useInvoiceMutations());

      await act(async () => {
        const newInvoiceId = await result.current.duplicateInvoice({
          sourceInvoiceId: "invoice_123" as any,
          newInvoiceNumber: "INV-002",
        });
        expect(newInvoiceId).toBe("invoice_new_456");
      });
    });
  });

  describe("useInvoiceMutations - deleteInvoice", () => {
    it("should successfully delete an invoice", async () => {
      const mockDeleteInvoice = vi.fn().mockResolvedValue("invoice_123");
      mockUseMutation.mockReturnValue(mockDeleteInvoice);

      const { result } = renderHook(() => useInvoiceMutations());

      await act(async () => {
        const invoiceId = await result.current.deleteInvoice({
          invoiceId: "invoice_123" as any,
        });
        expect(invoiceId).toBe("invoice_123");
      });
    });
  });
});
