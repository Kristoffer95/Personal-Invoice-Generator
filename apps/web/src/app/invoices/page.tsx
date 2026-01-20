"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  ArrowLeft,
  Plus,
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Archive,
  ArchiveRestore,
  BarChart3,
  Tag,
  FolderInput,
  Lock,
  Unlock,
  Folder,
  History,
  Users,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  useInvoices,
  useUncategorizedInvoices,
  useArchivedInvoices,
  useInvoiceMutations,
  useAllInvoicesCount,
  useNextBillingPeriod,
} from "@/hooks/use-invoices";
import { useNextInvoiceNumber } from "@/hooks/use-user-profile";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { FolderTree, FolderBreadcrumb, UNCATEGORIZED_FOLDER, type FolderSelection } from "@/components/folders/FolderTree";
import {
  InvoiceFilters,
  defaultFilters,
  type InvoiceFiltersState,
} from "@/components/invoice/InvoiceFilters";
import { InvoiceStatusSelect, InvoiceStatusBadge } from "@/components/invoice/InvoiceStatusSelect";
import { InvoicePreviewPopover } from "@/components/invoice/InvoicePreviewPopover";
import { TagBadgeList } from "@/components/tags/TagSelector";
import { useFolderTree, useFolderMutations, useFolderWithClientProfiles } from "@/hooks/use-invoice-folders";
import { TagManager } from "@/components/tags/TagManager";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { StatusLogList } from "@/components/status-logs/StatusLogList";
import { InvoiceStatusLogsDialog } from "@/components/status-logs/InvoiceStatusLogsDialog";
import { ClientManager } from "@/components/clients/ClientManager";
import {
  CURRENCY_SYMBOLS,
  type Currency,
  type InvoiceStatus,
} from "@invoice-generator/shared-types";
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";
import { useClientMutations, useClientProfiles } from "@/hooks/use-client-profiles";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type InvoiceItem = {
  _id: Id<"invoices">;
  invoiceNumber: string;
  status: InvoiceStatus;
  totalAmount: number;
  currency: Currency;
  issueDate: string;
  to: { name: string };
  folderId?: Id<"invoiceFolders">;
  isArchived?: boolean;
  isMoveLocked?: boolean;
  tags?: Id<"tags">[];
  periodStart?: string;
  periodEnd?: string;
  totalDays?: number;
};

// Helper function to format invoice coverage info
function formatCoverage(periodStart?: string, periodEnd?: string, totalDays?: number): string | null {
  if (!periodStart || !periodEnd) return null;

  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);
  const endDay = endDate.getDate();

  // Get month name (short format)
  const monthName = startDate.toLocaleDateString("en-US", { month: "short" });

  // Determine batch based on end date
  // 1st batch: ends on 15th
  // 2nd batch: ends on last day of month
  const lastDayOfMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
  const batch = endDay <= 15 ? "1st batch" : "2nd batch";

  // Format days worked
  const daysWorked = totalDays !== undefined ? `${totalDays} day${totalDays !== 1 ? "s" : ""}` : "";

  return `${monthName} / ${batch}${daysWorked ? ` / ${daysWorked}` : ""}`;
}

