"use client";

import { use } from "react";
import { Shield } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { UserDetailPage } from "@/components/admin/UserDetailPage";
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default function AdminUserDetailPage({ params }: PageProps) {
  const { userId } = use(params);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">User Details</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <UserDetailPage userId={userId as Id<"users">} />
      </main>
    </div>
  );
}
