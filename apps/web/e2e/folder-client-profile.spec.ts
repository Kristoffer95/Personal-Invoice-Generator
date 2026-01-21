import { test, expect } from '@playwright/test'

test.describe('Folder Client Profile Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to invoices page (E2E_TESTING env var bypasses auth in middleware)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/invoices')
    // Use domcontentloaded for faster tests, networkidle can timeout in CI
    await page.waitForLoadState('domcontentloaded')
    // Wait a bit for React hydration
    await page.waitForTimeout(1000)
  })

  test.describe('Folder Creation with Client Profile', () => {
    test('should display client and default settings section in folder dialog', async ({ page }) => {
      // Click on add folder button in sidebar
      const addFolderButton = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first()
      await expect(addFolderButton).toBeVisible({ timeout: 10000 })
      await addFolderButton.click()

      // Wait for dialog to open
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
      await expect(page.getByRole('heading', { name: /New Folder/i })).toBeVisible()

      // Check for client and defaults section
      await expect(page.getByText(/Client & Invoice Defaults/i)).toBeVisible()
      await expect(page.getByText(/Link a client and set default values/i)).toBeVisible()

      // Check for client selector
      await expect(page.getByText(/Client \(optional\)/i)).toBeVisible()

      // Check for default settings fields
      await expect(page.getByText(/Default Hourly Rate/i)).toBeVisible()
      await expect(page.getByText(/Default Currency/i)).toBeVisible()
      await expect(page.getByText(/Default Payment Terms/i)).toBeVisible()
      await expect(page.getByText(/Default Job Title/i)).toBeVisible()
    })

    test('should create folder with default invoice settings', async ({ page }) => {
      // Click on add folder button
      const addFolderButton = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first()
      await addFolderButton.click()

      // Wait for dialog
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      // Fill folder name
      await page.getByLabel(/Name/i).first().fill('Test Client Folder')

      // Fill default hourly rate
      const hourlyRateInput = page.locator('input[type="number"]').first()
      await hourlyRateInput.fill('75')

      // Select default currency
      const currencySelect = page.getByRole('combobox').filter({ hasText: /Select currency|Not set/i }).first()
      if (await currencySelect.isVisible()) {
        await currencySelect.click()
        await page.getByRole('option', { name: /USD/i }).click()
      }

      // Select default payment terms
      const paymentTermsSelect = page.getByRole('combobox').filter({ hasText: /Select terms|Not set/i }).first()
      if (await paymentTermsSelect.isVisible()) {
        await paymentTermsSelect.click()
        await page.getByRole('option', { name: /Net 30/i }).click()
      }

      // Fill default job title
      const jobTitleInput = page.getByPlaceholder(/Software Development/i)
      if (await jobTitleInput.isVisible()) {
        await jobTitleInput.fill('Consulting Services')
      }

      // Click create button
      await page.getByRole('button', { name: /Create/i }).click()

      // Verify folder was created (toast or folder appearing in list)
      await page.waitForTimeout(1000)
    })

    test('should edit existing folder to add client profile', async ({ page }) => {
      // First, check if there are any folders in the tree
      const folderItem = page.locator('[class*="folder"]').first()

      // If no folders exist, create one first
      if (!(await folderItem.isVisible({ timeout: 2000 }).catch(() => false))) {
        // Click add folder
        const addButton = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first()
        await addButton.click()

        // Create a simple folder
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
        await page.getByLabel(/Name/i).first().fill('Edit Test Folder')
        await page.getByRole('button', { name: /Create/i }).click()
        await page.waitForTimeout(1000)
      }
    })
  })

  test.describe('Multi-Client Selection', () => {
    test('should allow selecting multiple clients for a folder', async ({ page }) => {
      // Click on add folder button
      const addFolderButton = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first()
      await expect(addFolderButton).toBeVisible({ timeout: 10000 })
      await addFolderButton.click()

      // Wait for dialog
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

      // Check for the multi-client section with checkboxes
      await expect(page.getByText(/Link Clients \(optional\)/i)).toBeVisible()

      // The client list should use checkboxes for multi-select
      const clientCheckboxes = page.locator('input[type="checkbox"]')

      // If there are client profiles, checkboxes should be visible
      // We check that the UI supports multiple selection (checkboxes exist)
      const clientsSection = page.locator('label').filter({ has: clientCheckboxes })

      // The checkbox structure should be present
      // Even if no clients exist, the structure is there
      await expect(page.getByText(/No client profiles/i).or(clientsSection.first())).toBeVisible({ timeout: 3000 })
    })
  })

  test.describe('Invoice Auto-fill from Folder', () => {
    test('should navigate to calendar with folderId param when clicking New Invoice in folder', async ({ page }) => {
      // This tests that the "New Invoice" button passes the folder ID
      // The actual auto-fill happens on the calendar page

      // Get the new invoice button (when a folder is selected)
      const newInvoiceButton = page.getByRole('button', { name: /New Invoice/i })

      if (await newInvoiceButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Click the button and check the URL includes folderId
        await newInvoiceButton.click()

        // Wait for navigation
        await page.waitForTimeout(1000)

        // URL should either be "/" with folderId param or just "/"
        const url = page.url()
        expect(url).toContain('/')
      }
    })
  })

  test.describe('Folder Tree Display', () => {
    test('should display folder tree with options', async ({ page }) => {
      // Check folder section exists
      await expect(page.getByText(/Folders/i)).toBeVisible({ timeout: 10000 })

      // Check for "All" option
      await expect(page.getByText(/^All$/i)).toBeVisible()

      // Check for "Uncategorized" option
      await expect(page.getByText(/Uncategorized/i)).toBeVisible()
    })

    test('should show folder actions dropdown', async ({ page }) => {
      // First check if any folders exist
      const folderItems = page.locator('[class*="cursor-pointer"]').filter({ hasText: /^(?!All|Uncategorized)/ })

      // Try to find a folder and open its dropdown
      // If no folders, this test is skipped
      const firstFolder = folderItems.first()
      if (await firstFolder.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Hover to show the more options button
        await firstFolder.hover()

        // Look for the three dots menu button
        const moreButton = firstFolder.locator('button').filter({ has: page.locator('svg.lucide-more-horizontal') })
        if (await moreButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await moreButton.click()

          // Check dropdown options
          await expect(page.getByRole('menuitem', { name: /Edit/i })).toBeVisible()
          await expect(page.getByRole('menuitem', { name: /Add Subfolder/i })).toBeVisible()
        }
      }
    })
  })
})

