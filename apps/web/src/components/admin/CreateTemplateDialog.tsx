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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSystemTemplateMutations } from "@/hooks/use-system-templates";
import type { Doc } from "@invoice-generator/backend/convex/_generated/dataModel";

type SystemTemplateFolder = Doc<"systemTemplateFolders">;

const PAGE_SIZES = ["A4", "LETTER", "LEGAL", "LONG", "SHORT", "A5", "B5"] as const;
const ORIENTATIONS = ["portrait", "landscape"] as const;

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: SystemTemplateFolder[];
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
  folders,
}: CreateTemplateDialogProps) {
  const { toast } = useToast();
  const mutations = useSystemTemplateMutations();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [folderId, setFolderId] = useState<string>("none");
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>("A4");
  const [orientation, setOrientation] = useState<(typeof ORIENTATIONS)[number]>("portrait");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({ title: "Template name is required", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      await mutations.createSystemTemplate({
        name: name.trim(),
        description: description.trim() || undefined,
        folderId: folderId !== "none" ? folderId as never : undefined,
        pageSize,
        orientation,
        backgroundColor,
        margins: { top: 40, right: 40, bottom: 60, left: 40 },
        elements: [],
        isHidden: false,
        isDefault: false,
      });
      toast({ title: "Template created successfully" });
      onOpenChange(false);
      // Reset form
      setName("");
      setDescription("");
      setFolderId("none");
      setPageSize("A4");
      setOrientation("portrait");
      setBackgroundColor("#ffffff");
    } catch {
      toast({ title: "Failed to create template", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form on close
      setName("");
      setDescription("");
      setFolderId("none");
      setPageSize("A4");
      setOrientation("portrait");
      setBackgroundColor("#ffffff");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Template</DialogTitle>
          <DialogDescription>
            Create a new system template. You can edit the template design after creation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Template"
                disabled={isCreating}
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of this template..."
                disabled={isCreating}
                rows={2}
              />
            </div>

            {/* Folder */}
            <div className="grid gap-2">
              <Label htmlFor="folder">Folder</Label>
              <Select value={folderId} onValueChange={setFolderId} disabled={isCreating}>
                <SelectTrigger id="folder">
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No folder</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder._id} value={folder._id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Page Size & Orientation */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="pageSize">Page Size</Label>
                <Select
                  value={pageSize}
                  onValueChange={(v) => setPageSize(v as typeof pageSize)}
                  disabled={isCreating}
                >
                  <SelectTrigger id="pageSize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="orientation">Orientation</Label>
                <Select
                  value={orientation}
                  onValueChange={(v) => setOrientation(v as typeof orientation)}
                  disabled={isCreating}
                >
                  <SelectTrigger id="orientation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORIENTATIONS.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o.charAt(0).toUpperCase() + o.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Background Color */}
            <div className="grid gap-2">
              <Label htmlFor="backgroundColor">Background Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="backgroundColor"
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  disabled={isCreating}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  disabled={isCreating}
                  className="flex-1"
                  placeholder="#ffffff"
                />
              </div>
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
                "Create Template"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
