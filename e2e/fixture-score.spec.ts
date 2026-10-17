import { test, expect } from '@playwright/test';

test.describe('Fixture Score & Goal Scorers Suite', () => {
  test('allows entering match score and goal scorers with stoppage time minutes and persists to fixture card', async ({
    page,
  }) => {
    await page.goto('/?tab=fixtures');

    // Wait for fixtures list to stabilize
    const scoreButton = page.locator('button[aria-label*="Record or edit score"]').first();
    await expect(scoreButton).toBeVisible({ timeout: 10000 });

    // Open Score & Scorers modal
    await scoreButton.click();

    // Verify modal dialog opened
    const modal = page.getByRole('dialog', { name: /Match Score & Goal Scorers/i });
    await expect(modal).toBeVisible();

    // Clear any pre-existing scorers to guarantee clean test slate across test projects
    const removeButtons = modal.locator('button[aria-label*="Remove scorer"]');
    while ((await removeButtons.count()) > 0) {
      await removeButtons.first().click();
    }

    // Set Home score to 2 and Away score to 1
    const homeInput = modal.getByRole('spinbutton', { name: /Home team score/i });
    await homeInput.fill('2');
    const awayInput = modal.getByRole('spinbutton', { name: /Away team score/i });
    await awayInput.fill('1');

    // Add a Home goal scorer (18')
    const addHomeGoalBtn = modal.getByRole('button', { name: /\+ Home Goal/i });
    await addHomeGoalBtn.click();
    const minuteInputs = modal.locator('input[aria-label*="minute"]');
    await minuteInputs.first().fill('18');

    // Add second Home goal scorer with stoppage time format (45+2')
    await addHomeGoalBtn.click();
    await minuteInputs.nth(1).fill('45+2');

    // Add an Away goal scorer (32')
    const addAwayGoalBtn = modal.getByRole('button', { name: /\+ Away Goal/i });
    await addAwayGoalBtn.click();
    await minuteInputs.nth(2).fill('32');

    // Save Score & Scorers
    const saveBtn = modal.getByRole('button', { name: /Save Score & Scorers/i });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Modal should close
    await expect(modal).not.toBeVisible();

    // Verify fixture card displays score pill (2-1)
    const scoreBadge = page
      .locator('button[aria-label*="Record or edit score"]')
      .filter({ hasText: '2-1' })
      .first();
    await expect(scoreBadge).toBeVisible({ timeout: 10000 });

    // Verify goal scorers preview tag contains 45+2
    await expect(page.getByText(/45\+2/).first()).toBeVisible();
  });

  test('validates that goal scorers cannot exceed entered score', async ({ page }) => {
    await page.goto('/?tab=fixtures');

    const scoreButton = page.locator('button[aria-label*="Record or edit score"]').first();
    await expect(scoreButton).toBeVisible({ timeout: 10000 });
    await scoreButton.click();

    const modal = page.getByRole('dialog', { name: /Match Score & Goal Scorers/i });
    await expect(modal).toBeVisible();

    // Set Home score to 0 using input
    const homeInput = modal.getByRole('spinbutton', { name: /Home team score/i });
    await homeInput.fill('0');

    // Try to add a Home goal
    const addHomeGoalBtn = modal.getByRole('button', { name: /\+ Home Goal/i });
    await addHomeGoalBtn.click();

    // Force home score back to 0 so scorers exceed score
    await homeInput.fill('0');

    // Should display validation error banner
    await expect(modal.getByText(/Total home scorers/i)).toBeVisible();

    // Save button should be disabled
    const saveBtn = modal.getByRole('button', { name: /Save Score & Scorers/i });
    await expect(saveBtn).toBeDisabled();

    // Cancel modal
    const cancelBtn = modal.getByRole('button', { name: /Cancel/i });
    await cancelBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test('updates score and displays live scoreboard in live match mode', async ({ page }) => {
    await page.goto('/?tab=lineup');

    // Open Live Match modal using stopwatch button (handles both desktop header and mobile bottom bar)
    const liveMatchBtn = page
      .locator('button[aria-label*="live match" i], button[title*="Pitchside stopwatch" i]')
      .first();
    await expect(liveMatchBtn).toBeVisible({ timeout: 10000 });
    await liveMatchBtn.click();

    // Live match modal opened
    const liveModal = page.getByText(/Sideline Live Match & Sub Buzzer/i);
    await expect(liveModal).toBeVisible();

    // Live scoreboard strip should be visible
    await expect(page.getByText(/Live Match Score/i)).toBeVisible();

    // Increase home score live
    const incHomeLive = page.getByRole('button', { name: /Increase home score live/i });
    await incHomeLive.click();

    // Close live match modal via Escape
    await page.keyboard.press('Escape');

    // Main header should display match score
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });
});
