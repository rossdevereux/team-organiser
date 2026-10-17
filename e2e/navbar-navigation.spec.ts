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
    const teamBtn = page.locator('header button[title="Switch or manage teams"]').first();
    const fixBtn = page.locator('header button[title="Switch or manage fixtures"]').first();

    await expect(teamBtn).toBeVisible();

    // If viewport width >= 1024, fixture button should be visible
    const viewport = page.viewportSize();
    if (viewport && viewport.width >= 1024) {
      await expect(fixBtn).toBeVisible();

      // Mathematically verify no horizontal overlap
      const teamBox = await teamBtn.boundingBox();
      const fixBox = await fixBtn.boundingBox();
      if (teamBox && fixBox) {
        expect(teamBox.x + teamBox.width).toBeLessThanOrEqual(fixBox.x);
      }
    }
  });

  test('consolidates user and utility controls into right-aligned Avatar menu', async ({ page }) => {
    const userMenuBtn = page.locator('button[data-testid="user-menu-button"]');
    await expect(userMenuBtn).toBeVisible();
    await userMenuBtn.click();

    // Verify avatar popover content scoped to menu
    const popover = page.locator('div:has(> button[data-testid="settings-menu-item"])');
    await expect(popover.getByText(/Guest Coach/i).first()).toBeVisible();
    await expect(popover.locator('button[data-testid="settings-menu-item"]')).toBeVisible();
    await expect(popover.getByText(/Language \/ Idioma/i)).toBeVisible();
    await expect(popover.getByText(/English/i)).toBeVisible();
    await expect(
      popover.locator('button[data-testid="sign-in-button"], button[data-testid="sign-out-button"]')
    ).toBeVisible();
  });

  test('consolidates export actions into Share / Export dropdown', async ({ page }) => {
    const shareBtn = page.locator('button[data-testid="share-export-button"]');
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();

    // Dropdown contains both WhatsApp and Print options
    const whatsappItem = page.locator('button[data-testid="whatsapp-export-item"]');
    const printItem = page.locator('button[data-testid="print-export-item"]');

    await expect(whatsappItem).toBeVisible();
    await expect(printItem).toBeVisible();
    await expect(whatsappItem).toContainText('WhatsApp Squad Card');
    await expect(printItem).toContainText('Print Team Sheet');
  });

  test('navigation tabs satisfy minimum 44px touch targets', async ({ page }) => {
    const lineupTab = page.getByRole('button', { name: /Lineup/i }).first();
    await expect(lineupTab).toBeVisible();
    const box = await lineupTab.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
});
