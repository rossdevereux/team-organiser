import { test, expect } from '@playwright/test';
import { Selectors } from '../helpers/selectors';
import { setupTestTeamAndSquad } from '../helpers/squad';

test.describe('Journey 5: Multi-Team Isolation & RBAC Security', () => {
  test('verifies strict multi-tenant boundaries between teams, empty states on fresh team, and complete state restoration upon switching back', async ({
    page,
  }) => {
    const timestamp = Date.now().toString().slice(-4);
    const primaryTeamName = `Cold Ash Hawks U10-${timestamp}`;
    const secondaryTeamName = `Cold Ash Hawks U9-${timestamp}`;

    // 1. Setup primary team with 13-player squad (Oliver GK, Harry DEF, Jack ATT)
    await setupTestTeamAndSquad(page, {
      teamName: primaryTeamName,
      matchdaySquadCap: 10,
      pitchPlayerCount: 7,
      matchPeriodCount: 4,
      periodDurationMinutes: 12.5,
    });

    // 2. Schedule a fixture for primary team
    await page.getByRole('button', { name: /Fixtures/i }).first().click();
    await expect(page).toHaveURL(/(\/fixtures|\?tab=fixtures)/);

    const newFixBtn = page.locator(Selectors.fixtures.newFixtureBtn).first();
    await newFixBtn.click();

    const opponentInput = page.getByPlaceholder(/Oakridge Youth Tigers/i);
    await opponentInput.fill('Tadley Gladiators');

    const submitBtn = page.locator('form').getByRole('button', { name: /Save|Create/i });
    await submitBtn.click();
    await expect(page.locator('main').getByText('Tadley Gladiators').first()).toBeVisible();

    // 3. Navigate to Teams tab to create a secondary team
    await page.getByRole('button', { name: /Teams/i }).first().click();
    await expect(page).toHaveURL(/(\/teams|\?tab=teams)/);

    // 4. Create secondary team: "Cold Ash Hawks U9"
    await page.getByRole('button', { name: 'Create New Team' }).click();
    await expect(page.getByText('Create New Squad / Team')).toBeVisible();

    await page.fill('input[placeholder="e.g. The Rovers FC U12s"]', secondaryTeamName);
    await page.locator('select').nth(0).selectOption('U9');
    await page.locator('select').nth(1).selectOption('7');
    await page.getByRole('button', { name: 'Create Team' }).click();

    // Select the new secondary team card
    const secondaryHeading = page.getByRole('heading', { name: secondaryTeamName, exact: true }).last();
    await expect(secondaryHeading).toBeVisible();
    await secondaryHeading.click();

    // Verify navbar switcher displays secondary team
    const teamSwitcherBtn = page.locator(Selectors.navbar.teamSwitcherBtn);
    await expect(teamSwitcherBtn).toContainText(secondaryTeamName);

    // 5. Verify Squad tab is completely empty (0 players) and no primary players leak
    await page.getByRole('button', { name: /Squad/i }).first().click();
    await expect(page).toHaveURL(/(\/squad|\?tab=squad)/);

    // Assert empty squad state
    await expect(page.getByText(/No players added to this squad yet/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /Squad & Player Roster \(0\)/i })).toBeVisible();

    // Assert Oliver and Jack do NOT appear in U9 team
    await expect(page.getByText('Oliver')).not.toBeVisible();
    await expect(page.getByText('Jack')).not.toBeVisible();

    // 6. Verify Fixtures tab is completely empty (0 fixtures)
    await page.getByRole('button', { name: /Fixtures/i }).first().click();
    await expect(page).toHaveURL(/(\/fixtures|\?tab=fixtures)/);

    // Assert empty fixtures state
    await expect(page.getByRole('heading', { name: 'No fixtures scheduled.', exact: true })).toBeVisible();
    await expect(page.getByText('Tadley Gladiators')).not.toBeVisible();

    // 7. Switch back to primary team via Team Switcher dropdown menu
    await teamSwitcherBtn.click();
    const primaryTeamOption = page.locator('div.absolute.top-full').getByRole('button', { name: new RegExp(primaryTeamName, 'i') });
    await expect(primaryTeamOption).toBeVisible();
    await primaryTeamOption.click();

    // Verify navbar switcher displays primary team
    await expect(teamSwitcherBtn).toContainText(primaryTeamName);

    // 8. Assert all 13 players and fixtures are fully restored
    await page.getByRole('button', { name: /Squad/i }).first().click();
    await expect(page).toHaveURL(/(\/squad|\?tab=squad)/);

    // Assert squad size 13 is restored
    await expect(page.getByRole('heading', { name: /Squad & Player Roster \(13\)/i })).toBeVisible();
    await expect(page.getByText('Oliver').first()).toBeVisible();
    await expect(page.getByText('Jack').first()).toBeVisible();

    // Assert fixture is restored
    await page.getByRole('button', { name: /Fixtures/i }).first().click();
    await expect(page).toHaveURL(/(\/fixtures|\?tab=fixtures)/);
    await expect(page.getByText('Tadley Gladiators').first()).toBeVisible();
  });
});
