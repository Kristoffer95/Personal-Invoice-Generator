import type {
  TemplateElement,
  Margin,
  LayoutConfig,
  Spacing,
  Alignment,
  GridConfig,
  SizingMode,
  MinHeightMode,
} from './template'
import type { VisibilityContext } from './element-visibility/types'
import { shouldRenderElement } from './element-visibility/registry'

// Calculated position for rendering
export interface CalculatedPosition {
  x: number
  y: number
  width: number
  height: number
}

// Table content data for height estimation
export interface TableContentData {
  workHoursRowCount: number
  lineItemsRowCount: number
  summaryRowCount: number // Typically 3-5 rows for subtotal, discount, tax, total
}

// Constants for table height estimation
const TABLE_HEADER_HEIGHT = 24 // Header row height in points
const TABLE_ROW_HEIGHT = 22 // Content row height in points
const TABLE_MIN_HEIGHT = 40 // Minimum table height

// Default layout config
const defaultLayoutConfig: LayoutConfig = {
  direction: 'column',
  gap: 8,
  align: 'stretch',
  justify: 'start',
  wrap: false,
}

// Default spacing
const defaultSpacing: Spacing = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
}

// Default grid config
const defaultGridConfig: GridConfig = {
  templateColumns: '1fr 1fr',
  columnGap: 8,
  rowGap: 8,
}

/**
 * Calculate minimum height constraint for an element
 * Returns the minimum height in points, or 0 if no minimum is set
 */
function calculateMinHeight(
  element: TemplateElement,
  elements: TemplateElement[],
  pageHeight: number,
  parentHeight?: number,
  tableContent?: TableContentData,
  visibilityContext?: VisibilityContext
): number {
  const minHeightMode: MinHeightMode = element.minHeightMode ?? 'none'

  switch (minHeightMode) {
    case 'none':
      return 0 // No minimum constraint
    case 'fixed':
      return element.minHeightValue ?? 0
    case 'auto': {
      // Auto minimum: use content-based height
      // For layout containers, calculate auto height
      if (element.type === 'layout_container') {
        const children = getContainerChildren(element.id, elements, visibilityContext)
        return calculateAutoHeight(element, children, elements, tableContent, visibilityContext)
      }
      // For tables, estimate based on content
      if (isTableElement(element.type)) {
        return estimateTableHeight(element, tableContent)
      }
      // For other elements, use their natural height
      return element.position.height
    }
    case 'percentage': {
      const percent = element.minHeightPercent ?? 0
      const referenceHeight = parentHeight ?? pageHeight
      return (referenceHeight * percent) / 100
    }
    default:
      return 0
  }
}

/**
 * Apply minimum height constraint to a calculated height
 */
function applyMinHeight(
  calculatedHeight: number,
  element: TemplateElement,
  elements: TemplateElement[],
  pageHeight: number,
  parentHeight?: number,
  tableContent?: TableContentData,
  visibilityContext?: VisibilityContext
): number {
  const minHeight = calculateMinHeight(
    element,
    elements,
    pageHeight,
    parentHeight,
    tableContent,
    visibilityContext
  )
  return Math.max(calculatedHeight, minHeight)
}

/**
 * Estimate table height based on row count
 * Used for auto-height propagation to parent containers
 */
function estimateTableHeight(
  element: TemplateElement,
  tableContent?: TableContentData
): number {
  if (!tableContent) {
    // No content data - use element's defined height
    return element.position.height
  }

  let rowCount = 0

  switch (element.type) {
    case 'table_work_hours':
      rowCount = tableContent.workHoursRowCount
      break
    case 'table_line_items':
      rowCount = tableContent.lineItemsRowCount
      break
    case 'table_summary':
      rowCount = tableContent.summaryRowCount
      break
    default:
      return element.position.height
  }

  if (rowCount === 0) {
    // Table has no content - return minimum height
    return TABLE_MIN_HEIGHT
  }

  // Calculate height: header + rows
  const estimatedHeight = TABLE_HEADER_HEIGHT + rowCount * TABLE_ROW_HEIGHT

  // Return the larger of estimated height or element's defined height
  // This ensures the table is never smaller than designed
  return Math.max(estimatedHeight, TABLE_MIN_HEIGHT)
}

/**
 * Check if element is a table type
 */
function isTableElement(type: string): boolean {
  return type === 'table_work_hours' || type === 'table_line_items' || type === 'table_summary'
}

/**
 * Build a map of elements by their ID for quick lookup
 */
