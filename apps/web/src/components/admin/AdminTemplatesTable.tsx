"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Eye,
  EyeOff,
  Star,
  Trash2,
  Pencil,
  MoreVertical,
  FileText,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Id, Doc } from "@invoice-generator/backend/convex/_generated/dataModel";

type SystemTemplate = Doc<"systemTemplates">;
type SystemTemplateFolder = Doc<"systemTemplateFolders">;

interface AdminTemplatesTableProps {
  templates: SystemTemplate[];
  folders: SystemTemplateFolder[];
  isLoading: boolean;
  onEdit: (templateId: Id<"systemTemplates">) => void;
  onToggleVisibility: (templateId: Id<"systemTemplates">) => void;
  onSetDefault: (templateId: Id<"systemTemplates">) => void;
  onDelete: (templateId: Id<"systemTemplates">, templateName: string) => void;
  onMoveToFolder: (template: SystemTemplate) => void;
}

export function AdminTemplatesTable({
  templates,
  folders,
  isLoading,
  onEdit,
  onToggleVisibility,
  onSetDefault,
  onDelete,
  onMoveToFolder,
}: AdminTemplatesTableProps) {
  // Create folder lookup map
  const folderMap = new Map(folders.map((f) => [f._id, f]));

  const getFolderName = (folderId: Id<"systemTemplateFolders"> | undefined) => {
    if (!folderId) return "Uncategorized";
    const folder = folderMap.get(folderId);
    return folder?.name || "Unknown";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">No templates found</p>
        <p className="text-sm text-muted-foreground/75">
          Create a new template or adjust your filters
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="h-11 px-4 text-left align-middle text-sm font-medium text-muted-foreground">
                Name
              </th>
              <th className="h-11 px-4 text-left align-middle text-sm font-medium text-muted-foreground hidden md:table-cell">
                Folder
              </th>
              <th className="h-11 px-4 text-center align-middle text-sm font-medium text-muted-foreground hidden lg:table-cell">
                Page Size
              </th>
              <th className="h-11 px-4 text-center align-middle text-sm font-medium text-muted-foreground hidden sm:table-cell">
                Status
              </th>
              <th className="h-11 px-4 text-left align-middle text-sm font-medium text-muted-foreground hidden xl:table-cell">
                Updated
              </th>
              <th className="h-11 px-4 text-right align-middle text-sm font-medium text-muted-foreground">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => (
              <tr
                key={template._id}
                className="border-b transition-colors hover:bg-muted/50"
              >
                {/* Name */}
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
                      style={{ backgroundColor: template.backgroundColor || "#ffffff" }}
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{template.name}</span>
                        {template.isDefault && (
                          <Star className="h-4 w-4 shrink-0 fill-yellow-500 text-yellow-500" />
                        )}
                      </div>
                      {template.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                          {template.description}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Folder */}
                <td className="p-4 hidden md:table-cell">
                  <span className="text-sm">{getFolderName(template.folderId)}</span>
                </td>

                {/* Page Size */}
                <td className="p-4 text-center hidden lg:table-cell">
                  <Badge variant="outline" className="text-xs">
                    {template.pageSize}
                  </Badge>
                </td>

                {/* Status */}
                <td className="p-4 hidden sm:table-cell">
                  <div className="flex items-center justify-center gap-2">
                    {template.isHidden ? (
                      <Badge variant="secondary" className="gap-1">
                        <EyeOff className="h-3 w-3" />
                        Hidden
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <Eye className="h-3 w-3" />
                        Visible
                      </Badge>
                    )}
                    {template.isDefault && (
                      <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        <Star className="h-3 w-3 fill-current" />
                        Default
                      </Badge>
                    )}
                  </div>
                </td>

                {/* Updated */}
                <td className="p-4 hidden xl:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(template.updatedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </td>

                {/* Actions */}
                <td className="p-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(template._id)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onToggleVisibility(template._id)}>
                        {template.isHidden ? (
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
                      <DropdownMenuItem onClick={() => onSetDefault(template._id)}>
                        <Star className="mr-2 h-4 w-4" />
                        {template.isDefault ? "Clear Default" : "Set as Default"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onMoveToFolder(template)}>
                        <FolderOpen className="mr-2 h-4 w-4" />
                        Move to Folder
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete(template._id, template.name)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
