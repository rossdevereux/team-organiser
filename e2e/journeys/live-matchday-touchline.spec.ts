import { test, expect } from '@playwright/test';
import { Selectors } from '../helpers/selectors';
import { setupTestTeamAndSquad } from '../helpers/squad';

test.describe('Journey 3: Pitchside Live Match Tracking', () => {
  test('simulates mobile touchline stopwatch, in-game sub, injury departure rebalance, goal attribution, and match completion', async ({
    page,
  }) => {
    // 1. Ensure mobile touchline viewport (390x844)
    await page.setViewportSize({ width: 390, height: 844 });

    // 2. Set up team & squad with 4 quarters of 12.5m
    await setupTestTeamAndSquad(page, {
      teamName: 'Cold Ash Hawks U10',
      matchdaySquadCap: 10,
      pitchPlayerCount: 7,
      matchPeriodCount: 4,
      periodDurationMinutes: 12.5,
    });

    // 3. Create upcoming weekend fixture vs Tadley Gladiators
    await page.getByRole('button', { name: /Fixtures/i }).first().click();
    await expect(page).toHaveURL(/(\/fixtures|\?tab=fixtures)/);

    const newFixBtn = page.locator(Selectors.fixtures.newFixtureBtn).first();
    await expect(newFixBtn).toBeVisible();
    await newFixBtn.click();

    const opponentInput = page.getByPlaceholder(/Oakridge Youth Tigers/i);
    await opponentInput.fill('Tadley Gladiators');

    const dateInput = page.locator('form input[type="date"]').first();
    await dateInput.fill('2026-10-31');

    const periodsSelect = page.locator('#fixture-periods');
    if (await periodsSelect.isVisible()) {
      await periodsSelect.selectOption('4');
    }

    const durationInput = page.locator('#fixture-duration');
    if (await durationInput.isVisible()) {
      await durationInput.fill('12.5');
    }

    const submitBtn = page.locator('form').getByRole('button', { name: /Save|Create/i });
    await submitBtn.click();
    await expect(page.locator('main').getByText('Tadley Gladiators').first()).toBeVisible();

    // 4. Navigate to Lineup tab & auto-balance squad
    await page.getByRole('button', { name: /Lineup/i }).first().click();
    await expect(page).toHaveURL(/(\/lineup|\?tab=lineup)/);

    const autoBalanceBtn = page.locator(Selectors.lineup.reBalanceBtn).first();
    await expect(autoBalanceBtn).toBeVisible();
    await autoBalanceBtn.click();
    await expect(page.getByText(/Squad rotations re-balanced across all periods/i)).toBeVisible();

    // 5. Open Pitchside Live Match modal
    const liveMatchBtn = page.locator(Selectors.navbar.liveMatchBtn).first();
    await expect(liveMatchBtn).toBeVisible();
    await liveMatchBtn.click();

    const liveModal = page.locator(Selectors.liveMatch.modal);
    await expect(liveModal).toBeVisible();
    await expect(liveModal.getByText(/vs Tadley Gladiators/i)).toBeVisible();

    // 6. Kick off Quarter 1: Start Timer
    const startTimerBtn = liveModal.getByRole('button', { name: /Start Timer/i });
    await expect(startTimerBtn).toBeVisible();
    await startTimerBtn.click();

    // Verify timer begins running and toggle button changes to Pause Timer
    const pauseTimerBtn = liveModal.getByRole('button', { name: /Pause Timer/i });
    await expect(pauseTimerBtn).toBeVisible();

    // Wait 1.5 seconds to ensure clock increments
    await page.waitForTimeout(1600);

    // 7. Execute in-game tactical substitution via 1-Tap Sideline Substitution
    const offSelect = liveModal.locator('select').first();
    const onSelect = liveModal.locator('select').nth(1);

    await expect(offSelect).toBeVisible();
    await expect(onSelect).toBeVisible();

    // Select the first real available options (index 1)
    await offSelect.selectOption({ index: 1 });
    await onSelect.selectOption({ index: 1 });

    const confirmSubBtn = liveModal.getByRole('button', { name: /Confirm Substitution Now/i });
    await expect(confirmSubBtn).toBeEnabled();
    await confirmSubBtn.click();

    // Verify substitution appears in the live sub event log
    await expect(liveModal.getByText(/Match Sub Log:/i)).toBeVisible();
    await expect(liveModal.locator('text=OFF:').first()).toBeVisible();

    // 8. Handle an unexpected touchline emergency: player injury call-off
    // Select an on-pitch player in offSelect
    await offSelect.selectOption({ index: 1 });

    const injuredBtn = liveModal.locator(Selectors.liveMatch.injuryBtn);
    await expect(injuredBtn).toBeVisible();
    await injuredBtn.click();

    // Emergency departure modal opens
    const emergencyModal = page.locator('div.fixed.inset-0:has-text("Mid-Match Injury / Early Departure")').last();
    await expect(emergencyModal).toBeVisible();

    // Confirm departure and automatic touchline rebalance
    const confirmDepartureBtn = emergencyModal.getByRole('button', {
      name: /Confirm Departure & Rebalance/i,
    });
    await expect(confirmDepartureBtn).toBeVisible();
    await confirmDepartureBtn.click();

    // Verify emergency modal closes and toast notifies rebalance
    await expect(emergencyModal).not.toBeVisible();
    await expect(page.getByText(/rebalanced/i).first()).toBeVisible();

    // 9. Score tracking: Home team goal attributed to Jack (#9)
    const homePlusBtn = liveModal.locator(Selectors.liveMatch.homeScorePlusBtn);
    await homePlusBtn.click();
    await expect(liveModal.locator('text=1 - 0').first()).toBeVisible();

    // Open Scorers modal to attribute goal to Jack
    const scorersBtn = liveModal.locator(Selectors.liveMatch.scorersModalBtn);
    await scorersBtn.click();

    const scoreModal = page.locator('div[role="dialog"]:has-text("Goal Scorers")');
    await expect(scoreModal).toBeVisible();

    // Add Home Goal scorer
    const addHomeGoalBtn = scoreModal.getByRole('button', { name: /\+ Home Goal/i });
    await addHomeGoalBtn.click();

    // Select "Jack" as scorer
    const scorerSelect = scoreModal.locator('select[aria-label*="Goal scorer"]').first();
    await expect(scorerSelect).toBeVisible();

    const jackOptionValue = await scorerSelect
      .locator('option:has-text("Jack")')
      .getAttribute('value');
    if (jackOptionValue) {
      await scorerSelect.selectOption(jackOptionValue);
    }

    // 10. Advance through quarters and finalize match
    // Switch to Final Match Result
    const setFinalBtn = scoreModal.getByRole('button', { name: /🔴 Set Final/i });
    await expect(setFinalBtn).toBeVisible();
    await setFinalBtn.click();

    // Save final match score & scorers
    const saveScoreBtn = scoreModal.getByRole('button', { name: /Save/i });
    await saveScoreBtn.click();
    await expect(scoreModal).not.toBeVisible();

    // Close Live Match modal
    const closeLiveBtn = liveModal.locator(Selectors.liveMatch.closeBtn);
    await closeLiveBtn.click();
    await expect(liveModal).not.toBeVisible();

    // 11. Assertions on Fixtures tab:
    await page.getByRole('button', { name: /Fixtures/i }).first().click();
    await expect(page).toHaveURL(/(\/fixtures|\?tab=fixtures)/);

    // Verify fixture card displays Completed status, 1 - 0 score, and Jack's goal
    const fixtureCard = page.locator('div').filter({ has: page.getByRole('heading', { name: /vs Tadley Gladiators/i }) }).first();
    await expect(fixtureCard).toBeVisible();
    await expect(fixtureCard.getByText(/Completed/i)).toBeVisible();
    await expect(fixtureCard.getByText('Goals:')).toBeVisible();
    await expect(fixtureCard.getByText('Jack').first()).toBeVisible();
  });
});
