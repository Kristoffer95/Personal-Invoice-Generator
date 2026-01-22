'use client'

import { useState, useCallback } from 'react'
import { FileDown, ChevronDown, Sun, Moon, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StylePickerDialog } from './StylePickerDialog'
import { useTemplateStore } from '@/lib/template-store'
import type { Invoice, InvoiceTemplate, BackgroundDesign } from '@invoice-generator/shared-types'

type BuiltInStyle = 'light' | 'dark'

interface ExportButtonProps {
  invoice: Invoice
  backgroundDesign?: BackgroundDesign
  onExportPDF: (invoice: Invoice, options?: { template?: InvoiceTemplate; theme?: 'light' | 'dark' }) => Promise<void>
  disabled?: boolean
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  showLabel?: boolean
}

export function ExportButton({
  invoice,
  backgroundDesign,
  onExportPDF,
  disabled,
  size = 'default',
  className,
  showLabel = true,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [showStylePicker, setShowStylePicker] = useState(false)

  const { savedTemplates, defaultTemplateId, getDefaultTemplate } = useTemplateStore()

  const hasCustomStyles = savedTemplates.length > 0
  const defaultTemplate = getDefaultTemplate()

  const handleExport = useCallback(async (options?: { template?: InvoiceTemplate; theme?: BuiltInStyle }) => {
    if (isExporting || disabled) return

    setIsExporting(true)
    try {
      await onExportPDF(invoice, options)
    } finally {
      setIsExporting(false)
    }
  }, [invoice, onExportPDF, isExporting, disabled])

  const handleMainExport = useCallback(async () => {
    if (defaultTemplate) {
      // Export with default template
      await handleExport({ template: defaultTemplate })
    } else {
      // Export with current theme (classic)
      await handleExport({ theme: invoice.pdfTheme || 'light' })
    }
  }, [defaultTemplate, handleExport, invoice.pdfTheme])

  const handleSelectTemplate = useCallback(async (template: InvoiceTemplate) => {
    await handleExport({ template })
  }, [handleExport])

  const handleSelectBuiltIn = useCallback(async (style: BuiltInStyle) => {
    await handleExport({ theme: style })
  }, [handleExport])

  // Simple button when no custom styles exist
  if (!hasCustomStyles) {
    return (
      <Button
        size={size}
        onClick={handleMainExport}
        disabled={disabled || isExporting}
        className={className}
      >
        <FileDown className={showLabel ? 'mr-2 h-4 w-4' : 'h-4 w-4'} />
        {showLabel && (isExporting ? 'Exporting...' : 'Export PDF')}
      </Button>
    )
  }

  // Split button with dropdown when custom styles exist
  const buttonText = defaultTemplate
    ? `Export (${defaultTemplate.name.length > 12 ? defaultTemplate.name.slice(0, 12) + '...' : defaultTemplate.name})`
    : 'Export PDF'

  return (
    <>
      <div className="flex">
        <Button
          size={size}
          onClick={handleMainExport}
          disabled={disabled || isExporting}
          className={`rounded-r-none ${className || ''}`}
        >
          <FileDown className={showLabel ? 'mr-2 h-4 w-4' : 'h-4 w-4'} />
          {showLabel && (isExporting ? 'Exporting...' : buttonText)}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size={size}
              variant="default"
              disabled={disabled || isExporting}
              className="rounded-l-none border-l border-l-primary-foreground/20 px-2"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {/* Built-in styles */}
            <DropdownMenuItem onClick={() => handleSelectBuiltIn('light')}>
              <Sun className="mr-2 h-4 w-4" />
              Classic Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSelectBuiltIn('dark')}>
              <Moon className="mr-2 h-4 w-4" />
              Classic Dark
            </DropdownMenuItem>

            {/* Custom templates */}
            {savedTemplates.length > 0 && (
              <>
                <DropdownMenuSeparator />
                {savedTemplates.slice(0, 5).map((template) => (
                  <DropdownMenuItem
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                  >
                    {defaultTemplateId === template.id && (
                      <Star className="mr-2 h-4 w-4 fill-yellow-500 text-yellow-500" />
                    )}
                    {defaultTemplateId !== template.id && (
                      <span className="mr-2 w-4" />
                    )}
                    <span className="truncate">{template.name}</span>
                  </DropdownMenuItem>
                ))}
              </>
            )}

            {/* Show more option if there are many templates */}
            {savedTemplates.length > 5 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowStylePicker(true)}>
                  View all styles...
                </DropdownMenuItem>
              </>
            )}

            {/* Always show the full picker option */}
            {savedTemplates.length <= 5 && savedTemplates.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowStylePicker(true)}>
                  Manage styles...
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <StylePickerDialog
        open={showStylePicker}
        onOpenChange={setShowStylePicker}
        onSelectTemplate={handleSelectTemplate}
        onSelectBuiltIn={handleSelectBuiltIn}
      />
    </>
  )
}
