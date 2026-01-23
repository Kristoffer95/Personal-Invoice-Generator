import { test, expect } from '@playwright/test'

test.describe('Preview Style Selector', () => {
  test.describe('Style selector in invoice preview modal', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to the invoice manager page (E2E_TESTING env var bypasses auth in middleware)
      await page.goto('/')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1000)
    })

    test('shows style selector with Classic Light and Classic Dark buttons in full preview modal', async ({ page }) => {
      // Wait for the page to load
      await expect(page.getByRole('heading', { name: /Invoice Manager/i })).toBeVisible({ timeout: 10000 })

      // Find and click the preview button (Eye icon)
      const previewButton = page.getByRole('button', { name: /preview invoice/i }).first()

      // If there are no invoices, we need to check if the preview button exists
      const hasPreviewButton = await previewButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasPreviewButton) {
        // Skip test if no invoices exist
        test.skip(true, 'No invoices available to test preview')
        return
      }

      await previewButton.click()

      // Wait for the popover to appear
      await page.waitForTimeout(500)

      // Click "View Full Invoice" button
      const viewFullButton = page.getByRole('button', { name: /view full invoice/i })
      await expect(viewFullButton).toBeVisible({ timeout: 5000 })
      await viewFullButton.click()

      // Verify the dialog opens
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      // Verify style selector is present with "Style:" label
      await expect(page.getByText('Style:')).toBeVisible({ timeout: 5000 })

      // Verify Classic Light button is present
      const lightButton = page.getByRole('button', { name: /classic light|light/i })
      await expect(lightButton).toBeVisible()

      // Verify Classic Dark button is present
      const darkButton = page.getByRole('button', { name: /classic dark|dark/i })
      await expect(darkButton).toBeVisible()
    })

    test('switches between classic light and dark styles', async ({ page }) => {
      // Wait for the page to load
      await expect(page.getByRole('heading', { name: /Invoice Manager/i })).toBeVisible({ timeout: 10000 })

      // Find and click the preview button
      const previewButton = page.getByRole('button', { name: /preview invoice/i }).first()

      const hasPreviewButton = await previewButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasPreviewButton) {
        test.skip(true, 'No invoices available to test preview')
        return
      }

      await previewButton.click()
      await page.waitForTimeout(500)

      // Click "View Full Invoice" button
      await page.getByRole('button', { name: /view full invoice/i }).click()

      // Wait for dialog and style selector
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('Style:')).toBeVisible({ timeout: 5000 })

      // Classic Light should be selected by default (has bg-secondary class)
      const lightButton = page.getByRole('button', { name: /classic light|light/i })
      await expect(lightButton).toHaveClass(/bg-secondary/)

      // Click Classic Dark button
      const darkButton = page.getByRole('button', { name: /classic dark|dark/i })
      await darkButton.click()

      // Classic Dark should now be selected
      await expect(darkButton).toHaveClass(/bg-secondary/)

      // Click back to Classic Light
      await lightButton.click()

      // Classic Light should be selected again
      await expect(lightButton).toHaveClass(/bg-secondary/)
    })
  })

  test.describe('Style selector with saved templates', () => {
    test.beforeEach(async ({ page }) => {
      // Set up localStorage with test templates before navigating
      await page.goto('/')
      await page.evaluate(() => {
        const templates = [
          {
            id: 'test-template-1',
            name: 'Test Template One',
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
            id: 'test-template-2',
            name: 'Test Template Two',
            pageSize: 'A4',
            orientation: 'portrait',
            margins: { top: 40, right: 40, bottom: 60, left: 40 },
            backgroundColor: '#f5f5f5',
            elements: [],
            isDefault: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]

        localStorage.setItem('template-storage', JSON.stringify({
          state: {
            savedTemplates: templates,
            defaultTemplateId: 'test-template-2',
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

      // Reload to pick up localStorage changes
      await page.goto('/')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1000)
    })

    test('displays saved templates in style selector', async ({ page }) => {
      // Wait for the page to load
      await expect(page.getByRole('heading', { name: /Invoice Manager/i })).toBeVisible({ timeout: 10000 })

      // Find and click the preview button
      const previewButton = page.getByRole('button', { name: /preview invoice/i }).first()

      const hasPreviewButton = await previewButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasPreviewButton) {
        test.skip(true, 'No invoices available to test preview')
        return
      }

      await previewButton.click()
      await page.waitForTimeout(500)

      // Click "View Full Invoice" button
      await page.getByRole('button', { name: /view full invoice/i }).click()

      // Wait for dialog and style selector
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('Style:')).toBeVisible({ timeout: 5000 })

      // Verify saved templates are displayed
      await expect(page.getByText('Test Template One')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('Test Template Two')).toBeVisible()
    })

    test('shows star icon for default template', async ({ page }) => {
      // Wait for the page to load
      await expect(page.getByRole('heading', { name: /Invoice Manager/i })).toBeVisible({ timeout: 10000 })

      // Find and click the preview button
      const previewButton = page.getByRole('button', { name: /preview invoice/i }).first()

      const hasPreviewButton = await previewButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasPreviewButton) {
        test.skip(true, 'No invoices available to test preview')
        return
      }

      await previewButton.click()
      await page.waitForTimeout(500)

      // Click "View Full Invoice" button
      await page.getByRole('button', { name: /view full invoice/i }).click()

      // Wait for dialog
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      // Find the default template button (Test Template Two)
      const defaultTemplateButton = page.getByRole('button', { name: /test template two/i })
      await expect(defaultTemplateButton).toBeVisible({ timeout: 5000 })

      // The star icon should be present (fill-yellow-500 class indicates default)
      const starIcon = defaultTemplateButton.locator('.fill-yellow-500')
      await expect(starIcon).toBeVisible()
    })

    test('can select a custom template', async ({ page }) => {
      // Wait for the page to load
      await expect(page.getByRole('heading', { name: /Invoice Manager/i })).toBeVisible({ timeout: 10000 })

      // Find and click the preview button
      const previewButton = page.getByRole('button', { name: /preview invoice/i }).first()

      const hasPreviewButton = await previewButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasPreviewButton) {
        test.skip(true, 'No invoices available to test preview')
        return
      }

      await previewButton.click()
      await page.waitForTimeout(500)

      // Click "View Full Invoice" button
      await page.getByRole('button', { name: /view full invoice/i }).click()

      // Wait for dialog and style selector
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('Style:')).toBeVisible({ timeout: 5000 })

      // Click on a custom template
      const customTemplateButton = page.getByRole('button', { name: /test template one/i })
      await expect(customTemplateButton).toBeVisible({ timeout: 5000 })
      await customTemplateButton.click()

      // Custom template button should now be selected (has bg-secondary class)
      await expect(customTemplateButton).toHaveClass(/bg-secondary/)
    })

    test('switching between classic and custom templates works correctly', async ({ page }) => {
      // Wait for the page to load
      await expect(page.getByRole('heading', { name: /Invoice Manager/i })).toBeVisible({ timeout: 10000 })

      // Find and click the preview button
      const previewButton = page.getByRole('button', { name: /preview invoice/i }).first()

      const hasPreviewButton = await previewButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasPreviewButton) {
        test.skip(true, 'No invoices available to test preview')
        return
      }

      await previewButton.click()
      await page.waitForTimeout(500)

      // Click "View Full Invoice" button
      await page.getByRole('button', { name: /view full invoice/i }).click()

      // Wait for dialog
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      // Start with Classic Light selected
      const lightButton = page.getByRole('button', { name: /classic light|light/i })
      await expect(lightButton).toHaveClass(/bg-secondary/)

      // Select custom template
      const customTemplateButton = page.getByRole('button', { name: /test template one/i })
      await customTemplateButton.click()
      await expect(customTemplateButton).toHaveClass(/bg-secondary/)

      // Light button should no longer have selected class
      await expect(lightButton).not.toHaveClass(/bg-secondary/)

      // Select Classic Dark
      const darkButton = page.getByRole('button', { name: /classic dark|dark/i })
      await darkButton.click()
      await expect(darkButton).toHaveClass(/bg-secondary/)

      // Custom template should no longer be selected
      await expect(customTemplateButton).not.toHaveClass(/bg-secondary/)

      // Go back to custom template
      await customTemplateButton.click()
      await expect(customTemplateButton).toHaveClass(/bg-secondary/)
      await expect(darkButton).not.toHaveClass(/bg-secondary/)
    })
  })
})

