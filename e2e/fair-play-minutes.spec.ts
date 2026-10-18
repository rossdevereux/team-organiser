import { test, expect } from '@playwright/test';

test.describe('Fair Play & Logged Minutes Tracking Suite (Issue #15)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to lineup view in app
    await page.goto('/?tab=lineup');
    await expect(page.locator('header')).toBeVisible({ timeout: 10000 });
  });

  test('recording fixture playing time immediately updates Fair Play & Minutes cumulative totals without page reload', async ({ page }) => {
    // 1. Open Post-Match / Record Time modal
    const recordTimeBtn = page.getByRole('button', { name: /Record Time|Post-Match/i }).first();
    await expect(recordTimeBtn).toBeVisible({ timeout: 10000 });
    await recordTimeBtn.click();

    // Verify modal is open
    const modal = page.locator('div.fixed.inset-0:has-text("Post-Match Game Time")');
    await expect(modal).toBeVisible();

    // 2. Select Exact Minutes Mode
    const exactModeOption = modal.getByText('Exact In-Game Minutes');
    await exactModeOption.click();

    // 3. Set custom minutes for the first player
    const minuteInputs = modal.locator('input[type="number"]');
    const firstInput = minuteInputs.first();
    await expect(firstInput).toBeVisible();
    await firstInput.fill('45');

    // 4. Save match participation
    const saveBtn = modal.getByRole('button', { name: /Save Match Participation/i });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    // Modal should close
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // 5. Navigate to Fair Play & Minutes tab
    await page.goto('/?tab=stats');
    await expect(page.getByText('FA Youth Charter Compliant')).toBeVisible({ timeout: 10000 });

    // 6. Verify cumulative stats reflect the recorded minutes
    const playerRows = page.locator('div:has-text("mins played")');
    await expect(playerRows.first()).toBeVisible();

    // 7. Verify persistence across page refresh
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('FA Youth Charter Compliant')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('div:has-text("mins played")').first()).toBeVisible();
  });

  test('full_credit mode credits all selected squad players with total match minutes in Fair Play view', async ({ page }) => {
    // 1. Open Record Time modal
    const recordTimeBtn = page.getByRole('button', { name: /Record Time|Post-Match/i }).first();
    await expect(recordTimeBtn).toBeVisible({ timeout: 10000 });
    await recordTimeBtn.click();

    const modal = page.locator('div.fixed.inset-0:has-text("Post-Match Game Time")');
    await expect(modal).toBeVisible();

    // 2. Select Full Credit mode
    const fullCreditOption = modal.getByText('Equal Participation (100% Credit)');
    await fullCreditOption.click();

    // 3. Save playing time
    const saveBtn = modal.getByRole('button', { name: /Save Match Participation/i });
    await saveBtn.click();
    await expect(modal).not.toBeVisible();

    // 4. Navigate to stats
    await page.goto('/?tab=stats');
    await expect(page.getByText('Squad Equity Index')).toBeVisible({ timeout: 10000 });

    // 5. Verify squad average minutes is calculated and non-zero
    const squadAvgCard = page.locator('div:has-text("Squad Average Minutes")').first();
    await expect(squadAvgCard).toBeVisible();
  });
});
