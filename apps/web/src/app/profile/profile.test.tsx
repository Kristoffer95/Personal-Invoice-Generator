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
  useQuery: () => mockUseQuery(),
  useMutation: () => mockUseMutation(),
}));

// Mock the API import
vi.mock("@invoice-generator/backend/convex/_generated/api", () => ({
  api: {
    userProfiles: {
      getProfile: "userProfiles:getProfile",
      upsert: "userProfiles:upsert",
      updateInvoiceNumbering: "userProfiles:updateInvoiceNumbering",
      getNextInvoiceNumber: "userProfiles:getNextInvoiceNumber",
      incrementInvoiceNumber: "userProfiles:incrementInvoiceNumber",
    },
  },
}));

// Import after mocks
import { useUserProfile, useNextInvoiceNumber } from "@/hooks/use-user-profile";

describe("Profile Page Integration - useUserProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("upsertProfile mutation", () => {
    it("should successfully save profile with auto-provisioning", async () => {
      const mockUpsertProfile = vi.fn().mockResolvedValue("profile_123");
      mockUseMutation.mockReturnValue(mockUpsertProfile);
      mockUseQuery.mockReturnValue({
        user: {
          _id: "user_123",
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
        },
        profile: null,
      });

      const { result } = renderHook(() => useUserProfile());

      const profileData = {
        displayName: "John Doe",
        businessName: "Johns Company LLC",
        address: "123 Main St",
        city: "New York",
        state: "NY",
        postalCode: "10001",
        country: "USA",
        email: "john@company.com",
        phone: "+1234567890",
        taxId: "12-3456789",
        bankDetails: {
          bankName: "Chase Bank",
          accountName: "Johns Company LLC",
          accountNumber: "****1234",
        },
        invoicePrefix: "INV",
        nextInvoiceNumber: 1,
      };

      await act(async () => {
        const profileId = await result.current.upsertProfile(profileData);
        expect(profileId).toBe("profile_123");
      });

      expect(mockUpsertProfile).toHaveBeenCalledWith(profileData);
    });

    it("should handle profile save failure", async () => {
      const mockUpsertProfile = vi.fn().mockRejectedValue(new Error("Failed to save profile"));
      mockUseMutation.mockReturnValue(mockUpsertProfile);
      mockUseQuery.mockReturnValue({
        user: {
          _id: "user_123",
          email: "test@example.com",
        },
        profile: null,
      });

      const { result } = renderHook(() => useUserProfile());

      await expect(
        result.current.upsertProfile({
          displayName: "Test User",
        })
      ).rejects.toThrow("Failed to save profile");
    });

    it("should handle unauthorized error during profile save", async () => {
      const mockUpsertProfile = vi.fn().mockRejectedValue(new Error("Unauthorized"));
      mockUseMutation.mockReturnValue(mockUpsertProfile);
      mockUseQuery.mockReturnValue(null);

      const { result } = renderHook(() => useUserProfile());

      await expect(
        result.current.upsertProfile({
          displayName: "Test User",
        })
      ).rejects.toThrow("Unauthorized");
    });
  });

  describe("updateNumbering mutation", () => {
    it("should successfully update invoice numbering", async () => {
      const mockUpdateNumbering = vi.fn().mockResolvedValue("profile_123");
      mockUseMutation.mockReturnValue(mockUpdateNumbering);
      mockUseQuery.mockReturnValue({
        user: { _id: "user_123" },
        profile: { nextInvoiceNumber: 1 },
      });

      const { result } = renderHook(() => useUserProfile());

      await act(async () => {
        const profileId = await result.current.updateNumbering({
          invoicePrefix: "ACME",
          nextInvoiceNumber: 100,
        });
        expect(profileId).toBe("profile_123");
      });
    });
  });
});

describe("Profile Page Integration - useNextInvoiceNumber", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("incrementNumber mutation", () => {
    it("should successfully increment invoice number", async () => {
      const mockIncrementNumber = vi.fn().mockResolvedValue(2);
      mockUseMutation.mockReturnValue(mockIncrementNumber);
      mockUseQuery.mockReturnValue({
        prefix: "INV",
        number: 1,
        formatted: "INV-001",
      });

      const { result } = renderHook(() => useNextInvoiceNumber());

      await act(async () => {
        const newNumber = await result.current.incrementNumber();
        expect(newNumber).toBe(2);
      });
    });

    it("should handle increment failure", async () => {
      const mockIncrementNumber = vi.fn().mockRejectedValue(new Error("Failed to increment"));
      mockUseMutation.mockReturnValue(mockIncrementNumber);
      mockUseQuery.mockReturnValue({
        prefix: "",
        number: 1,
        formatted: "001",
      });

      const { result } = renderHook(() => useNextInvoiceNumber());

      await expect(result.current.incrementNumber()).rejects.toThrow("Failed to increment");
    });
  });
});

describe("Profile Data Loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return loading state initially", () => {
    mockUseQuery.mockReturnValue(undefined);

    const { result } = renderHook(() => useUserProfile());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it("should return user without profile for new users", () => {
    mockUseQuery.mockReturnValue({
      user: {
        _id: "user_123",
        email: "new@example.com",
        firstName: "New",
        lastName: "User",
      },
      profile: null,
    });

    const { result } = renderHook(() => useUserProfile());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.user).not.toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it("should return both user and profile for existing users", () => {
    const mockData = {
      user: {
        _id: "user_123",
        email: "existing@example.com",
        firstName: "Existing",
        lastName: "User",
      },
      profile: {
        _id: "profile_123",
        userId: "user_123",
        displayName: "Existing User",
        businessName: "My Business",
        invoicePrefix: "MB",
        nextInvoiceNumber: 42,
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now(),
      },
    };
    mockUseQuery.mockReturnValue(mockData);

    const { result } = renderHook(() => useUserProfile());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.user?.email).toBe("existing@example.com");
    expect(result.current.profile?.businessName).toBe("My Business");
    expect(result.current.profile?.nextInvoiceNumber).toBe(42);
  });
});
