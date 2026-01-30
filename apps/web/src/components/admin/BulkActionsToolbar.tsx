"use client";

import { X, Trash2, Eye, EyeOff, FolderOpen, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkShow: () => void;
  onBulkHide: () => void;
  onBulkMove: () => void;
  onBulkPageSize: () => void;
}

export function BulkActionsToolbar({
  selectedCount,
  onClearSelection,
  onBulkDelete,
  onBulkShow,
  onBulkHide,
  onBulkMove,
  onBulkPageSize,
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-4 rounded-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3 shadow-sm">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-8 gap-1"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
        <span className="text-sm font-medium">
          {selectedCount} {selectedCount === 1 ? "template" : "templates"} selected
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Show */}
        <Button
          variant="outline"
          size="sm"
          onClick={onBulkShow}
          className="h-8"
        >
          <Eye className="mr-2 h-4 w-4" />
          Show
        </Button>

        {/* Hide */}
        <Button
          variant="outline"
          size="sm"
          onClick={onBulkHide}
          className="h-8"
        >
          <EyeOff className="mr-2 h-4 w-4" />
          Hide
        </Button>

        {/* Move to Folder */}
        <Button
          variant="outline"
          size="sm"
          onClick={onBulkMove}
          className="h-8"
        >
          <FolderOpen className="mr-2 h-4 w-4" />
          Move
        </Button>

        {/* Page Size */}
        <Button
          variant="outline"
          size="sm"
          onClick={onBulkPageSize}
          className="h-8"
        >
          <FileText className="mr-2 h-4 w-4" />
          Page Size
        </Button>

        {/* Delete */}
        <Button
          variant="destructive"
          size="sm"
          onClick={onBulkDelete}
          className="h-8"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete ({selectedCount})
        </Button>
      </div>
    </div>
  );
}
