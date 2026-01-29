"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserRole } from "@/hooks/use-user-role";

interface AdminGuardProps {
  children: React.ReactNode;
}

/**
 * Guard component that redirects non-admin users to the home page.
 * Shows a loading state while checking authentication and role.
 */
export function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const { isAdmin, isLoading, isAuthenticated } = useUserRole();

  useEffect(() => {
    // Wait until we have loaded the user data
    if (isLoading) return;

    // Redirect if not authenticated or not an admin
    if (!isAuthenticated || !isAdmin) {
      router.replace("/");
    }
  }, [isAdmin, isLoading, isAuthenticated, router]);

  // Show loading state while checking auth/role
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children if not admin (redirect will happen in useEffect)
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">Access denied. Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
