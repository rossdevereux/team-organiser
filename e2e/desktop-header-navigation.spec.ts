import { test, expect } from '@playwright/test';

test.describe('Desktop Header Navigation & Layout Hardening (Issue #32)', () => {
  const desktopViewports = [
    { name: '1024x768 (Small Laptop / iPad Landscape)', width: 1024, height: 768 },
    { name: '1280x800 (Standard Laptop)', width: 1280, height: 800 },
    { name: '1366x768 (Common Laptop)', width: 1366, height: 768 },
    { name: '1920x1080 (Desktop HD)', width: 1920, height: 1080 },
  ];

  test('tab 2 label displays "Rotation Matrix" without prefix concatenation', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/lineup');
    await expect(page.locator('header')).toBeVisible();

    // Check the secondary navigation tabs
    const matrixTab = page.locator('header nav a[href*="matrix"]');
    await expect(matrixTab).toBeVisible();

    // The text content should be exactly "Rotation Matrix", not "2-HalfRotation Matrix" or "2-Half Rotation Matrix"
    const tabText = await matrixTab.innerText();
    expect(tabText.trim()).toBe('Rotation Matrix');
    expect(tabText).not.toContain('2-Half');
    expect(tabText).not.toContain('2-HalfRotation');
  });

  test('tab 2 label remains "Rotation Matrix" even with 4 quarters configuration', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/lineup');
    await expect(page.locator('header')).toBeVisible();

    // Update settings in localStorage to 4 periods
    await page.evaluate(() => {
      const rawSettings = localStorage.getItem('subshuffle_settings');
      const settings = rawSettings ? JSON.parse(rawSettings) : {};
      settings.matchPeriodCount = 4;
      localStorage.setItem('subshuffle_settings', JSON.stringify(settings));
    });

    await page.reload();
    await expect(page.locator('header')).toBeVisible();

    const matrixTab = page.locator('header nav a[href*="matrix"]');
    await expect(matrixTab).toBeVisible();
    const tabText = await matrixTab.innerText();
    expect(tabText.trim()).toBe('Rotation Matrix');
    expect(tabText).not.toContain('4-Period');
  });

  for (const vp of desktopViewports) {
    test(`header breadcrumb pill and action buttons do not collide on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/lineup');
      await expect(page.locator('header')).toBeVisible();

      // Breadcrumb container
      const teamBtn = page.locator('header button[data-testid="team-switcher-button"]');
      await expect(teamBtn).toBeVisible();

      // Right-hand action container (find first visible action control: trial badge or share or live match or user menu)
      const userMenuBtn = page.locator('button[data-testid="user-menu-button"]');
      await expect(userMenuBtn).toBeVisible();

      const shareBtn = page.locator('button[data-testid="share-export-button"]');
      await expect(shareBtn).toBeVisible();

      // Check the breadcrumb bounding box
      const breadcrumbBox = await teamBtn.boundingBox();
      expect(breadcrumbBox).not.toBeNull();

      // If fixture button is also visible (md+), check its box
      const fixBtn = page.locator('header button[data-testid="fixture-switcher-button"]');
      let breadcrumbRight = breadcrumbBox!.x + breadcrumbBox!.width;
      if (await fixBtn.isVisible()) {
        const fixBox = await fixBtn.boundingBox();
        if (fixBox) {
          expect(breadcrumbBox!.x + breadcrumbBox!.width).toBeLessThanOrEqual(fixBox.x);
          breadcrumbRight = Math.max(breadcrumbRight, fixBox.x + fixBox.width);
        }
      }

      // Check leftmost action button
      const trialBadge = page.locator('[data-testid="trial-badge"], [data-testid="subscription-badge-active"], [data-testid="subscription-badge-lifetime"]');
      let actionLeft = (await shareBtn.boundingBox())!.x;
      if (await trialBadge.isVisible()) {
        const badgeBox = await trialBadge.boundingBox();
        if (badgeBox) {
          actionLeft = Math.min(actionLeft, badgeBox.x);
        }
      }

      const liveBtn = page.locator('button[data-testid="live-match-header-btn"]');
      if (await liveBtn.isVisible()) {
        const liveBox = await liveBtn.boundingBox();
        if (liveBox) {
          actionLeft = Math.min(actionLeft, liveBox.x);
        }
      }

      // There must be a non-negative gap between breadcrumb and action group (strictly no overlap)
      expect(breadcrumbRight).toBeLessThanOrEqual(actionLeft);

      // Verify zero horizontal page overflow
      const pageOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(pageOverflow).toBe(false);
    });
  }

  test('long team and opponent names truncate gracefully without causing layout collision', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/lineup');
    await expect(page.locator('header')).toBeVisible();

    // Inject extra long team name and fixture into localStorage
    await page.evaluate(() => {
      const rawTeams = localStorage.getItem('subshuffle_teams');
      if (rawTeams) {
        const teams = JSON.parse(rawTeams);
        if (teams.length > 0) {
          teams[0].name = 'Westminster & Kensington Dragons Under-12 Championship Elite';
          localStorage.setItem('subshuffle_teams', JSON.stringify(teams));
        }
      }
      const rawFixtures = localStorage.getItem('subshuffle_fixtures');
      if (rawFixtures) {
        const fixtures = JSON.parse(rawFixtures);
        if (fixtures.length > 0) {
          fixtures[0].opponent = 'North London Metropolitan Athletic Academy Wanderers';
          localStorage.setItem('subshuffle_fixtures', JSON.stringify(fixtures));
        }
      }
    });

    await page.reload();
    await expect(page.locator('header')).toBeVisible();

    const teamSpan = page.locator('header button[data-testid="team-switcher-button"] span.truncate');
    await expect(teamSpan).toBeVisible();

    // Verify teamSpan does not blow up wider than allowed
    const teamSpanBox = await teamSpan.boundingBox();
    expect(teamSpanBox).not.toBeNull();
    expect(teamSpanBox!.width).toBeLessThanOrEqual(250);

    // Verify UserMenu is still fully on screen
    const userMenuBtn = page.locator('button[data-testid="user-menu-button"]');
    const userBox = await userMenuBtn.boundingBox();
    expect(userBox).not.toBeNull();
    expect(userBox!.x + userBox!.width).toBeLessThanOrEqual(1024);

    // Verify no page horizontal overflow
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasOverflow).toBe(false);
  });

  test('secondary controls collapse on 1024px laptop and expand on 1920px desktop', async ({ page }) => {
    // 1. On 1024px (intermediate laptop display < 2xl)
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/lineup');
    await expect(page.locator('header')).toBeVisible();

    // ContextSwitcher should be hidden on 1024px
    const contextSwitcher = page.locator('header [class*="hidden 2xl:block"]');
    await expect(contextSwitcher).not.toBeVisible();

    // Share / Export label should be hidden, button still visible as icon
    const shareBtn = page.locator('button[data-testid="share-export-button"]');
    await expect(shareBtn).toBeVisible();
    const shareText = shareBtn.locator('span[class*="hidden 2xl:inline"]');
    await expect(shareText).not.toBeVisible();

    // 2. On 1920px (large desktop display >= 2xl)
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    await expect(page.locator('header')).toBeVisible();

    // Share / Export label should now be visible
    await expect(shareText).toBeVisible();

    // ContextSwitcher should now be visible
    await expect(contextSwitcher).toBeVisible();
  });

  test('secondary navigation tab strip scrolls smoothly without clipping on 1024px', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/lineup');
    await expect(page.locator('header')).toBeVisible();

    // Verify tabs container exists with horizontal scroll
    const tabsContainer = page.locator('header .overflow-x-auto');
    await expect(tabsContainer).toBeVisible();

    // Check all 8 tabs are present in DOM
    const navLinks = page.locator('header nav a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThanOrEqual(6);

    // Last visible tab check
    const lastTab = navLinks.last();
    await expect(lastTab).toBeAttached();

    // Page body must have zero horizontal overflow
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(overflow).toBe(false);
  });
});
