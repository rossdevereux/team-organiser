import { test, expect } from '@playwright/test';
import { Selectors } from '../helpers/selectors';

test.describe('Journey 1: New Coach Onboarding & Pre-Season Setup', () => {
  test('coach sets up brand-new youth team, configures FA U10 format, adds squad and holiday', async ({ page }) => {
    // 1. Navigate to Landing Page unauthenticated
    await page.goto('/');
    await expect(page).toHaveTitle(/SubShuffle/i);
    await expect(page.locator('h1')).toBeVisible();

    // 2. Click "Try Live Demo" to enter application as coach
    await page.getByRole('button', { name: /Try Live Demo/i }).first().click();
    await expect(page).toHaveURL(/(\/lineup|\?tab=lineup)/);
    await expect(page.locator('header')).toBeVisible();

    // 3. Create a brand-new youth team: "Cold Ash Hawks U10"
    await page.getByRole('button', { name: /Teams/i }).first().click();
    await expect(page).toHaveURL(/(\/teams|\?tab=teams)/);
    await expect(page.getByRole('heading', { name: /Team Management/i })).toBeVisible();

    await page.getByRole('button', { name: 'Create New Team' }).click();
    await expect(page.getByText('Create New Squad / Team')).toBeVisible();

    const teamName = 'Cold Ash Hawks U10';
    await page.fill('input[placeholder="e.g. The Rovers FC U12s"]', teamName);
    await page.locator('select').nth(0).selectOption('U10');
    await page.locator('select').nth(1).selectOption('7');
    await page.getByRole('button', { name: 'Create Team' }).click();

    // Select the new team
    await page.getByRole('heading', { name: teamName, exact: true }).last().click();
    const teamSwitcherBtn = page.locator(Selectors.navbar.teamSwitcherBtn);
    await expect(teamSwitcherBtn).toContainText(teamName);

    // Open Team Settings and configure FA Under-10 7v7 format (4 quarters of 12.5m, 50% target)
    await page.locator(Selectors.navbar.userMenuBtn).click();
    await page.locator(Selectors.navbar.settingsMenuItem).click();

    const settingsDialog = page.locator('div.fixed.inset-0:has-text("Team & League Settings")');
    await expect(settingsDialog).toBeVisible();

    // Pitch starters: 7
    const pitchSelect = settingsDialog.locator('select').first();
    await pitchSelect.selectOption('7');

    // Matchday squad cap: 10
    const squadCapInput = settingsDialog.locator('input[type="number"]').first();
    await squadCapInput.fill('10');

    // Match periods: 4 Periods (Quarters)
    const periodsSelect = settingsDialog.locator('select').nth(1);
    await periodsSelect.selectOption('4');

    // Period duration: 12.5 minutes
    const periodDurationInput = settingsDialog.locator('input[type="number"][step="0.5"]');
    await periodDurationInput.fill('12.5');

    // Target game time: 50%
    const targetGameTimeInput = settingsDialog.locator('input[type="number"][min="40"]');
    await targetGameTimeInput.fill('50');

    // Save rules
    await settingsDialog.locator('button[type="submit"]').click();
    await expect(settingsDialog).not.toBeVisible();

    // 4. Navigate to Squad & Player Roster tab (starts empty with 0 players)
    await page.getByRole('button', { name: /Squad/i }).first().click();
    await expect(page).toHaveURL(/(\/squad|\?tab=squad)/);

    // Add Player A: "Oliver" (Goalkeeper, #1, Fixed GK)
    await page.locator(Selectors.squad.addPlayerBtn).first().click();
    await expect(page.getByText('Add Player to Squad')).toBeVisible();
    await page.fill('input[placeholder="e.g. Leo Davies"]', 'Oliver');
    await page.fill('input[placeholder="e.g. 7"]', '1');
    await page.getByRole('button', { name: 'Goalkeeper', exact: true }).click();
    await page.getByRole('button', { name: /Midfield/i }).first().click();
    const fixedToggle = page.locator('form input[type="checkbox"]');
    await fixedToggle.check({ force: true });
    await page.locator('form button:has-text("Save Player")').click();
    await expect(page.getByRole('heading', { name: 'Oliver', exact: true })).toBeVisible();

    // Add Player B: "Harry" (Defence, #4)
    await page.locator(Selectors.squad.addPlayerBtn).first().click();
    await expect(page.getByText('Add Player to Squad')).toBeVisible();
    await page.fill('input[placeholder="e.g. Leo Davies"]', 'Harry');
    await page.fill('input[placeholder="e.g. 7"]', '4');
    await page.getByRole('button', { name: 'Defence', exact: true }).click();
    await page.locator('form button:has-text("Save Player")').click();
    await expect(page.getByRole('heading', { name: 'Harry', exact: true })).toBeVisible();

    // Add Player C: "Jack" (Midfield/Attack, #9)
    await page.locator(Selectors.squad.addPlayerBtn).first().click();
    await expect(page.getByText('Add Player to Squad')).toBeVisible();
    await page.fill('input[placeholder="e.g. Leo Davies"]', 'Jack');
    await page.fill('input[placeholder="e.g. 7"]', '9');
    await page.getByRole('button', { name: 'Attack', exact: true }).click();
    await page.locator('form button:has-text("Save Player")').click();
    await expect(page.getByRole('heading', { name: 'Jack', exact: true })).toBeVisible();

    // Set holiday / blackout date for Harry on upcoming Saturday (2026-10-31)
    const harryCard = page.locator('[data-testid="player-card-harry"]');
    const harryHolidayBtn = harryCard.getByRole('button', { name: /Holidays|Away/i }).first();
    await harryHolidayBtn.click();

    const holidayModal = page.locator('div.fixed.inset-0:has-text("Manage Holidays & Absences")');
    await expect(holidayModal).toBeVisible();
    const singleDateInput = holidayModal.locator('input[type="date"]').last();
    await singleDateInput.fill('2026-10-31');
    await holidayModal.getByRole('button', { name: 'Add Day' }).click();
    await expect(holidayModal.getByText('2026-10-31')).toBeVisible();
    await holidayModal.locator('button:has(.lucide-x)').first().click();
    await expect(holidayModal).not.toBeVisible();

    // 5. Bulk-import remaining 10 squad members via sample CSV
    await page.locator(Selectors.squad.importCsvBtn).first().click();
    const csvModal = page.locator('div.fixed.inset-0:has-text("Import Squad via CSV")');
    await expect(csvModal).toBeVisible();

    const csvData = [
      'Name, Number, Positions',
      'George, 2, Defence',
      'Arthur, 3, Defence',
      'Freddie, 5, Defence',
      'Charlie, 6, Midfield',
      'Leo, 7, Midfield',
      'Oscar, 8, Midfield',
      'Alfie, 10, Attack',
      'Theo, 11, Attack',
      'Henry, 12, Midfield',
      'Thomas, 14, Defence',
    ].join('\n');

    await csvModal.locator('textarea').fill(csvData);
    await expect(csvModal.getByText('Preview: 10 Players Detected')).toBeVisible();
    await csvModal.getByRole('button', { name: /Import 10 Players/i }).click();
    await expect(csvModal).not.toBeVisible();

    // 6. Assertions
    // Total squad size displays exactly 13
    await expect(page.getByRole('heading', { name: /Squad & Player Roster \(13\)/i })).toBeVisible();

    // Position badges & attributes
    await expect(page.getByText('Oliver')).toBeVisible();
    await expect(page.locator('div').filter({ has: page.getByRole('heading', { name: 'Oliver', exact: true }) }).getByText('Goalkeeper').first()).toBeVisible();
    await expect(page.getByText('Harry')).toBeVisible();
    await expect(page.locator('div').filter({ has: page.getByRole('heading', { name: 'Harry', exact: true }) }).getByText('Defence').first()).toBeVisible();
    await expect(page.getByText('Jack')).toBeVisible();
    await expect(page.getByText('George')).toBeVisible();
    await expect(page.getByText('Thomas')).toBeVisible();
  });
});
