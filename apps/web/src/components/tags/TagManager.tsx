"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Tag as TagIcon } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTags, useTagMutations, type TagType } from "@/hooks/use-tags";
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";

const TAG_COLORS = [
  { name: "Gray", value: "#6b7280" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Yellow", value: "#eab308" },
  { name: "Lime", value: "#84cc16" },
  { name: "Green", value: "#22c55e" },
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Fuchsia", value: "#d946ef" },
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
];

type TagItem = {
  _id: Id<"tags">;
  name: string;
  color?: string;
  type: TagType;
};

export function TagManager() {
  const { toast } = useToast();
  const { tags, isLoading } = useTags();
  const { createTag, updateTag, removeTag } = useTagMutations();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#3b82f6");
  const [tagType, setTagType] = useState<TagType>("both");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<TagItem | null>(null);

  const handleCreateTag = () => {
    setEditingTag(null);
    setTagName("");
    setTagColor("#3b82f6");
    setTagType("both");
    setDialogOpen(true);
  };

  const handleEditTag = (tag: TagItem) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color || "#3b82f6");
    setTagType(tag.type);
    setDialogOpen(true);
  };

  const handleSaveTag = async () => {
    if (!tagName.trim()) return;

    try {
      if (editingTag) {
        await updateTag({
          tagId: editingTag._id,
          name: tagName.trim(),
          color: tagColor,
          type: tagType,
        });
        toast({ title: "Tag updated" });
      } else {
        await createTag({
          name: tagName.trim(),
          color: tagColor,
          type: tagType,
        });
        toast({ title: "Tag created" });
      }
      setDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save tag",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTag = async () => {
    if (!tagToDelete) return;

    try {
      await removeTag({ tagId: tagToDelete._id });
      toast({ title: "Tag deleted" });
      setDeleteDialogOpen(false);
      setTagToDelete(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete tag",
        variant: "destructive",
      });
    }
  };

  const getTypeLabel = (type: TagType) => {
    switch (type) {
      case "invoice":
        return "Invoices only";
      case "folder":
        return "Folders only";
      case "both":
        return "Both";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TagIcon className="h-5 w-5" />
              Tags
            </CardTitle>
            <CardDescription>
              Organize your invoices and folders with tags
            </CardDescription>
          </div>
          <Button onClick={handleCreateTag} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Tag
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading tags...
          </div>
        ) : tags.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No tags yet. Create one to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {tags.map((tag) => (
              <div
                key={tag._id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: tag.color || "#6b7280" }}
                  />
                  <span className="font-medium">{tag.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {getTypeLabel(tag.type)}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEditTag(tag as TagItem)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => {
                      setTagToDelete(tag as TagItem);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create/Edit Tag Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTag ? "Edit Tag" : "New Tag"}</DialogTitle>
            <DialogDescription>
              {editingTag
                ? "Update the tag details."
                : "Create a new tag to organize your invoices and folders."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tagName">Name</Label>
              <Input
                id="tagName"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="e.g., Urgent, Client A, Q1 2024"
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-9 gap-2">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                      tagColor === color.value
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setTagColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagType">Can be used for</Label>
              <Select value={tagType} onValueChange={(v) => setTagType(v as TagType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both invoices and folders</SelectItem>
                  <SelectItem value="invoice">Invoices only</SelectItem>
                  <SelectItem value="folder">Folders only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTag} disabled={!tagName.trim()}>
              {editingTag ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tag?</DialogTitle>
            <DialogDescription>
              This will remove the tag &quot;{tagToDelete?.name}&quot; from all invoices and
              folders. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setTagToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTag}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