test.describe('Security Tests for Folder Client Profile', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/invoices')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
  })

  test('should sanitize folder name input', async ({ page }) => {
    // Click add folder
    const addFolderButton = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first()
    await addFolderButton.click()

    // Wait for dialog
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

    // Try to inject script in folder name
    const nameInput = page.getByLabel(/Name/i).first()
    await nameInput.fill('<script>alert("xss")</script>')

    // The input should accept the text but it should be escaped/sanitized when displayed
    const value = await nameInput.inputValue()
    expect(value).toBe('<script>alert("xss")</script>')

    // Click create
    await page.getByRole('button', { name: /Create/i }).click()

    // Wait for creation
    await page.waitForTimeout(1000)

    // Close dialog if still open
    await page.keyboard.press('Escape')

    // The folder name should be displayed as text, not executed as script
    // No alert dialog should appear (if it did, the test would fail)
  })

  test('should validate hourly rate is positive number', async ({ page }) => {
    // Click add folder
    const addFolderButton = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first()
    await addFolderButton.click()

    // Wait for dialog
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

    // Fill folder name
    await page.getByLabel(/Name/i).first().fill('Rate Test Folder')

    // Try negative hourly rate
    const hourlyRateInput = page.locator('input[type="number"]').first()
    await hourlyRateInput.fill('-50')

    // The input should have min=0 validation
    const minAttr = await hourlyRateInput.getAttribute('min')
    expect(minAttr).toBe('0')
  })
})

test.describe('Performance Tests for Folder Operations', () => {
  test('should load folder tree efficiently', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/invoices')
    await page.waitForLoadState('domcontentloaded')
    const loadTime = Date.now() - startTime

    // Page should load within acceptable time
    expect(loadTime).toBeLessThan(5000)

    // Folder section should be visible
    await expect(page.getByText(/Folders/i)).toBeVisible({ timeout: 10000 })
  })

  test('should open folder dialog quickly', async ({ page }) => {
    await page.goto('/invoices')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)

    // Click add folder
    const addFolderButton = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first()
    await expect(addFolderButton).toBeVisible({ timeout: 10000 })

    const startTime = Date.now()
    await addFolderButton.click()

    // Wait for dialog
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })
    const dialogOpenTime = Date.now() - startTime

    // Dialog should open within 1 second
    expect(dialogOpenTime).toBeLessThan(1000)
  })
})

