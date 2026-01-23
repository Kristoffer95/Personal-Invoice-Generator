import { test, expect } from '@playwright/test'

test.describe('Folder Navigation and Caching', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page (E2E_TESTING env var bypasses auth in middleware)
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
  })

  test.describe('Home Page - All Invoices', () => {
    test('should load the invoice manager page', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /Invoice Manager/i })).toBeVisible({ timeout: 10000 })
    })

    test('should display folder sidebar', async ({ page }) => {
      // Check for folder tree sidebar
      await expect(page.getByText(/Folders/i)).toBeVisible({ timeout: 10000 })

      // Check for "All" option
      await expect(page.getByText(/^All$/)).toBeVisible()
    })

    test('should display Uncategorized option', async ({ page }) => {
      await expect(page.getByText(/Uncategorized/i)).toBeVisible({ timeout: 10000 })
    })

    test('should have "All" selected by default on home page', async ({ page }) => {
      // The "All" option should be highlighted/selected
      const allLink = page.locator('a').filter({ hasText: /^All$/ }).first()
      await expect(allLink).toBeVisible({ timeout: 10000 })

      // Check that it has the selected styling (primary background)
      const className = await allLink.getAttribute('class')
      expect(className).toContain('primary')
    })
  })

  test.describe('Folder Navigation Performance', () => {
    test('should navigate to folders without excessive loading', async ({ page }) => {
      // First, navigate to home to ensure data is loaded
      await page.goto('/')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1500) // Wait for initial data load

      // Check initial load
      const foldersText = page.getByText(/Folders/i)
      await expect(foldersText).toBeVisible({ timeout: 10000 })

      // Navigate to uncategorized folder
      const startTime = Date.now()
      await page.getByText(/Uncategorized/i).click()
      await page.waitForURL('**/folders/uncategorized')

      // Should navigate quickly (within 3 seconds including animation)
      const navigationTime = Date.now() - startTime
      expect(navigationTime).toBeLessThan(3000)

      // Content should still be visible
      await expect(page.getByText(/Folders/i)).toBeVisible({ timeout: 5000 })
    })

    test('should show folder content without long loading states when navigating back', async ({ page }) => {
      // Navigate to home
      await page.goto('/')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1500)

      // Navigate to uncategorized
      await page.getByText(/Uncategorized/i).click()
      await page.waitForURL('**/folders/uncategorized')
      await page.waitForTimeout(500)

      // Navigate back to home
      const startTime = Date.now()
      await page.getByText(/^All$/).click()
      await page.waitForURL('/')

      const returnTime = Date.now() - startTime
      expect(returnTime).toBeLessThan(2000)

      // Content should be visible (cached data should show)
      await expect(page.getByText(/Folders/i)).toBeVisible({ timeout: 3000 })
    })
  })

  test.describe('Folder Sidebar', () => {
    test('should display Add Folder button', async ({ page }) => {
      // Look for the add folder button in the sidebar
      const addButton = page.locator('button').filter({ has: page.locator('svg') }).first()
      await expect(addButton).toBeVisible({ timeout: 10000 })
    })

    test('should display Archived section', async ({ page }) => {
      await expect(page.getByText(/Archived/i)).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Breadcrumb Navigation', () => {
    test('should show breadcrumb on uncategorized page', async ({ page }) => {
      await page.goto('/folders/uncategorized')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1000)

      // Should show "All" link in breadcrumb
      const allBreadcrumb = page.locator('nav').getByText('All').first()
      await expect(allBreadcrumb).toBeVisible({ timeout: 10000 })

      // Should show "Uncategorized" as current
      await expect(page.getByText('Uncategorized')).toBeVisible()
    })

    test('should navigate via breadcrumb', async ({ page }) => {
      await page.goto('/folders/uncategorized')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1000)

      // Click "All" in breadcrumb
      await page.locator('nav').getByText('All').first().click()

      // Should navigate to home
      await expect(page).toHaveURL('/')
    })
  })

  test.describe('Tab Navigation', () => {
    test('should display tabs', async ({ page }) => {
      await expect(page.getByRole('tab', { name: /Invoices/i })).toBeVisible({ timeout: 10000 })
      await expect(page.getByRole('tab', { name: /Clients/i })).toBeVisible()
      await expect(page.getByRole('tab', { name: /Analytics/i })).toBeVisible()
      await expect(page.getByRole('tab', { name: /Tags/i })).toBeVisible()
    })

    test('should switch tabs', async ({ page }) => {
      // Click on Clients tab
      await page.getByRole('tab', { name: /Clients/i }).click()

      // Tab should be selected
      await expect(page.getByRole('tab', { name: /Clients/i })).toHaveAttribute('data-state', 'active')
    })

    test('should show Analytics tab content', async ({ page }) => {
      // Click on Analytics tab
      await page.getByRole('tab', { name: /Analytics/i }).click()

      // Tab should be selected
      await expect(page.getByRole('tab', { name: /Analytics/i })).toHaveAttribute('data-state', 'active')
    })
  })

  test.describe('New Invoice Button', () => {
    test('should display New Invoice button', async ({ page }) => {
      const newInvoiceButton = page.getByRole('button', { name: /New Invoice/i })
      await expect(newInvoiceButton).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Responsive Sidebar', () => {
    test('should show sidebar on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1000)

      // Sidebar should be visible
      await expect(page.getByText(/Folders/i)).toBeVisible({ timeout: 10000 })
    })

    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1000)

      // Page should still be functional
      await expect(page.getByRole('heading', { name: /Invoice Manager/i })).toBeVisible({ timeout: 10000 })
    })
  })
})

test.describe('Performance', () => {
  test('should load home page within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    const loadTime = Date.now() - startTime

    // Should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000)
  })

  test('should have fast navigation between pages', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)

    // Navigate to uncategorized
    const startTime = Date.now()
    await page.getByText(/Uncategorized/i).click()
    await page.waitForURL('**/folders/uncategorized')
    const navigationTime = Date.now() - startTime

    // Navigation should be fast (less than 2 seconds)
    expect(navigationTime).toBeLessThan(2000)
  })

  test('should not show prolonged loading state on repeat visits', async ({ page }) => {
    // First visit
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000) // Let data fully load

    // Navigate away
    await page.goto('/profile')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(500)

    // Navigate back - should be fast due to caching
    const startTime = Date.now()
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    const returnTime = Date.now() - startTime

    // Return navigation should be quick
    expect(returnTime).toBeLessThan(3000)

    // Content should be visible quickly
    await expect(page.getByText(/Folders/i)).toBeVisible({ timeout: 3000 })
  })
})
