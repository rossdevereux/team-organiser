import { test, expect } from '@playwright/test';

test.describe('Unauthenticated Visitor & Landing Journey Suite', () => {
  test('displays landing page hero when visiting with ?landing=true', async ({ page }) => {
    await page.goto('/?landing=true');

    // Verify Brand Logo and Title
    await expect(page.getByRole('heading', { name: /Smart Player Rotations for/i })).toBeVisible();
    await expect(page.getByText(/FA Youth Charter & Equal Playing Time Compliance/i)).toBeVisible();

    // Verify Dual Call to Actions
    const demoBtn = page.getByRole('button', { name: /Launch Interactive Demo/i });
    await expect(demoBtn).toBeVisible();

    const signInBtn = page.getByTitle(/Sign in with Google/i).first();
    await expect(signInBtn).toBeVisible();

    // Verify 4 Feature Pillars
    await expect(page.getByRole('heading', { name: 'Smart Auto-Rotation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pitchside Thumb Ergonomics' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Instant WhatsApp Call-Up' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Referee Match Sheets' })).toBeVisible();
  });

  test('clicking Launch Interactive Demo transitions into live sandbox planner', async ({ page }) => {
    await page.goto('/?landing=true');

    const demoBtn = page.getByRole('button', { name: /Launch Interactive Demo/i });
    await expect(demoBtn).toBeVisible();
    await demoBtn.click();

    // Verify transition into planner
    await expect(page.locator('header')).toBeVisible();
    await expect(page.getByText(/Demo Sandbox Active/i)).toBeVisible();
    await expect(page.getByText('The Rovers U11').first()).toBeVisible();

    // Verify pitch is visible
    const pitch = page.locator('.relative.w-full.aspect-\\[4\\/5\\], .relative.w-full.aspect-\\[4\\/3\\], [class*="aspect-"]').first();
    await expect(pitch).toBeVisible();
  });

  test('clicking Product Tour in guest banner returns to Landing Hero', async ({ page }) => {
    // Start in demo planner
    await page.goto('/?tab=lineup');
    await expect(page.getByText(/Demo Sandbox Active/i)).toBeVisible();

    // Click Product Tour button
    const tourBtn = page.getByRole('button', { name: 'Product Tour' }).first();
    await expect(tourBtn).toBeVisible();
    await tourBtn.click();

    // Verify Landing Hero is rendered
    await expect(page.getByRole('heading', { name: /Smart Player Rotations for/i })).toBeVisible();
  });
});
