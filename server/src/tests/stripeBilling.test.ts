import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import express from 'express';
import { storage } from '../db/storage.js';
import apiRouter from '../routes/api.js';
import billingRouter from '../routes/billing.js';
import adminRouter from '../routes/admin.js';
import {
  isSubscriptionActive,
  getTrialDaysRemaining,
} from '../middleware/requireActiveSubscription.js';
import { UserSubscription, Team, Fixture } from '../types.js';

describe('Stripe Billing & Free Trial Monetisation Suite (Issue #6)', () => {
  let server: http.Server;
  let baseUrl: string;

  const testUserId = 'test_coach_sub_1';
  const testUserEmail = 'coach.sub@grassroots.local';
  const testTeamId = 'team_sub_test';
  const testFixtureId = 'fix_sub_test';

  const testTeam: Team = {
    id: testTeamId,
    name: 'Sub Trial Rovers FC',
    ownerId: testUserId,
    ownerEmail: testUserEmail,
    sharedWith: [],
    settings: {
      pitchPlayerCount: 7,
      matchdaySquadCap: 10,
      subCount: 3,
      matchPeriodCount: 2,
      periodDurationMinutes: 25,
      targetGameTimePercent: 50,
      defaultFormation: '2-3-1',
    },
    createdAt: new Date().toISOString(),
  };

  const testFixture: Fixture = {
    id: testFixtureId,
    teamId: testTeamId,
    opponent: 'Rivals FC',
    venue: 'Home',
    date: '2026-11-01',
    status: 'Upcoming',
  };

  before(async () => {
    const app = express();
    app.use(
      express.json({
        verify: (req: any, _res, buf) => {
          req.rawBody = buf;
        },
      })
    );
    app.use('/api', apiRouter);
    app.use('/api/admin', adminRouter);
    app.use('/api/billing', billingRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}/api`;
        resolve();
      });
    });
  });

  after(async () => {
    await storage.deleteTeam(testTeamId);
    await storage.deleteFixture(testFixtureId);
    await storage.deleteAdminUser(testUserId);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(async () => {
    await storage.saveTeam(testTeam);
    await storage.saveFixture(testFixture);
  });

  describe('Trial Lifecycle & Subscription Entitlements Model', () => {
    it('automatically provisions a 30-day free trial on first user query', async () => {
      const freshUid = `new_coach_${Date.now()}`;
      const sub = await storage.getUserSubscription(freshUid);

      assert.equal(sub.status, 'trialing');
      assert.equal(sub.tier, 'free_trial');
      assert.ok(sub.trialStartedAt);
      assert.ok(sub.trialEndsAt);

      const daysRemaining = getTrialDaysRemaining(sub);
      assert.ok(daysRemaining >= 29 && daysRemaining <= 30, `Expected ~30 days left, got ${daysRemaining}`);
      assert.equal(isSubscriptionActive(sub), true);

      // Clean up
      await storage.deleteAdminUser(freshUid);
    });

    it('correctly calculates isSubscriptionActive across various states', () => {
      const now = Date.now();

      // Active
      const activeSub: UserSubscription = {
        status: 'active',
        tier: 'coach_annual',
        trialStartedAt: new Date(now - 86400000).toISOString(),
        trialEndsAt: new Date(now - 86400000).toISOString(),
      };
      assert.equal(isSubscriptionActive(activeSub), true);

      // Valid Trial
      const validTrial: UserSubscription = {
        status: 'trialing',
        tier: 'free_trial',
        trialStartedAt: new Date(now - 86400000).toISOString(),
        trialEndsAt: new Date(now + 10 * 86400000).toISOString(),
      };
      assert.equal(isSubscriptionActive(validTrial), true);

      // Expired Trial
      const expiredTrial: UserSubscription = {
        status: 'trialing',
        tier: 'free_trial',
        trialStartedAt: new Date(now - 40 * 86400000).toISOString(),
        trialEndsAt: new Date(now - 10 * 86400000).toISOString(),
      };
      assert.equal(isSubscriptionActive(expiredTrial), false);

      // Explicit expired
      const expiredStatus: UserSubscription = {
        status: 'expired',
        tier: 'coach_monthly',
        trialStartedAt: new Date(now - 40 * 86400000).toISOString(),
        trialEndsAt: new Date(now - 10 * 86400000).toISOString(),
      };
      assert.equal(isSubscriptionActive(expiredStatus), false);

      // Past Due within 3-day grace period
      const pastDueGrace: UserSubscription = {
        status: 'past_due',
        tier: 'coach_monthly',
        trialStartedAt: new Date(now - 40 * 86400000).toISOString(),
        trialEndsAt: new Date(now - 10 * 86400000).toISOString(),
        currentPeriodEnd: new Date(now - 86400000).toISOString(), // 1 day ago < 3 days
      };
      assert.equal(isSubscriptionActive(pastDueGrace), true);

      // Past Due beyond 3-day grace period
      const pastDueExpired: UserSubscription = {
        status: 'past_due',
        tier: 'coach_monthly',
        trialStartedAt: new Date(now - 40 * 86400000).toISOString(),
        trialEndsAt: new Date(now - 10 * 86400000).toISOString(),
        currentPeriodEnd: new Date(now - 5 * 86400000).toISOString(), // 5 days ago > 3 days
      };
      assert.equal(isSubscriptionActive(pastDueExpired), false);

      // Canceled before period end
      const canceledActive: UserSubscription = {
        status: 'canceled',
        tier: 'coach_monthly',
        trialStartedAt: new Date(now - 40 * 86400000).toISOString(),
        trialEndsAt: new Date(now - 10 * 86400000).toISOString(),
        currentPeriodEnd: new Date(now + 10 * 86400000).toISOString(),
      };
      assert.equal(isSubscriptionActive(canceledActive), true);

      // Canceled after period end
      const canceledExpired: UserSubscription = {
        status: 'canceled',
        tier: 'coach_monthly',
        trialStartedAt: new Date(now - 40 * 86400000).toISOString(),
        trialEndsAt: new Date(now - 10 * 86400000).toISOString(),
        currentPeriodEnd: new Date(now - 2 * 86400000).toISOString(),
      };
      assert.equal(isSubscriptionActive(canceledExpired), false);

      // Lifetime / Free for Life (Perpetual active access)
      const lifetimeSub: UserSubscription = {
        status: 'lifetime',
        tier: 'free_for_life',
        trialStartedAt: new Date(now - 100 * 86400000).toISOString(),
        trialEndsAt: new Date(now - 70 * 86400000).toISOString(),
      };
      assert.equal(isSubscriptionActive(lifetimeSub), true);

      const freeForLifeTierSub: UserSubscription = {
        status: 'expired',
        tier: 'free_for_life',
        trialStartedAt: new Date(now - 100 * 86400000).toISOString(),
        trialEndsAt: new Date(now - 70 * 86400000).toISOString(),
      };
      assert.equal(isSubscriptionActive(freeForLifeTierSub), true);
    });

    it('dynamically flips status to expired in storage when trial end date is exceeded', async () => {
      const pastUid = `past_coach_${Date.now()}`;
      await storage.upsertAdminUser({
        uid: pastUid,
        email: 'expired@grassroots.local',
        subscription: {
          status: 'trialing',
          tier: 'free_trial',
          trialStartedAt: new Date(Date.now() - 35 * 86400000).toISOString(),
          trialEndsAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        },
      });

      const sub = await storage.getUserSubscription(pastUid);
      assert.equal(sub.status, 'expired');
      assert.equal(isSubscriptionActive(sub), false);
      assert.equal(getTrialDaysRemaining(sub), 0);

      // Clean up
      await storage.deleteAdminUser(pastUid);
    });
  });

  describe('Feature Gating Middleware (Paywall Enforcement)', () => {
    it('allows an active trial user to create fixtures and run auto-rotate', async () => {
      // Setup active trial user
      await storage.upsertAdminUser({
        uid: testUserId,
        email: testUserEmail,
        subscription: {
          status: 'trialing',
          tier: 'free_trial',
          trialStartedAt: new Date().toISOString(),
          trialEndsAt: new Date(Date.now() + 20 * 86400000).toISOString(),
        },
      });

      // Attempt to create a fixture
      const res = await fetch(`${baseUrl}/fixtures`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': testUserEmail,
          'x-user-role': 'coach',
        },
        body: JSON.stringify({
          teamId: testTeamId,
          opponent: 'Active Trial Opponent',
          venue: 'Away',
          date: '2026-11-05',
        }),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.opponent, 'Active Trial Opponent');

      // Clean up created fixture
      await storage.deleteFixture(data.id);
    });

    it('returns HTTP 402 with TRIAL_EXPIRED when an expired coach attempts to create a fixture', async () => {
      // Mark coach as expired
      await storage.upsertAdminUser({
        uid: testUserId,
        email: testUserEmail,
        subscription: {
          status: 'expired',
          tier: 'free_trial',
          trialStartedAt: new Date(Date.now() - 40 * 86400000).toISOString(),
          trialEndsAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        },
      });

      const res = await fetch(`${baseUrl}/fixtures`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': testUserEmail,
          'x-user-role': 'coach',
        },
        body: JSON.stringify({
          teamId: testTeamId,
          opponent: 'Blocked Opponent',
          venue: 'Home',
          date: '2026-11-06',
        }),
      });

      assert.equal(res.status, 402);
      const data = await res.json();
      assert.equal(data.code, 'TRIAL_EXPIRED');
      assert.equal(data.requiresSubscription, true);
    });

    it('returns HTTP 402 with TRIAL_EXPIRED when an expired coach attempts to auto-rotate', async () => {
      await storage.upsertAdminUser({
        uid: testUserId,
        email: testUserEmail,
        subscription: {
          status: 'expired',
          tier: 'free_trial',
          trialStartedAt: new Date(Date.now() - 40 * 86400000).toISOString(),
          trialEndsAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        },
      });

      const res = await fetch(`${baseUrl}/fixtures/${testFixtureId}/auto-rotate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': testUserEmail,
          'x-user-role': 'coach',
        },
        body: JSON.stringify({}),
      });

      assert.equal(res.status, 402);
      const data = await res.json();
      assert.equal(data.code, 'TRIAL_EXPIRED');
    });

    it('preserves read-only access for expired coaches (no hostage data policy)', async () => {
      await storage.upsertAdminUser({
        uid: testUserId,
        email: testUserEmail,
        subscription: {
          status: 'expired',
          tier: 'free_trial',
          trialStartedAt: new Date(Date.now() - 40 * 86400000).toISOString(),
          trialEndsAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        },
      });

      // GET /api/teams succeeds
      const teamsRes = await fetch(`${baseUrl}/teams`, {
        headers: {
          'x-user-id': testUserId,
          'x-user-email': testUserEmail,
          'x-user-role': 'coach',
        },
      });
      assert.equal(teamsRes.status, 200);

      // GET /api/fixtures succeeds
      const fixturesRes = await fetch(`${baseUrl}/fixtures?teamId=${testTeamId}`, {
        headers: {
          'x-user-id': testUserId,
          'x-user-email': testUserEmail,
          'x-user-role': 'coach',
        },
      });
      assert.equal(fixturesRes.status, 200);

      // GET /api/fixtures/:id succeeds
      const singleFixRes = await fetch(`${baseUrl}/fixtures/${testFixtureId}`, {
        headers: {
          'x-user-id': testUserId,
          'x-user-email': testUserEmail,
          'x-user-role': 'coach',
        },
      });
      assert.equal(singleFixRes.status, 200);
    });
  });

  describe('Stripe Billing Endpoints & Webhook Lifecycle', () => {
    it('GET /api/billing/subscription returns subscription details and pricing plans', async () => {
      const res = await fetch(`${baseUrl}/billing/subscription`, {
        headers: {
          'x-user-id': testUserId,
          'x-user-email': testUserEmail,
          'x-user-role': 'coach',
          Authorization: 'Bearer mock-dev-token',
        },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.subscription);
      assert.equal(typeof data.trialDaysRemaining, 'number');
      assert.equal(typeof data.isSubscriptionActive, 'boolean');
      assert.ok(data.pricingPlans.coach_monthly);
      assert.ok(data.pricingPlans.coach_annual);
      assert.equal(data.pricingPlans.coach_monthly.priceGbp, 1.50);
      assert.equal(data.pricingPlans.coach_annual.priceGbp, 15.00);
    });

    it('POST /api/billing/create-checkout-session creates session or mock redirect URL', async () => {
      const res = await fetch(`${baseUrl}/billing/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': testUserEmail,
          'x-user-role': 'coach',
          Authorization: 'Bearer mock-dev-token',
        },
        body: JSON.stringify({
          plan: 'coach_annual',
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.url);
      assert.ok(data.sessionId);
    });

    it('POST /api/billing/create-portal-session returns portal URL', async () => {
      const res = await fetch(`${baseUrl}/billing/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': testUserId,
          'x-user-email': testUserEmail,
          'x-user-role': 'coach',
          Authorization: 'Bearer mock-dev-token',
        },
        body: JSON.stringify({
          returnUrl: 'http://localhost:5173/lineup',
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.url);
    });

    it('processes webhook checkout.session.completed and activates user subscription', async () => {
      const webhookPayload = {
        id: 'evt_test_checkout',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_12345',
            client_reference_id: testUserId,
            customer: 'cus_test_stripe_99',
            subscription: 'sub_test_stripe_99',
            metadata: {
              uid: testUserId,
              plan: 'coach_annual',
            },
          },
        },
      };

      const res = await fetch(`${baseUrl}/billing/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.received, true);

      // Verify user subscription in storage is now active coach_annual
      const sub = await storage.getUserSubscription(testUserId);
      assert.equal(sub.status, 'active');
      assert.equal(sub.tier, 'coach_annual');
      assert.equal(sub.stripeCustomerId, 'cus_test_stripe_99');
      assert.equal(sub.stripeSubscriptionId, 'sub_test_stripe_99');
      assert.equal(isSubscriptionActive(sub), true);
    });

    it('processes webhook customer.subscription.updated to sync status', async () => {
      const webhookPayload = {
        id: 'evt_test_sub_updated',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test_stripe_99',
            customer: 'cus_test_stripe_99',
            status: 'past_due',
            current_period_end: Math.floor(Date.now() / 1000) + 86400,
            cancel_at_period_end: false,
          },
        },
      };

      const res = await fetch(`${baseUrl}/billing/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      });

      assert.equal(res.status, 200);
      const sub = await storage.getUserSubscription(testUserId);
      assert.equal(sub.status, 'past_due');
    });

    it('processes webhook customer.subscription.deleted to expire subscription', async () => {
      const webhookPayload = {
        id: 'evt_test_sub_deleted',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_stripe_99',
            customer: 'cus_test_stripe_99',
            status: 'canceled',
          },
        },
      };

      const res = await fetch(`${baseUrl}/billing/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      });

      assert.equal(res.status, 200);
      const sub = await storage.getUserSubscription(testUserId);
      assert.equal(sub.status, 'expired');
    });

    it('PUT /api/admin/users/:uid/subscription allows Club Owner to grant Free for Life status', async () => {
      const targetCoachUid = `grant_lifetime_${Date.now()}`;
      await storage.upsertAdminUser({
        uid: targetCoachUid,
        email: 'lucky.coach@grassroots.local',
        displayName: 'Lucky Coach',
        role: 'coach',
      });

      // Attempt to grant lifetime as owner
      const grantRes = await fetch(`${baseUrl}/admin/users/${targetCoachUid}/subscription`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'club_owner_uid',
          'x-user-email': 'owner@grassroots.local',
          'x-user-role': 'owner',
          Authorization: 'Bearer mock-dev-token',
        },
        body: JSON.stringify({
          status: 'lifetime',
        }),
      });

      assert.equal(grantRes.status, 200);
      const grantData = await grantRes.json();
      assert.equal(grantData.subscription.status, 'lifetime');
      assert.equal(grantData.subscription.tier, 'free_for_life');

      // Verify entitlement check returns active
      const fetchedSub = await storage.getUserSubscription(targetCoachUid);
      assert.equal(fetchedSub.status, 'lifetime');
      assert.equal(isSubscriptionActive(fetchedSub), true);

      // Verify non-owner cannot grant subscriptions
      const forbiddenRes = await fetch(`${baseUrl}/admin/users/${targetCoachUid}/subscription`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'regular_coach_uid',
          'x-user-email': 'coach@grassroots.local',
          'x-user-role': 'coach',
          Authorization: 'Bearer mock-dev-token',
        },
        body: JSON.stringify({
          status: 'lifetime',
        }),
      });
      assert.equal(forbiddenRes.status, 403);

      // Clean up
      await storage.deleteAdminUser(targetCoachUid);
    });
  });
});
