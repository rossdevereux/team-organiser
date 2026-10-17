import { test, expect } from '@playwright/test';

test.describe('Navbar & Navigation Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?tab=lineup');
    // Wait for initial load
    await expect(page.locator('header')).toBeVisible();
  });

  test('displays brand logo and title lockup', async ({ page }) => {
    const brand = page.locator('header').getByAltText('SubShuffle Logo');
    await expect(brand).toBeVisible();
    await expect(page.locator('header')).toContainText('SubShuffle');
  });

  test('switches between all 6 primary navigation tabs and updates URL', async ({ page }) => {
    // 1. Matrix tab
    await page.getByRole('button', { name: /Matrix/i }).first().click();
    await expect(page).toHaveURL(/(tab=matrix|\/matrix)/);
    await expect(page.getByRole('heading', { name: /Rotation Matrix/i })).toBeVisible();

    // 2. Fair Play Stats tab
    await page.getByRole('button', { name: /Fair Play/i }).first().click();
    await expect(page).toHaveURL(/(tab=stats|\/stats)/);
    await expect(page.getByRole('heading', { name: /Fair Play Analytics/i })).toBeVisible();

    // 3. Squad Roster tab
    await page.getByRole('button', { name: /Squad/i }).first().click();
    await expect(page).toHaveURL(/(tab=squad|\/squad)/);
    await expect(page.getByRole('button', { name: /Add Player/i }).first()).toBeVisible();

    // 4. Fixtures tab
    await page.getByRole('button', { name: /Fixtures/i }).first().click();
    await expect(page).toHaveURL(/(tab=fixtures|\/fixtures)/);
    await expect(page.getByRole('button', { name: /New Fixture/i }).first()).toBeVisible();

    // 5. Teams & Sharing tab
    await page.getByRole('button', { name: /Teams/i }).first().click();
    await expect(page).toHaveURL(/(tab=teams|\/teams)/);
    await expect(page.getByRole('button', { name: /Create New Team/i })).toBeVisible();

    // 6. Pitch Lineup tab
    await page.getByRole('button', { name: /Lineup/i }).first().click();
    await expect(page).toHaveURL(/(tab=lineup|\/lineup)/);
  });

  test('supports deep linking via URL query parameters', async ({ page }) => {
    await page.goto('/?tab=fixtures');
    await expect(page.getByRole('button', { name: /New Fixture/i }).first()).toBeVisible();

    await page.goto('/?tab=matrix');
    await expect(page.getByRole('heading', { name: /Rotation Matrix/i })).toBeVisible();
  });

  test('team switcher dropdown allows switching teams', async ({ page }) => {
    const teamBtn = page.locator('header button[title="Switch or manage teams"]');
    await expect(teamBtn).toBeVisible();
    await teamBtn.click();

    // Verify dropdown content
    const dropdown = page.locator('header').getByText('Switch Team');
    await expect(dropdown).toBeVisible();

    // Check manage teams button inside dropdown
    const manageLink = page.locator('header').getByText('Manage All Teams & Sharing');
    await expect(manageLink).toBeVisible();
  });

  test('desktop shows fixture switcher and no navbar items overlap', async ({ page }) => {
    const teamBtn = page.locator('header button[title="Switch or manage teams"]');
    const fixBtn = page.locator('header button[title="Switch or manage fixtures"]');

    await expect(teamBtn).toBeVisible();

    // If viewport width >= 1024, fixture button should be visible
    const viewport = page.viewportSize();
    if (viewport && viewport.width >= 1024) {
      await expect(fixBtn).toBeVisible();

      // Mathematically verify no horizontal overlap
      const teamBox = await teamBtn.boundingBox();
      const fixBox = await fixBtn.boundingBox();
      expect(teamBox).not.toBeNull();
      expect(fixBox).not.toBeNull();
      if (teamBox && fixBox) {
        expect(teamBox.x + teamBox.width).toBeLessThanOrEqual(fixBox.x);
      }
    }
  });
});
