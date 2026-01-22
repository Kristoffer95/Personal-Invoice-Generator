"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { User, Plus, ChevronRight, ChevronLeft, FolderOpen, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useClientProfiles, useClientMutations } from "@/hooks/use-client-profiles";
import { useInvoiceMutations, useNextInvoiceNumberForFolder } from "@/hooks/use-invoices";
import { useFolderTree } from "@/hooks/use-invoice-folders";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useInvoiceStore } from "@/lib/store";
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";

interface CreateInvoiceWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, skip the folder selection step and use this folder */
  preSelectedFolderId?: Id<"invoiceFolders">;
}

type WizardStep = "client" | "folder" | "invoice";

interface NewClientFormData {
  name: string;
  companyName: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

const defaultNewClientFormData: NewClientFormData = {
  name: "",
  companyName: "",
  email: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  phone: "",
};

export function CreateInvoiceWizard({ open, onOpenChange, preSelectedFolderId }: CreateInvoiceWizardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { clients, isLoading: clientsLoading } = useClientProfiles();
  const { createClient } = useClientMutations();
  const { createInvoice } = useInvoiceMutations();
  const { resetCurrentInvoice } = useInvoiceStore();
  const { tree: folderTree, isLoading: foldersLoading } = useFolderTree();
  const { user: authUser, profile: userProfile } = useUserProfile();

  // Wizard state
  const [step, setStep] = useState<WizardStep>("client");
  const [selectedClientId, setSelectedClientId] = useState<Id<"clientProfiles"> | null>(null);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientFormData, setNewClientFormData] = useState<NewClientFormData>(defaultNewClientFormData);
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  // Folder selection for step 2
  const [selectedFolderId, setSelectedFolderId] = useState<Id<"invoiceFolders"> | null>(null);

  // Invoice details for step 3
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [hoursPerDay, setHoursPerDay] = useState<number>(8);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