export default function InvoicesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const {
    deleteInvoice,
    duplicateInvoice,
    updateStatus,
    archiveInvoice,
    unarchiveInvoice,
    bulkArchiveInvoices,
    bulkDeleteInvoices,
    bulkUpdateStatus,
    moveToFolder,
    toggleMoveLock,
    bulkMoveToFolder,
    quickCreateInvoice,
  } = useInvoiceMutations();
  const { toggleFolderMoveLock } = useFolderMutations();
  const { tree: folderTree } = useFolderTree();
  const { formatted: nextInvoiceNumber, incrementNumber } = useNextInvoiceNumber();

  // View state
  const [activeTab, setActiveTab] = useState<"invoices" | "clients" | "analytics" | "tags" | "logs">("invoices");
  const [selectedFolder, setSelectedFolder] = useState<FolderSelection>(undefined);
  const [filters, setFilters] = useState<InvoiceFiltersState>(defaultFilters);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);

  // Move invoice state
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [invoiceToMove, setInvoiceToMove] = useState<InvoiceItem | null>(null);
  const [selectedMoveTarget, setSelectedMoveTarget] = useState<Id<"invoiceFolders"> | null>(null);

  // Quick create invoice state
  const [clientSelectorOpen, setClientSelectorOpen] = useState(false);
  const [isQuickCreating, setIsQuickCreating] = useState(false);

  // Bulk delete state
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // New client form modal state (for "All" folder or no clients)
  const [newClientDialogOpen, setNewClientDialogOpen] = useState(false);
  const [newClientFormData, setNewClientFormData] = useState({
    name: "",
    companyName: "",
    email: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    phone: "",
  });
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  // Get folder with client profiles for the selected folder
  const selectedFolderIdForClients = selectedFolder && selectedFolder !== UNCATEGORIZED_FOLDER ? selectedFolder : undefined;
  const { folder: selectedFolderData, clientProfiles: folderClientProfiles, isLoading: clientProfilesLoading } = useFolderWithClientProfiles(selectedFolderIdForClients);
  const { period: nextBillingPeriod, isLoading: nextPeriodLoading } = useNextBillingPeriod(selectedFolderIdForClients);

  // Get all clients for "All" folder scenario
  const { clients: allClients } = useClientProfiles();
  const { createClient } = useClientMutations();

  // Build filter options for hooks
  const filterOptions = useMemo(() => {
    // Determine folder filter based on selection
    // undefined = all invoices (no folder filter)
    // UNCATEGORIZED_FOLDER = only invoices without a folder (folderId is undefined in DB)
    // actual ID = specific folder
    let folderFilter: Id<"invoiceFolders"> | undefined = undefined;
    let filterByUncategorized = false;

    if (selectedFolder === UNCATEGORIZED_FOLDER) {
      // For uncategorized, we need to query invoices where folderId is undefined
      // The backend getUnfiled query handles this, but for filters we pass undefined
      filterByUncategorized = true;
    } else if (selectedFolder !== undefined) {
      folderFilter = selectedFolder;
    }

    return {
      folderId: filterByUncategorized ? undefined : folderFilter,
      statuses: filters.statuses.length > 0 ? filters.statuses : undefined,
      tags: filters.tags.length > 0 ? filters.tags : undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      amountMin: filters.amountMin,
      amountMax: filters.amountMax,
      searchQuery: filters.searchQuery || undefined,
      // Fix archived filter: when showArchived is true, show ONLY archived invoices
      // when showArchived is false, show ONLY non-archived invoices
      isArchived: filters.showArchived ? true : false,
    };
  }, [selectedFolder, filters]);

  // Fetch invoices based on current view
  // For uncategorized folder, use the uncategorized invoices hook
  const isUncategorizedSelected = selectedFolder === UNCATEGORIZED_FOLDER;
  const { invoices: regularInvoices, isLoading: invoicesLoading } = useInvoices(
    isUncategorizedSelected ? { ...filterOptions, folderId: undefined } : filterOptions
  );
  const { invoices: uncategorizedInvoices, isLoading: uncategorizedLoading } = useUncategorizedInvoices();
  const { count: allInvoicesCount } = useAllInvoicesCount();
  const { invoices: archivedInvoices, isLoading: archivedLoading } = useArchivedInvoices();

  // Filter uncategorized invoices to only show those without folders when that option is selected
  const filteredInvoices = useMemo(() => {
    if (isUncategorizedSelected && !filters.showArchived) {
      // Filter uncategorized invoices based on current filters
      let result = uncategorizedInvoices.filter(i => !i.isArchived);

      // Apply search filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        result = result.filter(i =>
          i.invoiceNumber.toLowerCase().includes(query) ||
          i.to.name.toLowerCase().includes(query)
        );
      }

      // Apply status filter
      if (filters.statuses.length > 0) {
        result = result.filter(i => filters.statuses.includes(i.status));
      }

      // Apply tags filter
      if (filters.tags.length > 0) {
        result = result.filter(i =>
          filters.tags.every(tagId => i.tags?.includes(tagId))
        );
      }

      return result;
    }
    return regularInvoices;
  }, [isUncategorizedSelected, regularInvoices, uncategorizedInvoices, filters]);

  const isLoading = isUncategorizedSelected ? uncategorizedLoading : invoicesLoading;

  // Bulk selection handlers
  const toggleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoices((prev) => {
      const next = new Set(prev);
      if (next.has(invoiceId)) {
        next.delete(invoiceId);
      } else {
        next.add(invoiceId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedInvoices.size === filteredInvoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(filteredInvoices.map((i) => i._id)));
    }
  };

  const clearSelection = () => setSelectedInvoices(new Set());

  // Invoice actions
  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;

    try {
      await deleteInvoice({ invoiceId: invoiceToDelete as Id<"invoices"> });
      toast({ title: "Invoice deleted" });
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    } catch {
      toast({ title: "Error", description: "Failed to delete invoice", variant: "destructive" });
    }
  };

  const handleDuplicateInvoice = async (invoice: InvoiceItem) => {
    try {
      const newNumber = nextInvoiceNumber ?? "001";
      await duplicateInvoice({
        sourceInvoiceId: invoice._id,
        newInvoiceNumber: newNumber,
        folderId: invoice.folderId,
      });
      await incrementNumber();
      toast({ title: "Invoice duplicated", description: `Created invoice ${newNumber}` });
    } catch {
      toast({ title: "Error", description: "Failed to duplicate invoice", variant: "destructive" });
    }
  };

  const handleStatusChange = async (invoiceId: Id<"invoices">, status: InvoiceStatus, notes?: string) => {
    try {
      await updateStatus({ invoiceId, status, notes });
      toast({ title: "Status updated" });
    } catch {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const handleArchiveInvoice = async (invoiceId: Id<"invoices">) => {
    try {
      await archiveInvoice({ invoiceId });
      toast({ title: "Invoice archived" });
    } catch {
      toast({ title: "Error", description: "Failed to archive invoice", variant: "destructive" });
    }
  };

  const handleUnarchiveInvoice = async (invoiceId: Id<"invoices">) => {
    try {
      await unarchiveInvoice({ invoiceId });
      toast({ title: "Invoice restored" });
    } catch {
      toast({ title: "Error", description: "Failed to restore invoice", variant: "destructive" });
    }
  };

  // Bulk actions
  const handleBulkArchive = async () => {
    if (selectedInvoices.size === 0) return;

    try {
      await bulkArchiveInvoices({
        invoiceIds: Array.from(selectedInvoices) as Id<"invoices">[],
      });
      toast({ title: `${selectedInvoices.size} invoice(s) archived` });
      clearSelection();
    } catch {
      toast({ title: "Error", description: "Failed to archive invoices", variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedInvoices.size === 0) return;

    try {
      const deletedCount = await bulkDeleteInvoices({
        invoiceIds: Array.from(selectedInvoices) as Id<"invoices">[],
      });
      toast({ title: `${deletedCount} invoice(s) deleted` });
      clearSelection();
      setBulkDeleteDialogOpen(false);
    } catch {
      toast({ title: "Error", description: "Failed to delete invoices", variant: "destructive" });
    }
  };

  const handleBulkStatusUpdate = async (status: InvoiceStatus) => {
    if (selectedInvoices.size === 0) return;

    try {
      await bulkUpdateStatus({
        invoiceIds: Array.from(selectedInvoices) as Id<"invoices">[],
        status,
      });
      toast({ title: `${selectedInvoices.size} invoice(s) updated to ${status}` });
      clearSelection();
    } catch {
      toast({ title: "Error", description: "Failed to update invoices", variant: "destructive" });
    }
  };

  // Move invoice handlers
  const handleMoveInvoice = (invoice: InvoiceItem) => {
    if (invoice.isMoveLocked) {
      toast({ title: "Invoice locked", description: "This invoice cannot be moved", variant: "destructive" });
      return;
    }
    setInvoiceToMove(invoice);
    setSelectedMoveTarget(invoice.folderId ?? null);
    setMoveDialogOpen(true);
  };

  const handleConfirmMove = async () => {
    if (!invoiceToMove) return;

    try {
      await moveToFolder({
        invoiceId: invoiceToMove._id,
        folderId: selectedMoveTarget ?? undefined,
      });
      toast({ title: "Invoice moved" });
      setMoveDialogOpen(false);
      setInvoiceToMove(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to move invoice",
        variant: "destructive",
      });
    }
  };

  const handleBulkMove = async () => {
    if (selectedInvoices.size === 0) return;

    try {
      const result = await bulkMoveToFolder({
        invoiceIds: Array.from(selectedInvoices) as Id<"invoices">[],
        folderId: selectedMoveTarget ?? undefined,
      });
      if (result.locked > 0) {
        toast({
          title: `${result.moved} invoice(s) moved`,
          description: `${result.locked} invoice(s) were locked and could not be moved`,
        });
      } else {
        toast({ title: `${result.moved} invoice(s) moved` });
      }
      clearSelection();
      setMoveDialogOpen(false);
    } catch {
      toast({ title: "Error", description: "Failed to move invoices", variant: "destructive" });
    }
  };

  // Toggle move lock handlers
  const handleToggleMoveLock = async (invoiceId: Id<"invoices">, isLocked: boolean) => {
    try {
      await toggleMoveLock({ invoiceId, isMoveLocked: !isLocked });
      toast({ title: isLocked ? "Invoice unlocked" : "Invoice locked" });
    } catch {
      toast({ title: "Error", description: "Failed to update lock status", variant: "destructive" });
    }
  };

  // Quick create invoice with a specific client
  const handleQuickCreateWithClient = async (clientId: Id<"clientProfiles">) => {
    if (!selectedFolder || selectedFolder === UNCATEGORIZED_FOLDER || !nextInvoiceNumber) {
      return;
    }

    setIsQuickCreating(true);
    try {
      const result = await quickCreateInvoice({
        folderId: selectedFolder,
        clientProfileId: clientId,
        invoiceNumber: nextInvoiceNumber,
      });
      await incrementNumber();

      // Format period for toast message
      const periodLabel = result.batchType === "1st_batch" ? "1st batch" : "2nd batch";
      const periodDate = new Date(result.periodStart);
      const monthLabel = periodDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });

      toast({
        title: "Invoice created",
        description: `Created invoice for ${monthLabel} ${periodLabel}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create invoice",
        variant: "destructive",
      });
    } finally {
      setIsQuickCreating(false);
      setClientSelectorOpen(false);
    }
  };

  const handleCreateNewInvoice = async () => {
    // If "All Invoices" is selected (selectedFolder is undefined), show client form modal
    if (selectedFolder === undefined) {
      // Show the new client form modal
      setNewClientDialogOpen(true);
      return;
    }

    // If Uncategorized is selected, also show client form modal
    if (selectedFolder === UNCATEGORIZED_FOLDER) {
      setNewClientDialogOpen(true);
      return;
    }

    // Wait for data to load - show loading state if still loading
    if (clientProfilesLoading || nextPeriodLoading) {
      toast({
        title: "Loading...",
        description: "Please wait while we load folder data",
      });
      return;
    }

    // Check if folder has client profiles
    if (!selectedFolderData) {
      // Folder data not available - show error
      toast({
        title: "Folder not found",
        description: "Unable to load folder data. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Check how many clients are linked to this folder
    const clientCount = folderClientProfiles.length;

    if (clientCount === 0) {
      // No clients linked - show client form modal for creating a new client
      setNewClientDialogOpen(true);
      return;
    }

    if (clientCount === 1) {
      // Exactly 1 client - quick create with that client
      await handleQuickCreateWithClient(folderClientProfiles[0]._id);
      return;
    }

    // Multiple clients - show client selector dialog
    setClientSelectorOpen(true);
  };

  // Handle creating a new client and redirecting to home to create invoice
  const handleCreateClientAndRedirect = async () => {
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
      await createClient({
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
      setNewClientDialogOpen(false);
      setNewClientFormData({
        name: "",
        companyName: "",
        email: "",
        address: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
        phone: "",
      });
      // Redirect to home page to select month and batch
      router.push("/");
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

  const updateNewClientField = (field: keyof typeof newClientFormData, value: string) => {
    setNewClientFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleOpenInvoice = (invoiceId: Id<"invoices">) => {
    router.push(`/?invoiceId=${invoiceId}`);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatAmount = (amount: number, currency: Currency) => {
    const symbol = CURRENCY_SYMBOLS[currency] || "$";
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  // Flatten folder tree for move dialog
  type FlatFolder = { id: Id<"invoiceFolders">; name: string; level: number };
  const flattenFolderTree = (
    folders: typeof folderTree,
    level = 0
  ): FlatFolder[] => {
    const result: FlatFolder[] = [];
    for (const folder of folders) {
      result.push({ id: folder._id, name: folder.name, level });
      if (folder.children && folder.children.length > 0) {
        result.push(...flattenFolderTree(folder.children as typeof folderTree, level + 1));
      }
    }
    return result;
  };

  const flatFolders = flattenFolderTree(folderTree);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-semibold">Invoice Manager</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </header>

      <div className="container py-6">
        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="invoices" className="gap-2">
                <FileText className="h-4 w-4" />
                Invoices
              </TabsTrigger>
              <TabsTrigger value="clients" className="gap-2">
                <Users className="h-4 w-4" />
                Clients
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="tags" className="gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </TabsTrigger>
              <TabsTrigger value="logs" className="gap-2">
                <History className="h-4 w-4" />
                Status Logs
              </TabsTrigger>
            </TabsList>

            {activeTab === "invoices" && (
              <Button
                onClick={handleCreateNewInvoice}
                disabled={isQuickCreating || (selectedFolderIdForClients && (clientProfilesLoading || nextPeriodLoading))}
              >
                {isQuickCreating ? (
                  <>
                    <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Creating...
                  </>
                ) : (selectedFolderIdForClients && (clientProfilesLoading || nextPeriodLoading)) ? (
                  <>
                    <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    New Invoice
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-0">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Sidebar - Folder Tree */}
              <aside className="w-full lg:w-64 shrink-0">
                <Card className="sticky top-20">
                  <CardContent className="p-4">
                    <FolderTree
                      selectedFolderId={selectedFolder}
                      onSelectFolder={setSelectedFolder}
                      showAllInvoices
                      allInvoicesCount={allInvoicesCount}
                      showUncategorized
                      uncategorizedCount={uncategorizedInvoices.filter(i => !i.isArchived).length}
                    />

                    {/* Archived Invoices Link */}
                    <div className="mt-4 pt-4 border-t">
                      <Sheet>
                        <SheetTrigger asChild>
                          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors">
                            <Archive className="h-4 w-4" />
                            <span className="flex-1 text-left">Archived</span>
                            {archivedInvoices.length > 0 && (
                              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                                {archivedInvoices.length}
                              </Badge>
                            )}
                          </button>
                        </SheetTrigger>
                        <SheetContent className="w-[400px] sm:w-[540px]">
                          <SheetHeader>
                            <SheetTitle>Archived Invoices</SheetTitle>
                            <SheetDescription>
                              Invoices that have been archived
                            </SheetDescription>
                          </SheetHeader>
                          <div className="mt-6 space-y-2">
                            {archivedLoading ? (
                              <div className="text-center py-8 text-muted-foreground">
                                Loading...
                              </div>
                            ) : archivedInvoices.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">
                                No archived invoices
                              </div>
                            ) : (
                              archivedInvoices.map((invoice) => (
                                <div
                                  key={invoice._id}
                                  className="flex items-center justify-between p-3 rounded-lg border"
                                >
                                  <div>
                                    <div className="font-medium">{invoice.invoiceNumber}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {invoice.to.name}
                                    </div>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUnarchiveInvoice(invoice._id)}
                                  >
                                    <ArchiveRestore className="h-4 w-4 mr-2" />
                                    Restore
                                  </Button>
                                </div>
                              ))
                            )}
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                  </CardContent>
                </Card>
              </aside>

              {/* Main Content - Invoice List */}
              <main className="flex-1 min-w-0 space-y-4">
                {/* Filters */}
                <InvoiceFilters
                  filters={filters}
                  onChange={setFilters}
                  onClear={() => setFilters(defaultFilters)}
                />

                {/* Breadcrumb */}
                <FolderBreadcrumb
                  folderId={selectedFolder}
                  onNavigate={setSelectedFolder}
                />

                {/* Bulk Actions Bar */}
                {selectedInvoices.size > 0 && (
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-muted">
                    <span className="text-sm font-medium">
                      {selectedInvoices.size} selected
                    </span>
                    <div className="flex-1" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInvoiceToMove(null); // Bulk move mode
                        setSelectedMoveTarget(null);
                        setMoveDialogOpen(true);
                      }}
                    >
                      <FolderInput className="h-4 w-4 mr-2" />
                      Move
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleBulkArchive}>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setBulkDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          Update Status
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleBulkStatusUpdate("TO_SEND")}>
                          Mark as To Send
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkStatusUpdate("SENT")}>
                          Mark as Sent
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleBulkStatusUpdate("PAID")}>
                          Mark as Paid
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="ghost" size="sm" onClick={clearSelection}>
                      Clear
                    </Button>
                  </div>
                )}

                {/* Invoice List */}
                {isLoading ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Loading invoices...
                  </div>
                ) : filteredInvoices.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground mb-4">
                        {filters.searchQuery || filters.statuses.length > 0 || filters.tags.length > 0
                          ? "No invoices match your filters"
                          : selectedFolder
                          ? "No invoices in this folder"
                          : "No invoices yet"}
                      </p>
                      <Button
                        onClick={handleCreateNewInvoice}
                        disabled={isQuickCreating || (selectedFolderIdForClients && (clientProfilesLoading || nextPeriodLoading))}
                      >
                        {isQuickCreating ? (
                          <>
                            <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Invoice
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {/* Select All Header */}
                    <div className="flex items-center gap-4 px-4 py-2 text-sm text-muted-foreground">
                      <Checkbox
                        checked={
                          selectedInvoices.size === filteredInvoices.length &&
                          filteredInvoices.length > 0
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                      <span className="flex-1">
                        {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {filteredInvoices.map((invoice) => (
                      <Card
                        key={invoice._id}
                        className={`hover:bg-muted/50 transition-colors ${
                          selectedInvoices.has(invoice._id) ? "ring-2 ring-primary" : ""
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <Checkbox
                              checked={selectedInvoices.has(invoice._id)}
                              onCheckedChange={() => toggleSelectInvoice(invoice._id)}
                            />

                            <button
                              onClick={() => handleOpenInvoice(invoice._id)}
                              className="flex-1 min-w-0 text-left"
                            >
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium">
                                      {invoice.invoiceNumber}
                                    </span>
                                    <InvoiceStatusBadge status={invoice.status} />
                                    {invoice.isArchived && (
                                      <Badge variant="outline" className="text-xs">
                                        Archived
                                      </Badge>
                                    )}
                                    {invoice.isMoveLocked && (
                                      <span title="Move locked">
                                        <Lock className="h-3 w-3 text-muted-foreground" />
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span className="truncate">{invoice.to.name}</span>
                                    {formatCoverage(invoice.periodStart, invoice.periodEnd, invoice.totalDays) && (
                                      <>
                                        <span className="text-muted-foreground/50">•</span>
                                        <span className="text-xs">
                                          {formatCoverage(invoice.periodStart, invoice.periodEnd, invoice.totalDays)}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  {invoice.tags && invoice.tags.length > 0 && (
                                    <div className="mt-1">
                                      <TagBadgeList tagIds={invoice.tags} type="invoice" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>

                            <div className="text-right shrink-0">
                              <div className="font-medium">
                                {formatAmount(invoice.totalAmount, invoice.currency)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(invoice.issueDate)}
                              </div>
                            </div>

                            {/* Preview Button */}
                            <InvoicePreviewPopover invoiceId={invoice._id} />

                            <InvoiceStatusSelect
                              value={invoice.status}
                              onChange={(status, notes) =>
                                handleStatusChange(invoice._id, status, notes)
                              }
                              showNotes
                            />

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleOpenInvoice(invoice._id)}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDuplicateInvoice(invoice)}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleMoveInvoice(invoice)}
                                  disabled={invoice.isMoveLocked}
                                >
                                  <FolderInput className="h-4 w-4 mr-2" />
                                  Move to Folder
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleToggleMoveLock(invoice._id, !!invoice.isMoveLocked)}
                                >
                                  {invoice.isMoveLocked ? (
                                    <>
                                      <Unlock className="h-4 w-4 mr-2" />
                                      Unlock Moving
                                    </>
                                  ) : (
                                    <>
                                      <Lock className="h-4 w-4 mr-2" />
                                      Lock Moving
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <InvoiceStatusLogsDialog
                                  invoiceId={invoice._id}
                                  invoiceNumber={invoice.invoiceNumber}
                                  trigger={
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                      <History className="h-4 w-4 mr-2" />
                                      View Logs
                                    </DropdownMenuItem>
                                  }
                                />
                                <DropdownMenuSeparator />
                                {invoice.isArchived ? (
                                  <DropdownMenuItem
                                    onClick={() => handleUnarchiveInvoice(invoice._id)}
                                  >
                                    <ArchiveRestore className="h-4 w-4 mr-2" />
                                    Restore
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handleArchiveInvoice(invoice._id)}
                                  >
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archive
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setInvoiceToDelete(invoice._id);
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </main>
            </div>
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients">
            <ClientManager />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>

          {/* Tags Tab */}
          <TabsContent value="tags">
            <div className="max-w-2xl">
              <TagManager />
            </div>
          </TabsContent>

          {/* Status Logs Tab */}
          <TabsContent value="logs">
            <StatusLogList />
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice?</DialogTitle>
            <DialogDescription>
              This invoice will be permanently deleted. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setInvoiceToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteInvoice}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Invoice Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {invoiceToMove ? "Move Invoice" : `Move ${selectedInvoices.size} Invoice(s)`}
            </DialogTitle>
            <DialogDescription>
              {invoiceToMove
                ? `Select a folder for "${invoiceToMove.invoiceNumber}"`
                : "Select a destination folder for the selected invoices"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4 max-h-[300px] overflow-y-auto">
            <button
              type="button"
              className={`w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors ${
                selectedMoveTarget === null
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted"
              }`}
              onClick={() => setSelectedMoveTarget(null)}
            >
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">Uncategorized</span>
            </button>
            {flatFolders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                className={`w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors ${
                  selectedMoveTarget === folder.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                }`}
                style={{ paddingLeft: `${folder.level * 16 + 8}px` }}
                onClick={() => setSelectedMoveTarget(folder.id)}
              >
                <Folder className="h-4 w-4" />
                <span className="text-sm">{folder.name}</span>
              </button>
            ))}
            {flatFolders.length === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No folders available. Create a folder first.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMoveDialogOpen(false);
                setInvoiceToMove(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={invoiceToMove ? handleConfirmMove : handleBulkMove}>
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Selector Dialog for Quick Invoice Creation */}
      <Dialog open={clientSelectorOpen} onOpenChange={setClientSelectorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Client</DialogTitle>
            <DialogDescription>
              {nextBillingPeriod && (
                <>
                  Creating invoice for <strong>{nextBillingPeriod.monthLabel}</strong>{" "}
                  <strong>{nextBillingPeriod.batchType === "1st_batch" ? "1st batch" : "2nd batch"}</strong>.
                  Select which client this invoice is for:
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2 max-h-60 overflow-y-auto">
            {folderClientProfiles.map((client) => (
              <button
                key={client._id}
                onClick={() => handleQuickCreateWithClient(client._id)}
                disabled={isQuickCreating}
                className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent hover:border-primary transition-colors text-left disabled:opacity-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{client.companyName || client.name}</p>
                  {client.companyName && client.name !== client.companyName && (
                    <p className="text-xs text-muted-foreground truncate">{client.name}</p>
                  )}
                  {!client.companyName && client.email && (
                    <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setClientSelectorOpen(false)}
              disabled={isQuickCreating}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedInvoices.size} Invoice(s)?</DialogTitle>
            <DialogDescription>
              This will permanently delete the selected invoices. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              Delete {selectedInvoices.size} Invoice(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Client Form Dialog (for "All" folder or no clients linked) */}
      <Dialog open={newClientDialogOpen} onOpenChange={setNewClientDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Client</DialogTitle>
            <DialogDescription>
              Enter client details to create a new invoice. After creating the client, you&apos;ll be redirected to the home page to select a month and batch.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-client-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="new-client-name"
                  placeholder="Contact name"
                  value={newClientFormData.name}
                  onChange={(e) => updateNewClientField("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-client-companyName">Company Name</Label>
                <Input
                  id="new-client-companyName"
                  placeholder="Company or business name"
                  value={newClientFormData.companyName}
                  onChange={(e) => updateNewClientField("companyName", e.target.value)}
                />
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-client-email">Email</Label>
                <Input
                  id="new-client-email"
                  type="email"
                  placeholder="client@example.com"
                  value={newClientFormData.email}
                  onChange={(e) => updateNewClientField("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-client-phone">Phone</Label>
                <Input
                  id="new-client-phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={newClientFormData.phone}
                  onChange={(e) => updateNewClientField("phone", e.target.value)}
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="new-client-address">Street Address</Label>
              <Input
                id="new-client-address"
                placeholder="123 Main Street"
                value={newClientFormData.address}
                onChange={(e) => updateNewClientField("address", e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-client-city">City</Label>
                <Input
                  id="new-client-city"
                  placeholder="New York"
                  value={newClientFormData.city}
                  onChange={(e) => updateNewClientField("city", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-client-state">State / Province</Label>
                <Input
                  id="new-client-state"
                  placeholder="NY"
                  value={newClientFormData.state}
                  onChange={(e) => updateNewClientField("state", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-client-postalCode">Postal Code</Label>
                <Input
                  id="new-client-postalCode"
                  placeholder="10001"
                  value={newClientFormData.postalCode}
                  onChange={(e) => updateNewClientField("postalCode", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-client-country">Country</Label>
                <Input
                  id="new-client-country"
                  placeholder="United States"
                  value={newClientFormData.country}
                  onChange={(e) => updateNewClientField("country", e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewClientDialogOpen(false);
                setNewClientFormData({
                  name: "",
                  companyName: "",
                  email: "",
                  address: "",
                  city: "",
                  state: "",
                  postalCode: "",
                  country: "",
                  phone: "",
                });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateClientAndRedirect} disabled={isCreatingClient}>
              {isCreatingClient ? "Creating..." : "Create & Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
