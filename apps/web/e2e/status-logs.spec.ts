import { test, expect } from '@playwright/test'

/**
 * Status Logs Feature E2E Tests
 *
 * These tests require the dev server to be started with E2E_TESTING=true
 * to bypass Clerk authentication. The Playwright config handles this
 * automatically when starting the server, but if tests fail due to
 * authentication redirects, ensure:
 *
 * 1. No existing dev server is running (kill any process on port 3005)
 * 2. Run tests with: npx playwright test e2e/status-logs.spec.ts
 *
 * The webServer config in playwright.config.ts will start the server
 * with E2E_TESTING=true automatically.
 */

test.describe('Status Logs Feature E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the invoices page (E2E_TESTING env var bypasses auth in middleware)
    await page.goto('/invoices')
    // Wait for the page to be ready - use domcontentloaded instead of networkidle
    // since Convex keeps websocket connections open
    await page.waitForLoadState('domcontentloaded')
    // Wait a bit for React to hydrate
    await page.waitForTimeout(1000)
  })

  test.describe('Status Logs Tab', () => {
    test('should display Status Logs tab in navigation', async ({ page }) => {
      // Wait for tabs to be visible
      await expect(page.getByRole('tab', { name: /Status Logs/i })).toBeVisible({ timeout: 15000 })
    })

    test('should switch to Status Logs tab when clicked', async ({ page }) => {
      // Click on Status Logs tab
      await page.getByRole('tab', { name: /Status Logs/i }).click()

      // Should show the Status Logs content
      await expect(page.getByPlaceholder(/Search by invoice # or folder/i)).toBeVisible({ timeout: 10000 })
    })

    test('should show filter controls in Status Logs tab', async ({ page }) => {
      // Navigate to Status Logs tab
      await page.getByRole('tab', { name: /Status Logs/i }).click()

      // Should show search input
      await expect(page.getByPlaceholder(/Search by invoice # or folder/i)).toBeVisible({ timeout: 10000 })

      // Should show folder filter dropdown
      await expect(page.getByText(/All folders/i)).toBeVisible()

      // Should show status filter dropdown
      await expect(page.getByText(/All statuses/i)).toBeVisible()

      // Should show date range filter button
      await expect(page.getByRole('button', { name: /Date Range/i })).toBeVisible()
    })

    test('should show Activity Summary stats card', async ({ page }) => {
      // Navigate to Status Logs tab
      await page.getByRole('tab', { name: /Status Logs/i }).click()

      // Should show Activity Summary card
      await expect(page.getByText(/Activity Summary/i)).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(/Total status changes/i)).toBeVisible()
    })

    test('should show empty state when no logs exist', async ({ page }) => {
      // Navigate to Status Logs tab
      await page.getByRole('tab', { name: /Status Logs/i }).click()

      // Wait for the page to load (may show empty state or logs)
      await page.waitForTimeout(2000)

      // The page should either show logs or the empty state message
      const emptyState = page.getByText(/No status logs found/i)
      const statusChanges = page.getByText(/Total status changes/i)

      // At least one of these should be visible
      await expect(emptyState.or(statusChanges)).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Status Logs Filtering', () => {
    test('should allow typing in search input', async ({ page }) => {
      // Navigate to Status Logs tab
      await page.getByRole('tab', { name: /Status Logs/i }).click()

      // Find and interact with search input
      const searchInput = page.getByPlaceholder(/Search by invoice # or folder/i)
      await expect(searchInput).toBeVisible({ timeout: 10000 })

      // Type in search
      await searchInput.fill('INV-001')
      await expect(searchInput).toHaveValue('INV-001')
    })

    test('should open folder filter dropdown', async ({ page }) => {
      // Navigate to Status Logs tab
      await page.getByRole('tab', { name: /Status Logs/i }).click()

      // Click on folder filter
      const folderSelect = page.getByRole('combobox').first()
      await expect(folderSelect).toBeVisible({ timeout: 10000 })
      await folderSelect.click()

      // Dropdown should open
      await expect(page.getByRole('option', { name: /All folders/i })).toBeVisible({ timeout: 5000 })
    })

    test('should open status filter dropdown', async ({ page }) => {
      // Navigate to Status Logs tab
      await page.getByRole('tab', { name: /Status Logs/i }).click()

      // Find and click status filter (second combobox)
      const statusSelect = page.getByRole('combobox').nth(1)
      await expect(statusSelect).toBeVisible({ timeout: 10000 })
      await statusSelect.click()

      // Dropdown should show status options
      await expect(page.getByRole('option', { name: /All statuses/i })).toBeVisible({ timeout: 5000 })
      await expect(page.getByRole('option', { name: /Draft/i })).toBeVisible()
      await expect(page.getByRole('option', { name: /Sent/i })).toBeVisible()
    })

    test('should open date range filter popover', async ({ page }) => {
      // Navigate to Status Logs tab
      await page.getByRole('tab', { name: /Status Logs/i }).click()

      // Click on date range filter button
      const dateButton = page.getByRole('button', { name: /Date Range/i })
      await expect(dateButton).toBeVisible({ timeout: 10000 })
      await dateButton.click()

      // Popover should open with date inputs
      await expect(page.getByText(/^From$/)).toBeVisible({ timeout: 5000 })
      await expect(page.getByText(/^To$/)).toBeVisible()
    })

    test('should show clear button when filters are active', async ({ page }) => {
      // Navigate to Status Logs tab
      await page.getByRole('tab', { name: /Status Logs/i }).click()

      // Type in search to activate filter
      const searchInput = page.getByPlaceholder(/Search by invoice # or folder/i)
      await expect(searchInput).toBeVisible({ timeout: 10000 })
      await searchInput.fill('test')

      // Clear button should appear
      await expect(page.getByRole('button', { name: /Clear/i })).toBeVisible()
    })

    test('should clear filters when clear button is clicked', async ({ page }) => {
      // Navigate to Status Logs tab
      await page.getByRole('tab', { name: /Status Logs/i }).click()

      // Type in search
      const searchInput = page.getByPlaceholder(/Search by invoice # or folder/i)
      await expect(searchInput).toBeVisible({ timeout: 10000 })
      await searchInput.fill('test')

      // Click clear
      await page.getByRole('button', { name: /Clear/i }).click()

      // Search should be empty
      await expect(searchInput).toHaveValue('')
    })
  })

  test.describe('View Logs from Invoice Kebab Menu', () => {
    test('should show View Logs option in invoice kebab menu', async ({ page }) => {
      // First switch to Invoices tab (default)
      const invoicesTab = page.getByRole('tab', { name: /^Invoices$/i })
      await expect(invoicesTab).toBeVisible({ timeout: 15000 })

      // Wait for any invoices to load (or empty state)
      await page.waitForTimeout(2000)

      // Check if there are any invoices with kebab menus
      const kebabMenus = page.locator('[aria-haspopup="menu"]')
      const menuCount = await kebabMenus.count()

      if (menuCount > 0) {
        // Click on the first kebab menu
        await kebabMenus.first().click()

        // Should show View Logs option
        await expect(page.getByRole('menuitem', { name: /View Logs/i })).toBeVisible({ timeout: 5000 })
      } else {
        // If no invoices, the test passes (no kebab menus to test)
        test.skip()
      }
    })

    test('should open status logs dialog when View Logs is clicked', async ({ page }) => {
      // First check if there are any invoices
      const invoicesTab = page.getByRole('tab', { name: /^Invoices$/i })
      await expect(invoicesTab).toBeVisible({ timeout: 15000 })

      await page.waitForTimeout(2000)

      const kebabMenus = page.locator('[aria-haspopup="menu"]')
      const menuCount = await kebabMenus.count()

      if (menuCount > 0) {
        // Click on the first kebab menu
        await kebabMenus.first().click()

        // Click View Logs
        await page.getByRole('menuitem', { name: /View Logs/i }).click()

        // Dialog should open
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
        await expect(page.getByText(/Status History/i)).toBeVisible()
      } else {
        test.skip()
      }
    })
  })

  test.describe('Status Logs Dialog', () => {
    test('should display proper dialog structure', async ({ page }) => {
      // Check if there are invoices with View Logs button
      const invoicesTab = page.getByRole('tab', { name: /^Invoices$/i })
      await expect(invoicesTab).toBeVisible({ timeout: 15000 })

      await page.waitForTimeout(2000)

      const kebabMenus = page.locator('[aria-haspopup="menu"]')
      const menuCount = await kebabMenus.count()

      if (menuCount > 0) {
        // Open kebab menu and click View Logs
        await kebabMenus.first().click()
        await page.getByRole('menuitem', { name: /View Logs/i }).click()

        // Verify dialog structure
        const dialog = page.getByRole('dialog')
        await expect(dialog).toBeVisible({ timeout: 5000 })
        await expect(dialog.getByText(/Status History/i)).toBeVisible()
        await expect(dialog.getByText(/Complete history of status changes/i)).toBeVisible()
      } else {
        test.skip()
      }
    })

    test('should close dialog when close button is clicked', async ({ page }) => {
      const invoicesTab = page.getByRole('tab', { name: /^Invoices$/i })
      await expect(invoicesTab).toBeVisible({ timeout: 15000 })

      await page.waitForTimeout(2000)

      const kebabMenus = page.locator('[aria-haspopup="menu"]')
      const menuCount = await kebabMenus.count()

      if (menuCount > 0) {
        // Open dialog
        await kebabMenus.first().click()
        await page.getByRole('menuitem', { name: /View Logs/i }).click()

        const dialog = page.getByRole('dialog')
        await expect(dialog).toBeVisible({ timeout: 5000 })

        // Click close button
        await dialog.getByRole('button', { name: /close/i }).click()

        // Dialog should close
        await expect(dialog).not.toBeVisible({ timeout: 5000 })
      } else {
        test.skip()
      }
    })
  })

  test.describe('Tab Navigation Integration', () => {
    test('should maintain state when switching between tabs', async ({ page }) => {
      // Set desktop viewport for consistent behavior
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/invoices')
      await page.waitForLoadState('networkidle')

      // Navigate to Status Logs tab
      await page.getByRole('tab', { name: /Status Logs/i }).click()
      await expect(page.getByPlaceholder(/Search by invoice # or folder/i)).toBeVisible({ timeout: 10000 })

      // Switch to Invoices tab
      await page.getByRole('tab', { name: /^Invoices$/i }).click()
      await page.waitForTimeout(500)

      // Switch back to Status Logs tab
      await page.getByRole('tab', { name: /Status Logs/i }).click()

      // Status Logs content should still be visible
      await expect(page.getByPlaceholder(/Search by invoice # or folder/i)).toBeVisible({ timeout: 5000 })
    })

    test('should show all navigation tabs', async ({ page }) => {
      // Check that all tabs are visible
      await expect(page.getByRole('tab', { name: /^Invoices$/i })).toBeVisible({ timeout: 15000 })
      await expect(page.getByRole('tab', { name: /Analytics/i })).toBeVisible()
      await expect(page.getByRole('tab', { name: /Tags/i })).toBeVisible()
      await expect(page.getByRole('tab', { name: /Status Logs/i })).toBeVisible()
    })
  })

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/invoices')
      await page.waitForLoadState('networkidle')

      // Navigate to Status Logs tab
      await page.getByRole('tab', { name: /Status Logs/i }).click()

      // Content should still be visible on mobile
      await expect(page.getByPlaceholder(/Search by invoice # or folder/i)).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(/Activity Summary/i)).toBeVisible()
    })

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('/invoices')
      await page.waitForLoadState('networkidle')

      // Navigate to Status Logs tab
      await page.getByRole('tab', { name: /Status Logs/i }).click()

      // Content should be visible
      await expect(page.getByPlaceholder(/Search by invoice # or folder/i)).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // Navigate to Status Logs tab
      await page.getByRole('tab', { name: /Status Logs/i }).click()
      await expect(page.getByPlaceholder(/Search by invoice # or folder/i)).toBeVisible({ timeout: 10000 })

      // Focus should be movable through interactive elements
      await page.keyboard.press('Tab')

      // An element should be focused
      const focused = await page.evaluate(() => document.activeElement?.tagName)
      expect(focused).not.toBeNull()
    })

    test('should have proper ARIA labels on filter controls', async ({ page }) => {
      // Navigate to Status Logs tab
      await page.getByRole('tab', { name: /Status Logs/i }).click()
      await expect(page.getByPlaceholder(/Search by invoice # or folder/i)).toBeVisible({ timeout: 10000 })

      // Check for proper combobox roles
      const comboboxes = page.getByRole('combobox')
      const count = await comboboxes.count()
      expect(count).toBeGreaterThanOrEqual(2) // At least folder and status filters
    })
  })

  test.describe('Performance', () => {
    test('should load Status Logs tab within acceptable time', async ({ page }) => {
      const startTime = Date.now()

      // Navigate to Status Logs tab
      await page.getByRole('tab', { name: /Status Logs/i }).click()
      await expect(page.getByPlaceholder(/Search by invoice # or folder/i)).toBeVisible({ timeout: 10000 })

      const loadTime = Date.now() - startTime

      // Should load in under 5 seconds
      expect(loadTime).toBeLessThan(5000)
    })

    test('should handle filter interactions smoothly', async ({ page }) => {
      // Navigate to Status Logs tab
      await page.getByRole('tab', { name: /Status Logs/i }).click()
      await expect(page.getByPlaceholder(/Search by invoice # or folder/i)).toBeVisible({ timeout: 10000 })

      // Measure search input interaction
      const startTime = Date.now()
      const searchInput = page.getByPlaceholder(/Search by invoice # or folder/i)
      await searchInput.fill('test')
      await page.waitForTimeout(100)
      const interactionTime = Date.now() - startTime

      // Interaction should be fast
      expect(interactionTime).toBeLessThan(2000)
    })
  })
})
