'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Loader2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Invoice, BackgroundDesign } from '@invoice-generator/shared-types'

interface InvoicePreviewProps {
  invoice: Invoice
  backgroundDesign?: BackgroundDesign
}

/**
 * Detects if the current browser is iOS Safari or WebKit-based.
 * iOS Safari doesn't support PDF URL fragment parameters (#view=Fit&zoom=X),
 * so we need to use CSS transforms for zoom instead.
 */
function isIOSOrSafari(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua)
  return isIOS || isSafari
}

export function InvoicePreview({ invoice, backgroundDesign }: InvoicePreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(50) // Percentage: 50 = default for mobile readability
  const [isMobileSafari, setIsMobileSafari] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Detect iOS/Safari on mount
  useEffect(() => {
    setIsMobileSafari(isIOSOrSafari())
  }, [])

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

  // Zoom controls - using button controls only
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 25, 200))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 25, 50))
  }, [])

  const handleResetZoom = useCallback(() => {
    setZoomLevel(50)
  }, [])

  // Build PDF URL - for iOS/Safari we don't add fragment params as they're ignored
  // For other browsers, we keep them as a fallback (though we use CSS zoom as primary)
  const pdfViewUrl = useMemo(() => {
    if (!pdfUrl) return null
    // On iOS/Safari, fragment params are ignored, so just use the blob URL
    // On other browsers, add params as secondary support (CSS zoom is primary)
    if (isMobileSafari) {
      return pdfUrl
    }
    // view=FitH fits width, toolbar=0 hides toolbar, navpanes=0 hides navigation
    return `${pdfUrl}#view=FitH&toolbar=0&navpanes=0`
  }, [pdfUrl, isMobileSafari])

  // Calculate CSS transform scale for zoom
  // 100% zoom = scale(1), PDF fits container naturally
  const zoomScale = zoomLevel / 100

  // Calculate container dimensions for proper scaling
  // When zoomed, we need to adjust the iframe size to maintain proper overflow scrolling
  const iframeStyle = useMemo(() => {
    const baseStyle: React.CSSProperties = {
      minHeight: '400px',
      border: 'none',
    }

    // Apply CSS transform for zoom on all browsers (works universally)
    // This ensures consistent behavior across iOS Safari and other browsers
    if (zoomLevel !== 100) {
      return {
        ...baseStyle,
        transform: `scale(${zoomScale})`,
        transformOrigin: 'top left',
        // Adjust width/height to maintain proper scroll area
        width: `${100 / zoomScale}%`,
        height: `${100 / zoomScale}%`,
      }
    }

    return {
      ...baseStyle,
      width: '100%',
      height: '100%',
    }
  }, [zoomLevel, zoomScale])

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Generating preview...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* Zoom controls - buttons only */}
      <div className="mb-2 flex items-center justify-center gap-2 border-b pb-2">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 sm:h-8 sm:w-8"
          onClick={handleZoomOut}
          disabled={zoomLevel <= 50}
          aria-label="Zoom out"
        >
          <ZoomOut className="h-5 w-5 sm:h-4 sm:w-4" />
        </Button>
        <span className="min-w-[60px] text-center text-sm text-muted-foreground">
          {zoomLevel}%
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 sm:h-8 sm:w-8"
          onClick={handleZoomIn}
          disabled={zoomLevel >= 200}
          aria-label="Zoom in"
        >
          <ZoomIn className="h-5 w-5 sm:h-4 sm:w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 sm:h-8 sm:w-8"
          onClick={handleResetZoom}
          disabled={zoomLevel === 50}
          aria-label="Reset zoom to default"
        >
          <RotateCcw className="h-5 w-5 sm:h-4 sm:w-4" />
        </Button>
      </div>

      {/* PDF viewer with CSS-based zoom for cross-browser support */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-auto rounded-lg border bg-muted/30"
        style={{
          // Touch behavior for mobile
          WebkitOverflowScrolling: 'touch',
          // Ensure proper scrolling when zoomed
          overscrollBehavior: 'contain',
        }}
      >
        {pdfViewUrl && (
          <object
            data={pdfViewUrl}
            type="application/pdf"
            style={iframeStyle}
            title="Invoice Preview"
            aria-label="Invoice Preview"
          >
            {/* Fallback for browsers that don't support embedded PDFs */}
            <iframe
              src={pdfViewUrl}
              style={iframeStyle}
              title="Invoice Preview"
              sandbox="allow-same-origin"
            />
          </object>
        )}
      </div>
    </div>
  )
}
