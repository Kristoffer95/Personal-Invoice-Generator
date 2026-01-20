"use client";

import { useState, useCallback } from "react";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderInput,
  FileText,
  Lock,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFolderTree, useFolderPath, useFolderMutations } from "@/hooks/use-invoice-folders";
import { TagSelector, TagBadgeList } from "@/components/tags/TagSelector";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";

// Use a recursive type that matches the Convex return type
type FolderNode = {
  _id: Id<"invoiceFolders">;
  name: string;
  description?: string;
  color?: string;
  parentId?: Id<"invoiceFolders">;
  tags?: Id<"tags">[];
  invoiceCount: number;
  isMoveLocked?: boolean;
  children: FolderNode[];
  // Allow additional properties from Convex
  [key: string]: unknown;
};

interface FolderTreeItemProps {
  folder: FolderNode;
  level: number;
  selectedFolderId?: FolderSelection;
  expandedFolders: Set<string>;
  onSelect: (folderId: FolderSelection) => void;
  onToggleExpand: (folderId: string) => void;
  onEdit: (folder: FolderNode) => void;
  onDelete: (folder: FolderNode) => void;
  onMove: (folder: FolderNode) => void;
  onAddSubfolder: (parentId: Id<"invoiceFolders">) => void;
  onToggleMoveLock: (folder: FolderNode) => void;
}

