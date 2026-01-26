import type {
  TemplateElement,
  Margin,
  LayoutConfig,
  Spacing,
  Alignment,
  LayoutDirection,
  HeightMode,
} from './template'

// Calculated position for rendering
export interface CalculatedPosition {
  x: number
  y: number
  width: number
  height: number
}

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

/**
 * Build a map of elements by their ID for quick lookup
 */
function buildElementMap(elements: TemplateElement[]): Map<string, TemplateElement> {
  return new Map(elements.map((el) => [el.id, el]))
}

/**
 * Get children of a container, sorted by order
 */
function getContainerChildren(
  containerId: string,
  elements: TemplateElement[]
): TemplateElement[] {
  return elements
    .filter(
      (el) =>
        el.parentId === containerId &&
        el.positionMode === 'relative' &&
        el.visible !== false
    )
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

/**
 * Calculate auto-height for a container based on its children
 */
function calculateAutoHeight(
  container: TemplateElement,
  children: TemplateElement[],
  elements: TemplateElement[]
): number {
  if (children.length === 0) {
    // Minimum height when empty
    return 40
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

      // Get child height (recursively calculate if it's an auto-height container)
      let childHeight = child.position.height
      if (child.type === 'layout_container' && child.heightMode === 'auto') {
        const grandchildren = getContainerChildren(child.id, elements)
        childHeight = calculateAutoHeight(child, grandchildren, elements)
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

      // Get child height (recursively calculate if it's an auto-height container)
      let childHeight = child.position.height
      if (child.type === 'layout_container' && child.heightMode === 'auto') {
        const grandchildren = getContainerChildren(child.id, elements)
        childHeight = calculateAutoHeight(child, grandchildren, elements)
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
 */
function calculateEffectiveHeight(
  element: TemplateElement,
  elements: TemplateElement[],
  pageHeight: number,
  parentHeight?: number
): number {
  const heightMode = element.heightMode ?? 'fixed'

  switch (heightMode) {
    case 'auto': {
      if (element.type === 'layout_container') {
        const children = getContainerChildren(element.id, elements)
        return calculateAutoHeight(element, children, elements)
      }
      return element.position.height
    }
    case 'percentage': {
      const percent = element.heightPercent ?? 100
      const referenceHeight = parentHeight ?? pageHeight
      return Math.max(10, (referenceHeight * percent) / 100)
    }
    case 'fixed':
    default:
      return element.position.height
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
  containerHeight: number
): number {
  const flexBasis = child.flexBasis

  // If flexBasis is a number, use it directly
  if (typeof flexBasis === 'number') {
    return flexBasis
  }

  // If 'auto' or undefined, use the element's natural size
  if (isColumn) {
    // For column layout, main axis is height
    if (child.type === 'layout_container') {
      return calculateEffectiveHeight(child, elements, pageHeight, containerHeight)
    }
    return child.position.height
  } else {
    // For row layout, main axis is width
    return child.position.width
  }
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
  pageHeight: number = 0
): Map<string, CalculatedPosition> {
  const result = new Map<string, CalculatedPosition>()
  const config = container.layoutConfig ?? defaultLayoutConfig
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
    const baseMainSize = getFlexBasis(child, isColumn, elements, pageHeight, containerPosition.height)

    // Get cross axis size
    let baseCrossSize: number
    if (isColumn) {
      baseCrossSize = child.position.width
    } else {
      if (child.type === 'layout_container') {
        baseCrossSize = calculateEffectiveHeight(child, elements, pageHeight, containerPosition.height)
      } else {
        baseCrossSize = child.position.height
      }
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
  pageHeight: number
): void {
  // Set the container's position
  result.set(container.id, containerPosition)

  // Get and process children
  const children = getContainerChildren(container.id, elements)
  if (children.length === 0) return

  const childPositions = calculateContainerChildPositions(
    container,
    children,
    containerPosition,
    elements,
    pageHeight
  )

  // Add child positions to result and recursively process nested containers
  for (const child of children) {
    const childPos = childPositions.get(child.id)
    if (childPos) {
      if (child.type === 'layout_container') {
        // Recursively process nested container
        processContainer(child, childPos, elements, result, pageHeight)
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
 */
export function calculateElementPositions(
  elements: TemplateElement[],
  margins: Margin,
  pageWidth: number,
  pageHeight: number
): Map<string, CalculatedPosition> {
  const result = new Map<string, CalculatedPosition>()
  const elementMap = buildElementMap(elements)

  // First pass: position absolute elements and root containers
  for (const element of elements) {
    if (element.visible === false) continue

    // Skip relative elements (they'll be positioned by their containers)
    if (element.positionMode === 'relative' && element.parentId) continue

    // Calculate effective height based on height mode
    const effectiveHeight = calculateEffectiveHeight(element, elements, pageHeight)

    const position: CalculatedPosition = {
      x: element.position.x,
      y: element.position.y,
      width: element.position.width,
      height: effectiveHeight,
    }

    if (element.type === 'layout_container') {
      // Process container and its children
      processContainer(element, position, elements, result, pageHeight)
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
