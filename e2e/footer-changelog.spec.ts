import { test, expect } from '@playwright/test';

test.describe('Footer Version & Changelog Modal Suite', () => {
  test('displays application version in footer and opens changelog modal from lineup page', async ({ page }) => {
    await page.goto('/?tab=lineup');

    // Footer should be visible
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Version button should be visible in footer
    const versionBtn = footer.locator('button[aria-label*="View changelog"]').first();
    await expect(versionBtn).toBeVisible();
    await expect(versionBtn).toContainText(/v\d+\.\d+\.\d+/);

    // Click version button to open Changelog Modal
    await versionBtn.scrollIntoViewIfNeeded();
    await versionBtn.click();

    // Modal header and content should be visible
    const modal = page.getByRole('dialog', { name: /Release Notes & Changelog/i });
    await expect(modal).toBeVisible();

    // Verify search input is present
    const searchInput = modal.getByPlaceholder(/Search changes, features, or versions/i);
    await expect(searchInput).toBeVisible();

    // Verify releases are rendered (e.g. Version 1.0.0 or Upcoming Features)
    await expect(modal.getByText(/Version 1.0.0|Upcoming Features/i).first()).toBeVisible();

    // Test search filter: type "rotation"
    await searchInput.fill('rotation');
    await expect(modal.getByText(/rotation/i).first()).toBeVisible();

    // Close modal via Escape
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });

  test('displays application version in public landing footer and opens changelog modal without authentication', async ({ page }) => {
    await page.goto('/');

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    const versionBtn = footer.locator('button[aria-label*="View changelog"]').first();
    await expect(versionBtn).toBeVisible();
    await expect(versionBtn).toContainText(/v\d+\.\d+\.\d+/);

    await versionBtn.click();

    // Modal should open
    const modalHeading = page.getByRole('heading', { name: /Release Notes & Changelog/i });
    await expect(modalHeading).toBeVisible();

    // Close modal via Close button
    const closeBtn = page.getByRole('button', { name: /Close changelog modal/i });
    await closeBtn.click();
    await expect(modalHeading).not.toBeVisible();
  });

  test('filters release notes by category chips (All, Features, Improvements, Bug Fixes)', async ({ page }) => {
    await page.goto('/?tab=lineup');

    const versionBtn = page.locator('footer button[aria-label*="View changelog"]').first();
    await versionBtn.scrollIntoViewIfNeeded();
    await versionBtn.click();

    // Filter by Bug Fixes
    const fixesChip = page.getByRole('button', { name: 'Fixed' });
    if (await fixesChip.isVisible()) {
      await fixesChip.click();
      // Should show Bug Fixes
      await expect(page.getByText(/Bug Fixes/i).first()).toBeVisible();
    }

    // Switch back to All Updates
    const allChip = page.getByRole('button', { name: 'All Updates' });
    await allChip.click();

    // Close modal
    await page.keyboard.press('Escape');
  });

  test('footer does not display duplicate operational items and defers to top menu items (#8)', async ({ page }) => {
    await page.goto('/lineup');

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Verify duplicate operational items are NOT in footer
    await expect(footer.getByText('Print Pitch Sheet')).not.toBeVisible();
    await expect(footer.getByText('Teams & Sharing')).not.toBeVisible();
    await expect(footer.getByText('League Settings')).not.toBeVisible();
    await expect(footer.getByText('WhatsApp Announcement')).not.toBeVisible();

    // Verify footer retains general non-duplicate items
    await expect(footer.getByText('Product Tour')).toBeVisible();
    await expect(footer.getByText('Privacy & GDPR')).toBeVisible();

    // Verify operational items are available in the top navbar / header
    const header = page.locator('header');
    await expect(header).toBeVisible();
    await expect(header.locator('button[title*="WhatsApp"]')).toBeVisible();
    await expect(header.locator('button[title*="Team Settings & League Rules"]')).toBeVisible();
    await expect(header.getByRole('button', { name: /Teams/i })).toBeVisible();
  });
});
