import { test, expect } from '@playwright/test';

test.describe('Application Smoke Test', () => {
  test('loads home page and displays SubShuffle header', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.getByAltText('SubShuffle Logo').first()).toBeVisible();
  });
});
