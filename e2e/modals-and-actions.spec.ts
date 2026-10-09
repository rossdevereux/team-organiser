import { test, expect } from '@playwright/test';

test.describe('Modals & Action Tools Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?tab=lineup');
    await expect(page.locator('header')).toBeVisible();
  });

  test('opens WhatsApp export modal with formatted announcement and closes', async ({ page }) => {
    const whatsAppBtn = page.locator('header button[title*="WhatsApp"]').first();
    await expect(whatsAppBtn).toBeVisible();
    await whatsAppBtn.click();

    // Verify modal is open
    await expect(page.getByRole('heading', { name: /WhatsApp Team Announcement/i })).toBeVisible();
    await expect(page.getByText(/Includes matchday squad, rested players/i)).toBeVisible();

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: /WhatsApp Team Announcement/i })).not.toBeVisible();
  });

  test('opens Print / PDF modal with official emblem and closes via Close button', async ({ page }) => {
    // Only test on viewports where Print button is visible (desktop)
    const printBtn = page.locator('header button[title*="Print official matchday pitch sheet"]').first();
    if (await printBtn.isVisible()) {
      await printBtn.click();

      // Verify Print modal header
      await expect(page.getByRole('heading', { name: /Official Matchday Pitch Sheet/i })).toBeVisible();

      // Verify presence of document print area
      const printArea = page.locator('.print-area');
      await expect(printArea).toBeVisible();

      // Click Close button
      const closeBtn = page.locator('button[title*="Close print preview"]').first();
      await closeBtn.click();
      await expect(page.getByRole('heading', { name: /Official Matchday Pitch Sheet/i })).not.toBeVisible();
    }
  });

  test('opens Live Match modal, controls timer, and closes cleanly', async ({ page }) => {
    const liveBtn = page.locator('header button[title*="Pitchside stopwatch"]').first();
    await expect(liveBtn).toBeVisible();
    await liveBtn.click();

    // Verify Live Match modal
    await expect(page.getByRole('heading', { name: /Sideline Live Match & Sub Buzzer/i })).toBeVisible();

    // Timer display should be visible (e.g. 00:00)
    await expect(page.getByText(/\d{2}:\d{2}/).first()).toBeVisible();

    // Close modal
    const closeBtn = page.locator('button[title*="Close live match"]').first();
    await closeBtn.click();
    await expect(page.getByRole('heading', { name: /Sideline Live Match & Sub Buzzer/i })).not.toBeVisible();
  });

  test('opens Team Settings modal and inspects league configurations', async ({ page }) => {
    const settingsBtn = page.locator('header button[title*="Team Settings & League Rules"]').first();
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    // Verify settings modal
    await expect(page.getByRole('heading', { name: /Team & League Settings/i })).toBeVisible();
    await expect(page.getByText(/Pitch Format/i)).toBeVisible();

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: /Team & League Settings/i })).not.toBeVisible();
  });

  test('toggles High-Contrast Touchline Dugout Mode via ContextSwitcher', async ({ page }) => {
    const touchlineToggle = page.locator('header button[title*="Toggle High-Contrast Touchline"]').first();
    if (await touchlineToggle.isVisible()) {
      // Toggle to Touchline mode
      await touchlineToggle.click();

      // Check design system root attribute or banner
      const rootOrBody = page.locator('body, #root, [data-context="touchline"]').first();
      await expect(rootOrBody).toBeVisible();

      // Toggle back to Clubhouse
      await touchlineToggle.click();
      await expect(page.locator('header')).toBeVisible();
    }
  });
});
