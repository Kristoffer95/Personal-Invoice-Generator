'use client'

import dynamic from 'next/dynamic'
import type { Invoice } from '@invoice-generator/shared-types'

// Dynamically import the calendar page to avoid SSR issues with zustand persist
const InvoiceCalendarPage = dynamic(
  () => import('@/components/invoice/InvoiceCalendarPage').then((mod) => mod.InvoiceCalendarPage),
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

  return <InvoiceCalendarPage onExportPDF={handleExportPDF} />
}