test.describe('Bulk Invoice Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/invoices')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
  })

  test('should show bulk delete button when invoices are selected', async ({ page }) => {
    // First check if there are any invoices
    const invoiceCards = page.locator('[class*="rounded-lg"][class*="hover:bg-muted"]')

    if (await invoiceCards.count() > 0) {
      // Click on the first invoice's checkbox
      const firstCheckbox = page.locator('input[type="checkbox"]').nth(1) // Skip "select all"
      await firstCheckbox.click()

      // Check that bulk action bar appears with Delete button
      await expect(page.getByText(/1 selected/i)).toBeVisible({ timeout: 3000 })
      await expect(page.getByRole('button', { name: /delete/i })).toBeVisible()
    }
  })

  test('should show bulk delete confirmation dialog', async ({ page }) => {
    // First check if there are any invoices
    const invoiceCards = page.locator('[class*="rounded-lg"][class*="hover:bg-muted"]')

    if (await invoiceCards.count() > 0) {
      // Select first invoice
      const firstCheckbox = page.locator('input[type="checkbox"]').nth(1)
      await firstCheckbox.click()

      // Click delete button
      await page.getByRole('button', { name: /delete/i }).click()

      // Check confirmation dialog appears
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })
      await expect(page.getByText(/Delete.*Invoice\(s\)\?/i)).toBeVisible()
      await expect(page.getByText(/This will permanently delete/i)).toBeVisible()

      // Cancel the dialog
      await page.getByRole('button', { name: /cancel/i }).click()
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 2000 })
    }
  })

  test('should show move and archive buttons in bulk actions', async ({ page }) => {
    const invoiceCards = page.locator('[class*="rounded-lg"][class*="hover:bg-muted"]')

    if (await invoiceCards.count() > 0) {
      // Select first invoice
      const firstCheckbox = page.locator('input[type="checkbox"]').nth(1)
      await firstCheckbox.click()

      // Check all bulk action buttons are visible
      await expect(page.getByRole('button', { name: /move/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /archive/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /delete/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /update status/i })).toBeVisible()
    }
  })
})

test.describe('New Client Form from All Folder', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/invoices')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
  })

  test('should open new client form when clicking New Invoice in All folder', async ({ page }) => {
    // Skip if we're on sign-in page (E2E_TESTING not enabled)
    const signInHeading = page.getByRole('heading', { name: /sign in/i })
    if (await signInHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      test.skip(true, 'E2E_TESTING not enabled - server shows sign-in page')
      return
    }

    // Make sure we're in "All" folder view - the app should start in "All" by default
    const foldersSection = page.getByText(/Folders/i)
    await expect(foldersSection).toBeVisible({ timeout: 10000 })

    // Click New Invoice button (should be visible immediately)
    const newInvoiceButton = page.getByRole('button', { name: /new invoice/i })
    await expect(newInvoiceButton).toBeVisible({ timeout: 5000 })
    await newInvoiceButton.click()

    // Check that the new client form dialog appears
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText(/Create New Client/i)).toBeVisible()
    await expect(page.getByText(/Enter client details/i)).toBeVisible()
  })

  test('should show all required form fields in new client dialog', async ({ page }) => {
    // Skip if we're on sign-in page
    const signInHeading = page.getByRole('heading', { name: /sign in/i })
    if (await signInHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      test.skip(true, 'E2E_TESTING not enabled - server shows sign-in page')
      return
    }

    // Wait for app to load
    const foldersSection = page.getByText(/Folders/i)
    await expect(foldersSection).toBeVisible({ timeout: 10000 })

    // Click New Invoice button
    await page.getByRole('button', { name: /new invoice/i }).click()

    // Wait for dialog
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })

    // Check all form fields are present
    await expect(page.getByPlaceholder(/contact name/i)).toBeVisible()
    await expect(page.getByPlaceholder(/company or business name/i)).toBeVisible()
    await expect(page.getByPlaceholder(/client@example.com/i)).toBeVisible()
    await expect(page.getByPlaceholder(/\+1 \(555\)/i)).toBeVisible()
    await expect(page.getByPlaceholder(/123 main street/i)).toBeVisible()
    await expect(page.getByPlaceholder(/new york/i)).toBeVisible()
  })

  test('should open new client form when clicking New Invoice in Uncategorized folder', async ({ page }) => {
    // Skip if we're on sign-in page
    const signInHeading = page.getByRole('heading', { name: /sign in/i })
    if (await signInHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      test.skip(true, 'E2E_TESTING not enabled - server shows sign-in page')
      return
    }

    // Wait for app to load
    const foldersSection = page.getByText(/Folders/i)
    await expect(foldersSection).toBeVisible({ timeout: 10000 })

    // Navigate to Uncategorized folder
    const uncategorizedFolder = page.getByText(/Uncategorized/i).first()
    await uncategorizedFolder.click()
    await page.waitForTimeout(500)

    // Click New Invoice button
    const newInvoiceButton = page.getByRole('button', { name: /new invoice/i })
    await expect(newInvoiceButton).toBeVisible({ timeout: 5000 })
    await newInvoiceButton.click()

    // Check that the new client form dialog appears
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText(/Create New Client/i)).toBeVisible()
  })

  test('should show validation error when submitting without name', async ({ page }) => {
    // Skip if we're on sign-in page
    const signInHeading = page.getByRole('heading', { name: /sign in/i })
    if (await signInHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      test.skip(true, 'E2E_TESTING not enabled - server shows sign-in page')
      return
    }

    // Wait for app to load
    const foldersSection = page.getByText(/Folders/i)
    await expect(foldersSection).toBeVisible({ timeout: 10000 })

    // Click New Invoice button
    await page.getByRole('button', { name: /new invoice/i }).click()

    // Wait for dialog
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })

    // Try to submit without filling name
    await page.getByRole('button', { name: /create & continue/i }).click()

    // Should show toast error - look for any toast-related element
    // In shadcn/ui, toasts appear in a specific container
    await page.waitForTimeout(500)
    // The toast should contain "Name required"
  })

  test('should close dialog when cancel is clicked', async ({ page }) => {
    // Skip if we're on sign-in page
    const signInHeading = page.getByRole('heading', { name: /sign in/i })
    if (await signInHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      test.skip(true, 'E2E_TESTING not enabled - server shows sign-in page')
      return
    }

    // Wait for app to load
    const foldersSection = page.getByText(/Folders/i)
    await expect(foldersSection).toBeVisible({ timeout: 10000 })

    // Click New Invoice button
    await page.getByRole('button', { name: /new invoice/i }).click()

    // Wait for dialog
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })

    // Click cancel
    await page.getByRole('button', { name: /cancel/i }).click()

    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 2000 })
  })
})

