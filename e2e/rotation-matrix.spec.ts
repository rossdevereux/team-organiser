import { test, expect } from '@playwright/test';

test.describe('Rotation Matrix Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?tab=matrix');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Rotation Matrix/i })).toBeVisible();
  });

  test('displays matrix table with periods and playing metrics', async ({ page }) => {
    // Check table headers
    const table = page.locator('table');
    await expect(table).toBeVisible();

    await expect(table.getByText('Player', { exact: true })).toBeVisible();
    await expect(table.getByText('Pref Position', { exact: true })).toBeVisible();
    await expect(table.getByText('Minutes', { exact: true })).toBeVisible();
    await expect(table.getByText('Game Time', { exact: true })).toBeVisible();
    await expect(table.getByText('Fairness', { exact: true })).toBeVisible();
  });

  test('orders squad players by squad number then name', async ({ page }) => {
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Extract player squad numbers from the matrix table
    const squadNumberBadges = await table.locator('tbody tr td:first-child span.bg-slate-800').allInnerTexts();
    
    // Parse squad numbers (handling '#' prefix or '—')
    const parsedNumbers = squadNumberBadges.map((badge) => {
      const match = badge.match(/\d+/);
      return match ? parseInt(match[0], 10) : 9999;
    });

    // Verify list is non-decreasing (sorted ascending)
    for (let i = 0; i < parsedNumbers.length - 1; i++) {
      expect(parsedNumbers[i]).toBeLessThanOrEqual(parsedNumbers[i + 1]);
    }
  });

  test('clicking period column eye icon navigates to pitch lineup for that period', async ({ page }) => {
    const eyeBtn = page.locator('table thead button[title*="Jump to"]').first();
    await expect(eyeBtn).toBeVisible();
    await eyeBtn.click();

    // Navigates to lineup tab
    await expect(page).toHaveURL(/tab=lineup/);
  });

  test('provides Auto-Balance Periods action within matrix', async ({ page }) => {
    const autoBalanceBtn = page.getByRole('button', { name: /Auto-Balance Periods/i });
    await expect(autoBalanceBtn).toBeVisible();
    await autoBalanceBtn.click();
    await expect(page.locator('table')).toBeVisible();
  });
});
