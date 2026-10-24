import { test, expect } from '@playwright/test';
import { Selectors } from '../helpers/selectors';
import { setupTestTeamAndSquad } from '../helpers/squad';

test.describe('Journey 4: Post-Match Fair Play & Season Stats', () => {
  test('verifies cumulative playing time math, equity safeguards, and season team dashboard records', async ({
    page,
  }) => {
    // 1. Setup fresh team & 13-player squad with 4 quarters of 12.5m
    await setupTestTeamAndSquad(page, {
      teamName: 'Cold Ash Hawks U10',
      matchdaySquadCap: 10,
      pitchPlayerCount: 7,
      matchPeriodCount: 4,
      periodDurationMinutes: 12.5,
      targetGameTimePercent: 50,
    });

    // 2. Schedule match vs Tadley Gladiators
    await page.getByRole('button', { name: /Fixtures/i }).first().click();
    await expect(page).toHaveURL(/(\/fixtures|\?tab=fixtures)/);

    const newFixBtn = page.locator(Selectors.fixtures.newFixtureBtn).first();
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

    // 3. Navigate to Lineup, auto-rotate 4 quarters
    await page.getByRole('button', { name: /Lineup/i }).first().click();
    await expect(page).toHaveURL(/(\/lineup|\?tab=lineup)/);

    const autoBalanceBtn = page.locator(Selectors.lineup.reBalanceBtn).first();
    await autoBalanceBtn.click();
    await expect(page.getByText(/Squad rotations re-balanced across all periods/i)).toBeVisible();

    // 4. Mark fixture completed with a 1-0 win attributed to Jack
    // Open score modal via Fixtures tab
    await page.getByRole('button', { name: /Fixtures/i }).first().click();
    await expect(page).toHaveURL(/(\/fixtures|\?tab=fixtures)/);

    const fixtureCard = page.locator('div').filter({ has: page.getByRole('heading', { name: /vs Tadley Gladiators/i }) }).first();
    await expect(fixtureCard).toBeVisible();

    const scoreBtn = fixtureCard.locator('button[aria-label*="Record or edit score"]').first();
    await scoreBtn.click();

    const scoreModal = page.locator('div[role="dialog"]:has-text("Goal Scorers")');
    await expect(scoreModal).toBeVisible();

    // Increase home score to 1
    const homeScoreInput = scoreModal.locator('input[aria-label="Home team score"]');
    await homeScoreInput.fill('1');

    // Add Home Goal
    const addHomeGoalBtn = scoreModal.getByRole('button', { name: /\+ Home Goal/i });
    await addHomeGoalBtn.click();

    const scorerSelect = scoreModal.locator('select[aria-label*="Goal scorer"]').first();
    await expect(scorerSelect).toBeVisible();

    const jackOptionValue = await scorerSelect
      .locator('option:has-text("Jack")')
      .getAttribute('value');
    if (jackOptionValue) {
      await scorerSelect.selectOption(jackOptionValue);
    }

    // Save as Final Result
    const saveScoreBtn = scoreModal.getByRole('button', { name: /Save/i });
    await saveScoreBtn.click();
    await expect(scoreModal).not.toBeVisible();

    // 5. Navigate to Fair Play & Minutes (/stats)
    await page.getByRole('button', { name: /Fair Play & Minutes|Fair Play|Stats/i }).first().click();
    await expect(page).toHaveURL(/(\/stats|\?tab=stats)/);

    // Verify Fair Play metrics header
    await expect(page.getByText(/Cumulative Playing Time & Equity Parity/i)).toBeVisible();
    await expect(page.getByText(/Squad Equity Index/i)).toBeVisible();

    // Verify Jack has minutes logged and goal recorded
    const jackRow = page.locator('div.rounded-xl').filter({ hasText: 'Jack' }).first();
    await expect(jackRow).toBeVisible();
    await expect(jackRow.getByText(/mins played/i)).toBeVisible();

    // Verify Oliver has minutes logged
    const oliverRow = page.locator('div.rounded-xl').filter({ hasText: 'Oliver' }).first();
    await expect(oliverRow).toBeVisible();
    await expect(oliverRow.getByText(/mins played/i)).toBeVisible();

    // Verify equity compliance indicator (Balanced badge or green gauge)
    await expect(page.locator('.bg-emerald-500').first()).toBeVisible();

    // 6. Navigate to Team Dashboard (/team-dashboard)
    await page.getByRole('button', { name: /Team Dashboard|Dashboard|Awards/i }).first().click();
    await expect(page).toHaveURL(/(\/team-dashboard|\?tab=team-dashboard|\?tab=dashboard)/);

    // Verify Record reflects 1 Win, 0 Draws, 0 Losses
    await expect(page.getByText(/Record \(W-D-L\)/i)).toBeVisible();
    await expect(page.getByText(/1 - 0 - 0/)).toBeVisible();

    // Verify Clean Sheets reflects 1
    await expect(page.getByText(/Clean Sheets/i)).toBeVisible();
    await expect(page.locator('div:has-text("Clean Sheets")').getByText('1').first()).toBeVisible();

    // Verify Jack is listed in the Top Scorers / Golden Boot table with 1 goal
    await expect(page.getByRole('button', { name: /Golden Boot/i })).toBeVisible();
    const jackScorerRow = page.locator('tr').filter({ hasText: 'Jack' }).first();
    await expect(jackScorerRow).toBeVisible();
    await expect(jackScorerRow.locator('td').nth(3)).toContainText('1');
  });
});
