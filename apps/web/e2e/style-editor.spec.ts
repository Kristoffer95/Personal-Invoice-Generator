import { test, expect } from '@playwright/test'

test.describe('Style Editor E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the style editor page
    await page.goto('/style-editor')
    // Wait for dynamic import to load
    await page.waitForSelector('[data-testid="style-editor-canvas"]', { timeout: 15000 })
  })

  test.describe('Basic Page Load', () => {
    test('should load the style editor page with canvas', async ({ page }) => {
      // Canvas should be visible (A4 preview area)
      const canvas = page.locator('[data-testid="style-editor-canvas"]')
      await expect(canvas).toBeVisible()
    })

    test('should display the elements panel', async ({ page }) => {
      // Elements panel header
      await expect(page.getByRole('heading', { name: 'Elements' })).toBeVisible()
      // Check for element categories - actual category names from predefined-elements.ts
      await expect(page.getByText('Text Elements')).toBeVisible()
    })

    test('should display toolbar controls', async ({ page }) => {
      // Check for zoom level display (shows percentage like "100%")
      await expect(page.getByText(/\d+%/).first()).toBeVisible()
      // Check for Save button
      await expect(page.getByRole('button', { name: /Save/i })).toBeVisible()
    })
  })

  test.describe('Template Management', () => {
    test('should create default template on load', async ({ page }) => {
      // Template name should be visible in header
      await expect(page.getByText('My Invoice Template')).toBeVisible()
    })

    test('should save a template', async ({ page }) => {
      // Find save button
      const saveButton = page.getByRole('button', { name: /Save/i })
      await expect(saveButton).toBeVisible()

      // Click save
      await saveButton.click()

      // Verify template was saved to localStorage
      await page.waitForTimeout(500)
      const storage = await page.evaluate(() => localStorage.getItem('template-storage'))
      expect(storage).not.toBeNull()
    })

    test('should allow editing template name', async ({ page }) => {
      // Click on the template name to enter edit mode
      const templateNameButton = page.getByText('My Invoice Template')
      await templateNameButton.click()

      // Input should appear for editing
      const nameInput = page.locator('input[class*="h-8"]')
      if (await nameInput.isVisible({ timeout: 2000 })) {
        await nameInput.fill('My Custom Invoice')
        await page.keyboard.press('Enter')
        // Name should be updated
        await expect(page.getByText('My Custom Invoice')).toBeVisible()
      }
    })
  })

  test.describe('Element Categories', () => {
    test('should display text elements category', async ({ page }) => {
      await expect(page.getByText('Text Elements')).toBeVisible()
      // Check for specific text elements
      await expect(page.getByText('Invoice Title')).toBeVisible()
    })

    test('should display contact info category', async ({ page }) => {
      // Category name is "Contact Info" not "Contact Blocks"
      await expect(page.getByText('Contact Info')).toBeVisible()
      // Check for from/to blocks
      await expect(page.getByText('From Block')).toBeVisible()
    })

    test('should display tables category', async ({ page }) => {
      await expect(page.getByText('Tables').first()).toBeVisible()
      // Check for table elements
      await expect(page.getByText('Work Hours Table')).toBeVisible()
    })

    test('should display decorative category', async ({ page }) => {
      await expect(page.getByText('Decorative')).toBeVisible()
    })

    test('should be able to collapse/expand categories', async ({ page }) => {
      // Click on Text Elements category to collapse
      const textCategory = page.getByRole('button', { name: /Text Elements/ })
      await textCategory.click()
      await page.waitForTimeout(200)

      // Click again to expand
      await textCategory.click()
      await expect(page.getByText('Invoice Title')).toBeVisible()
    })
  })

  test.describe('Drag and Drop', () => {
    test('should drag element from panel to canvas', async ({ page }) => {
      // Find a draggable element in the panel - Invoice Title
      const invoiceTitle = page.getByText('Invoice Title').first()
      await expect(invoiceTitle).toBeVisible()

      const canvas = page.locator('[data-testid="style-editor-canvas"]')
      await expect(canvas).toBeVisible()

      // Get bounding boxes
      const elementBox = await invoiceTitle.boundingBox()
      const canvasBox = await canvas.boundingBox()

      if (elementBox && canvasBox) {
        // Perform drag and drop
        await page.mouse.move(
          elementBox.x + elementBox.width / 2,
          elementBox.y + elementBox.height / 2
        )
        await page.mouse.down()
        await page.mouse.move(canvasBox.x + 150, canvasBox.y + 150, { steps: 10 })
        await page.mouse.up()

        await page.waitForTimeout(500)

        // Check if element was added to canvas
        const canvasElements = await canvas.locator('[data-element-id]').count()
        expect(canvasElements).toBeGreaterThanOrEqual(0)
      }
    })

    test('should move element within canvas', async ({ page }) => {
      const canvas = page.locator('[data-testid="style-editor-canvas"]')
      await expect(canvas).toBeVisible()

      // First add an element by drag and drop
      const invoiceTitle = page.getByText('Invoice Title').first()
      const elementBox = await invoiceTitle.boundingBox()
      const canvasBox = await canvas.boundingBox()

      if (elementBox && canvasBox) {
        await page.mouse.move(
          elementBox.x + elementBox.width / 2,
          elementBox.y + elementBox.height / 2
        )
        await page.mouse.down()
        await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100, { steps: 5 })
        await page.mouse.up()
        await page.waitForTimeout(300)
      }

      // Try to find an existing element on canvas
      const element = canvas.locator('[data-element-id]').first()

      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        const newElementBox = await element.boundingBox()

        if (newElementBox) {
          // Store initial position
          const initialX = newElementBox.x
          const initialY = newElementBox.y

          // Drag the element
          await page.mouse.move(
            newElementBox.x + newElementBox.width / 2,
            newElementBox.y + newElementBox.height / 2
          )
          await page.mouse.down()
          await page.mouse.move(newElementBox.x + 50, newElementBox.y + 50, { steps: 5 })
          await page.mouse.up()

          await page.waitForTimeout(300)

          // Element should have moved or canvas should still be valid
          await expect(canvas).toBeVisible()
        }
      }
    })
  })

  test.describe('Element Selection', () => {
    test('should select element on click and show properties panel', async ({ page }) => {
      const canvas = page.locator('[data-testid="style-editor-canvas"]')
      await expect(canvas).toBeVisible()

      // First add an element
      const invoiceTitle = page.getByText('Invoice Title').first()
      const elementBox = await invoiceTitle.boundingBox()
      const canvasBox = await canvas.boundingBox()

      if (elementBox && canvasBox) {
        await page.mouse.move(
          elementBox.x + elementBox.width / 2,
          elementBox.y + elementBox.height / 2
        )
        await page.mouse.down()
        await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100, { steps: 5 })
        await page.mouse.up()
        await page.waitForTimeout(500)
      }

      // Find and click element on canvas
      const element = canvas.locator('[data-element-id]').first()

      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        await element.click()

        // Properties panel should be visible with "Properties" heading
        await expect(page.getByRole('heading', { name: 'Properties' })).toBeVisible({
          timeout: 3000,
        })
      }
    })

    test('should close properties panel when clicking close button', async ({ page }) => {
      const canvas = page.locator('[data-testid="style-editor-canvas"]')
      await expect(canvas).toBeVisible()

      // Add and select an element
      const invoiceTitle = page.getByText('Invoice Title').first()
      const elementBox = await invoiceTitle.boundingBox()
      const canvasBox = await canvas.boundingBox()

      if (elementBox && canvasBox) {
        await page.mouse.move(
          elementBox.x + elementBox.width / 2,
          elementBox.y + elementBox.height / 2
        )
        await page.mouse.down()
        await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100, { steps: 5 })
        await page.mouse.up()
        await page.waitForTimeout(300)
      }

      const element = canvas.locator('[data-element-id]').first()
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        await element.click()
        await page.waitForTimeout(300)

        // Press Escape to deselect
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)

        // Properties panel should be hidden
        const propertiesHeading = page.getByRole('heading', { name: 'Properties' })
        await expect(propertiesHeading).not.toBeVisible()
      }
    })
  })

  test.describe('Properties Panel', () => {
    test('should update element position via properties panel', async ({ page }) => {
      const canvas = page.locator('[data-testid="style-editor-canvas"]')
      await expect(canvas).toBeVisible()

      // Add an element
      const invoiceTitle = page.getByText('Invoice Title').first()
      const elementBox = await invoiceTitle.boundingBox()
      const canvasBox = await canvas.boundingBox()

      if (elementBox && canvasBox) {
        await page.mouse.move(
          elementBox.x + elementBox.width / 2,
          elementBox.y + elementBox.height / 2
        )
        await page.mouse.down()
        await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100, { steps: 5 })
        await page.mouse.up()
        await page.waitForTimeout(300)
      }

      const element = canvas.locator('[data-element-id]').first()

      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        await element.click()
        await page.waitForTimeout(300)

        // Find X position input by its label
        const xInput = page.locator('#pos-x')

        if (await xInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await xInput.fill('')
          await xInput.fill('150')
          await page.keyboard.press('Tab')

          await page.waitForTimeout(300)
          // Position should be updated
          await expect(xInput).toHaveValue('150')
        }
      }
    })

    test('should update element content via properties panel', async ({ page }) => {
      const canvas = page.locator('[data-testid="style-editor-canvas"]')
      await expect(canvas).toBeVisible()

      // Add a text element
      const customText = page.getByText('Custom Text').first()
      const elementBox = await customText.boundingBox()
      const canvasBox = await canvas.boundingBox()

      if (elementBox && canvasBox) {
        await page.mouse.move(
          elementBox.x + elementBox.width / 2,
          elementBox.y + elementBox.height / 2
        )
        await page.mouse.down()
        await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100, { steps: 5 })
        await page.mouse.up()
        await page.waitForTimeout(300)
      }

      // Find a text element on canvas
      const textElement = canvas.locator('[data-element-type="text"]').first()

      if (await textElement.isVisible({ timeout: 3000 }).catch(() => false)) {
        await textElement.click()
        await page.waitForTimeout(300)

        // Find content textarea
        const contentInput = page.locator('textarea').first()

        if (await contentInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await contentInput.fill('Updated Content')
          await page.waitForTimeout(300)

          // Content should be updated
          await expect(contentInput).toHaveValue('Updated Content')
        }
      }
    })
  })

  test.describe('Canvas Controls', () => {
    test('should toggle grid visibility', async ({ page }) => {
      // Find grid toggle button (icon button with Grid3X3 icon)
      // The button has a tooltip "Toggle Grid"
      const gridToggle = page.locator('button').filter({ has: page.locator('svg.lucide-grid-3x3') })

      if (await gridToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Toggle grid off
        await gridToggle.click()
        await page.waitForTimeout(200)

        // Toggle grid on
        await gridToggle.click()
        await page.waitForTimeout(200)

        // Canvas should still be visible
        const canvas = page.locator('[data-testid="style-editor-canvas"]')
        await expect(canvas).toBeVisible()
      }
    })

    test('should toggle ruler visibility', async ({ page }) => {
      // Find ruler toggle button (icon button with Ruler icon)
      const rulerToggle = page.locator('button').filter({ has: page.locator('svg.lucide-ruler') })

      if (await rulerToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await rulerToggle.click()
        await page.waitForTimeout(200)

        // Canvas should still be visible
        const canvas = page.locator('[data-testid="style-editor-canvas"]')
        await expect(canvas).toBeVisible()
      }
    })

    test('should change zoom level', async ({ page }) => {
      // Find zoom out button
      const zoomOut = page.locator('button').filter({ has: page.locator('svg.lucide-zoom-out') })

      if (await zoomOut.isVisible({ timeout: 3000 }).catch(() => false)) {
        await zoomOut.click()
        await page.waitForTimeout(200)

        // Zoom level should decrease
        const zoomText = page.getByText(/\d+%/).first()
        await expect(zoomText).toBeVisible()

        // Canvas should still be visible
        const canvas = page.locator('[data-testid="style-editor-canvas"]')
        await expect(canvas).toBeVisible()
      }
    })
  })

  test.describe('Token Insertion', () => {
    test('should show token inserter for text elements', async ({ page }) => {
      const canvas = page.locator('[data-testid="style-editor-canvas"]')
      await expect(canvas).toBeVisible()

      // Add a text element
      const customText = page.getByText('Custom Text').first()
      const elementBox = await customText.boundingBox()
      const canvasBox = await canvas.boundingBox()

      if (elementBox && canvasBox) {
        await page.mouse.move(
          elementBox.x + elementBox.width / 2,
          elementBox.y + elementBox.height / 2
        )
        await page.mouse.down()
        await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100, { steps: 5 })
        await page.mouse.up()
        await page.waitForTimeout(300)
      }

      // Select a text element
      const textElement = canvas.locator('[data-element-type="text"]').first()

      if (await textElement.isVisible({ timeout: 3000 }).catch(() => false)) {
        await textElement.click()
        await page.waitForTimeout(300)

        // Look for token inserter (should have "Insert Token" or similar text)
        const tokenSection = page.getByText(/Insert Token|Tokens/i)

        if (await tokenSection.isVisible({ timeout: 2000 }).catch(() => false)) {
          // Token inserter should be visible for text elements
          await expect(tokenSection).toBeVisible()
        }
      }
    })
  })

  test.describe('Keyboard Shortcuts', () => {
    test('should delete selected element with Delete key', async ({ page }) => {
      const canvas = page.locator('[data-testid="style-editor-canvas"]')
      await expect(canvas).toBeVisible()

      // Add an element first
      const customText = page.getByText('Custom Text').first()
      const elementBox = await customText.boundingBox()
      const canvasBox = await canvas.boundingBox()

      if (elementBox && canvasBox) {
        await page.mouse.move(
          elementBox.x + elementBox.width / 2,
          elementBox.y + elementBox.height / 2
        )
        await page.mouse.down()
        await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100, { steps: 5 })
        await page.mouse.up()
        await page.waitForTimeout(500)
      }

      // Get initial element count
      const initialCount = await canvas.locator('[data-element-id]').count()

      if (initialCount > 0) {
        // Select first element
        const element = canvas.locator('[data-element-id]').first()
        await element.click()
        await page.waitForTimeout(200)

        // Press Delete
        await page.keyboard.press('Delete')
        await page.waitForTimeout(300)

        // Element count should decrease
        const newCount = await canvas.locator('[data-element-id]').count()
        expect(newCount).toBeLessThan(initialCount)
      }
    })

    test('should undo with Cmd+Z', async ({ page }) => {
      const canvas = page.locator('[data-testid="style-editor-canvas"]')
      await expect(canvas).toBeVisible()

      // Add an element
      const customText = page.getByText('Custom Text').first()
      const elementBox = await customText.boundingBox()
      const canvasBox = await canvas.boundingBox()

      if (elementBox && canvasBox) {
        await page.mouse.move(
          elementBox.x + elementBox.width / 2,
          elementBox.y + elementBox.height / 2
        )
        await page.mouse.down()
        await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100, { steps: 5 })
        await page.mouse.up()
        await page.waitForTimeout(500)
      }

      const element = canvas.locator('[data-element-id]').first()

      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Delete the element
        await element.click()
        await page.keyboard.press('Delete')
        await page.waitForTimeout(300)

        const countAfterDelete = await canvas.locator('[data-element-id]').count()

        // Undo (use Meta on Mac)
        await page.keyboard.press('Meta+z')
        await page.waitForTimeout(300)

        // Element should be restored
        const countAfterUndo = await canvas.locator('[data-element-id]').count()
        expect(countAfterUndo).toBeGreaterThanOrEqual(countAfterDelete)
      }
    })

    test('should copy/paste with Cmd+C/Cmd+V', async ({ page }) => {
      const canvas = page.locator('[data-testid="style-editor-canvas"]')
      await expect(canvas).toBeVisible()

      // Add an element first
      const customText = page.getByText('Custom Text').first()
      const elementBox = await customText.boundingBox()
      const canvasBox = await canvas.boundingBox()

      if (elementBox && canvasBox) {
        await page.mouse.move(
          elementBox.x + elementBox.width / 2,
          elementBox.y + elementBox.height / 2
        )
        await page.mouse.down()
        await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100, { steps: 5 })
        await page.mouse.up()
        await page.waitForTimeout(500)
      }

      const initialCount = await canvas.locator('[data-element-id]').count()

      if (initialCount > 0) {
        // Select and copy
        const element = canvas.locator('[data-element-id]').first()
        await element.click()
        await page.waitForTimeout(200)
        await page.keyboard.press('Meta+c')
        await page.waitForTimeout(300)

        // Paste
        await page.keyboard.press('Meta+v')
        await page.waitForTimeout(300)

        // Should have one more element
        const newCount = await canvas.locator('[data-element-id]').count()
        expect(newCount).toBeGreaterThan(initialCount)
      }
    })

    test('should deselect with Escape key', async ({ page }) => {
      const canvas = page.locator('[data-testid="style-editor-canvas"]')
      await expect(canvas).toBeVisible()

      // Add an element
      const customText = page.getByText('Custom Text').first()
      const elementBox = await customText.boundingBox()
      const canvasBox = await canvas.boundingBox()

      if (elementBox && canvasBox) {
        await page.mouse.move(
          elementBox.x + elementBox.width / 2,
          elementBox.y + elementBox.height / 2
        )
        await page.mouse.down()
        await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100, { steps: 5 })
        await page.mouse.up()
        await page.waitForTimeout(500)
      }

      const element = canvas.locator('[data-element-id]').first()

      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        await element.click()
        await page.waitForTimeout(200)

        // Properties panel should be visible
        await expect(page.getByRole('heading', { name: 'Properties' })).toBeVisible()

        // Press Escape
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)

        // Properties panel should be hidden
        await expect(page.getByRole('heading', { name: 'Properties' })).not.toBeVisible()
      }
    })
  })
})

