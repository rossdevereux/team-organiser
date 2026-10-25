import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import express from 'express';
import { storage } from '../db/storage.js';
import apiRouter from '../routes/api.js';
import { DEFAULT_ONBOARDING_STATE, UserOnboardingState } from '../types.js';

describe('User Onboarding State & API Suite (Issue #28)', () => {
  let server: http.Server;
  let baseUrl: string;

  const testUserId = 'test_onboarding_coach_1';

  before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api', apiRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}/api`;
        resolve();
      });
    });
  });

  after(async () => {
    await storage.deleteAdminUser(testUserId);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(async () => {
    await storage.deleteAdminUser(testUserId);
  });

  describe('StorageManager Onboarding Persistence', () => {
    it('returns DEFAULT_ONBOARDING_STATE for user with no prior onboarding record', async () => {
      const state = await storage.getUserOnboarding('new_unknown_uid');
      assert.deepEqual(state, DEFAULT_ONBOARDING_STATE);
      assert.equal(state.hasCompletedWizard, false);
      assert.equal(state.hasSeenTour, false);
      assert.deepEqual(state.completedSteps, []);
    });

    it('persists and updates onboarding progress in storage', async () => {
      const initial = await storage.saveUserOnboarding(testUserId, {
        completedSteps: ['team_created'],
      });
      assert.equal(initial.hasCompletedWizard, false);
      assert.deepEqual(initial.completedSteps, ['team_created']);

      const updated = await storage.saveUserOnboarding(testUserId, {
        hasCompletedWizard: true,
        completedSteps: ['team_created', 'players_added', 'fixture_created'],
        hasSeenTour: true,
      });

      assert.equal(updated.hasCompletedWizard, true);
      assert.equal(updated.hasSeenTour, true);
      assert.deepEqual(updated.completedSteps, ['team_created', 'players_added', 'fixture_created']);

      const retrieved = await storage.getUserOnboarding(testUserId);
      assert.deepEqual(retrieved, updated);
    });
  });

  describe('GET & POST /api/user/onboarding Endpoints', () => {
    it('unauthenticated GET returns default onboarding state', async () => {
      const res = await fetch(`${baseUrl}/user/onboarding`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.deepEqual(json.onboarding, DEFAULT_ONBOARDING_STATE);
    });

    it('unauthenticated POST returns merged state without errors for guest demo users', async () => {
      const res = await fetch(`${baseUrl}/user/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hasCompletedWizard: true,
          completedSteps: ['team_created'],
        }),
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.onboarding.hasCompletedWizard, true);
      assert.deepEqual(json.onboarding.completedSteps, ['team_created']);
      assert.equal(json.onboarding.hasSeenTour, false);
    });

    it('rejects invalid types on POST /api/user/onboarding with HTTP 400', async () => {
      const res1 = await fetch(`${baseUrl}/user/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hasCompletedWizard: 'not-a-bool' }),
      });
      assert.equal(res1.status, 400);

      const res2 = await fetch(`${baseUrl}/user/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedSteps: 'not-an-array' }),
      });
      assert.equal(res2.status, 400);

      const res3 = await fetch(`${baseUrl}/user/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hasSeenTour: 'not-a-bool' }),
      });
      assert.equal(res3.status, 400);
    });

    it('authenticated user updates and retrieves onboarding state correctly', async () => {
      const authHeaders = {
        'Authorization': 'Bearer mock-coach-token',
        'x-user-id': testUserId,
        'Content-Type': 'application/json',
      };

      // 1. Initial GET
      const getRes1 = await fetch(`${baseUrl}/user/onboarding`, {
        headers: authHeaders,
      });
      assert.equal(getRes1.status, 200);
      const getJson1 = await getRes1.json();
      assert.equal(getJson1.onboarding.hasCompletedWizard, false);

      // 2. Post Step 1 & 2 completion
      const postRes = await fetch(`${baseUrl}/user/onboarding`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          completedSteps: ['team_created', 'players_added'],
        }),
      });
      assert.equal(postRes.status, 200);
      const postJson = await postRes.json();
      assert.deepEqual(postJson.onboarding.completedSteps, ['team_created', 'players_added']);

      // 3. Mark wizard completed and tour seen
      const finishRes = await fetch(`${baseUrl}/user/onboarding`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          hasCompletedWizard: true,
          hasSeenTour: true,
          completedSteps: ['team_created', 'players_added', 'fixture_created'],
        }),
      });
      assert.equal(finishRes.status, 200);
      const finishJson = await finishRes.json();
      assert.equal(finishJson.onboarding.hasCompletedWizard, true);
      assert.equal(finishJson.onboarding.hasSeenTour, true);

      // 4. Verify with fresh GET
      const getRes2 = await fetch(`${baseUrl}/user/onboarding`, {
        headers: authHeaders,
      });
      const getJson2 = await getRes2.json();
      assert.equal(getJson2.onboarding.hasCompletedWizard, true);
      assert.equal(getJson2.onboarding.hasSeenTour, true);
      assert.deepEqual(getJson2.onboarding.completedSteps, [
        'team_created',
        'players_added',
        'fixture_created',
      ]);
    });
  });
});
