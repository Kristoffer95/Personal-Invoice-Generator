"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  ArrowRight,
  Clock,
  X,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useStatusLogs, useStatusLogStats, type StatusLog } from "@/hooks/use-status-logs";
import { useFolderTree } from "@/hooks/use-invoice-folders";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  type InvoiceStatus,
} from "@invoice-generator/shared-types";
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";

// Status badge component matching InvoiceStatusBadge style
function StatusBadge({ status }: { status: InvoiceStatus }) {
  const colors = INVOICE_STATUS_COLORS[status];
  return (
    <Badge className={`${colors.bg} ${colors.text} border-0 whitespace-nowrap`}>
      {INVOICE_STATUS_LABELS[status]}
    </Badge>
  );
}

// Format relative time
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

// Format full date time
function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Single log entry component
function StatusLogEntry({
  log,
  onInvoiceClick,
}: {
  log: StatusLog;
  onInvoiceClick: (invoiceId: Id<"invoices">) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onInvoiceClick(log.invoiceId)}
                className="flex items-center gap-1 text-sm font-medium hover:underline"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                {log.invoiceNumber}
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </button>

              {log.folderName && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Folder className="h-3 w-3" />
                  {log.folderName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1">
              {log.previousStatus && (
                <>
                  <StatusBadge status={log.previousStatus} />
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </>
              )}
              <StatusBadge status={log.newStatus} />
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(log.changedAt)}
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Date & Time:</span>
                <span className="ml-2">{formatDateTime(log.changedAtStr)}</span>
              </div>
              {log.folderName && (
                <div>
                  <span className="text-muted-foreground">Folder:</span>
                  <span className="ml-2">{log.folderName}</span>
                </div>
              )}
            </div>
            {log.notes && (
              <div className="text-sm">
                <span className="text-muted-foreground">Notes:</span>
                <p className="mt-1 p-2 rounded bg-muted">{log.notes}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Filter state type
export interface StatusLogFiltersState {
  searchQuery: string;
  folderId?: Id<"invoiceFolders">;
  status?: InvoiceStatus;
  dateFrom?: number;
  dateTo?: number;
}

export const defaultStatusLogFilters: StatusLogFiltersState = {
  searchQuery: "",
  folderId: undefined,
  status: undefined,
  dateFrom: undefined,
  dateTo: undefined,
};

// Filters component
function StatusLogFilters({
  filters,
  onChange,
  onClear,
}: {
  filters: StatusLogFiltersState;
  onChange: (filters: StatusLogFiltersState) => void;
  onClear: () => void;
}) {
  const { tree: folderTree } = useFolderTree();

  // Flatten folders for select
  type FlatFolder = { id: Id<"invoiceFolders">; name: string; level: number };
  const flattenFolderTree = (
    folders: typeof folderTree,
    level = 0
  ): FlatFolder[] => {
    const result: FlatFolder[] = [];
    for (const folder of folders) {
      result.push({ id: folder._id, name: folder.name, level });
      if (folder.children && folder.children.length > 0) {
        result.push(...flattenFolderTree(folder.children as typeof folderTree, level + 1));
      }
    }
    return result;
  };

  const flatFolders = flattenFolderTree(folderTree);

  const activeFilterCount = [
    filters.folderId,
    filters.status,
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  const allStatuses: InvoiceStatus[] = [
    "DRAFT",
    "TO_SEND",
    "SENT",
    "PARTIAL_PAYMENT",
    "PAID",
    "OVERDUE",
    "CANCELLED",
    "REFUNDED",
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-[400px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by invoice # or folder..."
          value={filters.searchQuery}
          onChange={(e) =>
            onChange({ ...filters, searchQuery: e.target.value })
          }
          className="pl-9"
        />
      </div>

      {/* Folder Filter */}
      <Select
        value={filters.folderId ?? "all"}
        onValueChange={(value) =>
          onChange({
            ...filters,
            folderId: value === "all" ? undefined : value as Id<"invoiceFolders">,
          })
        }
      >
        <SelectTrigger className="w-[180px]">
          <Folder className="h-4 w-4 mr-2" />
          <SelectValue placeholder="All folders" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All folders</SelectItem>
          {flatFolders.map((folder) => (
            <SelectItem key={folder.id} value={folder.id}>
              {"  ".repeat(folder.level)}{folder.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select
        value={filters.status ?? "all"}
        onValueChange={(value) =>
          onChange({
            ...filters,
            status: value === "all" ? undefined : value as InvoiceStatus,
          })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {allStatuses.map((status) => (
            <SelectItem key={status} value={status}>
              {INVOICE_STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date Range Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Date Range
            {(filters.dateFrom || filters.dateTo) && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                1
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">From</label>
              <Input
                type="date"
                value={
                  filters.dateFrom
                    ? new Date(filters.dateFrom).toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  onChange({
                    ...filters,
                    dateFrom: e.target.value
                      ? new Date(e.target.value).getTime()
                      : undefined,
                  })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">To</label>
              <Input
                type="date"
                value={
                  filters.dateTo
                    ? new Date(filters.dateTo).toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  onChange({
                    ...filters,
                    dateTo: e.target.value
                      ? new Date(e.target.value).setHours(23, 59, 59, 999)
                      : undefined,
                  })
                }
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear Filters */}
      {(activeFilterCount > 0 || filters.searchQuery) && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}

// Statistics card
function StatusLogStatsCard() {
  const { stats, isLoading } = useStatusLogStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Activity Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const topStatuses = Object.entries(stats.byStatus)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Activity Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stats.totalChanges}</div>
        <p className="text-xs text-muted-foreground">Total status changes</p>

        {topStatuses.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground">Most common transitions:</p>
            {topStatuses.map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <StatusBadge status={status as InvoiceStatus} />
                <span className="text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Main component
export function StatusLogList() {
  const router = useRouter();
  const [filters, setFilters] = useState<StatusLogFiltersState>(defaultStatusLogFilters);
  const [cursor, setCursor] = useState<number | undefined>(undefined);

  // Build query options from filters
  const queryOptions = useMemo(() => ({
    folderId: filters.folderId,
    status: filters.status,
    searchQuery: filters.searchQuery || undefined,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    limit: 20,
    cursor,
  }), [filters, cursor]);

  const { logs, hasMore, isLoading, isFetching, nextCursor } = useStatusLogs(queryOptions);

  const handleInvoiceClick = (invoiceId: Id<"invoices">) => {
    router.push(`/?invoiceId=${invoiceId}`);
  };

  const handleLoadMore = () => {
    if (nextCursor) {
      setCursor(nextCursor);
    }
  };

  const handleClearFilters = () => {
    setFilters(defaultStatusLogFilters);
    setCursor(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3">
          <StatusLogFilters
            filters={filters}
            onChange={(newFilters) => {
              setFilters(newFilters);
              setCursor(undefined); // Reset pagination when filters change
            }}
            onClear={handleClearFilters}
          />
        </div>
        <StatusLogStatsCard />
      </div>

      {/* Logs List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse flex items-center gap-4">
                  <div className="h-6 w-6 bg-muted rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-2">No status logs found</p>
            <p className="text-sm text-muted-foreground">
              {filters.searchQuery || filters.folderId || filters.status
                ? "Try adjusting your filters"
                : "Status changes will appear here when invoices are updated"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {logs.map((log) => (
              <StatusLogEntry
                key={log._id}
                log={log}
                onInvoiceClick={handleInvoiceClick}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isFetching}
              >
                {isFetching ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
