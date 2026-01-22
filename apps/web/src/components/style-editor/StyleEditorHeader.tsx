'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  Download,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Ruler,
  Magnet,
  MoreVertical,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useTemplateStore } from '@/lib/template-store'

export function StyleEditorHeader() {
  const {
    currentTemplate,
    updateCurrentTemplate,
    saveCurrentTemplate,
    editorSettings,
    toggleRulers,
    toggleGrid,
    toggleSnapToGrid,
    zoomIn,
    zoomOut,
    setZoomLevel,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useTemplateStore()

  const [isEditing, setIsEditing] = useState(false)
  const [tempName, setTempName] = useState(currentTemplate?.name ?? '')

  const handleSave = () => {
    const saved = saveCurrentTemplate()
    if (saved) {
      // Show toast or notification
      console.log('Template saved:', saved.name)
    }
  }

  const handleNameChange = () => {
    if (tempName.trim()) {
      updateCurrentTemplate({ name: tempName.trim() })
    }
    setIsEditing(false)
  }

  const handleExportPDF = async () => {
    // This would trigger PDF generation with the template
    console.log('Export PDF with template')
  }

  return (
    <TooltipProvider>
      <header className="flex h-14 items-center justify-between border-b bg-background px-4">
        {/* Left section */}
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back to Dashboard</TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            {isEditing ? (
              <Input
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleNameChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameChange()
                  if (e.key === 'Escape') {
                    setTempName(currentTemplate?.name ?? '')
                    setIsEditing(false)
                  }
                }}
                className="h-8 w-[200px]"
                autoFocus
              />
            ) : (
              <button
                onClick={() => {
                  setTempName(currentTemplate?.name ?? '')
                  setIsEditing(true)
                }}
                className="text-sm font-medium hover:underline"
              >
                {currentTemplate?.name ?? 'Untitled Template'}
              </button>
            )}
          </div>
        </div>

        {/* Center section - Tools */}
        <div className="flex items-center gap-1">
          {/* Undo/Redo */}
          <div className="flex items-center gap-1 border-r pr-2 mr-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={undo}
                  disabled={!canUndo()}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo (Cmd+Z)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={redo}
                  disabled={!canRedo()}
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo (Cmd+Shift+Z)</TooltipContent>
            </Tooltip>
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-1 border-r pr-2 mr-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={editorSettings.showRulers ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={toggleRulers}
                >
                  <Ruler className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Rulers</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={editorSettings.showGrid ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={toggleGrid}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Grid</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={editorSettings.snapToGrid ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={toggleSnapToGrid}
                >
                  <Magnet className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Snap to Grid</TooltipContent>
            </Tooltip>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={zoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>

            <button
              onClick={() => setZoomLevel(100)}
              className="min-w-[60px] text-center text-sm text-muted-foreground hover:text-foreground"
            >
              {editorSettings.zoomLevel}%
            </button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={zoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>

          <Button size="sm" onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Import Template</DropdownMenuItem>
              <DropdownMenuItem>Export Template JSON</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Duplicate Template</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Delete Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </TooltipProvider>
  )
}
