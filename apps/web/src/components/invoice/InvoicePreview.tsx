'use client'

import { useState, useEffect, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import type { Invoice, BackgroundDesign } from '@invoice-generator/shared-types'

interface InvoicePreviewProps {
  invoice: Invoice
  backgroundDesign?: BackgroundDesign
}

export function InvoicePreview({ invoice, backgroundDesign }: InvoicePreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Memoize the invoice key to prevent unnecessary regeneration
  const invoiceKey = useMemo(() => {
    try {
      return JSON.stringify({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        showDetailedHours: invoice.showDetailedHours,
        jobTitle: invoice.jobTitle,
        backgroundDesignId: backgroundDesign?.id,
      })
    } catch {
      return invoice.id || 'default'
    }
  }, [invoice.id, invoice.invoiceNumber, invoice.totalAmount, invoice.showDetailedHours, invoice.jobTitle, backgroundDesign?.id])

  useEffect(() => {
    let isMounted = true
    let currentUrl: string | null = null

    async function generatePreview() {
      try {
        setIsLoading(true)
        setError(null)

        const { generatePDFBlob } = await import('@invoice-generator/pdf-generator')
        const blob = await generatePDFBlob({ invoice, backgroundDesign })

        if (isMounted) {
          currentUrl = URL.createObjectURL(blob)
          setPdfUrl(currentUrl)
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to generate preview. Please try again.')
          console.error('Preview error:', err)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    generatePreview()

    return () => {
      isMounted = false
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl)
      }
    }
  }, [invoice, backgroundDesign, invoiceKey])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Generating preview...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="w-full h-full min-h-[500px]">
      {pdfUrl && (
        <iframe
          src={pdfUrl}
          className="w-full h-full min-h-[500px] border rounded-lg"
          title="Invoice Preview"
        />
      )}
    </div>
  )
}
