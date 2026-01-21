"use client";

import { useState, useMemo } from "react";
import { Eye, ExternalLink, Calendar, Clock, Loader2, Download } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@invoice-generator/backend/convex/_generated/api";
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";
import { CURRENCY_SYMBOLS, type Currency, type Invoice } from "@invoice-generator/shared-types";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { InvoiceStatusBadge } from "./InvoiceStatusSelect";
import { InvoicePreview } from "./InvoicePreview";
import { useInvoiceStore } from "@/lib/store";

interface InvoicePreviewPopoverProps {
  invoiceId: Id<"invoices">;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  return `${symbol}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function InvoicePreviewPopover({ invoiceId }: InvoicePreviewPopoverProps) {
  const [showFullPreview, setShowFullPreview] = useState(false);
  const invoice = useQuery(api.invoices.getInvoice, { invoiceId });
  const { backgroundDesigns } = useInvoiceStore();

  const isLoading = invoice === undefined;
  const hasError = invoice === null;

  // Convert Convex invoice to Invoice type for the preview component
  const invoiceData: Invoice | null = useMemo(() => {
    if (!invoice) return null;

    return {
      id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      statusHistory: invoice.statusHistory ?? [],
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      sentAt: invoice.sentAt,
      paidAt: invoice.paidAt,
      viewedAt: invoice.viewedAt,
      from: invoice.from,
      to: invoice.to,
      hourlyRate: invoice.hourlyRate,
      defaultHoursPerDay: invoice.defaultHoursPerDay,
      dailyWorkHours: invoice.dailyWorkHours,
      totalDays: invoice.totalDays,
      totalHours: invoice.totalHours,
      subtotal: invoice.subtotal,
      lineItems: invoice.lineItems,
      discountPercent: invoice.discountPercent,
      discountAmount: invoice.discountAmount,
      taxPercent: invoice.taxPercent,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      currency: invoice.currency,
      paymentTerms: invoice.paymentTerms,
      customPaymentTerms: invoice.customPaymentTerms,
      bankDetails: invoice.bankDetails,
      notes: invoice.notes,
      terms: invoice.terms,
      jobTitle: invoice.jobTitle,
      tags: invoice.tags?.map(String) ?? [],
      isArchived: invoice.isArchived ?? false,
      archivedAt: invoice.archivedAt,
      showDetailedHours: invoice.showDetailedHours,
      pdfTheme: invoice.pdfTheme,
      backgroundDesignId: invoice.backgroundDesignId,
      pageSize: invoice.pageSize,
      createdAt: invoice._creationTime ? new Date(invoice._creationTime).toISOString() : new Date().toISOString(),
      updatedAt: invoice.updatedAt ? new Date(invoice.updatedAt).toISOString() : new Date().toISOString(),
    };
  }, [invoice]);

  // Get background design if set
  const backgroundDesign = useMemo(() => {
    if (!invoiceData?.backgroundDesignId) return undefined;
    return backgroundDesigns.find((d) => d.id === invoiceData.backgroundDesignId);
  }, [invoiceData?.backgroundDesignId, backgroundDesigns]);

  const handleExportPDF = async () => {
    if (!invoiceData) return;

    const { downloadPDF } = await import("@invoice-generator/pdf-generator");
    await downloadPDF({ invoice: invoiceData, backgroundDesign });
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Preview invoice"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : hasError ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Unable to load invoice preview.
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {/* Header: Invoice number and status */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm truncate">
                  {invoice.invoiceNumber}
                </span>
                <InvoiceStatusBadge status={invoice.status} />
              </div>

              {/* Client name */}
              <div className="text-sm">
                <span className="text-muted-foreground">Client: </span>
                <span className="font-medium">{invoice.to.name}</span>
              </div>

              {/* Total amount */}
              <div className="rounded-md bg-muted p-3 text-center">
                <div className="text-2xl font-bold">
                  {formatCurrency(invoice.totalAmount, invoice.currency as Currency)}
                </div>
                <div className="text-xs text-muted-foreground">Total Amount</div>
              </div>

              <Separator />

              {/* Dates section */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Issue Date:</span>
                  <span className="ml-auto">{formatDate(invoice.issueDate)}</span>
                </div>

                {invoice.dueDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Due Date:</span>
                    <span className="ml-auto">{formatDate(invoice.dueDate)}</span>
                  </div>
                )}

                {invoice.periodStart && invoice.periodEnd && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Period:</span>
                    <span className="ml-auto text-xs">
                      {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                    </span>
                  </div>
                )}
              </div>

              {/* Work hours summary */}
              {(invoice.totalHours > 0 || invoice.totalDays > 0) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-md bg-muted/50 p-2">
                      <div className="text-lg font-semibold">{invoice.totalHours.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">Hours</div>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2">
                      <div className="text-lg font-semibold">{invoice.totalDays}</div>
                      <div className="text-xs text-muted-foreground">Days</div>
                    </div>
                  </div>
                </>
              )}

              {/* Financial breakdown */}
              <Separator />
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal, invoice.currency as Currency)}</span>
                </div>
                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between text-red-600 dark:text-red-400">
                    <span>Discount ({invoice.discountPercent}%)</span>
                    <span>-{formatCurrency(invoice.discountAmount, invoice.currency as Currency)}</span>
                  </div>
                )}
                {invoice.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax ({invoice.taxPercent}%)</span>
                    <span>{formatCurrency(invoice.taxAmount, invoice.currency as Currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold pt-1 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.totalAmount, invoice.currency as Currency)}</span>
                </div>
              </div>

              {/* View full invoice button */}
              <div className="pt-2">
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => setShowFullPreview(true)}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Full Invoice
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Full Invoice Preview Modal */}
      <Dialog open={showFullPreview} onOpenChange={setShowFullPreview}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg">
                  Invoice Preview
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  {invoice ? `${invoice.invoiceNumber} - ${invoice.to.name}` : "Loading..."}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2 shrink-0 mr-8">
                <Button onClick={handleExportPDF} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden p-4">
            {invoiceData && (
              <InvoicePreview
                invoice={invoiceData}
                backgroundDesign={backgroundDesign}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
