"use client";

import { useState } from "react";
import { FolderIcon, Loader2, FolderOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSystemTemplateMutations } from "@/hooks/use-system-templates";
import type { Id, Doc } from "@invoice-generator/backend/convex/_generated/dataModel";

type SystemTemplate = Doc<"systemTemplates">;
type SystemTemplateFolder = Doc<"systemTemplateFolders">;

interface MoveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: SystemTemplate | null;
  folders: SystemTemplateFolder[];
}

export function MoveTemplateDialog({
  open,
  onOpenChange,
  template,
  folders,
}: MoveTemplateDialogProps) {
  const { toast } = useToast();
  const mutations = useSystemTemplateMutations();
  const [selectedFolderId, setSelectedFolderId] = useState<string>("uncategorized");
  const [isMoving, setIsMoving] = useState(false);

  // Reset state when dialog opens with a new template
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && template) {
      // Set initial value to current folder or "uncategorized"
      setSelectedFolderId(template.folderId ?? "uncategorized");
    }
    onOpenChange(newOpen);
  };

  const handleMove = async () => {
    if (!template) return;

    const newFolderId = selectedFolderId === "uncategorized"
      ? undefined
      : selectedFolderId as Id<"systemTemplateFolders">;

    // Check if folder actually changed
    if (newFolderId === template.folderId) {
      toast({ title: "Template is already in this folder" });
      return;
    }

    setIsMoving(true);
    try {
      await mutations.updateSystemTemplate({
        templateId: template._id,
        folderId: newFolderId,
      });

      const folderName = newFolderId
        ? folders.find(f => f._id === newFolderId)?.name || "selected folder"
        : "Uncategorized";

      toast({
        title: "Template moved",
        description: `"${template.name}" moved to ${folderName}`,
      });
      onOpenChange(false);
    } catch {
      toast({
        title: "Failed to move template",
        variant: "destructive"
      });
    } finally {
      setIsMoving(false);
    }
  };

  // Get current folder name for display
  const currentFolderName = template?.folderId
    ? folders.find(f => f._id === template.folderId)?.name || "Unknown"
    : "Uncategorized";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Move Template
          </DialogTitle>
          <DialogDescription>
            Move &quot;{template?.name}&quot; to a different folder.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Current folder info */}
          <div className="text-sm text-muted-foreground">
            Currently in: <span className="font-medium text-foreground">{currentFolderName}</span>
          </div>

          {/* Folder selection */}
          <div className="grid gap-2">
            <Label htmlFor="folder">Move to folder</Label>
            <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
              <SelectTrigger id="folder">
                <SelectValue placeholder="Select a folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uncategorized">
                  <div className="flex items-center gap-2">
                    <FolderIcon className="h-4 w-4 text-muted-foreground" />
                    Uncategorized
                  </div>
                </SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder._id} value={folder._id}>
                    <div className="flex items-center gap-2">
                      <FolderIcon className="h-4 w-4 text-muted-foreground" />
                      {folder.name}
                      {folder.isHidden && (
                        <span className="text-xs text-muted-foreground">(hidden)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMoving}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={isMoving}>
            {isMoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Move Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
