import { test, expect } from '@playwright/test';

test.describe('Optimised Live Match Status Polling & Heartbeat Suite (Issue #16)', () => {
  test('client polling requests send If-None-Match and receive 304 Not Modified', async ({ page }) => {
    const liveStatusRequests: { url: string; ifNoneMatch: string | null; status: number }[] = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/api/fixtures/') && url.includes('/live-status')) {
        const req = response.request();
        liveStatusRequests.push({
          url,
          ifNoneMatch: req.headers()['if-none-match'] || null,
          status: response.status(),
        });
      }
    });

    await page.goto('/?tab=lineup');
    await expect(page.locator('header')).toBeVisible({ timeout: 10000 });

    // Open Live Match modal via pitchside stopwatch button
    const liveBtn = page.locator('header button[title*="Pitchside stopwatch"]').first();
    await expect(liveBtn).toBeVisible({ timeout: 10000 });
    await liveBtn.click();

    const modal = page.locator('div.fixed.inset-0:has-text("Sideline Live Match")');
    await expect(modal).toBeVisible();

    // Ensure timer is reset to clean stopped state before starting
    const resetBtn = modal.locator('button[title*="Reset Match Stopwatch"]');
    if (await resetBtn.isVisible()) {
      await resetBtn.click();
    }

    // Start timer to activate live polling mode (5s interval)
    const startTimerBtn = modal.getByRole('button', { name: /Start Timer/i });
    await expect(startTimerBtn).toBeVisible({ timeout: 5000 });
    await startTimerBtn.click();

    // Wait dynamically for the scheduled poll tick sending If-None-Match
    await expect.poll(
      () => liveStatusRequests.filter((r) => r.ifNoneMatch !== null).length,
      { timeout: 14000 }
    ).toBeGreaterThanOrEqual(1);

    // Initial request had no If-None-Match and returned 200
    const firstReq = liveStatusRequests[0];
    expect(firstReq.status).toBe(200);

    // Subsequent poll sent If-None-Match and received 304 Not Modified
    const conditionalReq = liveStatusRequests.find((r) => r.ifNoneMatch !== null);
    expect(conditionalReq).toBeDefined();
    expect(conditionalReq?.ifNoneMatch).toBeTruthy();
    expect(conditionalReq?.status).toBe(304);

    // Reset timer to clean up
    if (await resetBtn.isVisible()) {
      await resetBtn.click();
    }
  });

  test('direct fetch to /api/fixtures/:id/live-status returns minimal payload and 304 on re-fetch', async ({ page }) => {
    await page.goto('/');

    // Execute direct fetch from page context to inspect byte size and ETag behavior
    const result = await page.evaluate(async () => {
      // Fetch fixtures list to find valid fixture ID
      const fixRes = await fetch('/api/fixtures?teamId=team-1');
      const fixtures = await fixRes.json();
      const testId = fixtures[0]?.id || 'fix-1';

      // 1. Initial heartbeat request
      const res1 = await fetch(`/api/fixtures/${testId}/live-status`);
      const etag = res1.headers.get('etag');
      const cacheControl = res1.headers.get('cache-control');
      const text = await res1.text();
      const byteSize = new Blob([text]).size;
      const json = JSON.parse(text);

      // 2. Conditional request with matching If-None-Match
      const res2 = await fetch(`/api/fixtures/${testId}/live-status`, {
        headers: { 'If-None-Match': etag || '' },
      });
      const text2 = await res2.text();

      return {
        status1: res1.status,
        byteSize,
        json,
        etag,
        cacheControl,
        status2: res2.status,
        text2,
      };
    });

    expect(result.status1).toBe(200);
    expect(result.byteSize).toBeLessThan(150); // Under 150 bytes target
    expect(result.etag).toBeTruthy();
    expect(result.cacheControl).toContain('s-maxage=3');
    expect(result.json).toHaveProperty('status');
    expect(result.json).toHaveProperty('period');
    expect(result.json).toHaveProperty('homeScore');
    expect(result.json).toHaveProperty('awayScore');
    expect(result.json).toHaveProperty('version');

    // 304 Not Modified verification
    expect(result.status2).toBe(304);
    expect(result.text2).toBe(''); // 0-byte body payload
  });
});
