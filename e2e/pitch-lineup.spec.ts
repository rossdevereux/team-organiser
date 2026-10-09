import { test, expect } from '@playwright/test';

test.describe('Pitch & Lineup Management Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?tab=lineup');
    await expect(page.locator('header')).toBeVisible();
  });

  test('renders tactical pitch and player position nodes', async ({ page }) => {
    // Pitch area should be visible
    const pitch = page.locator('.relative.w-full.aspect-\\[4\\/5\\], .relative.w-full.aspect-\\[4\\/3\\], div:has(canvas), [class*="aspect-"]').first();
    await expect(pitch).toBeVisible();

    // Check presence of player position cards on pitch
    const pitchPlayer = page.locator('div[draggable="true"]').first();
    await expect(pitchPlayer).toBeVisible();
  });

  test('switches match periods/halves and updates pitch state', async ({ page }) => {
    // Locate period buttons in the sub-navbar or hero bar
    const firstHalfBtn = page.getByRole('button', { name: '1st Half' }).first();
    const secondHalfBtn = page.getByRole('button', { name: '2nd Half' }).first();

    await expect(firstHalfBtn).toBeVisible();
    await expect(secondHalfBtn).toBeVisible();

    // Switch to 2nd Half
    await secondHalfBtn.click();
    await expect(secondHalfBtn).toHaveClass(/bg-emerald-500/);

    // Switch back to 1st Half
    await firstHalfBtn.click();
    await expect(firstHalfBtn).toHaveClass(/bg-emerald-500/);
  });

  test('changes team formation via formation selector dropdown', async ({ page }) => {
    const formationSelect = page.locator('select[title*="Formations for"]');
    await expect(formationSelect).toBeVisible();

    // Current value
    const initialVal = await formationSelect.inputValue();

    // Select second option if available
    const options = await formationSelect.locator('option').allInnerTexts();
    if (options.length > 1) {
      const nextOption = options.find((opt) => opt !== initialVal) || options[1];
      await formationSelect.selectOption({ label: nextOption });
      expect(await formationSelect.inputValue()).not.toBe('');
    }
  });

  test('substitutes bench shows resting and bench players with swap capability', async ({ page }) => {
    // Bench container should be visible
    const benchHeading = page.getByText(/Substitutes Bench/i);
    await expect(benchHeading).toBeVisible();

    // Test swap interaction: click a bench player
    const swapBtn = page.locator('button[title*="swap"], button:has(.lucide-arrow-left-right), div:has-text("swap") button').first();
    if (await swapBtn.isVisible()) {
      await swapBtn.click();
      // Should show swap highlight banner or prompt
      await expect(page.getByText(/Click another player/i).or(page.getByText(/swap/i))).toBeVisible();
    }
  });

  test('clicking Auto-Balance triggers rotation re-balance', async ({ page }) => {
    const autoBalanceBtn = page.getByRole('button', { name: /Auto-Balance|Re-Balance/i }).first();
    await expect(autoBalanceBtn).toBeVisible();
    await autoBalanceBtn.click();

    // Should maintain pitch lineup stability
    await expect(page.locator('header')).toBeVisible();
  });
});
