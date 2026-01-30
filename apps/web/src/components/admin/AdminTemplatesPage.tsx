"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  FolderPlus,
  Search,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  Pencil,
  MoreVertical,
  FolderIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  useSystemTemplatesAdmin,
  useSystemTemplateFoldersAdmin,
  useSystemTemplateMutations,
} from "@/hooks/use-system-templates";
import { AdminTemplatesTable } from "./AdminTemplatesTable";
import { CreateTemplateDialog } from "./CreateTemplateDialog";
import { CreateFolderDialog } from "./CreateFolderDialog";
import { EditFolderDialog } from "./EditFolderDialog";
import { MoveTemplateDialog } from "./MoveTemplateDialog";
import { BulkActionsToolbar } from "./BulkActionsToolbar";
import { BulkMoveDialog } from "./BulkMoveDialog";
import { BulkPageSizeDialog } from "./BulkPageSizeDialog";
import { DeleteStyleDialog } from "@/components/styles/DeleteStyleDialog";
import type { Id, Doc } from "@invoice-generator/backend/convex/_generated/dataModel";

type SystemTemplate = Doc<"systemTemplates">;

export function AdminTemplatesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { templates, isLoading: templatesLoading } = useSystemTemplatesAdmin();
  const { folders, isLoading: foldersLoading } = useSystemTemplateFoldersAdmin();
  const mutations = useSystemTemplateMutations();

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "visible" | "hidden">("all");
  const [folderFilter, setFolderFilter] = useState<string>("all");

  // Dialog states
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [editFolderOpen, setEditFolderOpen] = useState(false);
  const [deleteFolderOpen, setDeleteFolderOpen] = useState(false);
  const [deleteTemplateOpen, setDeleteTemplateOpen] = useState(false);
  const [moveTemplateOpen, setMoveTemplateOpen] = useState(false);

  // Bulk action dialog states
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [bulkPageSizeOpen, setBulkPageSizeOpen] = useState(false);

  // Selected items (single)
  const [selectedFolder, setSelectedFolder] = useState<(typeof folders)[number] | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<Id<"systemTemplates"> | null>(null);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<SystemTemplate | null>(null);

  // Multi-select state
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<Id<"systemTemplates">>>(new Set());

  // Loading states
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const isLoading = templatesLoading || foldersLoading;

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let result = templates;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
      );
    }

    // Visibility filter
    if (visibilityFilter === "visible") {
      result = result.filter((t) => !t.isHidden);
    } else if (visibilityFilter === "hidden") {
      result = result.filter((t) => t.isHidden);
    }

    // Folder filter
    if (folderFilter !== "all") {
      if (folderFilter === "uncategorized") {
        result = result.filter((t) => !t.folderId);
      } else {
        result = result.filter((t) => t.folderId === folderFilter);
      }
    }

    return result;
  }, [templates, searchQuery, visibilityFilter, folderFilter]);

  // Handlers
  const handleEditTemplate = (templateId: Id<"systemTemplates">) => {
    router.push(`/style-editor?systemTemplateId=${templateId}`);
  };

  const handleToggleTemplateVisibility = async (templateId: Id<"systemTemplates">) => {
    try {
      await mutations.toggleSystemTemplateVisibility({ templateId });
      toast({ title: "Template visibility updated" });
    } catch {
      toast({ title: "Failed to update visibility", variant: "destructive" });
    }
  };

  const handleSetDefaultTemplate = async (templateId: Id<"systemTemplates">) => {
    try {
      await mutations.setDefaultSystemTemplate({ templateId });
      toast({ title: "Default template updated" });
    } catch {
      toast({ title: "Failed to set default template", variant: "destructive" });
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplateId) return;
    setIsDeleting(true);
    try {
      await mutations.deleteSystemTemplate({ templateId: selectedTemplateId });
      toast({ title: "Template deleted" });
      setDeleteTemplateOpen(false);
      setSelectedTemplateId(null);
      setSelectedTemplateName("");
    } catch {
      toast({ title: "Failed to delete template", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteTemplateDialog = (templateId: Id<"systemTemplates">, templateName: string) => {
    setSelectedTemplateId(templateId);
    setSelectedTemplateName(templateName);
    setDeleteTemplateOpen(true);
  };

  const openMoveTemplateDialog = (template: SystemTemplate) => {
    setSelectedTemplate(template);
    setMoveTemplateOpen(true);
  };

  // Folder handlers
  const handleEditFolder = (folder: (typeof folders)[number]) => {
    setSelectedFolder(folder);
    setEditFolderOpen(true);
  };

  const handleToggleFolderVisibility = async (folderId: Id<"systemTemplateFolders">) => {
    try {
      await mutations.toggleFolderVisibility({ folderId });
      toast({ title: "Folder visibility updated" });
    } catch {
      toast({ title: "Failed to update folder visibility", variant: "destructive" });
    }
  };

  const handleDeleteFolder = async () => {
    if (!selectedFolder) return;
    setIsDeleting(true);
    try {
      await mutations.deleteFolder({ folderId: selectedFolder._id });
      toast({ title: "Folder deleted" });
      setDeleteFolderOpen(false);
      setSelectedFolder(null);
    } catch {
      toast({ title: "Failed to delete folder", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteFolderDialog = (folder: (typeof folders)[number]) => {
    setSelectedFolder(folder);
    setDeleteFolderOpen(true);
  };

  // Bulk action handlers
  const clearSelection = () => {
    setSelectedTemplateIds(new Set());
  };

  const selectedTemplateIdsArray = useMemo(() =>
    Array.from(selectedTemplateIds) as Id<"systemTemplates">[],
    [selectedTemplateIds]
  );

  const selectedTemplateNames = useMemo(() => {
    return templates
      .filter(t => selectedTemplateIds.has(t._id))
      .map(t => t.name);
  }, [templates, selectedTemplateIds]);

  const handleBulkDelete = async () => {
    if (selectedTemplateIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      const result = await mutations.bulkDeleteSystemTemplates({
        templateIds: selectedTemplateIdsArray,
      });

      if (result.successCount > 0) {
        toast({
          title: `Deleted ${result.successCount} ${result.successCount === 1 ? "template" : "templates"}`,
        });
      }

      if (result.failedCount > 0) {
        toast({
          title: `${result.failedCount} ${result.failedCount === 1 ? "template" : "templates"} failed to delete`,
          variant: "destructive",
        });
      }

      setBulkDeleteOpen(false);
      clearSelection();
    } catch {
      toast({
        title: "Failed to delete templates",
        variant: "destructive"
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkShow = async () => {
    if (selectedTemplateIds.size === 0) return;
    try {
      const result = await mutations.bulkUpdateVisibility({
        templateIds: selectedTemplateIdsArray,
        isHidden: false,
      });

      if (result.successCount > 0) {
        toast({
          title: `${result.successCount} ${result.successCount === 1 ? "template" : "templates"} shown`,
        });
      }

      clearSelection();
    } catch {
      toast({
        title: "Failed to update visibility",
        variant: "destructive"
      });
    }
  };

  const handleBulkHide = async () => {
    if (selectedTemplateIds.size === 0) return;
    try {
      const result = await mutations.bulkUpdateVisibility({
        templateIds: selectedTemplateIdsArray,
        isHidden: true,
      });

      if (result.successCount > 0) {
        toast({
          title: `${result.successCount} ${result.successCount === 1 ? "template" : "templates"} hidden`,
        });
      }

      clearSelection();
    } catch {
      toast({
        title: "Failed to update visibility",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button onClick={() => setCreateTemplateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
          <Button variant="outline" onClick={() => setCreateFolderOpen(true)}>
            <FolderPlus className="mr-2 h-4 w-4" />
            New Folder
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {templates.length} templates in {folders.length} folders
        </div>
      </div>

      {/* Folders Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderIcon className="h-5 w-5" />
            Folders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {foldersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : folders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No folders created yet
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {folders.map((folder) => {
                const templateCount = templates.filter(
                  (t) => t.folderId === folder._id
                ).length;
                return (
                  <div
                    key={folder._id}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <FolderIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{folder.name}</span>
                          {folder.isHidden && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              <EyeOff className="mr-1 h-3 w-3" />
                              Hidden
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {templateCount} {templateCount === 1 ? "template" : "templates"}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditFolder(folder)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleFolderVisibility(folder._id)}>
                          {folder.isHidden ? (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              Show to Users
                            </>
                          ) : (
                            <>
                              <EyeOff className="mr-2 h-4 w-4" />
                              Hide from Users
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => openDeleteFolderDialog(folder)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Templates Section */}
      <Card>
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Templates</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 sm:w-[200px]"
              />
            </div>
            {/* Folder filter */}
            <Select value={folderFilter} onValueChange={setFolderFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="All folders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All folders</SelectItem>
                <SelectItem value="uncategorized">Uncategorized</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder._id} value={folder._id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Visibility filter */}
            <Select value={visibilityFilter} onValueChange={(v) => setVisibilityFilter(v as typeof visibilityFilter)}>
              <SelectTrigger className="w-full sm:w-[130px]">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="visible">Visible</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bulk Actions Toolbar */}
          <BulkActionsToolbar
            selectedCount={selectedTemplateIds.size}
            onClearSelection={clearSelection}
            onBulkDelete={() => setBulkDeleteOpen(true)}
            onBulkShow={handleBulkShow}
            onBulkHide={handleBulkHide}
            onBulkMove={() => setBulkMoveOpen(true)}
            onBulkPageSize={() => setBulkPageSizeOpen(true)}
          />

          <AdminTemplatesTable
            templates={filteredTemplates}
            folders={folders}
            isLoading={isLoading}
            onEdit={handleEditTemplate}
            onToggleVisibility={handleToggleTemplateVisibility}
            onSetDefault={handleSetDefaultTemplate}
            onDelete={openDeleteTemplateDialog}
            onMoveToFolder={openMoveTemplateDialog}
            selectedIds={selectedTemplateIds}
            onSelectionChange={setSelectedTemplateIds}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateTemplateDialog
        open={createTemplateOpen}
        onOpenChange={setCreateTemplateOpen}
        folders={folders}
      />

      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
      />

      {selectedFolder && (
        <EditFolderDialog
          open={editFolderOpen}
          onOpenChange={setEditFolderOpen}
          folder={selectedFolder}
        />
      )}

      <DeleteStyleDialog
        open={deleteTemplateOpen}
        onOpenChange={setDeleteTemplateOpen}
        templateName={selectedTemplateName}
        onConfirm={handleDeleteTemplate}
        isDeleting={isDeleting}
      />

      {/* Delete Folder Confirmation */}
      <DeleteStyleDialog
        open={deleteFolderOpen}
        onOpenChange={setDeleteFolderOpen}
        templateName={selectedFolder?.name}
        onConfirm={handleDeleteFolder}
        isDeleting={isDeleting}
      />

      {/* Move Template Dialog */}
      <MoveTemplateDialog
        open={moveTemplateOpen}
        onOpenChange={setMoveTemplateOpen}
        template={selectedTemplate}
        folders={folders}
      />

      {/* Bulk Delete Confirmation */}
      <DeleteStyleDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        templateNames={selectedTemplateNames}
        count={selectedTemplateIds.size}
        onConfirm={handleBulkDelete}
        isDeleting={isBulkDeleting}
      />

      {/* Bulk Move Dialog */}
      <BulkMoveDialog
        open={bulkMoveOpen}
        onOpenChange={setBulkMoveOpen}
        templateIds={selectedTemplateIdsArray}
        folders={folders}
        onSuccess={clearSelection}
      />

      {/* Bulk Page Size Dialog */}
      <BulkPageSizeDialog
        open={bulkPageSizeOpen}
        onOpenChange={setBulkPageSizeOpen}
        templateIds={selectedTemplateIdsArray}
        onSuccess={clearSelection}
      />
    </div>
  );
}
