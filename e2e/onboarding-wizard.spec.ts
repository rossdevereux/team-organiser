import { test, expect } from '@playwright/test';

test.describe('New Coach Interactive Onboarding Wizard & Spotlight Tour Suite (Issue #28)', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to simulate a brand-new first-time coach
    await page.addInitScript(() => {
      localStorage.clear();
    });
  });

  test('walks through multi-step onboarding wizard and completes setup', async ({ page }) => {
    await page.goto('/?tab=lineup');

    // 1. Wizard should auto-trigger on first landing
    const wizardTitle = page.getByRole('heading', { name: /Club & Match Format Setup/i });
    await expect(wizardTitle).toBeVisible({ timeout: 10000 });

    // Step 1: Club & Match Format
    await expect(page.getByText('FA 50%+ Equal Minutes Rule')).toBeVisible();
    await expect(page.getByText('7v7 Mini-Soccer')).toBeVisible();

    // Fill custom team name
    const teamInput = page.getByPlaceholder(/The Rovers U10s/i);
    await teamInput.fill('Lightning FC U10s');

    // Click Continue to Step 2
    await page.getByRole('button', { name: /^Continue/i }).click();

    // Step 2: Squad Roster Kick-Start
    await expect(page.getByRole('heading', { name: /Squad Roster Kick-Start/i })).toBeVisible();
    await expect(page.getByText(/Current Squad List/i)).toBeVisible();

    // Verify demo squad loaded
    await expect(page.getByText(/players/i).first()).toBeVisible();

    // Click Continue to Step 3
    await page.getByRole('button', { name: /^Continue/i }).click();

    // Step 3: First Fixture Details
    await expect(page.getByRole('heading', { name: /First Weekend Match Details/i })).toBeVisible();
    const opponentInput = page.getByPlaceholder(/Riverside Juniors/i);
    await opponentInput.fill('Oakwood Rangers');

    // Click Launch Magic Lineup
    const launchButton = page.getByRole('button', { name: /Launch Magic Lineup/i });
    await expect(launchButton).toBeVisible();
    await launchButton.click();

    // 2. Wizard closes and immediately transitions into Guided Spotlight Tour
    await expect(wizardTitle).not.toBeVisible();
    const tourStep1 = page.getByRole('heading', { name: /1\. The Substitute Bench/i });
    await expect(tourStep1).toBeVisible({ timeout: 10000 });

    // Tour Step 1 -> Step 2
    await page.getByRole('button', { name: /Next/i }).click();
    await expect(page.getByRole('heading', { name: /2\. ⚡ 1-Tap Auto-Balance/i })).toBeVisible();

    // Tour Step 2 -> Step 3
    await page.getByRole('button', { name: /Next/i }).click();
    await expect(page.getByRole('heading', { name: /3\. Interactive Pitch & Periods/i })).toBeVisible();

    // Tour Step 3 -> Step 4
    await page.getByRole('button', { name: /Next/i }).click();
    await expect(page.getByRole('heading', { name: /4\. FA 50%\+ Equal Minutes Tracker/i })).toBeVisible();

    // Tour Step 4 -> Celebration
    await page.getByRole('button', { name: /Finish Tour/i }).click();
    await expect(page.getByRole('heading', { name: /You're Ready to Coach!/i })).toBeVisible();
    await expect(page.getByText(/WhatsApp Sheet/i)).toBeVisible();
    await expect(page.getByText(/Live Match Mode/i)).toBeVisible();

    // Close celebration overlay
    await page.getByRole('button', { name: /Let's Play!/i }).click();
    await expect(page.getByRole('heading', { name: /You're Ready to Coach!/i })).not.toBeVisible();

    // Verify Lineup workspace is ready and interactive
    await expect(page.locator('[data-tour-target="pitch"]')).toBeVisible();
    await expect(page.locator('[data-tour-target="bench"]')).toBeVisible();
  });

  test('prominent Skip for now button dismisses wizard', async ({ page }) => {
    await page.goto('/?tab=lineup');

    const wizardTitle = page.getByRole('heading', { name: /Club & Match Format Setup/i });
    await expect(wizardTitle).toBeVisible({ timeout: 10000 });

    const skipButton = page.getByRole('button', { name: /Skip for now/i });
    await expect(skipButton).toBeVisible();
    await skipButton.click();

    await expect(wizardTitle).not.toBeVisible();
  });

  test('replays setup wizard from UserMenu dropdown', async ({ page }) => {
    // Start with wizard already dismissed
    await page.addInitScript(() => {
      localStorage.setItem(
        'subshuffle_onboarding_state',
        JSON.stringify({ hasCompletedWizard: true, hasSeenTour: true, completedSteps: [] })
      );
    });

    await page.goto('/?tab=lineup');

    // Open UserMenu
    const userMenuButton = page.getByTestId('user-menu-button');
    await userMenuButton.click();

    // Click Replay Setup Wizard
    const replayButton = page.getByTestId('replay-onboarding-menu-item');
    await expect(replayButton).toBeVisible();
    await replayButton.click();

    // Verify wizard opens
    await expect(page.getByRole('heading', { name: /Club & Match Format Setup/i })).toBeVisible();
  });

  test('replays setup wizard from Coach User Guide page', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'subshuffle_onboarding_state',
        JSON.stringify({ hasCompletedWizard: true, hasSeenTour: true, completedSteps: [] })
      );
    });

    await page.goto('/guide');

    const guideReplayButton = page.getByTestId('guide-replay-wizard-button');
    await expect(guideReplayButton).toBeVisible();
    await guideReplayButton.click();

    // Navigates to lineup and opens wizard
    await expect(page).toHaveURL(/(tab=lineup|\/lineup)/);
    await expect(page.getByRole('heading', { name: /Club & Match Format Setup/i })).toBeVisible();
  });

  test('renders wizard and tour adaptively on mobile viewport (390px)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?tab=lineup');

    const wizardTitle = page.getByRole('heading', { name: /Club & Match Format Setup/i });
    await expect(wizardTitle).toBeVisible({ timeout: 10000 });

    // Verify no horizontal document overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    // Skip on mobile
    await page.getByRole('button', { name: /Skip for now/i }).click();
    await expect(wizardTitle).not.toBeVisible();
  });
});
