"use client";

import { use } from "react";
import dynamic from "next/dynamic";
import type { Invoice, InvoiceTemplate } from "@invoice-generator/shared-types";
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";

// Dynamically import the calendar page to avoid SSR issues with zustand persist
const InvoiceCalendarPage = dynamic(
  () => import("@/components/invoice/InvoiceCalendarPage").then((mod) => mod.InvoiceCalendarPage),
  { ssr: false }
);

interface ExportOptions {
  template?: InvoiceTemplate;
  theme?: "light" | "dark";
}

interface InvoiceCalendarPageProps {
  params: Promise<{ folderId: string; invoiceId: string }>;
}

export default function InvoiceEditCalendarPage({ params }: InvoiceCalendarPageProps) {
  const { folderId, invoiceId } = use(params);

  // Convert "uncategorized" to undefined for backend compatibility
  const resolvedFolderId = folderId === "uncategorized" ? undefined : folderId;

  const handleExportPDF = async (invoice: Invoice, options?: ExportOptions) => {
    // Dynamic import of PDF generator to reduce initial bundle
    const { downloadPDF, downloadTemplatePDF } = await import("@invoice-generator/pdf-generator");

    if (options?.template) {
      // Export with custom template
      await downloadTemplatePDF({
        template: options.template,
        invoice,
      });
    } else {
      // Export with classic theme
      const invoiceWithTheme = options?.theme
        ? { ...invoice, pdfTheme: options.theme }
        : invoice;
      await downloadPDF({
        invoice: invoiceWithTheme,
      });
    }
  };

  return (
    <InvoiceCalendarPage
      folderId={resolvedFolderId}
      invoiceId={invoiceId as Id<"invoices">}
      onExportPDF={handleExportPDF}
    />
  );
}
