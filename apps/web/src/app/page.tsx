"use client";

import { InvoiceManagerPage } from "@/components/invoice/InvoiceManagerPage";

export default function Home() {
  // Render InvoiceManagerPage with no folderId (shows all invoices)
  return <InvoiceManagerPage />;
}
