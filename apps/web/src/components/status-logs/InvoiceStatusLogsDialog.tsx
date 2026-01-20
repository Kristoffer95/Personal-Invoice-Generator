"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, ArrowRight, FileText, History } from "lucide-react";
import { useInvoiceStatusLogs, type StatusLog } from "@/hooks/use-status-logs";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  type InvoiceStatus,
} from "@invoice-generator/shared-types";
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";

// Status badge component
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

  if (days > 0) return `${days} day${days !== 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  if (minutes > 0) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
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

// Log entry component
function LogEntry({ log, isFirst }: { log: StatusLog; isFirst: boolean }) {
  return (
    <div className="relative pl-8 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-[11px] top-2 bottom-0 w-px bg-border last:hidden" />

      {/* Timeline dot */}
      <div
        className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center ${
          isFirst ? "bg-primary" : "bg-muted"
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full ${
            isFirst ? "bg-white" : "bg-muted-foreground"
          }`}
        />
      </div>

      <div className="space-y-2">
        {/* Status transition */}
        <div className="flex items-center gap-2 flex-wrap">
          {log.previousStatus ? (
            <>
              <StatusBadge status={log.previousStatus} />
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </>
          ) : (
            <span className="text-xs text-muted-foreground mr-1">Created as</span>
          )}
          <StatusBadge status={log.newStatus} />
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatDateTime(log.changedAtStr)}</span>
          <span className="text-muted-foreground/50">({formatRelativeTime(log.changedAt)})</span>
        </div>

        {/* Notes */}
        {log.notes && (
          <div className="text-sm p-2 rounded bg-muted">
            {log.notes}
          </div>
        )}
      </div>
    </div>
  );
}

// Props for controlled mode
interface InvoiceStatusLogsDialogProps {
  invoiceId: Id<"invoices">;
  invoiceNumber?: string;
  trigger?: React.ReactNode;
}

export function InvoiceStatusLogsDialog({
  invoiceId,
  invoiceNumber,
  trigger,
}: InvoiceStatusLogsDialogProps) {
  const [open, setOpen] = useState(false);
  const { logs, isLoading } = useInvoiceStatusLogs(open ? invoiceId : undefined);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="gap-2">
            <History className="h-4 w-4" />
            View Logs
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Status History
            {invoiceNumber && (
              <span className="text-muted-foreground font-normal">
                - {invoiceNumber}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Complete history of status changes for this invoice
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          {isLoading ? (
            <div className="space-y-4 py-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 pl-8">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-3 bg-muted rounded w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No status history available</p>
            </div>
          ) : (
            <div className="py-4">
              {logs.map((log, index) => (
                <LogEntry key={log._id} log={log} isFirst={index === 0} />
              ))}
            </div>
          )}
        </ScrollArea>

        {logs.length > 0 && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            {logs.length} status change{logs.length !== 1 ? "s" : ""} recorded
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
