import { test, expect } from '@playwright/test';
import { Selectors } from '../helpers/selectors';
import { setupTestTeamAndSquad } from '../helpers/squad';

test.describe('Journey 2: Match Preparation & Rotation Balancer', () => {
  test('schedules weekend game, auto-balances 4 quarters, verifies exclusion of holiday player, tweaks lineup and exports WhatsApp announcement', async ({
    page,
    context,
  }) => {
    // Grant clipboard permissions for WhatsApp copy assertion
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // 1. Ensure team with 13-player squad (Oliver GK, Harry DEF on holiday, Jack ATT) is active
    await setupTestTeamAndSquad(page, {
      teamName: 'Cold Ash Hawks U10',
      matchdaySquadCap: 10,
      pitchPlayerCount: 7,
      matchPeriodCount: 4,
      periodDurationMinutes: 12.5,
    });

    // 2. Navigate to Fixtures tab to create upcoming weekend fixture
    await page.getByRole('button', { name: /Fixtures/i }).first().click();
    await expect(page).toHaveURL(/(\/fixtures|\?tab=fixtures)/);

    // Click "Add Fixture"
    const newFixBtn = page.locator(Selectors.fixtures.newFixtureBtn).first();
    await expect(newFixBtn).toBeVisible();
    await newFixBtn.click();

    // Schedule: "vs Tadley Gladiators" (Home, Saturday 2026-10-31)
    const opponentInput = page.getByPlaceholder(/Oakridge Youth Tigers/i);
    await expect(opponentInput).toBeVisible();
    await opponentInput.fill('Tadley Gladiators');

    const dateInput = page.locator('form input[type="date"]').first();
    await dateInput.fill('2026-10-31');

    // Override periods if needed
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

    // Verify fixture card was created
    await expect(page.locator('main').getByText('Tadley Gladiators').first()).toBeVisible();

    // 3. Open the fixture's Pitch Lineup / Matchday Planner
    await page.getByRole('button', { name: /Lineup/i }).first().click();
    await expect(page).toHaveURL(/(\/lineup|\?tab=lineup)/);

    // Verify Harry is marked as Unavailable / Holiday and excluded from active match squad
    const squadSheetBtn = page.locator(Selectors.lineup.squadButton).first();
    if (await squadSheetBtn.isVisible()) {
      await squadSheetBtn.click();
      const squadModal = page.locator('div.fixed.inset-0:has-text("Select Matchday Squad")');
      await expect(squadModal).toBeVisible();

      // Harry should be in the list marked as Away Next Match
      const harrySection = squadModal.locator('div:has-text("Harry")').first();
      await expect(harrySection).toBeVisible();
      await expect(harrySection.getByText(/Away Next Match/i)).toBeVisible();

      // Trigger Smart Auto-Select (10) to exclude unavailable Harry
      const smartSelectBtn = squadModal.getByRole('button', { name: /Smart Auto-Select/i });
      if (await smartSelectBtn.isVisible()) {
        await smartSelectBtn.click();
      }

      // Apply selection
      const applyBtn = squadModal.getByRole('button', { name: /Apply Matchday Squad|Apply/i });
      if (await applyBtn.isVisible()) {
        await applyBtn.click();
      } else {
        await squadModal.locator('button:has(.lucide-x)').first().click();
      }
      await expect(squadModal).not.toBeVisible();
    }

    // 4. Trigger Auto-Balance / Rotate Lineup engine
    const autoBalanceBtn = page.locator(Selectors.lineup.reBalanceBtn).first();
    await expect(autoBalanceBtn).toBeVisible();
    await autoBalanceBtn.click();

    // Verify re-balance notification toast
    await expect(page.getByText(/Squad rotations re-balanced across all periods/i)).toBeVisible();

    // 5. Inspect generated quarters:
    // Period 1
    const p1Btn = page.getByRole('button', { name: /Quarter 1|Period 1|1st Half/i }).first();
    await p1Btn.click();

    // Verify Oliver is assigned to Goalkeeper
    const oliverNode = page.locator('span', { hasText: 'Oliver' }).first();
    await oliverNode.scrollIntoViewIfNeeded();
    await expect(oliverNode).toBeVisible();

    // Check bench players container exists
    const benchContainer = page.getByText(/Substitutes/i).first();
    await expect(benchContainer).toBeVisible();

    // Switch to Quarter 2
    const p2Btn = page.getByRole('button', { name: /Quarter 2|Period 2|2nd Half/i }).first();
    await p2Btn.click();

    // 6. Perform a manual touchline tweak: swap a player on bench into pitch for Quarter 2
    const swapBtn = page.locator('button[title*="Swap"], button:has-text("Swap")').first();
    if (await swapBtn.isVisible()) {
      await swapBtn.click();

      // Prompt banner appears
      await expect(page.getByText(/Selected for swap/i).first()).toBeVisible();

      // Click on-pitch player token to complete swap
      const pitchArea = page.locator('.relative.w-full.aspect-\\[4\\/5\\], .relative.w-full.aspect-\\[4\\/3\\], div:has(canvas), [class*="aspect-"]').first();
      const pitchPlayerToSwap = pitchArea.locator('div[draggable="true"]').first();
      await pitchPlayerToSwap.click();
    }

    // 7. Click Share / Export -> WhatsApp Squad Announcement
    await page.locator(Selectors.navbar.shareExportBtn).click();
    await page.locator(Selectors.navbar.whatsappExportItem).click();

    const whatsAppModal = page.locator(Selectors.whatsappModal.modal);
    await expect(whatsAppModal).toBeVisible();

    // Verify announcement text contains venue, format, squad & rested roster
    const announcementPre = whatsAppModal.locator('pre');
    await expect(announcementPre).toBeVisible();
    const textContent = await announcementPre.innerText();

    expect(textContent).toContain('Tadley Gladiators');
    expect(textContent).toContain('*Venue:* Home');
    expect(textContent).toContain('*Meet Time:* 09:30');
    expect(textContent).toContain('*MATCHDAY SQUAD (10)*');
    expect(textContent).toContain('Oliver (Goalkeeper)');
    expect(textContent).toContain('*RESTED / ROTATION ROSTER');
    expect(textContent).not.toContain('Harry');

    // Trigger copy
    const copyBtn = whatsAppModal.getByRole('button', { name: /Copy Team Sheet Announcement|Copy/i });
    await copyBtn.click();
    await expect(page.getByText(/Copied to clipboard!|Copied/i).first()).toBeVisible();

    // Close modal
    await whatsAppModal.locator('button:has(.lucide-x), button:has-text("Close")').first().click();
    await expect(whatsAppModal).not.toBeVisible();
  });
});
