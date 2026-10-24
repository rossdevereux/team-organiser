import { Page, expect } from '@playwright/test';
import { Selectors } from './selectors';

export interface SquadSetupOptions {
  teamName?: string;
  matchdaySquadCap?: number;
  pitchPlayerCount?: number;
  matchPeriodCount?: number;
  periodDurationMinutes?: number;
  targetGameTimePercent?: number;
}

/**
 * Ensures a clean test team with 13 players (including Oliver GK, Harry DEF with holiday, and Jack ATT)
 * exists and is currently selected.
 */
export async function setupTestTeamAndSquad(
  page: Page,
  options: SquadSetupOptions = {}
): Promise<string> {
  const teamName = options.teamName || 'Cold Ash Hawks U10';

  // 1. Enter app via demo sandbox
  await page.goto('/');
  const demoBtn = page.getByRole('button', { name: /Try Live Demo/i }).first();
  if (await demoBtn.isVisible()) {
    await demoBtn.click();
    await expect(page).toHaveURL(/(\/lineup|\?tab=lineup)/);
  }


  // 3. Create fresh team
  await page.getByRole('button', { name: /Teams/i }).first().click();
  await expect(page).toHaveURL(/(\/teams|\?tab=teams)/);

  await page.getByRole('button', { name: 'Create New Team' }).click();
  await expect(page.getByText('Create New Squad / Team')).toBeVisible();

  await page.fill('input[placeholder="e.g. The Rovers FC U12s"]', teamName);
  await page.locator('select').nth(0).selectOption('U10');
  await page.locator('select').nth(1).selectOption('7');
  await page.getByRole('button', { name: 'Create Team' }).click();

  // Select new team
  await page.getByRole('heading', { name: teamName, exact: true }).last().click();
  const teamSwitcherBtn = page.locator(Selectors.navbar.teamSwitcherBtn);
  await expect(teamSwitcherBtn).toContainText(teamName);

  // 4. Configure format settings (FA Under-10 7v7 format: 4 quarters of 12.5m, 50% target)
  await page.locator(Selectors.navbar.userMenuBtn).click();
  await page.locator(Selectors.navbar.settingsMenuItem).click();

  const settingsDialog = page.locator('div.fixed.inset-0:has-text("Team & League Settings")');
  await expect(settingsDialog).toBeVisible();

  const pitchSelect = settingsDialog.locator('select').first();
  await pitchSelect.selectOption('7');

  const squadCapInput = settingsDialog.locator('input[type="number"]').first();
  await squadCapInput.fill(String(options.matchdaySquadCap || 10));

  const periodsSelect = settingsDialog.locator('select').nth(1);
  await periodsSelect.selectOption(String(options.matchPeriodCount || 4));

  const periodDurationInput = settingsDialog.locator('input[type="number"][step="0.5"]');
  await periodDurationInput.fill(String(options.periodDurationMinutes || 12.5));

  const targetGameTimeInput = settingsDialog.locator('input[type="number"][min="40"]');
  await targetGameTimeInput.fill(String(options.targetGameTimePercent || 50));

  await settingsDialog.locator('button[type="submit"]').click();
  await expect(settingsDialog).not.toBeVisible();

  // 5. Add players
  await page.getByRole('button', { name: /Squad/i }).first().click();
  await expect(page).toHaveURL(/(\/squad|\?tab=squad)/);

  // Add Oliver (GK #1, Fixed GK)
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

  // Add Harry (DEF #4)
  await page.locator(Selectors.squad.addPlayerBtn).first().click();
  await expect(page.getByText('Add Player to Squad')).toBeVisible();
  await page.fill('input[placeholder="e.g. Leo Davies"]', 'Harry');
  await page.fill('input[placeholder="e.g. 7"]', '4');
  await page.getByRole('button', { name: 'Defence', exact: true }).click();
  await page.locator('form button:has-text("Save Player")').click();
  await expect(page.getByRole('heading', { name: 'Harry', exact: true })).toBeVisible();

  // Add Jack (ATT #9)
  await page.locator(Selectors.squad.addPlayerBtn).first().click();
  await expect(page.getByText('Add Player to Squad')).toBeVisible();
  await page.fill('input[placeholder="e.g. Leo Davies"]', 'Jack');
  await page.fill('input[placeholder="e.g. 7"]', '9');
  await page.getByRole('button', { name: 'Attack', exact: true }).click();
  await page.locator('form button:has-text("Save Player")').click();
  await expect(page.getByRole('heading', { name: 'Jack', exact: true })).toBeVisible();

  // Set holiday for Harry on upcoming Saturday (2026-10-31)
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

  // Bulk-import remaining 10 squad members via sample CSV
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
  await csvModal.getByRole('button', { name: /Import 10 Players/i }).click();
  await expect(csvModal).not.toBeVisible();

  // Verify squad size is 13
  await expect(page.getByRole('heading', { name: /Squad & Player Roster \(13\)/i })).toBeVisible();

  // Navigate back to Lineup
  await page.getByRole('button', { name: /Lineup/i }).first().click();
  return teamName;
}
