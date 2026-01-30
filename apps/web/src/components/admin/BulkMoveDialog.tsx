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

type SystemTemplateFolder = Doc<"systemTemplateFolders">;

interface BulkMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateIds: Id<"systemTemplates">[];
  folders: SystemTemplateFolder[];
  onSuccess?: () => void;
}

export function BulkMoveDialog({
  open,
  onOpenChange,
  templateIds,
  folders,
  onSuccess,
}: BulkMoveDialogProps) {
  const { toast } = useToast();
  const mutations = useSystemTemplateMutations();
  const [selectedFolderId, setSelectedFolderId] = useState<string>("uncategorized");
  const [isMoving, setIsMoving] = useState(false);

  const count = templateIds.length;

  // Reset state when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setSelectedFolderId("uncategorized");
    }
    onOpenChange(newOpen);
  };

  const handleMove = async () => {
    if (count === 0) return;

    const newFolderId = selectedFolderId === "uncategorized"
      ? undefined
      : selectedFolderId as Id<"systemTemplateFolders">;

    setIsMoving(true);
    try {
      const result = await mutations.bulkMoveTemplates({
        templateIds,
        folderId: newFolderId,
      });

      const folderName = newFolderId
        ? folders.find(f => f._id === newFolderId)?.name || "selected folder"
        : "Uncategorized";

      if (result.successCount > 0) {
        toast({
          title: `Moved ${result.successCount} ${result.successCount === 1 ? "template" : "templates"}`,
          description: `Moved to ${folderName}`,
        });
      }

      if (result.failedCount > 0) {
        toast({
          title: `${result.failedCount} ${result.failedCount === 1 ? "template" : "templates"} failed to move`,
          variant: "destructive",
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast({
        title: "Failed to move templates",
        variant: "destructive"
      });
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Move {count} {count === 1 ? "Template" : "Templates"}
          </DialogTitle>
          <DialogDescription>
            Select a folder to move the selected templates to.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
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
          <Button onClick={handleMove} disabled={isMoving || count === 0}>
            {isMoving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Move {count} {count === 1 ? "Template" : "Templates"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
