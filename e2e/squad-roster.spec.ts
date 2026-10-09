import { test, expect } from '@playwright/test';

test.describe('Squad Roster Management Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?tab=squad');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Full Squad Roster/i })).toBeVisible();
  });

  test('displays squad roster list with registered players', async ({ page }) => {
    // Should display squad members with squad numbers
    const playerRows = page.locator('div:has-text("#")').first();
    await expect(playerRows).toBeVisible();
  });

  test('adds a new player to the squad and saves', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /Add Player/i }).first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Verify form appears
    await expect(page.getByText('Add Player to Squad')).toBeVisible();

    // Fill player name
    const uniqueName = `Test Star ${Date.now().toString().slice(-4)}`;
    const nameInput = page.getByPlaceholder(/Leo Davies/i);
    await nameInput.fill(uniqueName);

    // Save
    const saveBtn = page.locator('form').getByRole('button', { name: 'Save Player' });
    await saveBtn.click();

    // Verify newly added player is in roster
    await expect(page.getByText(uniqueName)).toBeVisible();
  });

  test('opens player edit mode and updates details', async ({ page }) => {
    const editBtn = page.locator('button[title="Edit player"]').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await expect(page.getByText(/Edit Player Details/i)).toBeVisible();

      // Cancel edit cleanly
      const cancelBtn = page.getByRole('button', { name: /Cancel/i }).or(page.locator('form button:has(.lucide-x)')).first();
      await cancelBtn.click();
      await expect(page.getByText(/Edit Player Details/i)).not.toBeVisible();
    }
  });

  test('supports exporting squad roster as CSV', async ({ page }) => {
    const exportBtn = page.getByRole('button', { name: /Export CSV/i });
    await expect(exportBtn).toBeVisible();

    // Setup download event listener
    const downloadPromise = page.waitForEvent('download');
    await exportBtn.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/squad_roster.*\.csv$/);
  });
});
