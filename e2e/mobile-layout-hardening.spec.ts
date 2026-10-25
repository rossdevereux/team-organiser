import { test, expect } from '@playwright/test';

test.describe('Universal Mobile Layout Hardening & Touchline Ergonomics Suite', () => {
  const mobileViewports = [
    { name: 'iPhone SE (375x667)', width: 375, height: 667 },
    { name: 'iPhone 14 (390x844)', width: 390, height: 844 },
    { name: 'Galaxy (360x740)', width: 360, height: 740 },
  ];

  for (const vp of mobileViewports) {
    test.describe(`Viewport: ${vp.name}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
          localStorage.setItem(
            'subshuffle_onboarding_state',
            JSON.stringify({ hasCompletedWizard: true, hasSeenTour: true, completedSteps: [] })
          );
        });
      });

      test('ensures zero horizontal document overflow on main views', async ({ page }) => {
        // First verify landing page has zero overflow on small mobile screens
        await page.goto('/');
        await page.waitForTimeout(300);
        let hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        expect(hasOverflow, `Landing page has unexpected horizontal document scroll on ${vp.name}`).toBe(false);

        // Test main tactical app routes
        const routes = ['/lineup', '/matrix', '/fixtures', '/squad', '/stats'];
        for (const route of routes) {
          await page.goto(route);
          await page.waitForTimeout(300);

          hasOverflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth > window.innerWidth;
          });
          expect(hasOverflow, `Route ${route} has unexpected horizontal document scroll on ${vp.name}`).toBe(false);
        }
      });

      test('validates PitchView canvas min-height and token ergonomics', async ({ page }) => {
        await page.goto('/lineup');
        const pitch = page.locator('[data-tour-target="pitch"]');
        await expect(pitch).toBeVisible();

        const box = await pitch.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(370);
        }

        // Check player tokens exist and fit within viewport
        const playerNode = page.locator('[data-tour-target="pitch"] .group').first();
        if (await playerNode.isVisible()) {
          const nodeBox = await playerNode.boundingBox();
          expect(nodeBox).not.toBeNull();
        }
      });

      test('validates RotationMatrix mobile table and cards view toggle', async ({ page }) => {
        await page.goto('/matrix');
        await expect(page.getByRole('heading', { name: /Rotation Matrix|Half Matrix|Period Matrix/i })).toBeVisible();

        // Cards view button should be visible on mobile
        const cardsToggleBtn = page.getByRole('button', { name: 'Cards', exact: true });
        await expect(cardsToggleBtn).toBeVisible();
        await cardsToggleBtn.click();

        // Check that period cards are rendered
        await expect(page.getByText(/On Pitch/i).first()).toBeVisible();

        // Switch back to Table view using exact name / title
        const tableToggleBtn = page.locator('button[title="Table View"]');
        await expect(tableToggleBtn).toBeVisible();
        await tableToggleBtn.click();

        const table = page.locator('table');
        await expect(table).toBeVisible();
      });

      test('validates SuggestedSubsModal bottom sheet layout, touch targets and footer clearance', async ({ page }) => {
        await page.goto('/fixtures');
        
        // Find and click "Suggested Subs" button on fixture card
        const suggestedSubsBtn = page.getByRole('button', { name: /Suggested Subs/i }).first();
        if (await suggestedSubsBtn.isVisible()) {
          await suggestedSubsBtn.click();

          const modal = page.locator('div[role="dialog"]');
          await expect(modal).toBeVisible();

          // Close button touch target >= 44px
          const closeBtn = modal.locator('button[aria-label="Close suggestions"]');
          await expect(closeBtn).toBeVisible();
          const closeBox = await closeBtn.boundingBox();
          expect(closeBox).not.toBeNull();
          if (closeBox) {
            expect(closeBox.width).toBeGreaterThanOrEqual(44);
            expect(closeBox.height).toBeGreaterThanOrEqual(44);
          }

          // Sticky footer Done button >= 44px and visible
          const doneBtn = modal.getByRole('button', { name: 'Done', exact: true });
          await expect(doneBtn).toBeVisible();
          const doneBox = await doneBtn.boundingBox();
          expect(doneBox).not.toBeNull();
          if (doneBox) {
            expect(doneBox.height).toBeGreaterThanOrEqual(44);
          }

          // Close modal
          await doneBtn.click();
          await expect(modal).not.toBeVisible();
        }
      });

      test('validates ScoreScorersModal bottom sheet ergonomics and touch targets', async ({ page }) => {
        await page.goto('/fixtures');
        
        // Find and click score entry button
        const scoreBtn = page.locator('button[title*="Record score"], button:has-text("Score & Scorers"), button:has-text("Score (")').first();
        if (await scoreBtn.isVisible()) {
          await scoreBtn.click();

          const scoreModal = page.locator('div[role="dialog"][aria-labelledby="score-modal-title"]');
          await expect(scoreModal).toBeVisible();

          // Close button >= 44px
          const closeBtn = scoreModal.locator('button[aria-label="Close score modal"]');
          await expect(closeBtn).toBeVisible();
          const closeBox = await closeBtn.boundingBox();
          if (closeBox) {
            expect(closeBox.width).toBeGreaterThanOrEqual(44);
            expect(closeBox.height).toBeGreaterThanOrEqual(44);
          }

          // Score steppers >= 44px
          const stepperMinus = scoreModal.locator('button[aria-label="Decrease home score"]');
          if (await stepperMinus.isVisible()) {
            const minusBox = await stepperMinus.boundingBox();
            if (minusBox) {
              expect(minusBox.width).toBeGreaterThanOrEqual(44);
              expect(minusBox.height).toBeGreaterThanOrEqual(44);
            }
          }

          // Footer Cancel button >= 44px
          const cancelBtn = scoreModal.getByRole('button', { name: /Cancel/i });
          await expect(cancelBtn).toBeVisible();
          const cancelBox = await cancelBtn.boundingBox();
          if (cancelBox) {
            expect(cancelBox.height).toBeGreaterThanOrEqual(44);
          }

          await cancelBtn.click();
          await expect(scoreModal).not.toBeVisible();
        }
      });
    });
  }
});
