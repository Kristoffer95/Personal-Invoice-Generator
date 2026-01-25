import type {
  TemplateElement,
  Margin,
  LayoutConfig,
  Spacing,
  Alignment,
  LayoutDirection,
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
 * Calculate positions for children of a layout container
 */
function calculateContainerChildPositions(
  container: TemplateElement,
  children: TemplateElement[],
  containerPosition: CalculatedPosition
): Map<string, CalculatedPosition> {
  const result = new Map<string, CalculatedPosition>()
  const config = container.layoutConfig ?? defaultLayoutConfig
  const isColumn = config.direction === 'column'
  const padding = container.padding ?? 0

  // Available space after padding
  const availableWidth = containerPosition.width - padding * 2
  const availableHeight = containerPosition.height - padding * 2
  const availableMainSize = isColumn ? availableHeight : availableWidth

  // First pass: calculate child sizes and total content size
  const childSizes: Array<{
    child: TemplateElement
    width: number
    height: number
    spacing: Spacing
    mainSize: number // Size along main axis including spacing
  }> = []

  let totalContentSize = 0

  for (const child of children) {
    const spacing = child.spacing ?? defaultSpacing
    const baseWidth = child.position.width
    const baseHeight = child.position.height

    let childWidth: number
    let childHeight: number

    if (isColumn) {
      childWidth = calculateChildSize(
        baseWidth,
        availableWidth - spacing.left - spacing.right,
        config.align,
        child.alignSelf
      )
      childHeight = baseHeight
    } else {
      childWidth = baseWidth
      childHeight = calculateChildSize(
        baseHeight,
        availableHeight - spacing.top - spacing.bottom,
        config.align,
        child.alignSelf
      )
    }

    const mainSize = isColumn
      ? childHeight + spacing.top + spacing.bottom
      : childWidth + spacing.left + spacing.right

    childSizes.push({ child, width: childWidth, height: childHeight, spacing, mainSize })
    totalContentSize += mainSize
  }

  // Add gaps between children (n-1 gaps for n children)
  const totalGapSize = children.length > 1 ? (children.length - 1) * config.gap : 0
  const contentWithGaps = totalContentSize + totalGapSize
  const freeSpace = Math.max(0, availableMainSize - contentWithGaps)

  // Calculate justify-content distribution
  let startOffset = 0
  let gapBetween = config.gap

  switch (config.justify) {
    case 'start':
      // Default: items start at the beginning
      startOffset = 0
      break
    case 'center':
      // Items are centered
      startOffset = freeSpace / 2
      break
    case 'end':
      // Items are at the end
      startOffset = freeSpace
      break
    case 'space-between':
      // Items are evenly distributed; first item at start, last at end
      if (children.length > 1) {
        gapBetween = config.gap + freeSpace / (children.length - 1)
      }
      startOffset = 0
      break
    case 'space-around':
      // Items have equal space around them
      if (children.length > 0) {
        const spacePerItem = freeSpace / children.length
        startOffset = spacePerItem / 2
        gapBetween = config.gap + spacePerItem
      }
      break
    case 'space-evenly':
      // Items have equal space between them and at edges
      if (children.length > 0) {
        const totalSpaces = children.length + 1
        const spacePerSlot = freeSpace / totalSpaces
        startOffset = spacePerSlot
        gapBetween = config.gap + spacePerSlot
      }
      break
  }

  // Second pass: position children
  let currentMainPos = startOffset

  for (let i = 0; i < childSizes.length; i++) {
    const { child, width: childWidth, height: childHeight, spacing } = childSizes[i]

    let x: number
    let y: number

    if (isColumn) {
      // Column layout: children stack vertically
      const alignOffset = calculateAlignOffset(
        childWidth + spacing.left + spacing.right,
        availableWidth,
        child.alignSelf ?? config.align
      )
      x = containerPosition.x + padding + alignOffset + spacing.left
      y = containerPosition.y + padding + currentMainPos + spacing.top
      currentMainPos += childHeight + spacing.top + spacing.bottom
    } else {
      // Row layout: children stack horizontally
      const alignOffset = calculateAlignOffset(
        childHeight + spacing.top + spacing.bottom,
        availableHeight,
        child.alignSelf ?? config.align
      )
      x = containerPosition.x + padding + currentMainPos + spacing.left
      y = containerPosition.y + padding + alignOffset + spacing.top
      currentMainPos += childWidth + spacing.left + spacing.right
    }

    // Add gap after this child (except for the last one)
    if (i < childSizes.length - 1) {
      currentMainPos += gapBetween
    }

    result.set(child.id, {
      x,
      y,
      width: childWidth,
      height: childHeight,
    })
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
  result: Map<string, CalculatedPosition>
): void {
  // Set the container's position
  result.set(container.id, containerPosition)

  // Get and process children
  const children = getContainerChildren(container.id, elements)
  if (children.length === 0) return

  const childPositions = calculateContainerChildPositions(
    container,
    children,
    containerPosition
  )

  // Add child positions to result and recursively process nested containers
  for (const child of children) {
    const childPos = childPositions.get(child.id)
    if (childPos) {
      if (child.type === 'layout_container') {
        // Recursively process nested container
        processContainer(child, childPos, elements, result)
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

    const position: CalculatedPosition = {
      x: element.position.x,
      y: element.position.y,
      width: element.position.width,
      height: element.position.height,
    }

    if (element.type === 'layout_container') {
      // Process container and its children
      processContainer(element, position, elements, result)
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
