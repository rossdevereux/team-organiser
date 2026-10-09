import { test, expect } from '@playwright/test';

test.describe('Fair Play Stats & Compliance Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?tab=stats');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Fair Play Analytics/i })).toBeVisible();
  });

  test('renders fair play analytics dashboard and FA youth charter compliance badge', async ({ page }) => {
    await expect(page.getByText('FA Youth Charter Compliant')).toBeVisible();
    await expect(page.getByRole('button', { name: /Season-Long Fair Play/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Matchday Lineup/i })).toBeVisible();
  });

  test('toggles between Season-Long and Matchday Lineup statistics views', async ({ page }) => {
    const matchdayBtn = page.getByRole('button', { name: /Matchday Lineup/i });
    const seasonBtn = page.getByRole('button', { name: /Season-Long Fair Play/i });

    // Switch to matchday
    await matchdayBtn.click();
    await expect(matchdayBtn).toHaveClass(/bg-sky-600/);

    // Switch back to season
    await seasonBtn.click();
    await expect(seasonBtn).toHaveClass(/bg-sky-600/);
  });

  test('displays player participation bars and minutes breakdown', async ({ page }) => {
    // Should display squad members with minutes or match counts
    const statCards = page.locator('div:has-text("m played"), div:has-text("mins"), div:has-text("matches")').first();
    await expect(statCards).toBeVisible();
  });
});
