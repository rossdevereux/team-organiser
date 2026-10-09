import { test, expect } from '@playwright/test';

test.describe('Teams Management & Multi-Squad Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to Teams tab and show team roster overview', async ({ page }) => {
    // Navigate to Teams tab using header nav button
    await page.getByRole('banner').getByRole('button', { name: /Teams/i }).click();
    await expect(page).toHaveURL(/tab=teams/);

    // Verify header and description
    await expect(page.getByRole('heading', { name: /Manage Teams/i })).toBeVisible();
    await expect(
      page.getByText('Configure independent squads, age groups, match formats, and co-coach sharing.')
    ).toBeVisible();

    // Verify active team indicator is visible on at least one team card
    await expect(page.getByText('Active Team').first()).toBeVisible();
  });

  test('should create a new youth team squad', async ({ page }) => {
    await page.goto('/?tab=teams');
    await expect(page.getByRole('heading', { name: /Manage Teams/i })).toBeVisible();

    // Click "Create New Team" button
    await page.getByRole('button', { name: 'Create New Team' }).click();

    // Verify creation form is visible
    await expect(page.getByText('Create New Squad / Team')).toBeVisible();

    const timestamp = Date.now().toString().slice(-4);
    const newTeamName = `Stingrays FC U11-${timestamp}`;

    // Fill in team fields
    await page.fill('input[placeholder="e.g. The Rovers FC U12s"]', newTeamName);
    await page.locator('select').nth(0).selectOption('U11'); // Age group
    await page.locator('select').nth(1).selectOption('7');   // Pitch format 7-a-side

    // Submit form
    await page.getByRole('button', { name: 'Create Team' }).click();

    // Verify form closes and new team card is displayed
    await expect(page.getByText('Create New Squad / Team')).not.toBeVisible();
    await expect(page.getByRole('heading', { name: newTeamName, exact: true })).toBeVisible();
  });

  test('should switch active team by selecting a team card', async ({ page }) => {
    await page.goto('/?tab=teams');
    await expect(page.getByRole('heading', { name: /Manage Teams/i })).toBeVisible();

    // Wait for at least one team card title to be visible
    const teamHeading = page.locator('div.grid h3').first();
    await expect(teamHeading).toBeVisible();

    const targetTeamName = (await teamHeading.innerText()).trim();

    // Click the card containing this team heading
    await teamHeading.click();

    // Selecting a team switches to the lineup tab
    await expect(page).toHaveURL(/tab=lineup/);

    // Navbar team dropdown or indicator should display the selected team name
    const teamSwitcherBtn = page.locator('button[title="Switch or manage teams"]');
    await expect(teamSwitcherBtn).toBeVisible();
    await expect(teamSwitcherBtn).toContainText(targetTeamName);
  });

  test('should open co-coach sharing modal and invite an assistant coach', async ({ page }) => {
    await page.goto('/?tab=teams');

    // Click the share button on the first team card
    const shareButton = page.locator('button[title="Share team with co-coach"]').first();
    await shareButton.click();

    // Assert modal opened
    await expect(page.getByRole('heading', { name: 'Share Team with Assistant Coach' })).toBeVisible();
    await expect(
      page.getByText("Invite a co-coach, assistant manager, or parent to view and edit this team's matchday lineups")
    ).toBeVisible();

    // Enter assistant email
    await page.fill('input[type="email"]', 'assistant.coach@subshuffle.com');
    await page.getByRole('button', { name: 'Send Access' }).click();

    // Verify success feedback
    await expect(page.getByText('Shared with assistant.coach@subshuffle.com')).toBeVisible();
  });
});
