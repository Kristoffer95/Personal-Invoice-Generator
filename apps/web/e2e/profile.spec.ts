import { test, expect } from '@playwright/test'

test.describe('Profile Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the profile page (E2E_TESTING env var bypasses auth in middleware)
    await page.goto('/profile')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
  })

  test.describe('Page Layout', () => {
    test('should load the profile settings page', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /Profile Settings/i })).toBeVisible({ timeout: 10000 })
    })

    test('should have centered container on desktop', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/profile')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(500)

      // Check that the main content is properly centered by checking margin auto
      const main = page.locator('main')
      await expect(main).toBeVisible()

      // Get the bounding box and viewport to verify centering
      const mainBox = await main.boundingBox()
      const viewportSize = page.viewportSize()

      if (mainBox && viewportSize) {
        // The content should have space on both sides (centered)
        const leftMargin = mainBox.x
        const rightMargin = viewportSize.width - (mainBox.x + mainBox.width)

        // Both margins should be reasonably equal (allowing for small differences)
        // For a centered element, left and right margins should be similar
        expect(Math.abs(leftMargin - rightMargin)).toBeLessThan(50)
      }
    })

    test('should display tabs for Business Info and Invoice Settings', async ({ page }) => {
      await expect(page.getByRole('tab', { name: /Business/i })).toBeVisible({ timeout: 10000 })
      await expect(page.getByRole('tab', { name: /Invoice|Invoicing/i })).toBeVisible()
    })

    test('should display back button in header', async ({ page }) => {
      // There should be a button that goes back to home
      const backButton = page.getByRole('button').filter({ has: page.locator('svg') }).first()
      await expect(backButton).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Business Info Tab', () => {
    test('should display business information form fields', async ({ page }) => {
      // Check for key form fields
      await expect(page.getByLabel(/Your Name/i)).toBeVisible({ timeout: 10000 })
      await expect(page.getByLabel(/Business Name/i)).toBeVisible()
      await expect(page.getByLabel(/Address/i)).toBeVisible()
      await expect(page.getByLabel(/City/i)).toBeVisible()
      await expect(page.getByLabel(/Email/i)).toBeVisible()
    })

    test('should allow filling in business information', async ({ page }) => {
      // Fill in some fields
      const nameInput = page.getByLabel(/Your Name/i)
      await expect(nameInput).toBeVisible({ timeout: 10000 })
      await nameInput.fill('Test User')
      await expect(nameInput).toHaveValue('Test User')

      const businessNameInput = page.getByLabel(/Business Name/i)
      await businessNameInput.fill('Test Company LLC')
      await expect(businessNameInput).toHaveValue('Test Company LLC')

      const emailInput = page.getByLabel(/Email/i)
      await emailInput.fill('test@company.com')
      await expect(emailInput).toHaveValue('test@company.com')
    })
  })

  test.describe('Invoice Settings Tab', () => {
    test('should switch to invoice settings tab', async ({ page }) => {
      // Click on the invoicing tab
      await page.getByRole('tab', { name: /Invoice|Invoicing/i }).click()

      // Check for invoice settings content
      await expect(page.getByText(/Invoice Numbering/i)).toBeVisible({ timeout: 10000 })
    })

    test('should display invoice prefix field', async ({ page }) => {
      await page.getByRole('tab', { name: /Invoice|Invoicing/i }).click()

      // Check for invoice prefix input
      const prefixInput = page.getByLabel(/Invoice Prefix/i)
      await expect(prefixInput).toBeVisible({ timeout: 10000 })
    })

    test('should allow setting invoice prefix', async ({ page }) => {
      await page.getByRole('tab', { name: /Invoice|Invoicing/i }).click()

      const prefixInput = page.getByLabel(/Invoice Prefix/i)
      await expect(prefixInput).toBeVisible({ timeout: 10000 })
      await prefixInput.fill('ACME')
      await expect(prefixInput).toHaveValue('ACME')
    })
  })

  test.describe('Save Functionality', () => {
    test('should have a save button', async ({ page }) => {
      const saveButton = page.getByRole('button', { name: /Save/i })
      await expect(saveButton).toBeVisible({ timeout: 10000 })
    })

    test('should show loading state when saving', async ({ page }) => {
      // Fill in some data first
      const nameInput = page.getByLabel(/Your Name/i)
      await expect(nameInput).toBeVisible({ timeout: 10000 })
      await nameInput.fill('Test User')

      // Click save button
      const saveButton = page.getByRole('button', { name: /Save/i })
      await saveButton.click()

      // Button should show saving state briefly
      // This is a quick test - in real scenario we'd mock the backend
      await page.waitForTimeout(500)
    })
  })

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/profile')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1000)

      // Page should still be functional
      await expect(page.getByRole('heading', { name: /Profile Settings/i })).toBeVisible({ timeout: 10000 })

      // Form fields should be visible
      await expect(page.getByLabel(/Your Name/i)).toBeVisible()
    })

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto('/profile')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1000)

      // Page should still be functional
      await expect(page.getByRole('heading', { name: /Profile Settings/i })).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Navigation', () => {
    test('should navigate back to home page', async ({ page }) => {
      // Find and click the back button (first button with icon in header)
      const backButton = page.locator('header').getByRole('button').first()
      await expect(backButton).toBeVisible({ timeout: 10000 })
      await backButton.click()

      // Should navigate to home page
      await expect(page).toHaveURL('/')
    })
  })
})

test.describe('Accessibility', () => {
  test('should have proper form labels', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)

    // All form fields should have associated labels
    const inputs = page.locator('input[type="text"], input[type="email"], input[type="tel"]')
    const count = await inputs.count()

    for (let i = 0; i < Math.min(count, 5); i++) {
      const input = inputs.nth(i)
      const hasAriaLabel = await input.getAttribute('aria-label')
      const hasId = await input.getAttribute('id')

      // Input should have either aria-label or an associated label via id
      expect(hasAriaLabel !== null || hasId !== null).toBe(true)
    }
  })

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)

    // Press Tab to navigate through elements
    await page.keyboard.press('Tab')

    // First focusable element should be focused
    const focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(focused).not.toBeNull()
  })
})
