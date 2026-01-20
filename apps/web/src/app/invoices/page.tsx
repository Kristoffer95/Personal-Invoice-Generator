"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  ArrowLeft,
  Plus,
  Folder,
  FolderPlus,
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  FolderOpen,
  ChevronRight,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useInvoices, useUnfiledInvoices, useInvoiceMutations } from "@/hooks/use-invoices";
import { useInvoiceFolders, useFolderMutations } from "@/hooks/use-invoice-folders";
import { useNextInvoiceNumber } from "@/hooks/use-user-profile";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CURRENCY_SYMBOLS, type Currency } from "@invoice-generator/shared-types";
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";

type FolderWithCount = {
  _id: Id<"invoiceFolders">;
  name: string;
  description?: string;
  color?: string;
  parentId?: Id<"invoiceFolders">;
  invoiceCount: number;
};

type InvoiceItem = {
  _id: Id<"invoices">;
  invoiceNumber: string;
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";
  totalAmount: number;
  currency: Currency;
  issueDate: string;
  to: { name: string };
  folderId?: Id<"invoiceFolders">;
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  SENT: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  PAID: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  CANCELLED: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};

export default function InvoicesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { folders, isLoading: foldersLoading } = useInvoiceFolders();
  const { invoices: unfiledInvoices, isLoading: unfiledLoading } = useUnfiledInvoices();
  const { createFolder, updateFolder, deleteFolder } = useFolderMutations();
  const { deleteInvoice, duplicateInvoice, moveToFolder } = useInvoiceMutations();
  const { formatted: nextInvoiceNumber, incrementNumber } = useNextInvoiceNumber();

  const [selectedFolder, setSelectedFolder] = useState<Id<"invoiceFolders"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Folder dialog state
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderWithCount | null>(null);
  const [folderName, setFolderName] = useState("");

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: "folder" | "invoice"; id: string } | null>(null);

  // Get invoices for selected folder
  const { invoices: folderInvoices, isLoading: folderInvoicesLoading } = useInvoices(
    selectedFolder ? { folderId: selectedFolder } : undefined
  );

  const currentInvoices = selectedFolder ? folderInvoices : unfiledInvoices;
  const isLoading = foldersLoading || unfiledLoading || folderInvoicesLoading;

  // Filter invoices by search
  const filteredInvoices = currentInvoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.to.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateFolder = () => {
    setEditingFolder(null);
    setFolderName("");
    setFolderDialogOpen(true);
  };

  const handleEditFolder = (folder: FolderWithCount) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderDialogOpen(true);
  };

  const handleSaveFolder = async () => {
    if (!folderName.trim()) return;

    try {
      if (editingFolder) {
        await updateFolder({ folderId: editingFolder._id, name: folderName.trim() });
        toast({ title: "Folder updated" });
      } else {
        await createFolder({ name: folderName.trim() });
        toast({ title: "Folder created" });
      }
      setFolderDialogOpen(false);
    } catch {
      toast({ title: "Error", description: "Failed to save folder", variant: "destructive" });
    }
  };

  const handleDeleteFolder = async () => {
    if (!itemToDelete || itemToDelete.type !== "folder") return;

    try {
      await deleteFolder({ folderId: itemToDelete.id as Id<"invoiceFolders"> });
      if (selectedFolder === itemToDelete.id) {
        setSelectedFolder(null);
      }
      toast({ title: "Folder deleted" });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch {
      toast({ title: "Error", description: "Failed to delete folder", variant: "destructive" });
    }
  };

  const handleDeleteInvoice = async () => {
    if (!itemToDelete || itemToDelete.type !== "invoice") return;

    try {
      await deleteInvoice({ invoiceId: itemToDelete.id as Id<"invoices"> });
      toast({ title: "Invoice deleted" });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
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

  const handleCreateNewInvoice = () => {
    // Navigate to main page to create invoice
    // The folder context will be passed via query param
    if (selectedFolder) {
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

  const selectedFolderData = folders.find((f) => f._id === selectedFolder);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="font-semibold">Invoices</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </div>
      </header>

      <div className="container py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Folders */}
          <aside className="w-full lg:w-64 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Folders
              </h2>
              <Button variant="ghost" size="icon" onClick={handleCreateFolder}>
                <FolderPlus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-1">
              {/* All Invoices / Unfiled */}
              <button
                onClick={() => setSelectedFolder(null)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedFolder === null
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                }`}
              >
                <FolderOpen className="h-4 w-4" />
                <span className="flex-1 text-left">Unfiled</span>
                <span className="text-xs text-muted-foreground">
                  {unfiledInvoices.length}
                </span>
              </button>

              {/* Folder list */}
              {folders.map((folder) => (
                <div key={folder._id} className="group relative">
                  <button
                    onClick={() => setSelectedFolder(folder._id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedFolder === folder._id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    <Folder className="h-4 w-4" />
                    <span className="flex-1 text-left truncate">{folder.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {folder.invoiceCount}
                    </span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditFolder(folder)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setItemToDelete({ type: "folder", id: folder._id });
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
              ))}
            </div>
          </aside>

          {/* Main Content - Invoice List */}
          <main className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleCreateNewInvoice}>
                <Plus className="h-4 w-4 mr-2" />
                New Invoice
              </Button>
            </div>

            {/* Breadcrumb */}
            {selectedFolder && selectedFolderData && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <button
                  onClick={() => setSelectedFolder(null)}
                  className="hover:text-foreground"
                >
                  Invoices
                </button>
                <ChevronRight className="h-4 w-4" />
                <span className="text-foreground">{selectedFolderData.name}</span>
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
                    {searchQuery
                      ? "No invoices match your search"
                      : selectedFolder
                      ? "No invoices in this folder"
                      : "No unfiled invoices"}
                  </p>
                  <Button onClick={handleCreateNewInvoice}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredInvoices.map((invoice) => (
                  <Card
                    key={invoice._id}
                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
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
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full ${
                                    STATUS_COLORS[invoice.status]
                                  }`}
                                >
                                  {invoice.status}
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground truncate">
                                {invoice.to.name}
                              </div>
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
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setItemToDelete({ type: "invoice", id: invoice._id });
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
      </div>

      {/* Folder Dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFolder ? "Rename Folder" : "New Folder"}
            </DialogTitle>
            <DialogDescription>
              {editingFolder
                ? "Enter a new name for this folder."
                : "Create a folder to organize your invoices."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folderName">Folder Name</Label>
              <Input
                id="folderName"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="e.g., Client Name, Q1 2024"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveFolder();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFolder} disabled={!folderName.trim()}>
              {editingFolder ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {itemToDelete?.type === "folder" ? "Folder" : "Invoice"}?
            </DialogTitle>
            <DialogDescription>
              {itemToDelete?.type === "folder"
                ? "This will move all invoices in this folder to Unfiled. This action cannot be undone."
                : "This invoice will be permanently deleted. This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setItemToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={
                itemToDelete?.type === "folder"
                  ? handleDeleteFolder
                  : handleDeleteInvoice
              }
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
