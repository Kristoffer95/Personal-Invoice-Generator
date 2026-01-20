"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@invoice-generator/backend/convex/_generated/api";
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";

export function useInvoices(options?: {
  folderId?: Id<"invoiceFolders">;
  status?: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";
  limit?: number;
}) {
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

export function useInvoiceMutations() {
  const createInvoice = useMutation(api.invoices.createInvoice);
  const updateInvoice = useMutation(api.invoices.updateInvoice);
  const deleteInvoice = useMutation(api.invoices.removeInvoice);
  const duplicateInvoice = useMutation(api.invoices.duplicateInvoice);
  const moveToFolder = useMutation(api.invoices.moveToFolder);
  const updateStatus = useMutation(api.invoices.updateStatus);

  return {
    createInvoice,
    updateInvoice,
    deleteInvoice,
    duplicateInvoice,
    moveToFolder,
    updateStatus,
  };
}
