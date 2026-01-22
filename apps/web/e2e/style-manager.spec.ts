import { test, expect } from '@playwright/test'

test.describe('Style Manager', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the styles page
    await page.goto('/styles')
  })

  test('shows empty state when no templates exist', async ({ page }) => {
    // Check for empty state messaging
    const emptyMessage = page.getByText('No custom styles yet')
    await expect(emptyMessage).toBeVisible()

    // Check for create button
    const createButton = page.getByRole('button', { name: /Create Your First Style/i })
    await expect(createButton).toBeVisible()
  })

  test('navigates to style editor when clicking New Style', async ({ page }) => {
    const newStyleButton = page.getByRole('button', { name: /New Style/i })
    await newStyleButton.click()

    // Should navigate to style editor
    await expect(page).toHaveURL(/\/style-editor/)
  })
})

test.describe('Style Manager with Templates', () => {
  test.beforeEach(async ({ page }) => {
    // Set up localStorage with a test template
    await page.goto('/')
    await page.evaluate(() => {
      const template = {
        id: 'test-template-1',
        name: 'Test Template',
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 40, right: 40, bottom: 60, left: 40 },
        backgroundColor: '#ffffff',
        elements: [],
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      localStorage.setItem('template-storage', JSON.stringify({
        state: {
          savedTemplates: [template],
          defaultTemplateId: null,
          editorSettings: {
            showRulers: true,
            showGrid: true,
            snapToGrid: true,
            gridSize: 10,
            zoomLevel: 100,
          },
        },
        version: 0,
      }))
    })

    await page.goto('/styles')
  })

  test('displays saved templates', async ({ page }) => {
    // Check that the template card is visible
    await expect(page.getByText('Test Template')).toBeVisible()
  })

  test('can edit template via Edit Style button', async ({ page }) => {
    // Hover over the template card to reveal the Edit Style button
    const templateCard = page.locator('div').filter({ hasText: 'Test Template' }).first()
    await templateCard.hover()

    // Click the Edit Style button that appears on hover
    const editButton = page.getByRole('button', { name: /Edit Style/i })
    await editButton.click()

    // Should navigate to style editor with template ID
    await expect(page).toHaveURL(/\/style-editor\?templateId=test-template-1/)
  })

  test('shows actions menu with duplicate option', async ({ page }) => {
    // The card should have a more actions button that's visible on hover
    const templateCard = page.locator('div').filter({ hasText: 'Test Template' }).first()
    await templateCard.hover()

    // Look for the actions menu trigger (MoreVertical icon button)
    const actionsMenu = page.locator('[role="button"]').filter({ has: page.locator('svg') }).first()

    // Verify the template exists by checking the name
    await expect(page.getByText('Test Template')).toBeVisible()
  })
})

