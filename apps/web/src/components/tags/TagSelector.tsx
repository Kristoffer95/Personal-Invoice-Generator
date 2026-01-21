"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useInvoiceTags, useFolderTags } from "@/hooks/use-tags";
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";

interface TagSelectorProps {
  selectedTags: Id<"tags">[];
  onChange: (tags: Id<"tags">[]) => void;
  type: "invoice" | "folder";
  disabled?: boolean;
}

export function TagSelector({
  selectedTags,
  onChange,
  type,
  disabled = false,
}: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { tags: invoiceTags, isLoading: invoiceLoading } = useInvoiceTags();
  const { tags: folderTags, isLoading: folderLoading } = useFolderTags();

  const tags = type === "invoice" ? invoiceTags : folderTags;
  const isLoading = type === "invoice" ? invoiceLoading : folderLoading;

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleTag = (tagId: Id<"tags">) => {
    if (selectedTags.includes(tagId)) {
      onChange(selectedTags.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTags, tagId]);
    }
  };

  const handleRemoveTag = (tagId: Id<"tags">) => {
    onChange(selectedTags.filter((id) => id !== tagId));
  };

  const selectedTagObjects = tags.filter((tag) => selectedTags.includes(tag._id));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || isLoading}
          >
            {selectedTags.length > 0
              ? `${selectedTags.length} tag${selectedTags.length > 1 ? "s" : ""} selected`
              : "Select tags..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <div className="p-2 border-b">
            <Input
              placeholder="Search tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9"
            />
          </div>
          <ScrollArea className="h-[200px]">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading tags...
              </div>
            ) : filteredTags.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No tags found.
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag._id);
                  return (
                    <button
                      key={tag._id}
                      type="button"
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                        isSelected ? "bg-primary/10" : "hover:bg-muted"
                      )}
                      onClick={() => handleToggleTag(tag._id)}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color || "#6b7280" }}
                      />
                      <span className="flex-1 text-left">{tag.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {selectedTagObjects.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTagObjects.map((tag) => (
            <Badge
              key={tag._id}
              variant="secondary"
              className="gap-1 pr-1"
              style={{
                backgroundColor: `${tag.color}20` || "#6b728020",
                borderColor: tag.color || "#6b7280",
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: tag.color || "#6b7280" }}
              />
              {tag.name}
              {!disabled && (
                <button
                  type="button"
                  className="ml-1 rounded-full hover:bg-muted p-0.5"
                  onClick={() => handleRemoveTag(tag._id)}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

interface TagBadgeListProps {
  tagIds: Id<"tags">[];
  type: "invoice" | "folder";
}

export function TagBadgeList({ tagIds, type }: TagBadgeListProps) {
  const { tags: invoiceTags } = useInvoiceTags();
  const { tags: folderTags } = useFolderTags();

  const tags = type === "invoice" ? invoiceTags : folderTags;
  const selectedTags = tags.filter((tag) => tagIds.includes(tag._id));

  if (selectedTags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {selectedTags.map((tag) => (
        <Badge
          key={tag._id}
          variant="secondary"
          className="text-xs"
          style={{
            backgroundColor: `${tag.color}20` || "#6b728020",
            color: tag.color || "#6b7280",
          }}
        >
          {tag.name}
        </Badge>
      ))}
    </div>
  );
}
