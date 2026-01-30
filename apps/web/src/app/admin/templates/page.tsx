"use client";

import Link from "next/link";
import { ArrowLeft, Shield, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AdminTemplatesPage } from "@/components/admin/AdminTemplatesPage";

export default function AdminTemplatesRoute() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-muted-foreground">/</span>
              <Palette className="h-5 w-5 text-primary" />
              <h1 className="font-semibold">System Templates</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <AdminTemplatesPage />
      </main>
    </div>
  );
}
