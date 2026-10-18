import { test, expect } from '@playwright/test';

test.describe('Team Data Isolation & Switching Suite (Issue #13)', () => {
  test('switching to a newly created team clears primary team data and displays empty states', async ({ page }) => {
    // 1. Start on default primary team
    await page.goto('/?tab=squad');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Squad & Player Roster/i })).toBeVisible();

    // Verify primary team players are loaded (e.g. Leo Davies)
    await expect(page.getByText('Leo Davies')).toBeVisible();

    // Verify primary team fixtures are loaded
    await page.getByRole('button', { name: /Fixtures/i }).first().click();
    await expect(page).toHaveURL(/(tab=fixtures|\/fixtures)/);
    // Primary team should have fixture cards
    const fixtureCards = page.locator('div:has-text("vs")').first();
    await expect(fixtureCards).toBeVisible();

    // 2. Navigate to Teams tab to create a new secondary team
    await page.getByRole('button', { name: /Teams/i }).first().click();
    await expect(page).toHaveURL(/(tab=teams|\/teams)/);
    await expect(page.getByRole('heading', { name: /Team Management/i })).toBeVisible();

    // Click "Create New Team"
    await page.getByRole('button', { name: 'Create New Team' }).click();
    await expect(page.getByText('Create New Squad / Team')).toBeVisible();

    const timestamp = Date.now().toString().slice(-4);
    const secondaryTeamName = `Hawks Isolation U9-${timestamp}`;

    // Fill form
    await page.fill('input[placeholder="e.g. The Rovers FC U12s"]', secondaryTeamName);
    await page.locator('select').nth(0).selectOption('U9');
    await page.locator('select').nth(1).selectOption('7');
    await page.getByRole('button', { name: 'Create Team' }).click();

    // Verify team is created
    await expect(page.getByRole('heading', { name: secondaryTeamName, exact: true })).toBeVisible();

    // 3. Switch to the newly created secondary team
    const teamCardHeading = page.getByRole('heading', { name: secondaryTeamName, exact: true });
    await teamCardHeading.click();

    // Verify navbar shows secondary team active
    const teamSwitcherBtn = page.locator('button[data-testid="team-switcher-button"]');
    await expect(teamSwitcherBtn).toContainText(secondaryTeamName);

    // 4. Verify Squad Roster tab: Primary team players MUST NOT leak across
    await page.getByRole('button', { name: /Squad/i }).first().click();
    await expect(page).toHaveURL(/(tab=squad|\/squad)/);

    // Check that primary team player Leo Davies is NOT visible
    await expect(page.getByText('Leo Davies')).not.toBeVisible();
    // Check that the empty state is displayed
    await expect(page.getByText(/No players added to this squad yet/i)).toBeVisible();

    // 5. Verify Fixtures tab: Primary team fixtures MUST NOT leak across
    await page.getByRole('button', { name: /Fixtures/i }).first().click();
    await expect(page).toHaveURL(/(tab=fixtures|\/fixtures)/);

    // Check that empty state for fixtures is displayed
    await expect(page.getByRole('heading', { name: 'No fixtures scheduled.', exact: true })).toBeVisible();

    // 6. Verify Pitch Lineup tab: Primary team match squad MUST NOT leak across
    await page.getByRole('button', { name: /Lineup/i }).first().click();
    await expect(page).toHaveURL(/(tab=lineup|\/lineup)/);

    // Empty lineup state should be displayed
    await expect(page.getByText(/No Matchday Lineup Active/i)).toBeVisible();

    // 7. Add a player to the secondary team
    await page.getByRole('button', { name: /Squad/i }).first().click();
    const addBtn = page.getByRole('button', { name: /Add Player/i }).first();
    await addBtn.click();
    await expect(page.getByText('Add Player to Squad')).toBeVisible();

    const uniquePlayerName = `Hawk Scout ${timestamp}`;
    await page.getByPlaceholder(/Leo Davies/i).fill(uniquePlayerName);
    await page.locator('form').getByRole('button', { name: 'Save Player' }).click();

    // Verify newly added player is in the secondary team's roster
    await expect(page.getByText(uniquePlayerName)).toBeVisible();

    // 8. Switch back to primary team via navbar dropdown
    await teamSwitcherBtn.click();
    await expect(page.locator('header').getByText('Switch Team')).toBeVisible();

    // Click primary team in dropdown (e.g. The Rovers FC)
    const primaryTeamOption = page.locator('header button:has-text("The Rovers FC")').first();
    await primaryTeamOption.click();

    // Verify primary team players are restored
    await page.getByRole('button', { name: /Squad/i }).first().click();
    await expect(page.getByText('Leo Davies')).toBeVisible();

    // Secondary team player Hawk Scout must NOT be in primary team
    await expect(page.getByText(uniquePlayerName)).not.toBeVisible();

    // 9. Switch back to secondary team via dropdown: secondary player is preserved without primary players
    await teamSwitcherBtn.click();
    const secondaryTeamOption = page.locator(`header button:has-text("${secondaryTeamName}")`).first();
    await secondaryTeamOption.click();

    await page.getByRole('button', { name: /Squad/i }).first().click();
    await expect(page.getByText(uniquePlayerName)).toBeVisible();
    await expect(page.getByText('Leo Davies')).not.toBeVisible();
  });

  test('switching between existing teams updates match settings and clears foreign team states', async ({ page }) => {
    // 1. Start on Team 1 (The Rovers FC U10s - 7-a-side)
    await page.goto('/?tab=lineup');
    await expect(page.locator('header')).toBeVisible();

    const teamSwitcherBtn = page.locator('button[data-testid="team-switcher-button"]');
    await expect(teamSwitcherBtn).toBeVisible();

    // 2. Open dropdown and switch to Team 2 (The Rovers FC U12s - 9-a-side)
    await teamSwitcherBtn.click();
    await expect(page.locator('header').getByText('Switch Team')).toBeVisible();

    const team2Option = page.locator('header button:has-text("The Rovers FC (U12s)")');
    await team2Option.click();

    // Verify team switcher shows U12s
    await expect(teamSwitcherBtn).toContainText('The Rovers FC (U12s)');

    // Verify footer reflects 9-a-side format
    await expect(page.locator('footer')).toContainText('9-a-side');

    // 3. Switch back to Team 1 (U10s)
    await teamSwitcherBtn.click();
    const team1Option = page.locator('header button:has-text("The Rovers FC (U10s)")');
    await team1Option.click();

    await expect(teamSwitcherBtn).toContainText('The Rovers FC (U10s)');
    await expect(page.locator('footer')).toContainText('7-a-side');
  });
});

