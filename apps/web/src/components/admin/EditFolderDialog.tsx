"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useSystemTemplateMutations } from "@/hooks/use-system-templates";
import type { Doc } from "@invoice-generator/backend/convex/_generated/dataModel";

type SystemTemplateFolder = Doc<"systemTemplateFolders">;

interface EditFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: SystemTemplateFolder;
}

export function EditFolderDialog({
  open,
  onOpenChange,
  folder,
}: EditFolderDialogProps) {
  const { toast } = useToast();
  const mutations = useSystemTemplateMutations();

  const [name, setName] = useState(folder.name);
  const [description, setDescription] = useState(folder.description || "");
  const [sortOrder, setSortOrder] = useState(String(folder.sortOrder));
  const [isSaving, setIsSaving] = useState(false);

  // Update form when folder changes
  useEffect(() => {
    setName(folder.name);
    setDescription(folder.description || "");
    setSortOrder(String(folder.sortOrder));
  }, [folder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({ title: "Folder name is required", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      await mutations.updateFolder({
        folderId: folder._id,
        name: name.trim(),
        description: description.trim() || undefined,
        sortOrder: sortOrder ? parseInt(sortOrder, 10) : undefined,
      });
      toast({ title: "Folder updated successfully" });
      onOpenChange(false);
    } catch {
      toast({ title: "Failed to update folder", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Folder</DialogTitle>
          <DialogDescription>
            Update the folder details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="editFolderName">Name *</Label>
              <Input
                id="editFolderName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Folder"
                disabled={isSaving}
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="editFolderDescription">Description</Label>
              <Textarea
                id="editFolderDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of this folder..."
                disabled={isSaving}
                rows={2}
              />
            </div>

            {/* Sort Order */}
            <div className="grid gap-2">
              <Label htmlFor="editSortOrder">Sort Order</Label>
              <Input
                id="editSortOrder"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="1"
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers appear first.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !name.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