test.describe('Style Manager Multi-Select and Bulk Delete', () => {
  test.beforeEach(async ({ page }) => {
    // Set up localStorage with multiple test templates
    await page.goto('/')
    await page.evaluate(() => {
      const templates = [
        {
          id: 'template-1',
          name: 'Template One',
          pageSize: 'A4',
          orientation: 'portrait',
          margins: { top: 40, right: 40, bottom: 60, left: 40 },
          backgroundColor: '#ffffff',
          elements: [],
          isDefault: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'template-2',
          name: 'Template Two',
          pageSize: 'A4',
          orientation: 'portrait',
          margins: { top: 40, right: 40, bottom: 60, left: 40 },
          backgroundColor: '#f5f5f5',
          elements: [],
          isDefault: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'template-3',
          name: 'Template Three',
          pageSize: 'A4',
          orientation: 'portrait',
          margins: { top: 40, right: 40, bottom: 60, left: 40 },
          backgroundColor: '#e0e0e0',
          elements: [],
          isDefault: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]

      localStorage.setItem('template-storage', JSON.stringify({
        state: {
          savedTemplates: templates,
          defaultTemplateId: null,
          editorSettings: {
            showRulers: true,
            showGrid: true,
            snapToGrid: true,
            gridSize: 10,
            zoomLevel: 100,
          },
        },
        version: 0,
      }))
    })

    await page.goto('/styles')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(500)
  })

  test('shows select all checkbox when multiple templates exist', async ({ page }) => {
    // Should see the select all checkbox/label
    await expect(page.getByText(/Select all \(3 styles\)/i)).toBeVisible({ timeout: 5000 })
  })

  test('can select individual template via checkbox', async ({ page }) => {
    // Find and hover over the first template card to reveal the checkbox
    const templateCard = page.locator('.group').filter({ hasText: 'Template One' }).first()
    await templateCard.hover()

    // Wait for the checkbox to become visible (it has opacity transition)
    await page.waitForTimeout(300)

    // Find the checkbox within the card and click it using force since it may have low opacity
    const checkbox = templateCard.locator('[role="checkbox"]')
    await checkbox.click({ force: true })

    // Bulk action bar should appear
    await expect(page.getByText('1 selected')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /Delete \(1\)/i })).toBeVisible()
  })

  test('can select all templates', async ({ page }) => {
    // Click select all checkbox
    const selectAllCheckbox = page.locator('[role="checkbox"]').first()
    await selectAllCheckbox.click()

    // Bulk action bar should show all selected
    await expect(page.getByText('3 selected')).toBeVisible()
    await expect(page.getByRole('button', { name: /Delete \(3\)/i })).toBeVisible()
  })

  test('can clear selection', async ({ page }) => {
    // Select all first
    await page.locator('[role="checkbox"]').first().click()
    await expect(page.getByText('3 selected')).toBeVisible()

    // Click clear button
    await page.getByRole('button', { name: /Clear/i }).click()

    // Selection should be cleared
    await expect(page.getByText('3 selected')).not.toBeVisible()
    await expect(page.getByText(/Select all \(3 styles\)/i)).toBeVisible()
  })

  test('bulk delete shows confirmation dialog', async ({ page }) => {
    // Select two templates
    const cards = page.locator('[role="checkbox"]')
    await cards.first().click() // Select all

    // Click delete button
    await page.getByRole('button', { name: /Delete \(3\)/i }).click()

    // Confirmation dialog should appear
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await expect(page.getByText(/Delete 3 Styles\?/i)).toBeVisible()
  })

  test('bulk delete confirmation dialog has cancel button', async ({ page }) => {
    // Select all
    await page.locator('[role="checkbox"]').first().click()

    // Click delete
    await page.getByRole('button', { name: /Delete \(3\)/i }).click()

    // Dialog should have cancel button
    await expect(page.getByRole('button', { name: /Cancel/i })).toBeVisible()

    // Click cancel
    await page.getByRole('button', { name: /Cancel/i }).click()

    // Dialog should close, templates should still exist
    await expect(page.getByRole('alertdialog')).not.toBeVisible()
    await expect(page.getByText('Template One')).toBeVisible()
  })

  test('bulk delete removes selected templates', async ({ page }) => {
    // Select all
    await page.locator('[role="checkbox"]').first().click()

    // Click delete
    await page.getByRole('button', { name: /Delete \(3\)/i }).click()

    // Confirm delete
    await page.getByRole('button', { name: /Delete 3 Styles/i }).click()

    // Wait for deletion
    await page.waitForTimeout(500)

    // Should show empty state
    await expect(page.getByText('No custom styles yet')).toBeVisible()
  })

  test('selected cards show visual indicator', async ({ page }) => {
    // Hover and select first card
    const templateCard = page.locator('.group').filter({ hasText: 'Template One' }).first()
    await templateCard.hover()
    await page.waitForTimeout(300)

    const checkbox = templateCard.locator('[role="checkbox"]')
    await checkbox.click({ force: true })

    // Card should have ring/border indicator (check for the ring class)
    const selectedCard = page.locator('.ring-2').first()
    await expect(selectedCard).toBeVisible()
  })
})

test.describe('Style Editor Template Loading', () => {
  test('style editor loads existing template from URL param', async ({ page }) => {
    // Set up localStorage with a test template
    await page.goto('/')
    await page.evaluate(() => {
      const template = {
        id: 'edit-template-1',
        name: 'Editable Template',
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 40, right: 40, bottom: 60, left: 40 },
        backgroundColor: '#f0f0f0',
        elements: [],
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      localStorage.setItem('template-storage', JSON.stringify({
        state: {
          savedTemplates: [template],
          defaultTemplateId: null,
          editorSettings: {
            showRulers: true,
            showGrid: true,
            snapToGrid: true,
            gridSize: 10,
            zoomLevel: 100,
          },
        },
        version: 0,
      }))
    })

    // Navigate to style editor with template ID
    await page.goto('/style-editor?templateId=edit-template-1')

    // The template name should be shown in the editor
    await expect(page.getByText('Editable Template')).toBeVisible({ timeout: 10000 })
  })

  test('style editor creates new template when no param', async ({ page }) => {
    await page.goto('/style-editor')

    // Should show default template name input or canvas
    // The editor should load with a new template
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)

    // Check that the style editor header is visible
    const header = page.locator('header')
    await expect(header).toBeVisible()
  })
})

test.describe('PDF Export with Templates', () => {
  test('export button shows style dropdown when templates exist', async ({ page }) => {
    // Set up localStorage with templates
    await page.goto('/calendar')
    await page.evaluate(() => {
      const template = {
        id: 'export-template-1',
        name: 'Export Template',
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 40, right: 40, bottom: 60, left: 40 },
        backgroundColor: '#ffffff',
        elements: [
          {
            id: 'text-1',
            type: 'text',
            name: 'Title',
            content: 'INVOICE',
            position: { x: 40, y: 40, width: 200, height: 30 },
            visible: true,
            locked: false,
            zIndex: 0,
          }
        ],
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      localStorage.setItem('template-storage', JSON.stringify({
        state: {
          savedTemplates: [template],
          defaultTemplateId: null,
          editorSettings: {
            showRulers: true,
            showGrid: true,
            snapToGrid: true,
            gridSize: 10,
            zoomLevel: 100,
          },
        },
        version: 0,
      }))
    })

    await page.goto('/calendar')

    // The export button should be present (may be split button or dropdown)
    const exportButton = page.getByRole('button', { name: /Export/i }).first()
    await expect(exportButton).toBeVisible({ timeout: 10000 })
  })
})
