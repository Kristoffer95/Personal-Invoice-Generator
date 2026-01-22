"use client";

import { use } from "react";
import { InvoiceManagerPage } from "@/components/invoice/InvoiceManagerPage";
import { UNCATEGORIZED_FOLDER, type FolderSelection } from "@/components/folders/FolderTree";
import type { Id } from "@invoice-generator/backend/convex/_generated/dataModel";

interface FolderPageProps {
  params: Promise<{ folderId: string }>;
}

export default function FolderPage({ params }: FolderPageProps) {
  const { folderId } = use(params);

  // Convert the folderId param to the proper FolderSelection type
  // "uncategorized" is a special value for invoices without a folder
  const folderSelection: FolderSelection =
    folderId === "uncategorized"
      ? UNCATEGORIZED_FOLDER
      : (folderId as Id<"invoiceFolders">);

  return <InvoiceManagerPage folderId={folderSelection} />;
}
