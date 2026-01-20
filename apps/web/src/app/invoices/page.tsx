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
  Settings,
  FolderInput,
  Lock,
  Unlock,
  Folder,
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
import { useFolderTree, useFolderMutations } from "@/hooks/use-invoice-folders";
import { TagManager } from "@/components/tags/TagManager";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import {
  CURRENCY_SYMBOLS,
  type Currency,
  type InvoiceStatus,
} from "@invoice-generator/shared-types";
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";

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
    bulkUpdateStatus,
    moveToFolder,
    toggleMoveLock,
    bulkMoveToFolder,
  } = useInvoiceMutations();
  const { toggleFolderMoveLock } = useFolderMutations();
  const { tree: folderTree } = useFolderTree();
  const { formatted: nextInvoiceNumber, incrementNumber } = useNextInvoiceNumber();

  // View state
  const [activeTab, setActiveTab] = useState<"invoices" | "analytics" | "tags">("invoices");
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

  const handleCreateNewInvoice = () => {
    // Only pass folderId if a real folder is selected (not All or Uncategorized)
    if (selectedFolder && selectedFolder !== UNCATEGORIZED_FOLDER) {
      router.push(`/?folderId=${selectedFolder}`);
    } else {
      router.push("/");
    }
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
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="tags" className="gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </TabsTrigger>
            </TabsList>

            {activeTab === "invoices" && (
              <Button onClick={handleCreateNewInvoice}>
                <Plus className="h-4 w-4 mr-2" />
                New Invoice
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
                      <Button onClick={handleCreateNewInvoice}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Invoice
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
    </div>
  );
}