function buildElementMap(elements: TemplateElement[]): Map<string, TemplateElement> {
  return new Map(elements.map((el) => [el.id, el]))
}

/**
 * Get children of a container, sorted by order
 * Exported for use by visibility handlers
 *
 * @param containerId - The container element ID
 * @param elements - All template elements
 * @param visibilityContext - Optional visibility context for filtering hidden elements
 *                            If provided, children that fail visibility check are excluded
 *                            If omitted, only checks element.visible flag (editor mode)
 */
export function getContainerChildren(
  containerId: string,
  elements: TemplateElement[],
  visibilityContext?: VisibilityContext
): TemplateElement[] {
  return elements
    .filter((el) => {
      // Basic filters: must be a child of this container
      if (el.parentId !== containerId) return false
      if (el.positionMode !== 'relative') return false
      if (el.visible === false) return false

      // If visibility context provided, check element visibility
      // This filters out elements that resolve to empty (e.g., empty text, no data tables)
      if (visibilityContext) {
        return shouldRenderElement(el, visibilityContext)
      }

      return true
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

/**
 * Calculate auto-height for a container based on its children
 * Now includes table height estimation when tableContent is provided
 * Returns 0 for empty containers when showWhenEmpty is false (auto-collapse)
 *
 * @param container - The container element
 * @param children - Pre-filtered children (already filtered by visibility if context provided)
 * @param elements - All template elements
 * @param tableContent - Optional table content data for height estimation
 * @param visibilityContext - Optional visibility context for recursive child filtering
 */
function calculateAutoHeight(
  container: TemplateElement,
  children: TemplateElement[],
  elements: TemplateElement[],
  tableContent?: TableContentData,
  visibilityContext?: VisibilityContext
): number {
  if (children.length === 0) {
    // Empty container: return 0 if showWhenEmpty is false (collapse), otherwise minimum height
    if (container.showWhenEmpty === false || container.showWhenEmpty === undefined) {
      return 0
    }
    return 40 // Minimum height when showWhenEmpty is true
  }

  const config = container.layoutConfig ?? defaultLayoutConfig
  const isColumn = config.direction === 'column'
  const padding = container.padding ?? 0

  let totalHeight = padding * 2 // Top and bottom padding

  if (isColumn) {
    // For column layout, sum up all children heights plus gaps
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      const spacing = child.spacing ?? defaultSpacing

      // Get child height (recursively calculate if it's an auto-height container or table)
      let childHeight = child.position.height

      if (child.type === 'layout_container' && child.heightMode === 'auto') {
        const grandchildren = getContainerChildren(child.id, elements, visibilityContext)
        childHeight = calculateAutoHeight(child, grandchildren, elements, tableContent, visibilityContext)
      } else if (isTableElement(child.type)) {
        // Estimate table height based on content
        childHeight = estimateTableHeight(child, tableContent)
      }

      totalHeight += childHeight + spacing.top + spacing.bottom

      // Add gap between children (not after the last one)
      if (i < children.length - 1) {
        totalHeight += config.gap
      }
    }
  } else {
    // For row layout, take the maximum height of children
    let maxChildHeight = 0
    for (const child of children) {
      const spacing = child.spacing ?? defaultSpacing

      // Get child height (recursively calculate if it's an auto-height container or table)
      let childHeight = child.position.height

      if (child.type === 'layout_container' && child.heightMode === 'auto') {
        const grandchildren = getContainerChildren(child.id, elements, visibilityContext)
        childHeight = calculateAutoHeight(child, grandchildren, elements, tableContent, visibilityContext)
      } else if (isTableElement(child.type)) {
        // Estimate table height based on content
        childHeight = estimateTableHeight(child, tableContent)
      }

      const totalChildHeight = childHeight + spacing.top + spacing.bottom
      maxChildHeight = Math.max(maxChildHeight, totalChildHeight)
    }
    totalHeight += maxChildHeight
  }

  return Math.max(totalHeight, 40) // Minimum 40
}

/**
 * Calculate alignment offset for cross-axis positioning
 */
function calculateAlignOffset(
  childSize: number,
  containerSize: number,
  align: Alignment
): number {
  switch (align) {
    case 'start':
      return 0
    case 'center':
      return (containerSize - childSize) / 2
    case 'end':
      return containerSize - childSize
    case 'stretch':
      return 0
    default:
      return 0
  }
}

/**
 * Calculate child size with stretch alignment
 */
function calculateChildSize(
  originalSize: number,
  containerSize: number,
  align: Alignment,
  alignSelf?: Alignment
): number {
  const effectiveAlign = alignSelf ?? align
  if (effectiveAlign === 'stretch') {
    return containerSize
  }
  return originalSize
}

/**
 * Calculate effective height for an element based on its height mode
 * Works for both layout containers (using heightMode) and other elements (using heightSizingMode)
 */
function calculateEffectiveHeight(
  element: TemplateElement,
  elements: TemplateElement[],
  pageHeight: number,
  parentHeight?: number,
  availableHeight?: number,
  tableContent?: TableContentData,
  visibilityContext?: VisibilityContext
): number {
  let height: number

  // For layout containers, use the legacy heightMode
  if (element.type === 'layout_container') {
    const heightMode = element.heightMode ?? 'fixed'

    switch (heightMode) {
      case 'auto': {
        const children = getContainerChildren(element.id, elements, visibilityContext)
        height = calculateAutoHeight(element, children, elements, tableContent, visibilityContext)
        break
      }
      case 'percentage': {
        const percent = element.heightPercent ?? 100
        const referenceHeight = parentHeight ?? pageHeight
        height = Math.max(10, (referenceHeight * percent) / 100)
        break
      }
      case 'fixed':
      default:
        height = element.position.height
    }
  } else if (isTableElement(element.type) && tableContent) {
    // For table elements, estimate height based on content
    height = estimateTableHeight(element, tableContent)
  } else {
    // For other elements, use heightSizingMode
    const sizingMode: SizingMode = element.heightSizingMode ?? 'fixed'

    switch (sizingMode) {
      case 'auto':
        // Auto height: for most elements, use their natural height
        // In the future, this could be enhanced to measure text content
        height = element.position.height
        break
      case 'percentage': {
        const percent = element.heightSizingPercent ?? 100
        const referenceHeight = parentHeight ?? pageHeight
        height = Math.max(10, (referenceHeight * percent) / 100)
        break
      }
      case 'fill': {
        // Fill available height in parent container
        if (availableHeight !== undefined) {
          height = Math.max(10, availableHeight)
        } else {
          height = element.position.height
        }
        break
      }
      case 'fixed':
      default:
        height = element.position.height
    }
  }

  // Apply minHeight constraint
  return applyMinHeight(height, element, elements, pageHeight, parentHeight, tableContent, visibilityContext)
}

/**
 * Calculate effective width for an element based on its width mode
 */
function calculateEffectiveWidth(
  element: TemplateElement,
  pageWidth: number,
  parentWidth?: number,
  availableWidth?: number
): number {
  // Layout containers don't use widthMode - they use their position width
  if (element.type === 'layout_container') {
    return element.position.width
  }

  const sizingMode: SizingMode = element.widthMode ?? 'fixed'

  switch (sizingMode) {
    case 'auto':
      // Auto width: for most elements, use their natural width
      // In the future, this could be enhanced to measure text content
      return element.position.width
    case 'percentage': {
      const percent = element.widthPercent ?? 100
      const referenceWidth = parentWidth ?? pageWidth
      return Math.max(10, (referenceWidth * percent) / 100)
    }
    case 'fill': {
      // Fill available width in parent container
      if (availableWidth !== undefined) {
        return Math.max(10, availableWidth)
      }
      return element.position.width
    }
    case 'fixed':
    default:
      return element.position.width
  }
}

/**
 * Get the flex basis for a child element
 * Returns the basis size along the main axis
 */
function getFlexBasis(
  child: TemplateElement,
  isColumn: boolean,
  elements: TemplateElement[],
  pageHeight: number,
  containerHeight: number,
  containerWidth: number,
  availableMainSize: number,
  tableContent?: TableContentData,
  visibilityContext?: VisibilityContext
): number {
  const flexBasis = child.flexBasis

  // If flexBasis is a number, use it directly
  if (typeof flexBasis === 'number') {
    return flexBasis
  }

  // If 'auto' or undefined, use the element's natural size based on sizing mode
  if (isColumn) {
    // For column layout, main axis is height
    return calculateEffectiveHeight(
      child,
      elements,
      pageHeight,
      containerHeight,
      availableMainSize, // For 'fill' mode
      tableContent,
      visibilityContext
    )
  } else {
    // For row layout, main axis is width
    return calculateEffectiveWidth(
      child,
      containerWidth,
      containerWidth,
      availableMainSize // For 'fill' mode - note: 'fill' on main axis handled by flexGrow
    )
  }
}

/**
 * Parse a CSS grid track value (e.g., "1fr", "100px", "auto")
 * Returns the resolved size in points
 */
function parseGridTrack(
  track: string,
  availableSpace: number,
  totalFr: number
): number {
  track = track.trim()

  if (track === 'auto') {
    // Auto: will be determined by content, default to fair share
    return availableSpace / Math.max(1, totalFr || 1)
  }

  if (track.endsWith('fr')) {
    const fr = parseFloat(track.slice(0, -2))
    if (!isNaN(fr) && totalFr > 0) {
      return (availableSpace * fr) / totalFr
    }
    return availableSpace / Math.max(1, totalFr || 1)
  }

  if (track.endsWith('px') || track.endsWith('pt')) {
    const value = parseFloat(track.slice(0, -2))
    if (!isNaN(value)) {
      return value
    }
  }

  if (track.endsWith('%')) {
    const percent = parseFloat(track.slice(0, -1))
    if (!isNaN(percent)) {
      return (availableSpace * percent) / 100
    }
  }

  // Try parsing as raw number (points)
  const num = parseFloat(track)
  if (!isNaN(num)) {
    return num
  }

  // Default fallback
  return availableSpace / Math.max(1, totalFr || 1)
}

/**
 * Parse grid template string into track sizes
 * e.g., "1fr 1fr 1fr" -> [size1, size2, size3]
 */
function parseGridTemplate(
  template: string,
  availableSpace: number
): number[] {
  const tracks = template.trim().split(/\s+/)

  // First pass: calculate total fr units and fixed sizes
  let totalFr = 0
  let usedSpace = 0

  for (const track of tracks) {
    if (track.endsWith('fr')) {
      totalFr += parseFloat(track.slice(0, -2)) || 0
    } else if (track !== 'auto') {
      // Fixed size
      const size = parseGridTrack(track, availableSpace, 0)
      usedSpace += size
    }
  }

  // Calculate space available for fr units
  const frSpace = Math.max(0, availableSpace - usedSpace)

  // Second pass: resolve all track sizes
  return tracks.map((track) => parseGridTrack(track, frSpace, totalFr))
}

/**
 * Parse grid line specification (e.g., "1 / 3", "span 2", "1")
 * Returns [startLine, endLine] (1-indexed)
 */
function parseGridLine(
  spec: string | undefined,
  defaultStart: number,
  maxLines: number
): [number, number] {
  if (!spec) {
    return [defaultStart, defaultStart + 1]
  }

  spec = spec.trim()

  // Handle "span N"
  if (spec.startsWith('span ')) {
    const span = parseInt(spec.slice(5), 10) || 1
    return [defaultStart, Math.min(defaultStart + span, maxLines + 1)]
  }

  // Handle "start / end"
  if (spec.includes('/')) {
    const [startStr, endStr] = spec.split('/').map((s) => s.trim())

    let start = parseInt(startStr, 10)
    if (isNaN(start)) start = defaultStart

    let end: number
    if (endStr.startsWith('span ')) {
      const span = parseInt(endStr.slice(5), 10) || 1
      end = start + span
    } else {
      end = parseInt(endStr, 10)
      if (isNaN(end)) end = start + 1
    }

    return [
      Math.max(1, Math.min(start, maxLines)),
      Math.max(start + 1, Math.min(end, maxLines + 1)),
    ]
  }

  // Single value
  const line = parseInt(spec, 10)
  if (!isNaN(line)) {
    return [Math.max(1, line), Math.max(1, line) + 1]
  }

  return [defaultStart, defaultStart + 1]
}

/**
 * Calculate positions for children using CSS Grid layout
 */
function calculateGridChildPositions(
  container: TemplateElement,
  children: TemplateElement[],
  containerPosition: CalculatedPosition,
  elements: TemplateElement[] = [],
  pageHeight: number = 0,
  tableContent?: TableContentData,
  visibilityContext?: VisibilityContext
): Map<string, CalculatedPosition> {
  const result = new Map<string, CalculatedPosition>()
  const config = container.layoutConfig ?? defaultLayoutConfig
  const gridConfig = config.grid ?? defaultGridConfig
  const padding = container.padding ?? 0

  // Available space after padding
  const availableWidth = containerPosition.width - padding * 2
  const availableHeight = containerPosition.height - padding * 2

  // Parse column and row templates
  const columnSizes = parseGridTemplate(gridConfig.templateColumns, availableWidth)
  const numColumns = columnSizes.length

  // For row template: if not specified, create auto rows based on children
  let rowSizes: number[]
  const numChildren = children.length
  const implicitRows = Math.ceil(numChildren / numColumns)

  if (gridConfig.templateRows) {
    rowSizes = parseGridTemplate(gridConfig.templateRows, availableHeight)
  } else {
    // Auto rows: distribute available height (minus gaps) equally
    const totalRowGap = Math.max(0, implicitRows - 1) * (gridConfig.rowGap ?? 8)
    const rowHeight = (availableHeight - totalRowGap) / Math.max(1, implicitRows)
    rowSizes = Array(implicitRows).fill(rowHeight)
  }
  const numRows = rowSizes.length

  // Subtract gaps from column sizes to get actual track widths
  const totalColumnGap = Math.max(0, numColumns - 1) * (gridConfig.columnGap ?? 8)
  const adjustedColumnSizes = columnSizes.map(
    (size) => size - totalColumnGap / numColumns
  )

  // Calculate column start positions (x offsets)
  const columnStarts: number[] = [padding]
  for (let i = 0; i < numColumns - 1; i++) {
    columnStarts.push(
      columnStarts[i] + adjustedColumnSizes[i] + (gridConfig.columnGap ?? 8)
    )
  }

  // Calculate row start positions (y offsets)
  const rowStarts: number[] = [padding]
  for (let i = 0; i < numRows - 1; i++) {
    rowStarts.push(rowStarts[i] + rowSizes[i] + (gridConfig.rowGap ?? 8))
  }

  // Track which cells are occupied
  const occupied = new Set<string>()

  // Find next available cell
  function findNextCell(startRow: number): [number, number] {
    for (let row = startRow; row <= numRows; row++) {
      for (let col = 1; col <= numColumns; col++) {
        if (!occupied.has(`${row}-${col}`)) {
          return [row, col]
        }
      }
    }
    return [numRows + 1, 1] // Overflow
  }

  // Mark cells as occupied
  function markOccupied(
    rowStart: number,
    rowEnd: number,
    colStart: number,
    colEnd: number
  ): void {
    for (let r = rowStart; r < rowEnd; r++) {
      for (let c = colStart; c < colEnd; c++) {
        occupied.add(`${r}-${c}`)
      }
    }
  }

  let currentRow = 1

  for (const child of children) {
    const spacing = child.spacing ?? defaultSpacing

    // Parse grid placement
    let [colStart, colEnd] = parseGridLine(child.gridColumn, 1, numColumns)
    let [rowStart, rowEnd] = parseGridLine(child.gridRow, currentRow, numRows)

    // If no explicit placement, auto-place
    if (!child.gridColumn && !child.gridRow) {
      const [autoRow, autoCol] = findNextCell(currentRow)
      colStart = autoCol
      colEnd = autoCol + 1
      rowStart = autoRow
      rowEnd = autoRow + 1
    }

    // Ensure we don't exceed grid bounds
    colStart = Math.max(1, Math.min(colStart, numColumns))
    colEnd = Math.max(colStart + 1, Math.min(colEnd, numColumns + 1))
    rowStart = Math.max(1, Math.min(rowStart, numRows))
    rowEnd = Math.max(rowStart + 1, Math.min(rowEnd, numRows + 1))

    // Mark cells as occupied
    markOccupied(rowStart, rowEnd, colStart, colEnd)

    // Calculate position and size
    const x =
      containerPosition.x +
      (columnStarts[colStart - 1] ?? padding) +
      spacing.left
    const y =
      containerPosition.y + (rowStarts[rowStart - 1] ?? padding) + spacing.top

    // Calculate width spanning multiple columns
    let width = 0
    for (let c = colStart - 1; c < colEnd - 1; c++) {
      width += adjustedColumnSizes[c] ?? 0
      if (c < colEnd - 2) {
        width += gridConfig.columnGap ?? 8 // Add gap for spanned columns
      }
    }
    width -= spacing.left + spacing.right

    // Calculate height spanning multiple rows
    let height = 0
    for (let r = rowStart - 1; r < rowEnd - 1; r++) {
      height += rowSizes[r] ?? 0
      if (r < rowEnd - 2) {
        height += gridConfig.rowGap ?? 8 // Add gap for spanned rows
      }
    }
    height -= spacing.top + spacing.bottom

    // Handle nested layout containers and tables
    if (child.type === 'layout_container') {
      const effectiveHeight = calculateEffectiveHeight(
        child,
        elements,
        pageHeight,
        height,
        undefined,
        tableContent,
        visibilityContext
      )
      height = effectiveHeight
    } else if (isTableElement(child.type)) {
      // Estimate table height based on content
      height = estimateTableHeight(child, tableContent)
    }

    result.set(child.id, {
      x,
      y,
      width: Math.max(10, width),
      height: Math.max(10, height),
    })

    // Update current row for auto-placement
    if (!child.gridRow) {
      currentRow = rowStart
    }
  }

  return result
}

/**
 * Calculate positions for children of a layout container
 * Implements flexbox-like behavior with flex-grow, flex-shrink, and flex-basis
 */
function calculateContainerChildPositions(
  container: TemplateElement,
  children: TemplateElement[],
  containerPosition: CalculatedPosition,
  elements: TemplateElement[] = [],
  pageHeight: number = 0,
  tableContent?: TableContentData,
  visibilityContext?: VisibilityContext
): Map<string, CalculatedPosition> {
  const config = container.layoutConfig ?? defaultLayoutConfig

  // If grid mode, use grid calculation
  if (config.displayMode === 'grid') {
    return calculateGridChildPositions(
      container,
      children,
      containerPosition,
      elements,
      pageHeight,
      tableContent,
      visibilityContext
    )
  }

  // Otherwise use flexbox (default)
  const result = new Map<string, CalculatedPosition>()
  const isColumn = config.direction === 'column'
  const padding = container.padding ?? 0

  // Available space after padding
  const availableWidth = containerPosition.width - padding * 2
  const availableHeight = containerPosition.height - padding * 2
  const availableMainSize = isColumn ? availableHeight : availableWidth
  const availableCrossSize = isColumn ? availableWidth : availableHeight

  // First pass: calculate base sizes and flex factors
  const childData: Array<{
    child: TemplateElement
    spacing: Spacing
    baseCrossSize: number // Size along cross axis (height for row, width for column)
    baseMainSize: number // Flex basis (size along main axis before flex adjustment)
    flexGrow: number
    flexShrink: number
    finalMainSize: number // Will be calculated
    finalCrossSize: number // Will be calculated
  }> = []

  let totalBaseMainSize = 0
  let totalFlexGrow = 0
  let totalFlexShrink = 0

  for (const child of children) {
    const spacing = child.spacing ?? defaultSpacing
    const flexGrow = child.flexGrow ?? 0
    const flexShrink = child.flexShrink ?? 1

    // Get flex basis (main axis size)
    const baseMainSize = getFlexBasis(
      child,
      isColumn,
      elements,
      pageHeight,
      containerPosition.height,
      containerPosition.width,
      availableMainSize,
      tableContent,
      visibilityContext
    )

    // Get cross axis size - use effective calculations for width/height modes
    let baseCrossSize: number
    if (isColumn) {
      // Cross axis is width for column layout
      baseCrossSize = calculateEffectiveWidth(
        child,
        containerPosition.width,
        availableWidth,
        availableWidth // available for fill mode
      )
    } else {
      // Cross axis is height for row layout
      baseCrossSize = calculateEffectiveHeight(
        child,
        elements,
        pageHeight,
        containerPosition.height,
        availableHeight, // available for fill mode
        tableContent,
        visibilityContext
      )
    }

    // Add spacing to main size for total calculation
    const mainSizeWithSpacing = baseMainSize + (isColumn ? spacing.top + spacing.bottom : spacing.left + spacing.right)

    childData.push({
      child,
      spacing,
      baseCrossSize,
      baseMainSize,
      flexGrow,
      flexShrink,
      finalMainSize: baseMainSize,
      finalCrossSize: baseCrossSize,
    })

    totalBaseMainSize += mainSizeWithSpacing
    totalFlexGrow += flexGrow
    totalFlexShrink += flexShrink
  }

  // Calculate total gap size
  const totalGapSize = children.length > 1 ? (children.length - 1) * config.gap : 0
  const totalContentSize = totalBaseMainSize + totalGapSize
  let freeSpace = availableMainSize - totalContentSize

  // Distribute free space based on flex-grow (positive space) or flex-shrink (negative space)
  if (freeSpace > 0 && totalFlexGrow > 0) {
    // Positive free space: distribute based on flex-grow
    const spacePerGrow = freeSpace / totalFlexGrow
    for (const data of childData) {
      data.finalMainSize = data.baseMainSize + spacePerGrow * data.flexGrow
    }
    freeSpace = 0 // All space distributed
  } else if (freeSpace < 0 && totalFlexShrink > 0) {
    // Negative free space: shrink based on flex-shrink
    // Use weighted shrink factor: flexShrink * baseMainSize
    let totalShrinkFactor = 0
    for (const data of childData) {
      totalShrinkFactor += data.flexShrink * data.baseMainSize
    }

    if (totalShrinkFactor > 0) {
      const shrinkAmount = Math.abs(freeSpace)
      for (const data of childData) {
        const shrinkFactor = (data.flexShrink * data.baseMainSize) / totalShrinkFactor
        const itemShrink = shrinkAmount * shrinkFactor
        data.finalMainSize = Math.max(0, data.baseMainSize - itemShrink)
      }
      freeSpace = 0 // All shrinkage applied
    }
  }

  // Calculate cross-axis sizes based on alignment
  for (const data of childData) {
    const { child, spacing } = data
    const spacingCross = isColumn ? spacing.left + spacing.right : spacing.top + spacing.bottom

    data.finalCrossSize = calculateChildSize(
      data.baseCrossSize,
      availableCrossSize - spacingCross,
      config.align,
      child.alignSelf
    )
  }

  // Calculate justify-content distribution (only if there's remaining free space)
  let startOffset = 0
  let gapBetween = config.gap

  // Recalculate free space after flex adjustments
  let totalFinalMainSize = 0
  for (const data of childData) {
    const mainSpacing = isColumn
      ? data.spacing.top + data.spacing.bottom
      : data.spacing.left + data.spacing.right
    totalFinalMainSize += data.finalMainSize + mainSpacing
  }
  const remainingFreeSpace = Math.max(0, availableMainSize - totalFinalMainSize - totalGapSize)

  switch (config.justify) {
    case 'start':
      startOffset = 0
      break
    case 'center':
      startOffset = remainingFreeSpace / 2
      break
    case 'end':
      startOffset = remainingFreeSpace
      break
    case 'space-between':
      if (children.length > 1 && remainingFreeSpace > 0) {
        gapBetween = config.gap + remainingFreeSpace / (children.length - 1)
      }
      startOffset = 0
      break
    case 'space-around':
      if (children.length > 0 && remainingFreeSpace > 0) {
        const spacePerItem = remainingFreeSpace / children.length
        startOffset = spacePerItem / 2
        gapBetween = config.gap + spacePerItem
      }
      break
    case 'space-evenly':
      if (children.length > 0 && remainingFreeSpace > 0) {
        const totalSpaces = children.length + 1
        const spacePerSlot = remainingFreeSpace / totalSpaces
        startOffset = spacePerSlot
        gapBetween = config.gap + spacePerSlot
      }
      break
  }

  // Final pass: position children
  let currentMainPos = startOffset

  for (let i = 0; i < childData.length; i++) {
    const { child, spacing, finalMainSize, finalCrossSize } = childData[i]

    let x: number
    let y: number
    let width: number
    let height: number

    if (isColumn) {
      // Column layout: main axis is vertical
      const alignOffset = calculateAlignOffset(
        finalCrossSize + spacing.left + spacing.right,
        availableWidth,
        child.alignSelf ?? config.align
      )
      x = containerPosition.x + padding + alignOffset + spacing.left
      y = containerPosition.y + padding + currentMainPos + spacing.top
      width = finalCrossSize
      height = finalMainSize
      currentMainPos += finalMainSize + spacing.top + spacing.bottom
    } else {
      // Row layout: main axis is horizontal
      const alignOffset = calculateAlignOffset(
        finalCrossSize + spacing.top + spacing.bottom,
        availableHeight,
        child.alignSelf ?? config.align
      )
      x = containerPosition.x + padding + currentMainPos + spacing.left
      y = containerPosition.y + padding + alignOffset + spacing.top
      width = finalMainSize
      height = finalCrossSize
      currentMainPos += finalMainSize + spacing.left + spacing.right
    }

    // Add gap after this child (except for the last one)
    if (i < childData.length - 1) {
      currentMainPos += gapBetween
    }

    result.set(child.id, { x, y, width, height })
  }

  return result
}

/**
 * Recursively calculate positions for a container and its children
 */
function processContainer(
  container: TemplateElement,
  containerPosition: CalculatedPosition,
  elements: TemplateElement[],
  result: Map<string, CalculatedPosition>,
  pageHeight: number,
  tableContent?: TableContentData,
  visibilityContext?: VisibilityContext
): void {
  // Set the container's position
  result.set(container.id, containerPosition)

  // Get and process children (filtered by visibility if context provided)
  const children = getContainerChildren(container.id, elements, visibilityContext)
  if (children.length === 0) return

  const childPositions = calculateContainerChildPositions(
    container,
    children,
    containerPosition,
    elements,
    pageHeight,
    tableContent,
    visibilityContext
  )

  // Add child positions to result and recursively process nested containers
  for (const child of children) {
    const childPos = childPositions.get(child.id)
    if (childPos) {
      if (child.type === 'layout_container') {
        // Recursively process nested container
        processContainer(child, childPos, elements, result, pageHeight, tableContent, visibilityContext)
      } else {
        result.set(child.id, childPos)
      }
    }
  }
}

/**
 * Calculate actual positions for all elements in a template
 *
 * - Absolute elements: use x, y directly
 * - Container elements: use x, y for container position
 * - Relative elements: calculate based on parent container and siblings
 *
 * @param elements - Template elements to calculate positions for
 * @param margins - Page margins
 * @param pageWidth - Page width in points
 * @param pageHeight - Page height in points
 * @param tableContent - Optional table content data for height estimation
 * @param visibilityContext - Optional visibility context for filtering hidden elements in layout calculation
 *                            When provided, elements that fail visibility check are excluded from layout
 *                            (e.g., empty text elements, tables with no data). This ensures no gaps
 *                            in the output when elements are hidden.
 *                            - For PDF rendering: pass RenderContext to filter based on actual invoice data
 *                            - For Style Editor: pass PreviewRenderContext or omit (shows all elements)
 */
export function calculateElementPositions(
  elements: TemplateElement[],
  margins: Margin,
  pageWidth: number,
  pageHeight: number,
  tableContent?: TableContentData,
  visibilityContext?: VisibilityContext
): Map<string, CalculatedPosition> {
  const result = new Map<string, CalculatedPosition>()
  const _elementMap = buildElementMap(elements)

  // First pass: position absolute elements and root containers
  for (const element of elements) {
    if (element.visible === false) continue

    // If visibility context provided, check element visibility
    // This filters out elements that resolve to empty (e.g., empty text, no data tables)
    if (visibilityContext && !shouldRenderElement(element, visibilityContext)) {
      continue
    }

    // Skip relative elements (they'll be positioned by their containers)
    if (element.positionMode === 'relative' && element.parentId) continue

    // Calculate effective dimensions based on sizing modes
    const effectiveWidth = calculateEffectiveWidth(element, pageWidth)
    const effectiveHeight = calculateEffectiveHeight(
      element,
      elements,
      pageHeight,
      undefined,
      undefined,
      tableContent,
      visibilityContext
    )

    const position: CalculatedPosition = {
      x: element.position.x,
      y: element.position.y,
      width: effectiveWidth,
      height: effectiveHeight,
    }

    if (element.type === 'layout_container') {
      // Process container and its children
      processContainer(element, position, elements, result, pageHeight, tableContent, visibilityContext)
    } else {
      result.set(element.id, position)
    }
  }

  return result
}

/**
 * Check if an element can be a valid parent for another element
 * Prevents circular references
 */
export function canBeParent(
  potentialParentId: string,
  childId: string,
  elements: TemplateElement[]
): boolean {
  if (potentialParentId === childId) return false

  const elementMap = buildElementMap(elements)
  let current = elementMap.get(potentialParentId)

  // Traverse up the parent chain
  while (current && current.parentId) {
    if (current.parentId === childId) return false
    current = elementMap.get(current.parentId)
  }

  return true
}

/**
 * Get all layout containers in a template
 */
export function getLayoutContainers(elements: TemplateElement[]): TemplateElement[] {
  return elements.filter((el) => el.type === 'layout_container')
}

/**
 * Orphan children when parent is deleted - convert to absolute at last known position
 */
export function orphanChildren(
  parentId: string,
  elements: TemplateElement[],
  calculatedPositions: Map<string, CalculatedPosition>
): TemplateElement[] {
  return elements.map((el) => {
    if (el.parentId === parentId) {
      const calcPos = calculatedPositions.get(el.id)
      return {
        ...el,
        positionMode: 'absolute' as const,
        parentId: undefined,
        position: calcPos
          ? {
              x: calcPos.x,
              y: calcPos.y,
              width: calcPos.width,
              height: calcPos.height,
            }
          : el.position,
      }
    }
    return el
  })
}

/**
 * Get visible children of a container using visibility filter
 * Used by visibility-aware layout calculations
 */
export function getVisibleContainerChildren(
  containerId: string,
  elements: TemplateElement[],
  isVisible: (element: TemplateElement) => boolean
): TemplateElement[] {
  return elements
    .filter(
      (el) =>
        el.parentId === containerId &&
        el.positionMode === 'relative' &&
        el.visible !== false &&
        isVisible(el)
    )
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}
