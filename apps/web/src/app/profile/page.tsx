"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ArrowLeft, Save, Building2, CreditCard, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
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
  bankName: string;
  accountName: string;
  accountNumber: string;
  routingNumber: string;
  swiftCode: string;
  iban: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data, user, profile, isLoading, upsertProfile, updateNumbering } = useUserProfile();
  const [isSaving, setIsSaving] = useState(false);

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
    bankName: "",
    accountName: "",
    accountNumber: "",
    routingNumber: "",
    swiftCode: "",
    iban: "",
    invoicePrefix: "",
    nextInvoiceNumber: 1,
  });

  // Load existing profile data
  useEffect(() => {
    if (user && profile) {
      setFormData({
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
        bankName: profile.bankDetails?.bankName ?? "",
        accountName: profile.bankDetails?.accountName ?? "",
        accountNumber: profile.bankDetails?.accountNumber ?? "",
        routingNumber: profile.bankDetails?.routingNumber ?? "",
        swiftCode: profile.bankDetails?.swiftCode ?? "",
        iban: profile.bankDetails?.iban ?? "",
        invoicePrefix: profile.invoicePrefix ?? "",
        nextInvoiceNumber: profile.nextInvoiceNumber ?? 1,
      });
    } else if (user && !profile) {
      // Initialize from Clerk user data
      setFormData((prev) => ({
        ...prev,
        displayName: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
        email: user.email ?? "",
      }));
    }
  }, [user, profile]);

  const handleChange = (field: keyof ProfileFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
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
        bankDetails: {
          bankName: formData.bankName || undefined,
          accountName: formData.accountName || undefined,
          accountNumber: formData.accountNumber || undefined,
          routingNumber: formData.routingNumber || undefined,
          swiftCode: formData.swiftCode || undefined,
          iban: formData.iban || undefined,
        },
        invoicePrefix: formData.invoicePrefix || undefined,
        nextInvoiceNumber: formData.nextInvoiceNumber,
      });

      toast({
        title: "Profile saved",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

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
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
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
      <main className="container py-6 max-w-3xl">
        <Tabs defaultValue="business" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="business" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Business Info</span>
              <span className="sm:hidden">Business</span>
            </TabsTrigger>
            <TabsTrigger value="banking" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Bank Details</span>
              <span className="sm:hidden">Banking</span>
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

          {/* Bank Details Tab */}
          <TabsContent value="banking">
            <Card>
              <CardHeader>
                <CardTitle>Bank Details</CardTitle>
                <CardDescription>
                  Default payment information that will appear on your invoices.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      value={formData.bankName}
                      onChange={(e) => handleChange("bankName", e.target.value)}
                      placeholder="Chase Bank"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="accountName">Account Name</Label>
                    <Input
                      id="accountName"
                      value={formData.accountName}
                      onChange={(e) => handleChange("accountName", e.target.value)}
                      placeholder="Your Company LLC"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      value={formData.accountNumber}
                      onChange={(e) => handleChange("accountNumber", e.target.value)}
                      placeholder="****1234"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="routingNumber">Routing Number</Label>
                    <Input
                      id="routingNumber"
                      value={formData.routingNumber}
                      onChange={(e) => handleChange("routingNumber", e.target.value)}
                      placeholder="021000021"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="swiftCode">SWIFT / BIC Code</Label>
                    <Input
                      id="swiftCode"
                      value={formData.swiftCode}
                      onChange={(e) => handleChange("swiftCode", e.target.value)}
                      placeholder="CHASUS33"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="iban">IBAN</Label>
                    <Input
                      id="iban"
                      value={formData.iban}
                      onChange={(e) => handleChange("iban", e.target.value)}
                      placeholder="US12 3456 7890 1234 5678 90"
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
                  Configure how your invoice numbers are generated.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
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
                      Example: INV-001, ACME-001
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nextInvoiceNumber">Next Invoice Number</Label>
                    <Input
                      id="nextInvoiceNumber"
                      type="number"
                      min={1}
                      value={formData.nextInvoiceNumber}
                      onChange={(e) => handleChange("nextInvoiceNumber", parseInt(e.target.value) || 1)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Start from any number you prefer.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm font-medium">Preview</p>
                  <p className="text-lg font-mono mt-1">
                    {formData.invoicePrefix
                      ? `${formData.invoicePrefix}-${formData.nextInvoiceNumber.toString().padStart(3, "0")}`
                      : formData.nextInvoiceNumber.toString().padStart(3, "0")}
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
    </div>
  );
}
