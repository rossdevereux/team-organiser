import { test, expect } from '@playwright/test';
import { Selectors } from './helpers/selectors';

test.describe('Settings Modal Viewport Overflow & Sticky Action Footer (Issue #29)', () => {
  const testViewports = [
    { name: 'Mobile Portrait', width: 390, height: 844 },
    { name: 'Small Laptop', width: 1366, height: 768 },
    { name: 'Standard Desktop', width: 1920, height: 1080 },
  ];

  for (const vp of testViewports) {
    test(`renders fixed header, scrollable body, and sticky save button without clipping on ${vp.name} (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // 1. Enter app via demo sandbox
      await page.goto('/');
      const demoBtn = page.getByRole('button', { name: /Try Live Demo/i }).first();
      if (await demoBtn.isVisible()) {
        await demoBtn.click();
        await expect(page).toHaveURL(/(\/lineup|\?tab=lineup)/);
      }

      // 2. Open Settings modal
      await page.locator(Selectors.navbar.userMenuBtn).click();
      await page.locator(Selectors.navbar.settingsMenuItem).click();

      const dialog = page.locator(Selectors.settingsModal.dialog);
      await expect(dialog).toBeVisible();

      // 3. Verify modal card structural flex layout and max-height constraints
      const dialogCard = dialog.locator('> div');
      const cardStyles = await dialogCard.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          display: computed.display,
          flexDirection: computed.flexDirection,
          overflow: computed.overflow,
          height: rect.height,
          viewportHeight: window.innerHeight,
        };
      });

      expect(cardStyles.display).toBe('flex');
      expect(cardStyles.flexDirection).toBe('column');
      // Ensure the dialog card fits within 90% of the viewport height
      expect(cardStyles.height).toBeLessThanOrEqual(cardStyles.viewportHeight * 0.92);

      // 4. Verify sticky action buttons (Save / Cancel) are visible immediately without any scrolling
      const saveBtn = dialog.locator('button[type="submit"]');
      const cancelBtn = dialog.getByRole('button', { name: /Cancel/i });
      await expect(saveBtn).toBeVisible();
      await expect(cancelBtn).toBeVisible();

      // Ensure Save button bounding box is entirely inside the viewport
      const saveBtnBox = await saveBtn.boundingBox();
      expect(saveBtnBox).not.toBeNull();
      if (saveBtnBox) {
        expect(saveBtnBox.y + saveBtnBox.height).toBeLessThanOrEqual(vp.height);
      }

      // 5. Verify the form body has a scrollable container with overflow-y: auto
      const scrollBody = dialog.locator('.overflow-y-auto');
      await expect(scrollBody).toBeVisible();

      const scrollProperties = await scrollBody.evaluate((el) => ({
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        hasVerticalScrollbar: el.scrollHeight > el.clientHeight,
      }));

      // On constrained heights like 768px, content should have vertical scroll available
      if (vp.height <= 850) {
        expect(scrollProperties.hasVerticalScrollbar).toBe(true);
      }

      // 6. Scroll down to bottom of body and verify club kit color presets are reachable
      await scrollBody.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });

      const presetBtn = dialog.getByRole('button', { name: /Onyx\/Amber/i });
      await expect(presetBtn).toBeVisible();
      await presetBtn.click();

      // 7. Click sticky Save button and verify settings update and modal closes
      await saveBtn.click();
      await expect(dialog).not.toBeVisible();
    });
  }

  test('switches to billing tab with sticky close button', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 768 });
    await page.goto('/');
    const demoBtn = page.getByRole('button', { name: /Try Live Demo/i }).first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
    }

    await page.locator(Selectors.navbar.userMenuBtn).click();
    await page.locator(Selectors.navbar.settingsMenuItem).click();

    const dialog = page.locator(Selectors.settingsModal.dialog);
    await expect(dialog).toBeVisible();

    // Switch to Billing & Plan tab
    const billingTab = dialog.locator('[data-testid="billing-settings-tab"]');
    await billingTab.click();

    await expect(dialog.getByText(/Current Plan/i)).toBeVisible();
    await expect(dialog.getByText(/Your Plan Entitlements/i)).toBeVisible();

    // Verify sticky Close button in footer
    const closeFooterBtn = dialog.getByRole('button', { name: /Close/i });
    await expect(closeFooterBtn).toBeVisible();
    await closeFooterBtn.click();
    await expect(dialog).not.toBeVisible();
  });
});