  // Get next invoice number based on selected folder
  const { formatted: nextInvoiceNumber } = useNextInvoiceNumberForFolder(selectedFolderId ?? undefined);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep("client");
      setSelectedClientId(null);
      setShowNewClientForm(false);
      setNewClientFormData(defaultNewClientFormData);
      setSelectedFolderId(preSelectedFolderId ?? null);
      setInvoiceNumber("");
      setJobTitle("");
      setIssueDate(format(new Date(), "yyyy-MM-dd"));
      setHourlyRate(0);
      setHoursPerDay(8);
    }
  }, [open, preSelectedFolderId]);

  // Update invoice number when next number loads or folder changes
  useEffect(() => {
    if (nextInvoiceNumber && step === "invoice") {
      setInvoiceNumber(nextInvoiceNumber);
    }
  }, [nextInvoiceNumber, step]);

  const updateNewClientField = (field: keyof NewClientFormData, value: string) => {
    setNewClientFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSelectClient = (clientId: Id<"clientProfiles">) => {
    setSelectedClientId(clientId);
    setShowNewClientForm(false);
  };

  const handleCreateNewClient = async () => {
    if (!newClientFormData.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a client name",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingClient(true);
    try {
      const clientId = await createClient({
        name: newClientFormData.name,
        companyName: newClientFormData.companyName || undefined,
        email: newClientFormData.email || undefined,
        address: newClientFormData.address || undefined,
        city: newClientFormData.city || undefined,
        state: newClientFormData.state || undefined,
        postalCode: newClientFormData.postalCode || undefined,
        country: newClientFormData.country || undefined,
        phone: newClientFormData.phone || undefined,
      });

      toast({ title: "Client created" });
      setSelectedClientId(clientId);
      setShowNewClientForm(false);
      setNewClientFormData(defaultNewClientFormData);
    } catch {
      toast({
        title: "Error",
        description: "Failed to create client",
        variant: "destructive",
      });
    } finally {
      setIsCreatingClient(false);
    }
  };

  const handleNext = () => {
    if (step === "client") {
      if (!selectedClientId) {
        toast({
          title: "Select a client",
          description: "Please select an existing client or create a new one",
          variant: "destructive",
        });
        return;
      }
      // Skip folder step if folder is pre-selected
      if (preSelectedFolderId) {
        setStep("invoice");
      } else {
        setStep("folder");
      }
    } else if (step === "folder") {
      setStep("invoice");
    }
  };

  const handleBack = () => {
    if (step === "folder") {
      setStep("client");
    } else if (step === "invoice") {
      // Go back to client if folder was pre-selected, otherwise to folder
      setStep(preSelectedFolderId ? "client" : "folder");
    }
  };

  const handleSkipFolder = () => {
    setSelectedFolderId(null);
    setStep("invoice");
  };

  const handleSelectFolder = (folderId: Id<"invoiceFolders">) => {
    setSelectedFolderId(folderId);
  };

  const handleCreateInvoice = async () => {
    if (!selectedClientId || !invoiceNumber.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const selectedClient = clients.find((c) => c._id === selectedClientId);
    if (!selectedClient) {
      toast({
        title: "Client not found",
        description: "Please select a valid client",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingInvoice(true);
    try {
      // Build the "from" name from user profile or auth user data
      const fromDisplayName = userProfile?.displayName
        || userProfile?.businessName
        || `${authUser?.firstName ?? ''} ${authUser?.lastName ?? ''}`.trim()
        || authUser?.email
        || "";

      // Create the invoice with basic information
      const result = await createInvoice({
        folderId: selectedFolderId ?? undefined,
        invoiceNumber: invoiceNumber.trim(),
        status: "DRAFT",
        issueDate: issueDate,
        to: {
          name: selectedClient.companyName || selectedClient.name,
          address: selectedClient.address || "",
          city: selectedClient.city || "",
          state: selectedClient.state || "",
          postalCode: selectedClient.postalCode || "",
          country: selectedClient.country || "",
          email: selectedClient.email || "",
          phone: selectedClient.phone || "",
          taxId: selectedClient.taxId || "",
        },
        from: {
          name: fromDisplayName,
          address: userProfile?.address ?? "",
          city: userProfile?.city ?? "",
          state: userProfile?.state ?? "",
          postalCode: userProfile?.postalCode ?? "",
          country: userProfile?.country ?? "",
          email: userProfile?.email ?? authUser?.email ?? "",
          phone: userProfile?.phone ?? "",
          taxId: userProfile?.taxId ?? "",
        },
        hourlyRate: hourlyRate,
        defaultHoursPerDay: hoursPerDay,
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
        currency: "USD",
        paymentTerms: "NET_30",
        showDetailedHours: false,
        pdfTheme: "light",
        pageSize: "A4",
        jobTitle: jobTitle.trim() || undefined,
        bankDetails: userProfile?.bankDetails,
      });

      toast({
        title: "Invoice created",
        description: `Invoice ${invoiceNumber} has been created`,
      });

      // Reset the invoice store for fresh auto-fill on the calendar page
      resetCurrentInvoice();

      // Close dialog and navigate to calendar
      onOpenChange(false);
      const folderSegment = selectedFolderId || "uncategorized";
      router.push(`/folders/${folderSegment}/invoices/${result}/calendar`);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create invoice",
        variant: "destructive",
      });
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const selectedClient = clients.find((c) => c._id === selectedClientId);

  // Flatten folder tree to find selected folder by ID
  type FolderTreeItem = (typeof folderTree)[number];
  const flattenFolders = (folders: FolderTreeItem[]): FolderTreeItem[] => {
    const result: FolderTreeItem[] = [];
    for (const folder of folders) {
      result.push(folder);
      if (folder.children?.length) {
        // Children have the same structure as parent folders in the tree
        result.push(...flattenFolders(folder.children as FolderTreeItem[]));
      }
    }
    return result;
  };
  const allFolders = flattenFolders(folderTree);
  const selectedFolder = selectedFolderId ? allFolders.find((f) => f._id === selectedFolderId) : null;

  // Calculate dynamic step count based on whether folder is pre-selected
  const totalSteps = preSelectedFolderId ? 2 : 3;
  const currentStepNumber = step === "client" ? 1
    : step === "folder" ? 2
    : preSelectedFolderId ? 2 : 3;

  const getStepTitle = () => {
    switch (step) {
      case "client": return `Step 1 of ${totalSteps}: Select Client`;
      case "folder": return `Step 2 of ${totalSteps}: Select Folder (Optional)`;
      case "invoice": return `Step ${currentStepNumber} of ${totalSteps}: Invoice Details`;
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case "client": return "Choose an existing client or create a new one for this invoice.";
      case "folder": return "Choose a folder for this invoice, or skip to keep it uncategorized.";
      case "invoice": return "Enter the basic invoice information. You can complete the details on the calendar page.";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{getStepTitle()}</DialogTitle>
          <DialogDescription>{getStepDescription()}</DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 px-2">
          {/* Step 1: Client */}
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
            step === "client" ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"
          }`}>
            1
          </div>
          <div className={`h-0.5 flex-1 ${step !== "client" ? "bg-primary" : "bg-muted"}`} />

          {/* Step 2: Folder (only shown if no pre-selected folder) */}
          {!preSelectedFolderId && (
            <>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                step === "folder" ? "bg-primary text-primary-foreground" : step === "invoice" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                2
              </div>
              <div className={`h-0.5 flex-1 ${step === "invoice" ? "bg-primary" : "bg-muted"}`} />
            </>
          )}

          {/* Step 2 or 3: Invoice */}
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
            step === "invoice" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>
            {preSelectedFolderId ? 2 : 3}
          </div>
        </div>

        {/* Step Content */}
        <ScrollArea className="max-h-[50vh] pr-4">
          {step === "client" && (
            <div className="space-y-4 py-2">
              {/* Client List */}
              {!showNewClientForm && (
                <>
                  <div className="space-y-2">
                    {clientsLoading ? (
                      <div className="py-8 text-center text-muted-foreground">
                        Loading clients...
                      </div>
                    ) : clients.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        No clients yet. Create your first client below.
                      </div>
                    ) : (
                      clients.map((client) => (
                        <button
                          key={client._id}
                          onClick={() => handleSelectClient(client._id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                            selectedClientId === client._id
                              ? "border-primary bg-primary/5"
                              : "hover:bg-accent hover:border-primary/50"
                          }`}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {client.companyName || client.name}
                            </p>
                            {client.companyName && client.name !== client.companyName && (
                              <p className="text-xs text-muted-foreground truncate">
                                {client.name}
                              </p>
                            )}
                            {!client.companyName && client.email && (
                              <p className="text-xs text-muted-foreground truncate">
                                {client.email}
                              </p>
                            )}
                          </div>
                          {selectedClientId === client._id && (
                            <div className="text-primary text-sm font-medium">Selected</div>
                          )}
                        </button>
                      ))
                    )}
                  </div>

                  {/* Create New Client Button */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowNewClientForm(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Client
                  </Button>
                </>
              )}

              {/* New Client Form */}
              {showNewClientForm && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">New Client</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowNewClientForm(false);
                        setNewClientFormData(defaultNewClientFormData);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="wizard-client-name">
                        Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="wizard-client-name"
                        placeholder="Contact name"
                        value={newClientFormData.name}
                        onChange={(e) => updateNewClientField("name", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wizard-client-company">Company Name</Label>
                      <Input
                        id="wizard-client-company"
                        placeholder="Company or business"
                        value={newClientFormData.companyName}
                        onChange={(e) => updateNewClientField("companyName", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="wizard-client-email">Email</Label>
                      <Input
                        id="wizard-client-email"
                        type="email"
                        placeholder="client@example.com"
                        value={newClientFormData.email}
                        onChange={(e) => updateNewClientField("email", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wizard-client-phone">Phone</Label>
                      <Input
                        id="wizard-client-phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={newClientFormData.phone}
                        onChange={(e) => updateNewClientField("phone", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wizard-client-address">Street Address</Label>
                    <Input
                      id="wizard-client-address"
                      placeholder="123 Main Street"
                      value={newClientFormData.address}
                      onChange={(e) => updateNewClientField("address", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="wizard-client-city">City</Label>
                      <Input
                        id="wizard-client-city"
                        placeholder="New York"
                        value={newClientFormData.city}
                        onChange={(e) => updateNewClientField("city", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wizard-client-state">State / Province</Label>
                      <Input
                        id="wizard-client-state"
                        placeholder="NY"
                        value={newClientFormData.state}
                        onChange={(e) => updateNewClientField("state", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="wizard-client-postal">Postal Code</Label>
                      <Input
                        id="wizard-client-postal"
                        placeholder="10001"
                        value={newClientFormData.postalCode}
                        onChange={(e) => updateNewClientField("postalCode", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wizard-client-country">Country</Label>
                      <Input
                        id="wizard-client-country"
                        placeholder="United States"
                        value={newClientFormData.country}
                        onChange={(e) => updateNewClientField("country", e.target.value)}
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleCreateNewClient}
                    disabled={isCreatingClient}
                  >
                    {isCreatingClient ? "Creating..." : "Create Client"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === "folder" && (
            <div className="space-y-4 py-2">
              {/* Selected Client Summary */}
              {selectedClient && (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {selectedClient.companyName || selectedClient.name}
                    </p>
                    <p className="text-xs text-muted-foreground">Client</p>
                  </div>
                </div>
              )}

              {/* Folder List */}
              <div className="space-y-2">
                {foldersLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Loading folders...
                  </div>
                ) : allFolders.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No folders yet. Skip to keep this invoice uncategorized, or create folders first.
                  </div>
                ) : (
                  allFolders.map((folder) => (
                    <button
                      key={folder._id}
                      onClick={() => handleSelectFolder(folder._id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                        selectedFolderId === folder._id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-accent hover:border-primary/50"
                      }`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <FolderOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{folder.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {folder.invoiceCount} {folder.invoiceCount === 1 ? "invoice" : "invoices"}
                        </p>
                      </div>
                      {selectedFolderId === folder._id && (
                        <div className="text-primary text-sm font-medium">Selected</div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {step === "invoice" && (
            <div className="space-y-4 py-2">
              {/* Selected Client and Folder Summary */}
              <div className="space-y-2">
                {selectedClient && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {selectedClient.companyName || selectedClient.name}
                      </p>
                      <p className="text-xs text-muted-foreground">Client</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <FolderOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {selectedFolder?.name || "Uncategorized"}
                    </p>
                    <p className="text-xs text-muted-foreground">Folder</p>
                  </div>
                </div>
              </div>

              {/* Invoice Details Form */}
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="wizard-invoice-number">
                      Invoice Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="wizard-invoice-number"
                      placeholder="INV-001"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Auto-generated. You can customize this.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wizard-job-title">Job Title / Description</Label>
                    <Input
                      id="wizard-job-title"
                      placeholder="e.g., Software Development"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="wizard-issue-date">Issue Date</Label>
                    <Input
                      id="wizard-issue-date"
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wizard-hourly-rate">
                      Hourly Rate <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="wizard-hourly-rate"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={hourlyRate || ""}
                      onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wizard-hours-per-day">
                    Hours/Day <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="wizard-hours-per-day"
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    placeholder="8"
                    value={hoursPerDay}
                    onChange={(e) => setHoursPerDay(parseFloat(e.target.value) || 8)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Default hours worked per day (used when filling in the calendar).
                  </p>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          {(step === "folder" || step === "invoice") && (
            <Button variant="outline" onClick={handleBack} className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step === "client" && (
            <Button
              onClick={handleNext}
              disabled={!selectedClientId || showNewClientForm}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          {step === "folder" && (
            <>
              <Button
                variant="ghost"
                onClick={handleSkipFolder}
                className="gap-1"
              >
                <SkipForward className="h-4 w-4" />
                Skip
              </Button>
              <Button
                onClick={handleNext}
                disabled={!selectedFolderId}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
          {step === "invoice" && (
            <Button
              onClick={handleCreateInvoice}
              disabled={isCreatingInvoice || !invoiceNumber.trim()}
            >
              {isCreatingInvoice ? "Creating..." : "Create Invoice"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
