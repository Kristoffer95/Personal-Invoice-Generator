"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@invoice-generator/backend/convex/_generated/api";
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";

export type InvoiceStatus =
  | "DRAFT"
  | "TO_SEND"
  | "SENT"
  | "VIEWED"
  | "PAYMENT_PENDING"
  | "PARTIAL_PAYMENT"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED"
  | "REFUNDED";

export interface InvoiceFilterOptions {
  folderId?: Id<"invoiceFolders">;
  status?: InvoiceStatus;
  statuses?: InvoiceStatus[];
  isArchived?: boolean;
  tags?: Id<"tags">[];
  clientName?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  searchQuery?: string;
  limit?: number;
}

export function useInvoices(options?: InvoiceFilterOptions) {
  const invoices = useQuery(api.invoices.listInvoices, options ?? {});

  return {
    invoices: invoices ?? [],
    isLoading: invoices === undefined,
  };
}

export function useRecentInvoices(limit?: number) {
  const invoices = useQuery(api.invoices.listRecent, { limit });

  return {
    invoices: invoices ?? [],
    isLoading: invoices === undefined,
  };
}

export function useInvoice(invoiceId: Id<"invoices"> | undefined) {
  const invoice = useQuery(
    api.invoices.getInvoice,
    invoiceId ? { invoiceId } : "skip"
  );

  return {
    invoice: invoice ?? null,
    isLoading: invoice === undefined,
  };
}

export function useUnfiledInvoices() {
  const invoices = useQuery(api.invoices.getUnfiled);

  return {
    invoices: invoices ?? [],
    isLoading: invoices === undefined,
  };
}

export function useArchivedInvoices(limit?: number) {
  const invoices = useQuery(api.invoices.getArchivedInvoices, { limit });

  return {
    invoices: invoices ?? [],
    isLoading: invoices === undefined,
  };
}

export function useInvoiceMutations() {
  const createInvoice = useMutation(api.invoices.createInvoice);
  const updateInvoice = useMutation(api.invoices.updateInvoice);
  const deleteInvoice = useMutation(api.invoices.removeInvoice);
  const duplicateInvoice = useMutation(api.invoices.duplicateInvoice);
  const moveToFolder = useMutation(api.invoices.moveToFolder);
  const updateStatus = useMutation(api.invoices.updateStatus);
  const archiveInvoice = useMutation(api.invoices.archiveInvoice);
  const unarchiveInvoice = useMutation(api.invoices.unarchiveInvoice);
  const bulkArchiveInvoices = useMutation(api.invoices.bulkArchiveInvoices);
  const bulkUpdateStatus = useMutation(api.invoices.bulkUpdateStatus);

  return {
    createInvoice,
    updateInvoice,
    deleteInvoice,
    duplicateInvoice,
    moveToFolder,
    updateStatus,
    archiveInvoice,
    unarchiveInvoice,
    bulkArchiveInvoices,
    bulkUpdateStatus,
  };
}
