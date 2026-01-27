"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ArrowLeft, Save, Building2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { useUserProfile } from "@/hooks/use-user-profile";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface ProfileFormData {
  displayName: string;
  businessName: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  email: string;
  phone: string;
  taxId: string;
  invoicePrefix: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, isLoading, upsertProfile } = useUserProfile();
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const initialFormDataRef = useRef<ProfileFormData | null>(null);

  const [formData, setFormData] = useState<ProfileFormData>({
    displayName: "",
    businessName: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    email: "",
    phone: "",
    taxId: "",
    invoicePrefix: "",
  });

  // Unsaved changes detection
  const { hasUnsavedChanges, markAsSaved, resetTracking } = useUnsavedChanges({
    currentState: formData,
    initialState: initialFormDataRef.current || formData,
    enableBeforeUnload: true,
  });

  // Load existing profile data
  useEffect(() => {
    if (user && profile) {
      const loadedData = {
        displayName: profile.displayName ?? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
        businessName: profile.businessName ?? "",
        address: profile.address ?? "",
        city: profile.city ?? "",
        state: profile.state ?? "",
        postalCode: profile.postalCode ?? "",
        country: profile.country ?? "",
        email: profile.email ?? user.email ?? "",
        phone: profile.phone ?? "",
        taxId: profile.taxId ?? "",
        invoicePrefix: profile.invoicePrefix ?? "",
      };
      setFormData(loadedData);
      // Store initial state for unsaved changes detection and reset hook baseline
      if (initialFormDataRef.current === null) {
        initialFormDataRef.current = loadedData;
        resetTracking(loadedData);
      }
    } else if (user && !profile) {
      // Initialize from Clerk user data
      const initialData = {
        displayName: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
        businessName: "",
        address: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
        email: user.email ?? "",
        phone: "",
        taxId: "",
        invoicePrefix: "",
      };
      setFormData(initialData);
      // Store initial state for unsaved changes detection and reset hook baseline
      if (initialFormDataRef.current === null) {
        initialFormDataRef.current = initialData;
        resetTracking(initialData);
      }
    }
  }, [user, profile, resetTracking]);

  // Handle navigation with unsaved changes
  const handleNavigationAttempt = useCallback((destination: string) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(destination);
      setShowUnsavedDialog(true);
      return true; // Blocked
    }
    return false; // Allowed
  }, [hasUnsavedChanges]);

  const handleUnsavedDiscard = useCallback(() => {
    setShowUnsavedDialog(false);
    if (pendingNavigation) {
      router.push(pendingNavigation);
    }
    setPendingNavigation(null);
  }, [pendingNavigation, router]);

  const handleUnsavedCancel = useCallback(() => {
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
  }, []);

  const handleChange = (field: keyof ProfileFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await upsertProfile({
        displayName: formData.displayName || undefined,
        businessName: formData.businessName || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        postalCode: formData.postalCode || undefined,
        country: formData.country || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        taxId: formData.taxId || undefined,
        invoicePrefix: formData.invoicePrefix || undefined,
      });

      // Mark as saved to clear unsaved changes tracking
      markAsSaved();
      initialFormDataRef.current = formData;

      toast({
        title: "Profile saved",
        description: "Your profile has been updated successfully.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [formData, upsertProfile, markAsSaved, toast]);

  // Handle save from unsaved changes dialog
  const handleUnsavedSave = useCallback(async () => {
    await handleSave();
    setShowUnsavedDialog(false);
    if (pendingNavigation) {
      router.push(pendingNavigation);
    }
    setPendingNavigation(null);
  }, [handleSave, pendingNavigation, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (!handleNavigationAttempt("/")) {
                  router.push("/");
                }
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-semibold">Profile Settings</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-6 max-w-3xl px-4 sm:px-6 lg:px-8">
        <Tabs defaultValue="business" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="business" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Business Info</span>
              <span className="sm:hidden">Business</span>
            </TabsTrigger>
            <TabsTrigger value="invoicing" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Invoice Settings</span>
              <span className="sm:hidden">Invoicing</span>
            </TabsTrigger>
          </TabsList>

          {/* Business Info Tab */}
          <TabsContent value="business">
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>
                  This information will be used as the default &quot;From&quot; details when creating invoices.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="displayName">Your Name</Label>
                    <Input
                      id="displayName"
                      value={formData.displayName}
                      onChange={(e) => handleChange("displayName", e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input
                      id="businessName"
                      value={formData.businessName}
                      onChange={(e) => handleChange("businessName", e.target.value)}
                      placeholder="Your Company LLC"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleChange("city", e.target.value)}
                      placeholder="New York"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State / Province</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleChange("state", e.target.value)}
                      placeholder="NY"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => handleChange("postalCode", e.target.value)}
                      placeholder="10001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => handleChange("country", e.target.value)}
                      placeholder="United States"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="you@company.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="taxId">Tax ID / VAT Number</Label>
                    <Input
                      id="taxId"
                      value={formData.taxId}
                      onChange={(e) => handleChange("taxId", e.target.value)}
                      placeholder="12-3456789"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoice Settings Tab */}
          <TabsContent value="invoicing">
            <Card>
              <CardHeader>
                <CardTitle>Invoice Numbering</CardTitle>
                <CardDescription>
                  Configure the prefix for your invoice numbers. The number will be automatically derived from the latest invoice in each folder.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invoicePrefix">Invoice Prefix (Optional)</Label>
                  <Input
                    id="invoicePrefix"
                    value={formData.invoicePrefix}
                    onChange={(e) => handleChange("invoicePrefix", e.target.value.toUpperCase())}
                    placeholder="INV"
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    Example: INV-001, ACME-001. The number will increment automatically based on your existing invoices.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} className="min-w-32">
            {isSaving ? (
              "Saving..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </main>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onSave={handleUnsavedSave}
        onDiscard={handleUnsavedDiscard}
        onCancel={handleUnsavedCancel}
        isSaving={isSaving}
      />
    </div>
  );
}