test.describe('Preview Style Selector with Single Template', () => {
  test.beforeEach(async ({ page }) => {
    // Set up localStorage with a single test template
    await page.goto('/')
    await page.evaluate(() => {
      const template = {
        id: 'single-template',
        name: 'My Custom Style',
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

    // Reload to pick up localStorage changes
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
  })

  test('shows single custom template alongside classic styles', async ({ page }) => {
    // Wait for the page to load
    await expect(page.getByRole('heading', { name: /Invoice Manager/i })).toBeVisible({ timeout: 10000 })

    // Find and click the preview button
    const previewButton = page.getByRole('button', { name: /preview invoice/i }).first()

    const hasPreviewButton = await previewButton.isVisible({ timeout: 5000 }).catch(() => false)

    if (!hasPreviewButton) {
      test.skip(true, 'No invoices available to test preview')
      return
    }

    await previewButton.click()
    await page.waitForTimeout(500)

    // Click "View Full Invoice" button
    await page.getByRole('button', { name: /view full invoice/i }).click()

    // Wait for dialog
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

    // All three options should be visible
    await expect(page.getByRole('button', { name: /classic light|light/i })).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /classic dark|dark/i })).toBeVisible()
    await expect(page.getByText('My Custom Style')).toBeVisible()
  })
})