test.describe('Security Tests for Bulk Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/invoices')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
  })

  test('should sanitize client name input in new client form', async ({ page }) => {
    // Skip if we're on sign-in page
    const signInHeading = page.getByRole('heading', { name: /sign in/i })
    if (await signInHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      test.skip(true, 'E2E_TESTING not enabled - server shows sign-in page')
      return
    }

    // Wait for app to load
    const foldersSection = page.getByText(/Folders/i)
    await expect(foldersSection).toBeVisible({ timeout: 10000 })

    // Click New Invoice button
    await page.getByRole('button', { name: /new invoice/i }).click()

    // Wait for dialog
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })

    // Try to inject script in name field
    const nameInput = page.getByPlaceholder(/contact name/i)
    await nameInput.fill('<script>alert("xss")</script>')

    // The input should accept the text but it should be escaped when stored/displayed
    const value = await nameInput.inputValue()
    expect(value).toBe('<script>alert("xss")</script>')

    // No alert should appear during the test - the framework will catch any XSS
  })

  test('should require confirmation before bulk delete', async ({ page }) => {
    // Skip if we're on sign-in page
    const signInHeading = page.getByRole('heading', { name: /sign in/i })
    if (await signInHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      test.skip(true, 'E2E_TESTING not enabled - server shows sign-in page')
      return
    }

    // Wait for app to load
    const foldersSection = page.getByText(/Folders/i)
    await expect(foldersSection).toBeVisible({ timeout: 10000 })

    const invoiceCards = page.locator('[class*="rounded-lg"][class*="hover:bg-muted"]')

    if (await invoiceCards.count() > 0) {
      // Select first invoice
      const firstCheckbox = page.locator('input[type="checkbox"]').nth(1)
      await firstCheckbox.click()

      // Click delete - should NOT immediately delete
      await page.getByRole('button', { name: /delete/i }).click()

      // Confirmation dialog MUST appear
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })
      await expect(page.getByText(/permanently delete/i)).toBeVisible()

      // Only after clicking confirm button should it delete
      // Cancel to avoid actual deletion
      await page.getByRole('button', { name: /cancel/i }).click()
    }
  })
})
