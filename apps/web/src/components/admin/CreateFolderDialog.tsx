"use client";

import { useState } from "react";
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

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateFolderDialog({
  open,
  onOpenChange,
}: CreateFolderDialogProps) {
  const { toast } = useToast();
  const mutations = useSystemTemplateMutations();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({ title: "Folder name is required", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      await mutations.createFolder({
        name: name.trim(),
        description: description.trim() || undefined,
        sortOrder: sortOrder ? parseInt(sortOrder, 10) : undefined,
        isHidden: false,
      });
      toast({ title: "Folder created successfully" });
      onOpenChange(false);
      // Reset form
      setName("");
      setDescription("");
      setSortOrder("");
    } catch {
      toast({ title: "Failed to create folder", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form on close
      setName("");
      setDescription("");
      setSortOrder("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>
            Create a folder to organize your system templates.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="folderName">Name *</Label>
              <Input
                id="folderName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Folder"
                disabled={isCreating}
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="folderDescription">Description</Label>
              <Textarea
                id="folderDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of this folder..."
                disabled={isCreating}
                rows={2}
              />
            </div>

            {/* Sort Order */}
            <div className="grid gap-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="Auto (leave empty)"
                disabled={isCreating}
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers appear first. Leave empty for automatic ordering.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || !name.trim()}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Folder"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
