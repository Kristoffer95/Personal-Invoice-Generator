"use client";

import { formatDistanceToNow } from "date-fns";
import {
  FileText,
  Download,
  Plus,
  Pencil,
  Trash2,
  ArrowRight,
  Archive,
  ArchiveRestore,
  Copy,
  RefreshCw,
} from "lucide-react";
import type { Doc } from "@invoice-generator/backend/convex/_generated/dataModel";

type ActivityLog = Doc<"activityLogs">;

interface ActivityFeedProps {
  activities: ActivityLog[];
  isLoading?: boolean;
  showUser?: boolean;
}

const EVENT_TYPE_CONFIG: Record<
  string,
  {
    icon: React.ReactNode;
    label: string;
    color: string;
  }
> = {
  PDF_EXPORT: {
    icon: <Download className="h-4 w-4" />,
    label: "Exported PDF",
    color: "text-blue-500",
  },
  INVOICE_CREATE: {
    icon: <Plus className="h-4 w-4" />,
    label: "Created invoice",
    color: "text-green-500",
  },
  INVOICE_UPDATE: {
    icon: <Pencil className="h-4 w-4" />,
    label: "Updated invoice",
    color: "text-yellow-500",
  },
  INVOICE_DELETE: {
    icon: <Trash2 className="h-4 w-4" />,
    label: "Deleted invoice",
    color: "text-red-500",
  },
  INVOICE_STATUS_CHANGE: {
    icon: <RefreshCw className="h-4 w-4" />,
    label: "Changed invoice status",
    color: "text-purple-500",
  },
  INVOICE_ARCHIVE: {
    icon: <Archive className="h-4 w-4" />,
    label: "Archived invoice",
    color: "text-gray-500",
  },
  INVOICE_UNARCHIVE: {
    icon: <ArchiveRestore className="h-4 w-4" />,
    label: "Unarchived invoice",
    color: "text-gray-500",
  },
  INVOICE_DUPLICATE: {
    icon: <Copy className="h-4 w-4" />,
    label: "Duplicated invoice",
    color: "text-blue-500",
  },
  INVOICE_MOVE: {
    icon: <ArrowRight className="h-4 w-4" />,
    label: "Moved invoice",
    color: "text-indigo-500",
  },
  FOLDER_CREATE: {
    icon: <Plus className="h-4 w-4" />,
    label: "Created folder",
    color: "text-green-500",
  },
  FOLDER_UPDATE: {
    icon: <Pencil className="h-4 w-4" />,
    label: "Updated folder",
    color: "text-yellow-500",
  },
  FOLDER_DELETE: {
    icon: <Trash2 className="h-4 w-4" />,
    label: "Deleted folder",
    color: "text-red-500",
  },
  FOLDER_MOVE: {
    icon: <ArrowRight className="h-4 w-4" />,
    label: "Moved folder",
    color: "text-indigo-500",
  },
  TEMPLATE_CREATE: {
    icon: <Plus className="h-4 w-4" />,
    label: "Created template",
    color: "text-green-500",
  },
  TEMPLATE_UPDATE: {
    icon: <Pencil className="h-4 w-4" />,
    label: "Updated template",
    color: "text-yellow-500",
  },
  TEMPLATE_DELETE: {
    icon: <Trash2 className="h-4 w-4" />,
    label: "Deleted template",
    color: "text-red-500",
  },
  TEMPLATE_DUPLICATE: {
    icon: <Copy className="h-4 w-4" />,
    label: "Duplicated template",
    color: "text-blue-500",
  },
  CLIENT_CREATE: {
    icon: <Plus className="h-4 w-4" />,
    label: "Created client",
    color: "text-green-500",
  },
  CLIENT_UPDATE: {
    icon: <Pencil className="h-4 w-4" />,
    label: "Updated client",
    color: "text-yellow-500",
  },
  CLIENT_DELETE: {
    icon: <Trash2 className="h-4 w-4" />,
    label: "Deleted client",
    color: "text-red-500",
  },
  USER_PROFILE_UPDATE: {
    icon: <Pencil className="h-4 w-4" />,
    label: "Updated profile",
    color: "text-yellow-500",
  },
};

export function ActivityFeed({
  activities,
  isLoading,
  showUser: _showUser = false,
}: ActivityFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 animate-pulse">
            <div className="h-8 w-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/4 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No activity yet
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity) => {
        const config = EVENT_TYPE_CONFIG[activity.eventType] ?? {
          icon: <FileText className="h-4 w-4" />,
          label: activity.eventType,
          color: "text-gray-500",
        };

        return (
          <div
            key={activity._id}
            className="flex items-start gap-3 py-3 border-b last:border-0"
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full bg-muted ${config.color}`}
            >
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{config.label}</span>
                {activity.targetName && (
                  <>
                    <span className="text-muted-foreground text-sm">·</span>
                    <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                      {activity.targetName}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.timestamp), {
                    addSuffix: true,
                  })}
                </span>
                {activity.metadata && (
                  <ActivityMetadata metadata={activity.metadata} eventType={activity.eventType} />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActivityMetadata({
  metadata,
  eventType,
}: {
  metadata: Record<string, unknown>;
  eventType: string;
}) {
  // Show relevant metadata based on event type
  let details: string | null = null;

  switch (eventType) {
    case "INVOICE_STATUS_CHANGE":
      if (metadata.previousStatus && metadata.newStatus) {
        details = `${metadata.previousStatus} → ${metadata.newStatus}`;
      }
      break;
    case "PDF_EXPORT":
      if (metadata.templateName) {
        details = `Template: ${metadata.templateName}`;
      }
      break;
    case "INVOICE_MOVE":
    case "FOLDER_MOVE":
      if (metadata.previousFolderName || metadata.newFolderName) {
        details = `${metadata.previousFolderName || "Root"} → ${metadata.newFolderName || "Root"}`;
      }
      break;
    default:
      break;
  }

  if (!details) return null;

  return (
    <>
      <span className="text-muted-foreground text-xs">·</span>
      <span className="text-xs text-muted-foreground">{details}</span>
    </>
  );
}
