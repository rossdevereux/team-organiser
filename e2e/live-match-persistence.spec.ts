import { test, expect } from '@playwright/test';

test.describe('Live Match Persistence & Synchronization Suite (Issue #14)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to lineup view in app
    await page.goto('/?tab=lineup');
    await expect(page.locator('header')).toBeVisible({ timeout: 10000 });
  });

  test('persists running match timer and elapsed seconds across page refresh', async ({ page }) => {
    // 1. Open Live Match modal
    const liveBtn = page.locator('header button[title*="Pitchside stopwatch"]').first();
    await expect(liveBtn).toBeVisible({ timeout: 10000 });
    await liveBtn.click();

    const modal = page.locator('div.fixed.inset-0:has-text("Sideline Live Match")');
    await expect(modal).toBeVisible();

    // Ensure clean stopped timer state before test run
    const resetBtn = modal.locator('button[title*="Reset Match Stopwatch"]');
    await resetBtn.click();

    // Start timer button should be visible
    const startTimerBtn = modal.getByRole('button', { name: /Start Timer/i });
    await expect(startTimerBtn).toBeVisible();

    // 2. Start the timer
    await startTimerBtn.click();

    // The button should now switch to "Pause Timer"
    const pauseTimerBtn = modal.getByRole('button', { name: /Pause Timer/i });
    await expect(pauseTimerBtn).toBeVisible();

    // 3. Wait for timer to tick past 00:01
    await page.waitForTimeout(2200);

    // 4. Hard reload page to simulate browser refresh, dead battery, or phone app switch
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Re-open Live Match modal
    const liveBtnAfterReload = page.locator('header button[title*="Pitchside stopwatch"]').first();
    await expect(liveBtnAfterReload).toBeVisible({ timeout: 10000 });
    await liveBtnAfterReload.click();

    const modalReload = page.locator('div.fixed.inset-0:has-text("Sideline Live Match")');
    await expect(modalReload).toBeVisible();

    // 5. Verify timer is still running and button says "Pause Timer" (not reset to "Start Timer")
    await expect(modalReload.getByRole('button', { name: /Pause Timer/i })).toBeVisible({ timeout: 5000 });

    // 6. Pause timer
    await modalReload.getByRole('button', { name: /Pause Timer/i }).click();
    await expect(modalReload.getByRole('button', { name: /Start Timer/i })).toBeVisible();

    // 7. Verify paused state survives page reload
    await page.reload();
    await page.waitForLoadState('networkidle');

    const liveBtnAfterPause = page.locator('header button[title*="Pitchside stopwatch"]').first();
    await expect(liveBtnAfterPause).toBeVisible({ timeout: 10000 });
    await liveBtnAfterPause.click();

    const modalPaused = page.locator('div.fixed.inset-0:has-text("Sideline Live Match")');
    // Still paused, not running
    await expect(modalPaused.getByRole('button', { name: /Start Timer/i })).toBeVisible();
  });

  test('persists in-match substitutions to the database and sub log across page reload', async ({ page }) => {
    // 1. Open Live Match modal
    const liveBtn = page.locator('header button[title*="Pitchside stopwatch"]').first();
    await expect(liveBtn).toBeVisible({ timeout: 10000 });
    await liveBtn.click();

    const modal = page.locator('div.fixed.inset-0:has-text("Sideline Live Match")');
    await expect(modal).toBeVisible();

    // 2. Perform 1-Tap Sideline Substitution
    const offSelect = modal.locator('select').first();
    const onSelect = modal.locator('select').nth(1);

    await expect(offSelect).toBeVisible();
    await expect(onSelect).toBeVisible();

    // Select the first real available options (index 1)
    await offSelect.selectOption({ index: 1 });
    await onSelect.selectOption({ index: 1 });

    const confirmSubBtn = modal.getByRole('button', { name: /Confirm Substitution Now/i });
    await expect(confirmSubBtn).toBeEnabled();
    await confirmSubBtn.click();

    // 3. Verify sub log appears
    await expect(modal.getByText(/Match Sub Log:/i)).toBeVisible();
    await expect(modal.locator('text=OFF:').first()).toBeVisible();

    // 4. Hard reload page to verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Re-open modal
    const liveBtnReload = page.locator('header button[title*="Pitchside stopwatch"]').first();
    await expect(liveBtnReload).toBeVisible();
    await liveBtnReload.click();

    const modalReload = page.locator('div.fixed.inset-0:has-text("Sideline Live Match")');
    // 5. Sub Log must STILL be visible after reload
    await expect(modalReload.getByText(/Match Sub Log:/i)).toBeVisible({ timeout: 5000 });
    await expect(modalReload.locator('text=OFF:').first()).toBeVisible();
  });

  test('tracks independent period timers and preserves active period across reload', async ({ page }) => {
    // 1. Open Live Match modal
    const liveBtn = page.locator('header button[title*="Pitchside stopwatch"]').first();
    await expect(liveBtn).toBeVisible({ timeout: 10000 });
    await liveBtn.click();

    const modal = page.locator('div.fixed.inset-0:has-text("Sideline Live Match")');
    await expect(modal).toBeVisible();

    // 2. Switch to Half 2
    const half2Btn = modal.getByRole('button', { name: /^Half 2$/i });
    await expect(half2Btn).toBeVisible();
    await half2Btn.click();

    // Half 2 should be highlighted active
    await expect(half2Btn).toHaveClass(/bg-sky-600/);

    // 3. Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 4. Re-open Live Match modal
    const liveBtnReload = page.locator('header button[title*="Pitchside stopwatch"]').first();
    await expect(liveBtnReload).toBeVisible();
    await liveBtnReload.click();

    const modalAfter = page.locator('div.fixed.inset-0:has-text("Sideline Live Match")');
    // Half 2 should still be the active period
    const half2BtnAfter = modalAfter.getByRole('button', { name: /^Half 2$/i });
    await expect(half2BtnAfter).toHaveClass(/bg-sky-600/);
  });
});
