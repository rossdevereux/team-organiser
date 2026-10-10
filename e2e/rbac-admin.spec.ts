import { test, expect } from '@playwright/test';

test.describe('Role-Based Access Control (RBAC) & Admin Portal Suite', () => {
  test('navigates to Admin Portal from Navbar and renders club administration dashboard for owner', async ({ page }) => {
    await page.goto('/?role=owner');
    await expect(page.locator('header')).toBeVisible();

    // Click Admin Portal tab in Navbar
    const adminBtn = page.getByRole('button', { name: /Admin Portal/i });
    await expect(adminBtn).toBeVisible();
    await adminBtn.click();

    // Verify URL update
    await expect(page).toHaveURL(/tab=admin/);

    // Verify Admin Portal title and sections
    await expect(page.getByRole('heading', { name: /Club Administration Portal/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Users & Custom Claims/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Club Settings & Kits/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Backups & Disaster Recovery/i })).toBeVisible();
  });

  test('AdminRoute guard blocks viewer from accessing Admin Portal with 403 Forbidden UI', async ({ page }) => {
    // Navigate with viewer role
    await page.goto('/?tab=admin&role=viewer');

    // AdminRoute guard should display Access Denied screen
    await expect(page.getByRole('heading', { name: /Elevated Permissions Required/i })).toBeVisible();
    await expect(page.getByText('Access Denied (403 Forbidden)')).toBeVisible();
    await expect(page.getByText(/Your Current Role/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Refresh Token Claims/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Back to Planner/i })).toBeVisible();
  });

  test('user management tab lists registered users with custom claims and invite modal works', async ({ page }) => {
    await page.goto('/?tab=admin&role=owner');
    await expect(page.getByRole('heading', { name: /Club Administration Portal/i })).toBeVisible();

    // Verify users table headers
    await expect(page.getByText('User Access & Token Claims')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();

    // Open Invite User Modal
    const inviteBtn = page.getByRole('button', { name: /Invite \/ Add User/i });
    await expect(inviteBtn).toBeVisible();
    await inviteBtn.click();

    // Verify Modal fields
    const testEmail = `newcoach_${Date.now()}@therovers.local`;
    await expect(page.getByRole('heading', { name: /Invite \/ Provision User/i })).toBeVisible();
    await page.getByPlaceholder('coach.name@therovers.local').fill(testEmail);
    await page.getByPlaceholder(/e\.g\. Dave Miller/i).fill('New Assistant Coach');

    // Submit form
    await page.getByRole('button', { name: /Provision Claims/i }).click();

    // Modal closes and user appears in table
    await expect(page.getByRole('heading', { name: /Invite \/ Provision User/i })).not.toBeVisible();
    await expect(page.locator('table').getByText(testEmail, { exact: true }).first()).toBeVisible();
  });

  test('club settings tab allows editing club name and kit colors with live preview', async ({ page }) => {
    await page.goto('/?tab=admin&role=owner');
    await expect(page.getByRole('heading', { name: /Club Administration Portal/i })).toBeVisible();

    // Switch to Club Settings & Kits tab
    await page.getByRole('button', { name: /Club Settings & Kits/i }).click();

    // Verify Club Profile Form
    await expect(page.getByText('Club Profile & Federation Rules')).toBeVisible();
    await expect(page.getByText('Club Official Name')).toBeVisible();
    await expect(page.getByText('Primary Kit Colour')).toBeVisible();
    await expect(page.getByText('Secondary Trim Colour')).toBeVisible();
    await expect(page.getByText('Matchday Pitch Canvas Kit Preview')).toBeVisible();

    // Verify Save Button is present
    await expect(page.getByRole('button', { name: /Save Club Settings/i })).toBeVisible();
  });

  test('backups and disaster recovery tab displays database statistics and download trigger', async ({ page }) => {
    await page.goto('/?tab=admin&role=owner');
    await expect(page.getByRole('heading', { name: /Club Administration Portal/i })).toBeVisible();

    // Switch to Backups tab
    await page.getByRole('button', { name: /Backups & Disaster Recovery/i }).click();

    // Verify Export and Restore cards
    await expect(page.getByText('Export Full System Snapshot')).toBeVisible();
    await expect(page.getByText('Restore Database from Snapshot')).toBeVisible();
    await expect(page.getByRole('button', { name: /Download JSON Backup/i })).toBeVisible();
    await expect(page.getByText('Select Backup JSON File')).toBeVisible();
  });

  test('backend API enforces zero-database-lookup RBAC middleware guards', async ({ request }) => {
    // 1. Unauthenticated request to /api/admin/users should be rejected with 401
    const unauthRes = await request.get('/api/admin/users');
    expect(unauthRes.status()).toBe(401);
    const unauthBody = await unauthRes.json();
    expect(unauthBody.error).toMatch(/Missing or malformed authorisation header/i);

    // 2. Request with viewer role to /api/admin/backup/export should be rejected with 403
    const viewerRes = await request.get('/api/admin/backup/export', {
      headers: {
        Authorization: 'Bearer mock-viewer-token',
        'x-user-role': 'viewer',
      },
    });
    expect(viewerRes.status()).toBe(403);
    const viewerBody = await viewerRes.json();
    expect(viewerBody.error).toMatch(/Insufficient permissions/i);

    // 3. Request with owner role to /api/admin/backup/stats should succeed with 200
    const ownerRes = await request.get('/api/admin/backup/stats', {
      headers: {
        Authorization: 'Bearer mock-owner-token',
        'x-user-role': 'owner',
      },
    });
    expect(ownerRes.status()).toBe(200);
    const ownerBody = await ownerRes.json();
    expect(ownerBody.stats).toBeDefined();
    expect(ownerBody.stats.totalTeams).toBeGreaterThan(0);
  });
});
