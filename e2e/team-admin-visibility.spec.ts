import { test, expect } from '@playwright/test';

test.describe('Team Admin Visibility & Access Suite', () => {
  test('displays only teams specifically created by or explicitly shared with the user', async ({ page }) => {
    // Mock the backend /api/teams endpoint to simulate an administrator with 1 owned and 1 shared team
    const adminUser = {
      uid: 'admin_test_101',
      email: 'admin.manager@roversclub.local',
      displayName: 'Admin Manager',
    };

    await page.addInitScript((user) => {
      localStorage.setItem('subshuffle_mock_user', JSON.stringify(user));
      localStorage.setItem('subshuffle_role_override', 'owner');
    }, adminUser);

    const mockAdminTeams = [
      {
        id: 'team_owned_u11',
        name: 'Thunderbolts U11 (Owned)',
        ageGroup: 'U11',
        ownerId: adminUser.uid,
        ownerEmail: adminUser.email,
        sharedWith: [],
        settings: {
          pitchPlayerCount: 7,
          matchdaySquadCap: 10,
          subCount: 3,
          matchPeriodCount: 2,
          periodDurationMinutes: 25,
          targetGameTimePercent: 50,
          defaultFormation: '2-3-1',
          customFormations: [],
        },
      },
      {
        id: 'team_shared_u13',
        name: 'Hurricanes U13 (Shared)',
        ageGroup: 'U13',
        ownerId: 'other_coach_999',
        ownerEmail: 'headcoach@otherclub.org',
        sharedWith: [adminUser.email],
        settings: {
          pitchPlayerCount: 9,
          matchdaySquadCap: 12,
          subCount: 3,
          matchPeriodCount: 2,
          periodDurationMinutes: 30,
          targetGameTimePercent: 50,
          defaultFormation: '3-3-2',
          customFormations: [],
        },
      },
    ];

    await page.route('**/api/teams', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAdminTeams),
      });
    });

    await page.goto('/teams');

    // Verify user-owned team is visible with "Your Team" and "Created by you" badge
    const ownedTeamCard = page.locator('[data-testid="team-card-team_owned_u11"]');
    await expect(ownedTeamCard).toBeVisible({ timeout: 10000 });
    await expect(ownedTeamCard.getByText('Your Team')).toBeVisible();
    await expect(ownedTeamCard.getByText('Created by you')).toBeVisible();

    // Verify shared team is visible with "Shared with You" badge
    const sharedTeamCard = page.locator('[data-testid="team-card-team_shared_u13"]');
    await expect(sharedTeamCard).toBeVisible();
    await expect(sharedTeamCard.getByText('Shared with You', { exact: true })).toBeVisible();
    await expect(sharedTeamCard.getByText(/Shared with you by headcoach@otherclub\.org/i)).toBeVisible();

    // Verify unshared teams (such as seed demo teams) are NOT displayed
    await expect(page.getByText(/The Rovers FC \(U10s\)/i)).not.toBeVisible();
    await expect(page.getByText(/The Rovers FC \(U12s\)/i)).not.toBeVisible();

    // Verify team count in banner indicates (2)
    await expect(page.getByText(/Manage Teams \(2\)/i)).toBeVisible();
  });

  test('displays clean empty state and does not leak other teams when admin has no teams', async ({ page }) => {
    const newAdminUser = {
      uid: 'new_admin_empty_202',
      email: 'emptyadmin@club.org',
      displayName: 'Empty Admin',
    };

    await page.addInitScript((user) => {
      localStorage.setItem('subshuffle_mock_user', JSON.stringify(user));
      localStorage.setItem('subshuffle_role_override', 'owner');
    }, newAdminUser);

    // Mock /api/teams returning empty array
    await page.route('**/api/teams', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/teams');

    // Should display empty state
    await expect(page.getByRole('heading', { name: /No Teams Found/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Create Your First Team/i })).toBeVisible();

    // Should NOT display sample or demo teams from other users
    await expect(page.getByText(/The Rovers FC \(U10s\)/i)).not.toBeVisible();
    await expect(page.getByText(/The Rovers FC \(U12s\)/i)).not.toBeVisible();
  });

  test('allows creating a new team and displays it as user-owned team', async ({ page }) => {
    await page.goto('/teams');

    // Click Create New Team button
    const createBtn = page.getByRole('button', { name: /Create New Team/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();

    // Fill form
    const teamNameInput = page.locator('input[placeholder*="e.g. The Rovers U10s"]').or(page.locator('form input[type="text"]').first());
    await teamNameInput.fill('Dragons Academy U9');

    // Submit creation
    const submitBtn = page.getByRole('button', { name: /Create Team/i }).last();
    await submitBtn.click();

    // Verify newly created team card appears
    await expect(page.getByText(/Dragons Academy U9/i).first()).toBeVisible({ timeout: 10000 });
  });
});
