import { redirect } from "next/navigation";

interface InvoicePageProps {
  params: Promise<{ folderId: string; invoiceId: string }>;
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { folderId, invoiceId } = await params;

  // Redirect to the calendar subpage for editing the invoice
  redirect(`/folders/${folderId}/invoices/${invoiceId}/calendar`);
}
