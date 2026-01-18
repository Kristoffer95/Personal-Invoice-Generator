'use client'

import dynamic from 'next/dynamic'
import type { Invoice } from '@invoice-generator/shared-types'

// Dynamically import the form to avoid SSR issues with zustand persist
const InvoiceForm = dynamic(
  () => import('@/components/invoice/InvoiceForm').then((mod) => mod.InvoiceForm),
  { ssr: false }
)

export default function Home() {
  const handleExportPDF = async (invoice: Invoice) => {
    // Dynamic import of PDF generator to reduce initial bundle
    const { downloadPDF } = await import('@invoice-generator/pdf-generator')

    await downloadPDF({
      invoice,
    })
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <InvoiceForm onExportPDF={handleExportPDF} />
      </div>
    </main>
  )
}
