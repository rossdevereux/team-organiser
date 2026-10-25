import { test, expect } from '@playwright/test';

test.describe('Navbar & Navigation Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'subshuffle_onboarding_state',
        JSON.stringify({ hasCompletedWizard: true, hasSeenTour: true, completedSteps: [] })
      );
    });
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
    await expect(page.getByRole('heading', { name: /Fair Play & Minutes|Fair Play Analytics/i })).toBeVisible();

    // 3. Squad Roster tab
    await page.getByRole('button', { name: /Squad/i }).first().click();
    await expect(page).toHaveURL(/(tab=squad|\/squad)/);
    await expect(page.getByRole('button', { name: /Add Player/i }).first()).toBeVisible();

    // 4. Fixtures tab
    await page.getByRole('button', { name: /Fixtures/i }).first().click();
    await expect(page).toHaveURL(/(tab=fixtures|\/fixtures)/);
    await expect(page.getByRole('button', { name: /Add Fixture|New Fixture/i }).first()).toBeVisible();

    // 5. Teams & Sharing tab
    await page.getByRole('button', { name: /Teams/i }).first().click();
    await expect(page).toHaveURL(/(tab=teams|\/teams)/);
    await expect(page.getByRole('button', { name: /Create New Team/i })).toBeVisible();

    // 6. Pitch Lineup tab
    await page.getByRole('button', { name: /Lineup/i }).first().click();
    await expect(page).toHaveURL(/(tab=lineup|\/lineup)/);
  });

  test('supports deep linking via URL query parameters', async ({ page }) => {
    await page.goto('/fixtures');
    await expect(page.getByRole('button', { name: /Add Fixture|New Fixture/i }).first()).toBeVisible();

    await page.goto('/matrix');
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

  test('mobile header collapses fixture breadcrumb and keeps avatar menu fully in viewport (Issue #30)', async ({ page }) => {
    // Test on 390px mobile viewport (iPhone 14)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/lineup');

    const header = page.locator('header');
    await expect(header).toBeVisible();

    // 1. Team switcher must be visible and have truncation constraint
    const teamBtn = page.locator('header button[data-testid="team-switcher-button"]');
    await expect(teamBtn).toBeVisible();

    // 2. Fixture switcher segment must be hidden on mobile (< md)
    const fixtureBtn = page.locator('header button[data-testid="fixture-switcher-button"]');
    await expect(fixtureBtn).not.toBeVisible();

    // 3. User Avatar / Menu button must be visible and not pushed off-screen
    const userMenuBtn = page.locator('button[data-testid="user-menu-button"]');
    await expect(userMenuBtn).toBeVisible();
    const userBox = await userMenuBtn.boundingBox();
    expect(userBox).not.toBeNull();
    if (userBox) {
      expect(userBox.x + userBox.width).toBeLessThanOrEqual(390);
    }

    // 4. Trial badge must be icon-only on mobile (text labels hidden) and fit within bounds
    const trialBadge = page.locator('[data-testid="trial-badge"]');
    if (await trialBadge.isVisible()) {
      const badgeBox = await trialBadge.boundingBox();
      expect(badgeBox).not.toBeNull();
      if (badgeBox) {
        expect(badgeBox.x + badgeBox.width).toBeLessThanOrEqual(390);
      }
    }

    // 5. Zero horizontal viewport scroll/wobble
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasOverflow).toBe(false);
  });

  test('secondary tabs support smooth horizontal scroll with no-scrollbar and overflow cue (Issue #30)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/lineup');

    // Verify sub-bar container has overflow-x-auto and no-scrollbar
    const tabsContainer = page.locator('header .overflow-x-auto');
    await expect(tabsContainer).toBeVisible();
    await expect(tabsContainer).toHaveClass(/no-scrollbar/);

    // Verify tabs have shrink-0 whitespace-nowrap
    const lineupTab = page.getByRole('button', { name: /Lineup/i }).first();
    await expect(lineupTab).toHaveClass(/shrink-0/);
    await expect(lineupTab).toHaveClass(/whitespace-nowrap/);

    // Verify visual overflow cue exists on mobile
    const cue = page.locator('header .pointer-events-none');
    await expect(cue).toBeAttached();
  });

  test('zero horizontal viewport scroll across all mobile & tablet widths (Issue #30)', async ({ page }) => {
    const viewports = [
      { width: 360, height: 740 }, // Android small (Galaxy S8/S9)
      { width: 375, height: 667 }, // iPhone SE
      { width: 390, height: 844 }, // iPhone 13/14
      { width: 412, height: 915 }, // Pixel 7
      { width: 768, height: 1024 }, // iPad Portrait
      { width: 820, height: 1180 }, // iPad Air
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await page.goto('/lineup');
      await expect(page.locator('header')).toBeVisible();

      // Verify zero horizontal wobble
      const isClean = await page.evaluate(() => {
        return (
          window.innerWidth === document.documentElement.clientWidth &&
          document.documentElement.scrollWidth <= window.innerWidth
        );
      });
      expect(isClean).toBe(true);

      // Verify User Menu is fully visible on screen
      const userBtn = page.locator('button[data-testid="user-menu-button"]');
      await expect(userBtn).toBeVisible();
      const box = await userBtn.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
      }
    }
  });
});