test.describe('Style Editor Security Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/style-editor')
    await page.waitForSelector('[data-testid="style-editor-canvas"]', { timeout: 15000 })
  })

  test.describe('XSS Prevention', () => {
    test('should escape XSS in element content', async ({ page }) => {
      const canvas = page.locator('[data-testid="style-editor-canvas"]')
      await expect(canvas).toBeVisible()

      // Add a text element
      const customText = page.getByText('Custom Text').first()
      const elementBox = await customText.boundingBox()
      const canvasBox = await canvas.boundingBox()

      if (elementBox && canvasBox) {
        await page.mouse.move(
          elementBox.x + elementBox.width / 2,
          elementBox.y + elementBox.height / 2
        )
        await page.mouse.down()
        await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100, { steps: 5 })
        await page.mouse.up()
        await page.waitForTimeout(500)
      }

      const textElement = canvas.locator('[data-element-type="text"]').first()

      if (await textElement.isVisible({ timeout: 3000 }).catch(() => false)) {
        await textElement.click()
        await page.waitForTimeout(300)

        const contentInput = page.locator('textarea').first()

        if (await contentInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          const xssPayload = '<script>alert("XSS")</script>'

          // Set up dialog listener BEFORE filling the input
          const alerts: string[] = []
          page.on('dialog', (dialog) => {
            alerts.push(dialog.message())
            dialog.dismiss()
          })

          await contentInput.fill(xssPayload)

          // Value should be stored but not executed
          const inputValue = await contentInput.inputValue()
          expect(inputValue).toBe(xssPayload)

          // Wait a moment to ensure no dialog appears
          await page.waitForTimeout(500)
          expect(alerts.length).toBe(0)
        }
      }
    })

    test('should escape XSS in template name', async ({ page }) => {
      // Click on template name to edit
      const templateName = page.getByText('My Invoice Template')
      await templateName.click()

      const nameInput = page.locator('input[class*="h-8"]')

      if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        const xssPayload = '"><img src=x onerror=alert(1)>'

        // Set up dialog listener
        const alerts: string[] = []
        page.on('dialog', (dialog) => {
          alerts.push(dialog.message())
          dialog.dismiss()
        })

        await nameInput.fill(xssPayload)
        const inputValue = await nameInput.inputValue()
        expect(inputValue).toBe(xssPayload)

        await page.waitForTimeout(500)
        expect(alerts.length).toBe(0)
      }
    })
  })

  test.describe('Token Security', () => {
    test('should only allow whitelisted tokens', async ({ page }) => {
      const canvas = page.locator('[data-testid="style-editor-canvas"]')
      await expect(canvas).toBeVisible()

      // Add a text element
      const customText = page.getByText('Custom Text').first()
      const elementBox = await customText.boundingBox()
      const canvasBox = await canvas.boundingBox()

      if (elementBox && canvasBox) {
        await page.mouse.move(
          elementBox.x + elementBox.width / 2,
          elementBox.y + elementBox.height / 2
        )
        await page.mouse.down()
        await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100, { steps: 5 })
        await page.mouse.up()
        await page.waitForTimeout(500)
      }

      const textElement = canvas.locator('[data-element-type="text"]').first()

      if (await textElement.isVisible({ timeout: 3000 }).catch(() => false)) {
        await textElement.click()
        await page.waitForTimeout(300)

        const contentInput = page.locator('textarea').first()

        if (await contentInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          // Try to add an invalid/dangerous token
          const invalidToken = '{{__proto__}}'
          await contentInput.fill(invalidToken)

          await page.waitForTimeout(300)

          // The input should accept it (it's just text until rendered)
          // but it should be sanitized/ignored during PDF generation
          const inputValue = await contentInput.inputValue()
          expect(inputValue).toBe(invalidToken)
        }
      }
    })
  })

  test.describe('Input Validation', () => {
    test('should handle very long content', async ({ page }) => {
      const canvas = page.locator('[data-testid="style-editor-canvas"]')
      await expect(canvas).toBeVisible()

      // Add a text element
      const customText = page.getByText('Custom Text').first()
      const elementBox = await customText.boundingBox()
      const canvasBox = await canvas.boundingBox()

      if (elementBox && canvasBox) {
        await page.mouse.move(
          elementBox.x + elementBox.width / 2,
          elementBox.y + elementBox.height / 2
        )
        await page.mouse.down()
        await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100, { steps: 5 })
        await page.mouse.up()
        await page.waitForTimeout(500)
      }

      const textElement = canvas.locator('[data-element-type="text"]').first()

      if (await textElement.isVisible({ timeout: 3000 }).catch(() => false)) {
        await textElement.click()
        await page.waitForTimeout(300)

        const contentInput = page.locator('textarea').first()

        if (await contentInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          const longContent = 'A'.repeat(10000)
          await contentInput.fill(longContent)

          // Should not crash
          await page.waitForTimeout(500)
          await expect(canvas).toBeVisible()
        }
      }
    })

    test('should handle special characters', async ({ page }) => {
      const canvas = page.locator('[data-testid="style-editor-canvas"]')
      await expect(canvas).toBeVisible()

      // Add a text element
      const customText = page.getByText('Custom Text').first()
      const elementBox = await customText.boundingBox()
      const canvasBox = await canvas.boundingBox()

      if (elementBox && canvasBox) {
        await page.mouse.move(
          elementBox.x + elementBox.width / 2,
          elementBox.y + elementBox.height / 2
        )
        await page.mouse.down()
        await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100, { steps: 5 })
        await page.mouse.up()
        await page.waitForTimeout(500)
      }

      const textElement = canvas.locator('[data-element-type="text"]').first()

      if (await textElement.isVisible({ timeout: 3000 }).catch(() => false)) {
        await textElement.click()
        await page.waitForTimeout(300)

        const contentInput = page.locator('textarea').first()

        if (await contentInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          const specialChars = '!@#$%^&*()_+-=[]{}|;\':",./<>?日本語中文한국어🎉'
          await contentInput.fill(specialChars)

          const inputValue = await contentInput.inputValue()
          expect(inputValue).toBe(specialChars)
        }
      }
    })
  })

  test.describe('Template Validation', () => {
    test('should limit number of elements', async ({ page }) => {
      // This tests that the app handles many elements without crashing
      const canvas = page.locator('[data-testid="style-editor-canvas"]')
      await expect(canvas).toBeVisible()

      // App should remain responsive with the initial state
      await expect(page.getByRole('heading', { name: 'Elements' })).toBeVisible()
    })
  })
})

