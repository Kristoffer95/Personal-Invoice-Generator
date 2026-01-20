import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// Mock convex/react
const mockUseMutation = vi.fn();
vi.mock("convex/react", () => ({
  useMutation: () => mockUseMutation(),
}));

// Mock the API import
vi.mock("@invoice-generator/backend/convex/_generated/api", () => ({
  api: {
    users: {
      ensureUser: "users:ensureUser",
    },
  },
}));

// Import after mocks
import { useEnsureUser } from "./use-ensure-user";

describe("useEnsureUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return ensureUser mutation function", () => {
    const mockMutationFn = vi.fn();
    mockUseMutation.mockReturnValue(mockMutationFn);

    const { result } = renderHook(() => useEnsureUser());

    expect(result.current.ensureUser).toBe(mockMutationFn);
  });

  it("should allow calling ensureUser to auto-provision user", async () => {
    const mockMutationFn = vi.fn().mockResolvedValue({ userId: "user_123" });
    mockUseMutation.mockReturnValue(mockMutationFn);

    const { result } = renderHook(() => useEnsureUser());

    const response = await result.current.ensureUser();

    expect(mockMutationFn).toHaveBeenCalled();
    expect(response).toEqual({ userId: "user_123" });
  });

  it("should return null when user is not authenticated", async () => {
    const mockMutationFn = vi.fn().mockResolvedValue(null);
    mockUseMutation.mockReturnValue(mockMutationFn);

    const { result } = renderHook(() => useEnsureUser());

    const response = await result.current.ensureUser();

    expect(response).toBeNull();
  });
});