function FolderTreeItem({
  folder,
  level,
  selectedFolderId,
  expandedFolders,
  onSelect,
  onToggleExpand,
  onEdit,
  onDelete,
  onMove,
  onAddSubfolder,
  onToggleMoveLock,
}: FolderTreeItemProps) {
  const isExpanded = expandedFolders.has(folder._id);
  const isSelected = selectedFolderId === folder._id;
  const hasChildren = folder.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
          isSelected
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted/50"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {/* Expand/Collapse Button */}
        <button
          type="button"
          className={cn(
            "p-0.5 rounded hover:bg-muted",
            !hasChildren && "invisible"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(folder._id);
          }}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {/* Folder Icon */}
        <div
          className="flex items-center justify-center w-5 h-5"
          onClick={() => onSelect(folder._id)}
        >
          {isExpanded ? (
            <FolderOpen
              className="h-4 w-4"
              style={{ color: folder.color || undefined }}
            />
          ) : (
            <Folder
              className="h-4 w-4"
              style={{ color: folder.color || undefined }}
            />
          )}
        </div>

        {/* Folder Name */}
        <span
          className="flex-1 truncate text-sm font-medium"
          onClick={() => onSelect(folder._id)}
        >
          {folder.name}
        </span>

        {/* Lock Indicator */}
        {folder.isMoveLocked && (
          <span title="Invoices in this folder are locked from moving">
            <Lock className="h-3 w-3 text-muted-foreground" />
          </span>
        )}

        {/* Invoice Count */}
        {folder.invoiceCount > 0 && (
          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
            {folder.invoiceCount}
          </Badge>
        )}

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onAddSubfolder(folder._id)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Subfolder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(folder)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMove(folder)}>
              <FolderInput className="h-4 w-4 mr-2" />
              Move
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleMoveLock(folder)}>
              {folder.isMoveLocked ? (
                <>
                  <Unlock className="h-4 w-4 mr-2" />
                  Unlock Invoices
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Lock Invoices
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(folder)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {folder.children.map((child) => (
            <FolderTreeItem
              key={child._id}
              folder={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              expandedFolders={expandedFolders}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onEdit={onEdit}
              onDelete={onDelete}
              onMove={onMove}
              onAddSubfolder={onAddSubfolder}
              onToggleMoveLock={onToggleMoveLock}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Special folder value for uncategorized invoices (no folder assigned)
export const UNCATEGORIZED_FOLDER = "__uncategorized__" as const;
export type FolderSelection = Id<"invoiceFolders"> | typeof UNCATEGORIZED_FOLDER | undefined;

interface FolderTreeProps {
  selectedFolderId?: FolderSelection;
  onSelectFolder: (folderId: FolderSelection) => void;
  showAllInvoices?: boolean;
  allInvoicesCount?: number;
  showUncategorized?: boolean;
  uncategorizedCount?: number;
}

export function FolderTree({
  selectedFolderId,
  onSelectFolder,
  showAllInvoices = true,
  allInvoicesCount = 0,
  showUncategorized = true,
  uncategorizedCount = 0,
}: FolderTreeProps) {
  const { toast } = useToast();
  const { tree, isLoading } = useFolderTree();
  const { createFolder, updateFolder, deleteFolder, moveFolder, toggleFolderMoveLock } = useFolderMutations();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Dialog states
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderNode | null>(null);
  const [parentIdForNew, setParentIdForNew] = useState<Id<"invoiceFolders"> | undefined>();

  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [folderToMove, setFolderToMove] = useState<FolderNode | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<FolderNode | null>(null);

  // Form state
  const [folderName, setFolderName] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [folderColor, setFolderColor] = useState("#3b82f6");
  const [folderTags, setFolderTags] = useState<Id<"tags">[]>([]);
  const [selectedMoveTarget, setSelectedMoveTarget] = useState<Id<"invoiceFolders"> | null>(null);

  const handleToggleExpand = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const handleAddFolder = (parentId?: Id<"invoiceFolders">) => {
    setEditingFolder(null);
    setParentIdForNew(parentId);
    setFolderName("");
    setFolderDescription("");
    setFolderColor("#3b82f6");
    setFolderTags([]);
    setFolderDialogOpen(true);
  };

  const handleEditFolder = (folder: FolderNode) => {
    setEditingFolder(folder);
    setParentIdForNew(undefined);
    setFolderName(folder.name);
    setFolderDescription(folder.description || "");
    setFolderColor(folder.color || "#3b82f6");
    setFolderTags(folder.tags || []);
    setFolderDialogOpen(true);
  };

  const handleSaveFolder = async () => {
    if (!folderName.trim()) return;

    try {
      if (editingFolder) {
        await updateFolder({
          folderId: editingFolder._id,
          name: folderName.trim(),
          description: folderDescription || undefined,
          color: folderColor,
          tags: folderTags.length > 0 ? folderTags : undefined,
        });
        toast({ title: "Folder updated" });
      } else {
        const newId = await createFolder({
          name: folderName.trim(),
          description: folderDescription || undefined,
          color: folderColor,
          parentId: parentIdForNew,
          tags: folderTags.length > 0 ? folderTags : undefined,
        });
        toast({ title: "Folder created" });

        // Expand parent if creating subfolder
        if (parentIdForNew) {
          setExpandedFolders((prev) => new Set([...prev, parentIdForNew]));
        }
      }
      setFolderDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save folder",
        variant: "destructive",
      });
    }
  };

  const handleMoveFolder = (folder: FolderNode) => {
    setFolderToMove(folder);
    setSelectedMoveTarget(null);
    setMoveDialogOpen(true);
  };

  const handleConfirmMove = async () => {
    if (!folderToMove) return;

    try {
      await moveFolder({
        folderId: folderToMove._id,
        newParentId: selectedMoveTarget || undefined,
      });
      toast({ title: "Folder moved" });
      setMoveDialogOpen(false);
      setFolderToMove(null);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to move folder",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFolder = (folder: FolderNode) => {
    setFolderToDelete(folder);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!folderToDelete) return;

    try {
      await deleteFolder({ folderId: folderToDelete._id });
      toast({ title: "Folder deleted" });
      setDeleteDialogOpen(false);
      setFolderToDelete(null);

      // Clear selection if deleted folder was selected
      if (selectedFolderId === folderToDelete._id) {
        onSelectFolder(undefined);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete folder",
        variant: "destructive",
      });
    }
  };

  const handleToggleMoveLock = async (folder: FolderNode) => {
    try {
      await toggleFolderMoveLock({
        folderId: folder._id,
        isMoveLocked: !folder.isMoveLocked,
      });
      toast({
        title: folder.isMoveLocked
          ? "Invoices unlocked"
          : "Invoices locked",
        description: folder.isMoveLocked
          ? "Invoices in this folder can now be moved"
          : "Invoices in this folder cannot be moved",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update lock status",
        variant: "destructive",
      });
    }
  };

  // Flatten tree for move dialog
  const flattenTree = (nodes: FolderNode[], excludeId?: string): Array<{ id: Id<"invoiceFolders">; name: string; level: number }> => {
    const result: Array<{ id: Id<"invoiceFolders">; name: string; level: number }> = [];

    const traverse = (folders: FolderNode[], level: number) => {
      for (const folder of folders) {
        if (folder._id !== excludeId) {
          result.push({ id: folder._id, name: folder.name, level });
          traverse(folder.children, level + 1);
        }
      }
    };

    traverse(nodes, 0);
    return result;
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-8 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  const availableFoldersForMove = folderToMove
    ? flattenTree(tree as unknown as FolderNode[], folderToMove._id)
    : [];

  return (
    <div className="space-y-2">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Folders
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => handleAddFolder()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* All Invoices Option */}
      {showAllInvoices && (
        <div
          className={cn(
            "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
            selectedFolderId === undefined
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted/50"
          )}
          onClick={() => onSelectFolder(undefined)}
        >
          <FileText className="h-4 w-4" />
          <span className="flex-1 text-sm font-medium">All</span>
          {allInvoicesCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {allInvoicesCount}
            </Badge>
          )}
        </div>
      )}

      {/* Uncategorized Option - invoices not in any folder */}
      {showUncategorized && (
        <div
          className={cn(
            "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
            selectedFolderId === UNCATEGORIZED_FOLDER
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted/50"
          )}
          onClick={() => onSelectFolder(UNCATEGORIZED_FOLDER)}
        >
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-sm font-medium">Uncategorized</span>
          {uncategorizedCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {uncategorizedCount}
            </Badge>
          )}
        </div>
      )}

      {/* Folder Tree */}
      {tree.length === 0 ? (
        <div className="px-2 py-4 text-center text-sm text-muted-foreground">
          No folders yet
        </div>
      ) : (
        <div className="space-y-0.5">
          {(tree as unknown as FolderNode[]).map((folder) => (
            <FolderTreeItem
              key={folder._id}
              folder={folder}
              level={0}
              selectedFolderId={selectedFolderId}
              expandedFolders={expandedFolders}
              onSelect={onSelectFolder}
              onToggleExpand={handleToggleExpand}
              onEdit={handleEditFolder}
              onDelete={handleDeleteFolder}
              onMove={handleMoveFolder}
              onAddSubfolder={handleAddFolder}
              onToggleMoveLock={handleToggleMoveLock}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Folder Dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFolder ? "Edit Folder" : "New Folder"}
            </DialogTitle>
            <DialogDescription>
              {editingFolder
                ? "Update the folder details."
                : parentIdForNew
                ? "Create a new subfolder."
                : "Create a new folder to organize your invoices."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folderName">Name</Label>
              <Input
                id="folderName"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="e.g., Client Projects"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="folderDescription">Description (optional)</Label>
              <Input
                id="folderDescription"
                value={folderDescription}
                onChange={(e) => setFolderDescription(e.target.value)}
                placeholder="e.g., Invoices for client projects"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                type="color"
                value={folderColor}
                onChange={(e) => setFolderColor(e.target.value)}
                className="h-10 w-20 p-1 cursor-pointer"
              />
            </div>
            <div className="space-y-2">
              <Label>Tags (optional)</Label>
              <TagSelector
                selectedTags={folderTags}
                onChange={setFolderTags}
                type="folder"
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

      {/* Move Folder Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Folder</DialogTitle>
            <DialogDescription>
              Select a new location for &quot;{folderToMove?.name}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4 max-h-[300px] overflow-y-auto">
            <button
              type="button"
              className={cn(
                "w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors",
                selectedMoveTarget === null
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted"
              )}
              onClick={() => setSelectedMoveTarget(null)}
            >
              <Folder className="h-4 w-4" />
              <span className="text-sm font-medium">Root (No parent)</span>
            </button>
            {availableFoldersForMove.map((folder) => (
              <button
                key={folder.id}
                type="button"
                className={cn(
                  "w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors",
                  selectedMoveTarget === folder.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                )}
                style={{ paddingLeft: `${folder.level * 16 + 8}px` }}
                onClick={() => setSelectedMoveTarget(folder.id)}
              >
                <Folder className="h-4 w-4" />
                <span className="text-sm">{folder.name}</span>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmMove}>Move</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete &quot;{folderToDelete?.name}&quot;. Invoices in this folder
              will become uncategorized. Subfolders will be moved to the parent level.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Breadcrumb component for folder navigation
interface FolderBreadcrumbProps {
  folderId?: FolderSelection;
  onNavigate: (folderId?: FolderSelection) => void;
}

export function FolderBreadcrumb({ folderId, onNavigate }: FolderBreadcrumbProps) {
  // Only fetch path for actual folder IDs, not for special values
  const actualFolderId = folderId && folderId !== UNCATEGORIZED_FOLDER ? folderId : undefined;
  const { path, isLoading } = useFolderPath(actualFolderId);

  // Show breadcrumb for Uncategorized
  if (folderId === UNCATEGORIZED_FOLDER) {
    return (
      <nav className="flex items-center gap-1 text-sm">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => onNavigate(undefined)}
        >
          All
        </button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">Uncategorized</span>
      </nav>
    );
  }

  if (!folderId || isLoading) {
    return null;
  }

  return (
    <nav className="flex items-center gap-1 text-sm">
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => onNavigate(undefined)}
      >
        All
      </button>
      {path.map((item, index) => (
        <span key={item._id} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          {index === path.length - 1 ? (
            <span className="font-medium">{item.name}</span>
          ) : (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => onNavigate(item._id as Id<"invoiceFolders">)}
            >
              {item.name}
            </button>
          )}
        </span>
      ))}
    </nav>
  );
}
