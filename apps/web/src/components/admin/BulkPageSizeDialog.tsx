"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
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
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";

// Page sizes matching the pageSizeValidator in backend
const PAGE_SIZE_OPTIONS = [
  { value: "A4", label: "A4 (210 × 297mm)" },
  { value: "LETTER", label: "Letter (8.5 × 11in)" },
  { value: "LEGAL", label: "Legal (8.5 × 14in)" },
  { value: "LONG", label: "Long (8.5 × 13in)" },
  { value: "SHORT", label: "Short (8.5 × 6.5in)" },
  { value: "A5", label: "A5 (148 × 210mm)" },
  { value: "B5", label: "B5 (176 × 250mm)" },
] as const;

type PageSize = typeof PAGE_SIZE_OPTIONS[number]["value"];

interface BulkPageSizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateIds: Id<"systemTemplates">[];
  onSuccess?: () => void;
}

export function BulkPageSizeDialog({
  open,
  onOpenChange,
  templateIds,
  onSuccess,
}: BulkPageSizeDialogProps) {
  const { toast } = useToast();
  const mutations = useSystemTemplateMutations();
  const [selectedPageSize, setSelectedPageSize] = useState<PageSize>("A4");
  const [isUpdating, setIsUpdating] = useState(false);

  const count = templateIds.length;

  // Reset state when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setSelectedPageSize("A4");
    }
    onOpenChange(newOpen);
  };

  const handleUpdate = async () => {
    if (count === 0) return;

    setIsUpdating(true);
    try {
      const result = await mutations.bulkUpdatePageSize({
        templateIds,
        pageSize: selectedPageSize,
      });

      if (result.successCount > 0) {
        toast({
          title: `Updated ${result.successCount} ${result.successCount === 1 ? "template" : "templates"}`,
          description: `Page size set to ${selectedPageSize}`,
        });
      }

      if (result.failedCount > 0) {
        toast({
          title: `${result.failedCount} ${result.failedCount === 1 ? "template" : "templates"} failed to update`,
          variant: "destructive",
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast({
        title: "Failed to update page size",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Update Page Size
          </DialogTitle>
          <DialogDescription>
            Set the page size for {count} selected {count === 1 ? "template" : "templates"}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Page size selection */}
          <div className="grid gap-2">
            <Label htmlFor="pageSize">Page Size</Label>
            <Select value={selectedPageSize} onValueChange={(v) => setSelectedPageSize(v as PageSize)}>
              <SelectTrigger id="pageSize">
                <SelectValue placeholder="Select a page size" />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating || count === 0}>
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update {count} {count === 1 ? "Template" : "Templates"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
