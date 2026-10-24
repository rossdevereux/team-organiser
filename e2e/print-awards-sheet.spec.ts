import { test, expect } from '@playwright/test';

test.describe('Season Presentation & Awards Sheet Print / Save PDF Export (Issue #26)', () => {
  test('opens awards sheet, renders clean print layout with white background, hides action buttons, and triggers window.print()', async ({
    page,
  }) => {
    // 1. Enter app via demo sandbox
    await page.goto('/');
    const demoBtn = page.getByRole('button', { name: /Try Live Demo/i }).first();
    if (await demoBtn.isVisible()) {
      await demoBtn.click();
      await expect(page).toHaveURL(/(\/lineup|\?tab=lineup)/);
    }

    // 2. Navigate to Team Dashboard
    await page.getByRole('button', { name: /Team Dashboard|Awards/i }).first().click();
    await expect(page).toHaveURL(/(\/team-dashboard|\/dashboard|\?tab=dashboard)/);

    // 3. Wait for dashboard and Print Awards Sheet button
    const printAwardsBtn = page.getByRole('button', { name: /Print Awards Sheet/i });
    await expect(printAwardsBtn).toBeVisible({ timeout: 10000 });

    // Mock window.print to verify it triggers without runtime errors
    await page.evaluate(() => {
      (window as any).__printTriggered = false;
      window.print = () => {
        (window as any).__printTriggered = true;
      };
    });

    // 4. Click "Print Awards Sheet"
    await printAwardsBtn.click();

    // 5. Verify the modal dialog opens with id="awards-sheet-modal"
    const modal = page.locator('#awards-sheet-modal');
    await expect(modal).toBeVisible();

    // Verify modal is portalled directly under body or properly isolated
    const isDirectChildOfBody = await page.evaluate(() => {
      const el = document.getElementById('awards-sheet-modal');
      return el?.parentElement === document.body;
    });
    expect(isDirectChildOfBody).toBe(true);

    // 6. Verify core presentation content is visible on-screen
    await expect(modal.getByText(/Official Season Record & Presentation Day Summary/i)).toBeVisible();
    await expect(modal.locator('.kpi-card')).toHaveCount(4);
    await expect(modal.locator('.award-card')).toHaveCount(3);
    await expect(modal.getByText(/Head Coach: _____________________________/i)).toBeVisible();
    await expect(modal.getByText(/Date: _____________________________/i)).toBeVisible();

    // 7. Verify print button triggers window.print
    const printPdfBtn = modal.getByRole('button', { name: /Print \/ Save PDF/i });
    await expect(printPdfBtn).toBeVisible();
    await printPdfBtn.click();

    const wasPrintCalled = await page.evaluate(() => (window as any).__printTriggered);
    expect(wasPrintCalled).toBe(true);

    // 8. Emulate Print Media to verify @media print styling
    await page.emulateMedia({ media: 'print' });

    // Modal action buttons should be strictly hidden in print
    await expect(printPdfBtn).not.toBeVisible();
    const closeBtn = modal.getByTitle(/Close dialog/i);
    await expect(closeBtn).not.toBeVisible();

    // Content container should have white background and dark slate text in print
    const printContainer = modal.locator('.print-area');
    await expect(printContainer).toBeVisible();

    const computedStyles = await printContainer.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        color: style.color,
        backgroundColor: style.backgroundColor,
      };
    });

    // Verify dark high-contrast typography
    expect(computedStyles.color).toBe('rgb(15, 23, 42)'); // #0f172a
    expect(computedStyles.backgroundColor).toBe('rgb(255, 255, 255)'); // #ffffff

    // Verify cards have hairline borders
    const firstCard = modal.locator('.award-card').first();
    const cardBorder = await firstCard.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        borderTopWidth: style.borderTopWidth,
        borderTopColor: style.borderTopColor,
        breakInside: style.breakInside,
      };
    });

    expect(cardBorder.borderTopWidth).toBe('1px');
    expect(cardBorder.borderTopColor).toBe('rgb(203, 213, 225)'); // #cbd5e1
    expect(cardBorder.breakInside).toBe('avoid');

    // Verify #root is completely hidden (display: none) during print so no dark or blank page precedes the modal
    const rootDisplay = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root ? window.getComputedStyle(root).display : null;
    });
    expect(rootDisplay).toBe('none');

    // Simulate beforeprint event: ensure PrintMatchSheet does NOT accidentally open
    await page.evaluate(() => {
      window.dispatchEvent(new Event('beforeprint'));
    });
    const matchSheetCount = await page.locator('.official-print-modal:not(#awards-sheet-modal)').count();
    expect(matchSheetCount).toBe(0);

    // Signature lines should remain visible in print
    await expect(modal.getByText(/Head Coach: _____________________________/i)).toBeVisible();
    await expect(modal.getByText(/Date: _____________________________/i)).toBeVisible();

    // 9. Restore screen media and test closing dialog
    await page.emulateMedia({ media: 'screen' });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });
});
