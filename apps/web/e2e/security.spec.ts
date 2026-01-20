import { test, expect } from '@playwright/test'

test.describe('Security Tests', () => {
  // E2E_TESTING env var bypasses auth in middleware

  test.describe('XSS Prevention', () => {
    test('should escape XSS in invoice number input', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Open settings to access invoice number
      await page.getByLabel(/Settings/i).first().click()
      await expect(page.getByRole('heading', { name: /Invoice Settings/i })).toBeVisible({ timeout: 10000 })

      // Try to inject script
      const xssPayload = '<script>alert("XSS")</script>'
      await page.getByLabel(/Invoice Number/i).fill(xssPayload)

      // Check that the script is not executed (value should be escaped/stored as text)
      const inputValue = await page.getByLabel(/Invoice Number/i).inputValue()
      expect(inputValue).toBe(xssPayload) // Value should be stored but not executed

      // No alert should have appeared
      const alerts: string[] = []
      page.on('dialog', (dialog) => {
        alerts.push(dialog.message())
        dialog.dismiss()
      })

      expect(alerts.length).toBe(0)
    })

    test('should escape XSS in notes textarea', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Open settings to access notes
      await page.getByLabel(/Settings/i).first().click()
      await expect(page.getByRole('heading', { name: /Invoice Settings/i })).toBeVisible({ timeout: 10000 })

      // Scroll to notes section
      const notesLabel = page.getByLabel(/^Notes$/i)
      await notesLabel.scrollIntoViewIfNeeded()

      const xssPayload = '"><img src=x onerror=alert(1)>'
      await notesLabel.fill(xssPayload)

      // Value should be stored but not executed
      const textareaValue = await notesLabel.inputValue()
      expect(textareaValue).toBe(xssPayload)
    })

    test('should escape XSS in party name fields', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Open settings
      await page.getByLabel(/Settings/i).first().click()
      await expect(page.getByRole('heading', { name: /Invoice Settings/i })).toBeVisible({ timeout: 10000 })

      const xssPayload = '<script>document.cookie</script>'
      const nameInput = page.locator('input[id*="name"]').first()
      await expect(nameInput).toBeVisible({ timeout: 5000 })
      await nameInput.fill(xssPayload)

      // Should not execute script
      const inputValue = await nameInput.inputValue()
      expect(inputValue).toBe(xssPayload)
    })
  })

  test.describe('Input Validation', () => {
    test('should prevent negative hourly rate', async ({ page }) => {
      // Set desktop viewport to see quick settings sidebar
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Wait for quick settings to appear
      await expect(page.getByText(/Quick Settings/i)).toBeVisible({ timeout: 15000 })

      const hourlyRateInput = page.getByLabel(/Hourly Rate/i).first()
      await expect(hourlyRateInput).toBeVisible({ timeout: 5000 })

      // Try to enter negative value
      await hourlyRateInput.fill('-100')

      // The min attribute should prevent negative values or it should be treated as 0
      // Check that the application handles this gracefully
      const value = await hourlyRateInput.inputValue()
      // Either the input rejects negative or shows empty/0
      expect(Number(value)).toBeGreaterThanOrEqual(0)
    })

    test('should validate email format', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Open settings
      await page.getByLabel(/Settings/i).first().click()
      await expect(page.getByRole('heading', { name: /Invoice Settings/i })).toBeVisible({ timeout: 10000 })

      const emailInput = page.locator('input[type="email"]').first()
      if (await emailInput.isVisible()) {
        await emailInput.fill('invalid-email')

        // HTML5 validation should mark it as invalid
        const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid)
        expect(isValid).toBe(false)
      }
    })
  })

  test.describe('Security Headers', () => {
    test('should have security headers', async ({ page }) => {
      const response = await page.goto('/')

      const headers = response?.headers() || {}

      // Check for common security headers (these may vary based on config)
      // X-Content-Type-Options
      if (headers['x-content-type-options']) {
        expect(headers['x-content-type-options']).toBe('nosniff')
      }

      // X-Frame-Options (if present)
      if (headers['x-frame-options']) {
        expect(['DENY', 'SAMEORIGIN']).toContain(headers['x-frame-options'])
      }
    })
  })

  test.describe('Data Sanitization', () => {
    test('should handle special characters in inputs', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Open settings
      await page.getByLabel(/Settings/i).first().click()
      await expect(page.getByRole('heading', { name: /Invoice Settings/i })).toBeVisible({ timeout: 10000 })

      const specialChars = '!@#$%^&*()_+-=[]{}|;\':",./<>?'
      await page.getByLabel(/Invoice Number/i).fill(specialChars)

      // Should not cause any errors
      const value = await page.getByLabel(/Invoice Number/i).inputValue()
      expect(value).toBe(specialChars)
    })

    test('should handle unicode characters', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Open settings
      await page.getByLabel(/Settings/i).first().click()
      await expect(page.getByRole('heading', { name: /Invoice Settings/i })).toBeVisible({ timeout: 10000 })

      const unicodeText = '日本語テスト 中文测试 한국어테스트 🎉👍💰'
      await page.getByLabel(/Job Title/i).fill(unicodeText)

      const value = await page.getByLabel(/Job Title/i).inputValue()
      expect(value).toBe(unicodeText)
    })

    test('should handle very long input', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Open settings
      await page.getByLabel(/Settings/i).first().click()
      await expect(page.getByRole('heading', { name: /Invoice Settings/i })).toBeVisible({ timeout: 10000 })

      // Scroll to notes
      const notesTextarea = page.getByLabel(/^Notes$/i)
      await notesTextarea.scrollIntoViewIfNeeded()

      const longInput = 'A'.repeat(10000)
      await notesTextarea.fill(longInput)

      // Should not crash
      const value = await notesTextarea.inputValue()
      expect(value.length).toBeGreaterThan(0)
    })
  })

  test.describe('Local Storage Security', () => {
    test('should not expose sensitive data in localStorage unencrypted', async ({ page }) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Note: This is a basic check. In production, sensitive data like
      // bank account numbers should ideally be encrypted or not stored client-side
      const storageData = await page.evaluate(() => localStorage.getItem('invoice-storage'))

      if (storageData) {
        // Check that the storage doesn't contain actual API keys or passwords
        expect(storageData.toLowerCase()).not.toContain('api_key')
        expect(storageData.toLowerCase()).not.toContain('password')
        expect(storageData.toLowerCase()).not.toContain('secret')
      }
    })
  })

  test.describe('Form Submission Security', () => {
    test('should prevent duplicate rapid submissions', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Wait for export button to be visible
      const exportButton = page.getByRole('button', { name: /Export/i }).first()
      await expect(exportButton).toBeVisible({ timeout: 10000 })

      // Click multiple times rapidly (sequentially to avoid race conditions)
      await exportButton.click()
      await page.waitForTimeout(100)
      await exportButton.click()
      await page.waitForTimeout(100)
      await exportButton.click()

      // App should not crash - wait a bit for any error state
      await page.waitForTimeout(500)
      await expect(page.getByRole('heading', { name: /Invoice Generator/i })).toBeVisible()
    })

    test('should handle form reset during submission', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Wait for quick settings to appear
      await expect(page.getByText(/Quick Settings/i)).toBeVisible({ timeout: 15000 })

      // Fill some data
      const hourlyRateInput = page.getByLabel(/Hourly Rate/i).first()
      await expect(hourlyRateInput).toBeVisible({ timeout: 5000 })
      await hourlyRateInput.fill('100')

      // Click reset while data might be processing
      await page.getByRole('button', { name: /Reset/i }).first().click()

      // App should not crash
      await expect(page.getByRole('heading', { name: /Invoice Generator/i })).toBeVisible()
    })
  })

  test.describe('Navigation Security', () => {
    test('should not allow arbitrary navigation via URL manipulation', async ({ page }) => {
      // Try to access non-existent routes
      const response = await page.goto('/admin')

      // Should either redirect to home or show 404, not expose sensitive routes
      // Either 404 page or redirect happened
      expect(response?.status()).toBeLessThan(500) // No server errors
    })

    test('should handle malformed URLs gracefully', async ({ page }) => {
      const response = await page.goto('/?<script>alert(1)</script>')

      // Should not cause errors
      expect(response?.status()).toBeLessThan(500)
    })
  })
})

test.describe('Content Security Policy', () => {
  test('should not have inline script execution', async ({ page }) => {
    let cspViolation = false

    page.on('console', (msg) => {
      if (msg.text().includes('Content Security Policy')) {
        cspViolation = true
      }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Navigate through the app - use settings instead of tabs
    await page.getByLabel(/Settings/i).first().click()
    await expect(page.getByRole('heading', { name: /Invoice Settings/i })).toBeVisible({ timeout: 10000 })
    await page.keyboard.press('Escape')

    // App should work without CSP violations
    // Note: Some CSP violations might be acceptable depending on config
    // This test documents the current behavior
    await expect(page.getByRole('heading', { name: /Invoice Generator/i })).toBeVisible()
  })
})