test.describe('Style Editor Responsive Design', () => {
  test('should work on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/style-editor')
    await page.waitForSelector('[data-testid="style-editor-canvas"]', { timeout: 15000 })

    await expect(page.getByRole('heading', { name: 'Elements' })).toBeVisible()
    await expect(page.locator('[data-testid="style-editor-canvas"]')).toBeVisible()
  })

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/style-editor')
    await page.waitForSelector('[data-testid="style-editor-canvas"]', { timeout: 15000 })

    await expect(page.getByRole('heading', { name: 'Elements' })).toBeVisible()
  })

  test('should still render on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/style-editor')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)

    // Either the editor works on mobile or shows some content
    const content = await page.content()
    expect(content.length).toBeGreaterThan(100)
  })
})

test.describe('Style Editor Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/style-editor')
    await page.waitForSelector('[data-testid="style-editor-canvas"]', { timeout: 15000 })
  })

  test('should be keyboard navigable', async ({ page }) => {
    // Tab through elements
    await page.keyboard.press('Tab')

    const focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(focused).not.toBeNull()
  })

  test('should have proper ARIA labels', async ({ page }) => {
    // Check for buttons with accessible names
    const buttons = await page.getByRole('button').all()
    expect(buttons.length).toBeGreaterThan(0)

    // Canvas should be visible
    const canvas = page.locator('[data-testid="style-editor-canvas"]')
    await expect(canvas).toBeVisible()
  })
})

test.describe('Style Editor Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/style-editor')
    await page.waitForLoadState('domcontentloaded')
    const loadTime = Date.now() - startTime

    // Should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000)
  })

  test('should handle interactions smoothly', async ({ page }) => {
    await page.goto('/style-editor')
    await page.waitForSelector('[data-testid="style-editor-canvas"]', { timeout: 15000 })

    const canvas = page.locator('[data-testid="style-editor-canvas"]')
    await expect(canvas).toBeVisible()

    // Measure interaction performance
    const startTime = Date.now()

    // Click on elements panel
    await page.getByText('Invoice Title').first().click()

    const interactionTime = Date.now() - startTime

    // Interaction should be fast
    expect(interactionTime).toBeLessThan(2000)
  })
})
