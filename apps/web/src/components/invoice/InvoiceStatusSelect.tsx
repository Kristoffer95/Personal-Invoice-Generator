"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  type InvoiceStatus,
} from "@invoice-generator/shared-types";

interface InvoiceStatusSelectProps {
  value: InvoiceStatus;
  onChange: (status: InvoiceStatus, notes?: string) => void;
  disabled?: boolean;
  showNotes?: boolean;
}

const ALL_STATUSES: InvoiceStatus[] = [
  "DRAFT",
  "TO_SEND",
  "SENT",
  "VIEWED",
  "PAYMENT_PENDING",
  "PARTIAL_PAYMENT",
  "PAID",
  "OVERDUE",
  "CANCELLED",
  "REFUNDED",
];

export function InvoiceStatusSelect({
  value,
  onChange,
  disabled = false,
  showNotes = true,
}: InvoiceStatusSelectProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<InvoiceStatus | null>(null);
  const [notes, setNotes] = useState("");

  const handleStatusChange = (newStatus: InvoiceStatus) => {
    if (showNotes && newStatus !== value) {
      setPendingStatus(newStatus);
      setNotes("");
      setDialogOpen(true);
    } else {
      onChange(newStatus);
    }
  };

  const handleConfirm = () => {
    if (pendingStatus) {
      onChange(pendingStatus, notes || undefined);
      setDialogOpen(false);
      setPendingStatus(null);
      setNotes("");
    }
  };

  const colors = INVOICE_STATUS_COLORS[value];

  return (
    <>
      <Select value={value} onValueChange={handleStatusChange} disabled={disabled}>
        <SelectTrigger className="w-[180px]">
          <SelectValue>
            <Badge className={`${colors.bg} ${colors.text} border-0`}>
              {INVOICE_STATUS_LABELS[value]}
            </Badge>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ALL_STATUSES.map((status) => {
            const statusColors = INVOICE_STATUS_COLORS[status];
            return (
              <SelectItem key={status} value={status}>
                <Badge className={`${statusColors.bg} ${statusColors.text} border-0`}>
                  {INVOICE_STATUS_LABELS[status]}
                </Badge>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
            <DialogDescription>
              Change status from {INVOICE_STATUS_LABELS[value]} to{" "}
              {pendingStatus ? INVOICE_STATUS_LABELS[pendingStatus] : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add a note about this status change..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const colors = INVOICE_STATUS_COLORS[status];
  return (
    <Badge className={`${colors.bg} ${colors.text} border-0`}>
      {INVOICE_STATUS_LABELS[status]}
    </Badge>
  );
}
