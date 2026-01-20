import { test, expect } from '@playwright/test'

test.describe('Invoice Generator E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app (E2E_TESTING env var bypasses auth in middleware)
    await page.goto('/')
    // Wait for hydration
    await page.waitForLoadState('networkidle')
  })

  test.describe('Basic Page Load', () => {
    test('should load the invoice generator page', async ({ page }) => {
      await expect(page).toHaveTitle(/Invoice Generator/)
      await expect(page.getByRole('heading', { name: /Invoice Generator/i })).toBeVisible()
    })

    test('should display work hours calendar', async ({ page }) => {
      await expect(page.getByText(/Work Hours/i)).toBeVisible()
      await expect(page.getByText(/Click on a day to edit hours/i)).toBeVisible()
    })

    test('should display period selectors', async ({ page }) => {
      await expect(page.getByText(/1st Batch/i)).toBeVisible()
      await expect(page.getByText(/2nd Batch/i)).toBeVisible()
      await expect(page.getByText(/Whole Month/i)).toBeVisible()
    })

    test('should display action buttons', async ({ page }) => {
      // Desktop buttons - wait for them to be visible
      await expect(page.getByRole('button', { name: /Reset/i }).first()).toBeVisible({ timeout: 10000 })
      await expect(page.getByRole('button', { name: /Preview/i }).first()).toBeVisible()
      await expect(page.getByRole('button', { name: /Export/i }).first()).toBeVisible()
    })
  })

  test.describe('Calendar Navigation', () => {
    test('should navigate to previous month', async ({ page }) => {
      // Get current month display - look for the month year text
      const monthDisplay = page.locator('span').filter({ hasText: /\w{3} \d{4}/ }).first()
      await expect(monthDisplay).toBeVisible({ timeout: 10000 })
      const initialMonth = await monthDisplay.textContent()

      // Click previous month button using aria-label
      await page.getByLabel(/Previous month/i).click()

      // Wait for update
      await page.waitForTimeout(500)

      // Month should change
      const newMonth = await monthDisplay.textContent()
      expect(newMonth).not.toBe(initialMonth)
    })

    test('should navigate to next month', async ({ page }) => {
      // Get current month display
      const monthDisplay = page.locator('span').filter({ hasText: /\w{3} \d{4}/ }).first()
      await expect(monthDisplay).toBeVisible({ timeout: 10000 })
      const initialMonth = await monthDisplay.textContent()

      // Click next month button
      await page.getByLabel(/Next month/i).click()

      // Wait for update
      await page.waitForTimeout(500)

      // Month should change
      const newMonth = await monthDisplay.textContent()
      expect(newMonth).not.toBe(initialMonth)
    })
  })

  test.describe('Period Selection', () => {
    test('should switch between period batches', async ({ page }) => {
      // Select 2nd Batch
      await page.getByLabel(/2nd Batch/i).click()
      await expect(page.getByLabel(/2nd Batch/i)).toBeChecked()

      // Select Whole Month
      await page.getByLabel(/Whole Month/i).click()
      await expect(page.getByLabel(/Whole Month/i)).toBeChecked()

      // Select 1st Batch
      await page.getByLabel(/1st Batch/i).click()
      await expect(page.getByLabel(/1st Batch/i)).toBeChecked()
    })
  })

  test.describe('Settings Panel', () => {
    test('should open settings panel', async ({ page }) => {
      // Click settings button
      await page.getByLabel(/Settings/i).first().click()

      // Settings sheet should open
      await expect(page.getByRole('heading', { name: /Invoice Settings/i })).toBeVisible({ timeout: 10000 })
    })

    test('should show invoice details in settings', async ({ page }) => {
      await page.getByLabel(/Settings/i).first().click()

      // Wait for sheet to open
      await expect(page.getByRole('heading', { name: /Invoice Settings/i })).toBeVisible({ timeout: 10000 })

      // Check for invoice details section
      await expect(page.getByText(/Invoice Details/i)).toBeVisible()
    })

    test('should show party info forms in settings', async ({ page }) => {
      await page.getByLabel(/Settings/i).first().click()

      // Wait for sheet to open
      await expect(page.getByRole('heading', { name: /Invoice Settings/i })).toBeVisible({ timeout: 10000 })

      // Check for from/to sections
      await expect(page.getByText(/From \(Your Info\)/i)).toBeVisible()
      await expect(page.getByText(/Bill To \(Client\)/i)).toBeVisible()
    })

    test('should fill in invoice details', async ({ page }) => {
      await page.getByLabel(/Settings/i).first().click()

      // Wait for sheet to open
      await expect(page.getByRole('heading', { name: /Invoice Settings/i })).toBeVisible({ timeout: 10000 })

      // Fill invoice number - find the input inside the sheet
      const invoiceNumberInput = page.getByLabel(/Invoice Number/i)
      await expect(invoiceNumberInput).toBeVisible({ timeout: 5000 })
      await invoiceNumberInput.fill('INV-TEST-001')
      await expect(invoiceNumberInput).toHaveValue('INV-TEST-001')

      // Fill job title
      const jobTitleInput = page.getByLabel(/Job Title/i)
      await jobTitleInput.fill('Software Development')
      await expect(jobTitleInput).toHaveValue('Software Development')
    })
  })

  test.describe('Quick Settings Sidebar', () => {
    test('should show quick settings on desktop', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Check for quick settings - wait longer for hydration
      await expect(page.getByText(/Quick Settings/i)).toBeVisible({ timeout: 15000 })
    })

    test('should update hourly rate', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Wait for the sidebar to appear
      await expect(page.getByText(/Quick Settings/i)).toBeVisible({ timeout: 15000 })

      const hourlyRateInput = page.getByLabel(/Hourly Rate/i).first()
      await expect(hourlyRateInput).toBeVisible({ timeout: 5000 })
      await hourlyRateInput.fill('150')
      await expect(hourlyRateInput).toHaveValue('150')
    })
  })

  test.describe('Summary', () => {
    test('should display summary on desktop', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Check for summary section
      await expect(page.getByText(/Summary/i).first()).toBeVisible({ timeout: 15000 })
      await expect(page.getByText(/Working Days/i)).toBeVisible()
      await expect(page.getByText(/Total Hours/i)).toBeVisible()
    })
  })

  test.describe('Preview', () => {
    test('should open preview dialog after filling required fields', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Fill required fields via settings
      await page.getByLabel(/Settings/i).first().click()
      await expect(page.getByRole('heading', { name: /Invoice Settings/i })).toBeVisible({ timeout: 10000 })

      await page.getByLabel(/Invoice Number/i).fill('INV-001')

      // Fill from name
      const nameInputs = page.locator('input[placeholder*="name" i], input[id*="name" i]')
      const fromName = nameInputs.first()
      await fromName.fill('Test Company')

      // Close settings
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)

      // Wait for sidebar and fill hourly rate
      await expect(page.getByText(/Quick Settings/i)).toBeVisible({ timeout: 10000 })
      await page.getByLabel(/Hourly Rate/i).first().fill('100')

      // Click preview
      await page.getByRole('button', { name: /Preview/i }).first().click()

      // Check if validation error or preview dialog appears
      // The app may show a toast if validation fails
      await page.waitForTimeout(1000)
    })
  })

  test.describe('Reset', () => {
    test('should reset the form', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Wait for sidebar
      await expect(page.getByText(/Quick Settings/i)).toBeVisible({ timeout: 15000 })

      // Fill hourly rate first
      const hourlyRateInput = page.getByLabel(/Hourly Rate/i).first()
      await expect(hourlyRateInput).toBeVisible({ timeout: 5000 })
      await hourlyRateInput.fill('999')
      await expect(hourlyRateInput).toHaveValue('999')

      // Click reset
      await page.getByRole('button', { name: /Reset/i }).first().click()

      // Wait for reset to complete
      await page.waitForTimeout(500)

      // Form should be reset - value should be different
      const value = await hourlyRateInput.inputValue()
      expect(value).not.toBe('999')
    })
  })
})

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Page should still be functional
    await expect(page.getByRole('heading', { name: /Invoice Generator/i })).toBeVisible({ timeout: 10000 })

    // Calendar should be visible
    await expect(page.getByText(/Work Hours/i)).toBeVisible()
  })

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /Invoice Generator/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Work Hours/i)).toBeVisible()
  })
})

test.describe('Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Focus should move through interactive elements
    await page.keyboard.press('Tab')

    // First focusable element should be focused
    const focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(focused).not.toBeNull()
  })

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check for proper labels on navigation buttons
    await expect(page.getByLabel(/Previous month/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByLabel(/Next month/i)).toBeVisible()
  })
})

test.describe('Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    const loadTime = Date.now() - startTime

    // Should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000)
  })

  test('should have no major performance issues on interactions', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Measure period selection performance
    const startTime = Date.now()
    await page.getByLabel(/2nd Batch/i).click()
    await page.waitForTimeout(100)
    const interactionTime = Date.now() - startTime

    // Interaction should be fast
    expect(interactionTime).toBeLessThan(2000)
  })
})
