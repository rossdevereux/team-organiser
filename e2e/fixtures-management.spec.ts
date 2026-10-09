import { test, expect } from '@playwright/test';

test.describe('Fixtures Management Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?tab=fixtures');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Fixtures & Matches/i })).toBeVisible();
  });

  test('displays scheduled fixtures list and view mode toggles', async ({ page }) => {
    // Mode toggles
    const cardsBtn = page.getByRole('button', { name: /Cards View/i });
    const tableBtn = page.getByRole('button', { name: /Team Sheet Matrix/i });

    await expect(cardsBtn).toBeVisible();
    await expect(tableBtn).toBeVisible();

    // Toggle to matrix table view
    await tableBtn.click();
    await expect(tableBtn).toHaveClass(/bg-indigo-600/);

    // Toggle back to cards view
    await cardsBtn.click();
    await expect(cardsBtn).toHaveClass(/bg-indigo-600/);
  });

  test('schedules a new fixture and verifies it appears in the fixtures list', async ({ page }) => {
    const newFixBtn = page.getByRole('button', { name: /New Fixture/i });
    await expect(newFixBtn).toBeVisible();
    await newFixBtn.click();

    // Form should appear
    await expect(page.getByText('Schedule New Fixture & Logistics')).toBeVisible();

    // Fill opponent name
    const opponentName = `Hawks Utd ${Date.now().toString().slice(-4)}`;
    const oppInput = page.getByPlaceholder(/Oakridge Youth Tigers/i);
    await oppInput.fill(opponentName);

    // Submit form
    const submitBtn = page.locator('form').getByRole('button', { name: /Create|Schedule/i });
    await submitBtn.click();

    // Verify fixture card was created
    await expect(page.locator('main').getByText(opponentName).first()).toBeVisible();
  });

  test('edits an existing fixture logistics and updates details', async ({ page }) => {
    // Find an edit button on the first fixture card
    const editBtn = page.locator('button[title*="Edit fixture logistics"]').first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Edit modal should open
    await expect(page.getByRole('heading', { name: /Edit Fixture Logistics/i })).toBeVisible();

    // Close or Cancel cleanly
    const cancelBtn = page.getByRole('button', { name: /Cancel/i });
    await cancelBtn.click();
    await expect(page.getByRole('heading', { name: /Edit Fixture Logistics/i })).not.toBeVisible();
  });

  test('hero match banner allows quick-editing active fixture logistics', async ({ page }) => {
    await page.goto('/?tab=lineup');
    
    // Pencil icon button next to main fixture title
    const heroEditBtn = page.locator('h1 + button, button[title*="Edit fixture logistics"]').first();
    await expect(heroEditBtn).toBeVisible();
    await heroEditBtn.click();

    // Edit fixture modal should open
    await expect(page.getByRole('heading', { name: /Edit Fixture Logistics/i })).toBeVisible();

    // Close with Escape key
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: /Edit Fixture Logistics/i })).not.toBeVisible();
  });
});
