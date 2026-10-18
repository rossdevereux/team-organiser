import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import express from 'express';
import compression from 'compression';
import { storage } from '../db/storage.js';
import apiRouter from '../routes/api.js';
import { Fixture, LiveMatchState, LiveStatusResponse } from '../types.js';

describe('Optimised Live Match Status Polling & Heartbeat Suite (Issue #16)', () => {
  let server: http.Server;
  let baseUrl: string;

  const testFixtureId = 'fix_test_live_status_1';
  const testTeamId = 'team-1';

  before(async () => {
    const app = express();
    app.use(compression({ threshold: 256 }));
    app.use(express.json());
    app.use('/api', apiRouter);

    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(async () => {
    const initialFixture: Fixture = {
      id: testFixtureId,
      teamId: testTeamId,
      season: '2026/2027',
      date: '2026-10-25',
      opponent: 'Kingswood United',
      venue: 'Home',
      status: 'Upcoming',
      homeScore: 0,
      awayScore: 0,
      matchPeriodCount: 2,
      periodDurationMinutes: 25,
      version: 1,
      updatedAt: '2026-10-18T10:00:00.000Z',
    };
    await storage.saveFixture(initialFixture);
  });

  it('GET /api/fixtures/:id/live-status returns minimal heartbeat payload < 150 bytes', async () => {
    const res = await fetch(`${baseUrl}/api/fixtures/${testFixtureId}/live-status`);
    assert.equal(res.status, 200);

    const rawText = await res.text();
    const payloadBytes = Buffer.byteLength(rawText, 'utf8');

    // Requirement 1: Payload size strictly < 150 bytes uncompressed
    assert.ok(
      payloadBytes < 150,
      `Payload size should be under 150 bytes uncompressed, got: ${payloadBytes} bytes. Payload: ${rawText}`
    );

    const body: LiveStatusResponse = JSON.parse(rawText);
    assert.equal(body.status, 'upcoming');
    assert.equal(body.period, 1);
    assert.equal(body.homeScore, 0);
    assert.equal(body.awayScore, 0);
    assert.equal(body.periodStartedAt, null);
    assert.ok(typeof body.version === 'number');
    assert.ok(typeof body.updatedAt === 'string');
  });

  it('sets Edge CDN Cache-Control headers and ETag on live-status response', async () => {
    const res = await fetch(`${baseUrl}/api/fixtures/${testFixtureId}/live-status`);
    assert.equal(res.status, 200);

    // Requirement 4: Edge CDN Caching
    const cacheControl = res.headers.get('cache-control');
    assert.ok(cacheControl, 'Cache-Control header must be set');
    assert.match(cacheControl, /public/);
    assert.match(cacheControl, /max-age=1/);
    assert.match(cacheControl, /s-maxage=3/);
    assert.match(cacheControl, /stale-while-revalidate=2/);

    // Requirement 2: ETag generation
    const etag = res.headers.get('etag');
    assert.ok(etag, 'ETag header must be returned');
    assert.match(etag, /^W\//, 'ETag should have weak validator prefix');
  });

  it('returns HTTP 304 Not Modified with 0 bytes body when If-None-Match matches ETag', async () => {
    const initialRes = await fetch(`${baseUrl}/api/fixtures/${testFixtureId}/live-status`);
    assert.equal(initialRes.status, 200);
    const etag = initialRes.headers.get('etag')!;
    assert.ok(etag);

    // Subsequent polling tick with matching ETag
    const conditionalRes = await fetch(`${baseUrl}/api/fixtures/${testFixtureId}/live-status`, {
      headers: {
        'If-None-Match': etag,
      },
    });

    // Requirement 2: 304 with empty body
    assert.equal(conditionalRes.status, 304);
    const bodyText = await conditionalRes.text();
    assert.equal(bodyText, '', 'Body on 304 Not Modified must be empty (0 bytes)');
    assert.equal(conditionalRes.headers.get('etag'), etag);
  });

  it('invalidates ETag and returns HTTP 200 when live match state starts or pauses', async () => {
    const initialRes = await fetch(`${baseUrl}/api/fixtures/${testFixtureId}/live-status`);
    const originalEtag = initialRes.headers.get('etag')!;

    // Start live match timer
    const startedAt = new Date().toISOString();
    const liveState: LiveMatchState = {
      isRunning: true,
      currentPeriod: 1,
      startedAt,
      elapsedSeconds: 0,
      periodTimers: {
        1: { elapsedSeconds: 0, isRunning: true, startedAt },
      },
      updatedAt: startedAt,
    };
    await storage.updateLiveMatchState(testFixtureId, liveState);

    // Poll with previous ETag
    const changedRes = await fetch(`${baseUrl}/api/fixtures/${testFixtureId}/live-status`, {
      headers: {
        'If-None-Match': originalEtag,
      },
    });

    assert.equal(changedRes.status, 200, 'Must return 200 when match state mutates');
    const newEtag = changedRes.headers.get('etag')!;
    assert.notEqual(newEtag, originalEtag, 'ETag must be updated upon state change');

    const body: LiveStatusResponse = await changedRes.json();
    assert.equal(body.status, 'live');
    assert.equal(body.period, 1);
    assert.equal(body.periodStartedAt, new Date(startedAt).getTime());
  });

  it('invalidates ETag and returns HTTP 200 when fixture score is updated', async () => {
    const initialRes = await fetch(`${baseUrl}/api/fixtures/${testFixtureId}/live-status`);
    const originalEtag = initialRes.headers.get('etag')!;

    // Update match score
    await storage.updateFixtureScore(testFixtureId, {
      homeScore: 2,
      awayScore: 1,
      status: 'In Progress',
      isLive: true,
    });

    const changedRes = await fetch(`${baseUrl}/api/fixtures/${testFixtureId}/live-status`, {
      headers: {
        'If-None-Match': originalEtag,
      },
    });

    assert.equal(changedRes.status, 200);
    const body: LiveStatusResponse = await changedRes.json();
    assert.equal(body.homeScore, 2);
    assert.equal(body.awayScore, 1);
    assert.equal(body.status, 'live');
  });

  it('returns status "completed" when fixture is finalized', async () => {
    await storage.updateFixtureScore(testFixtureId, {
      homeScore: 3,
      awayScore: 2,
      status: 'Completed',
      isLive: false,
    });

    const res = await fetch(`${baseUrl}/api/fixtures/${testFixtureId}/live-status`);
    assert.equal(res.status, 200);

    const body: LiveStatusResponse = await res.json();
    assert.equal(body.status, 'completed');
    assert.equal(body.homeScore, 3);
    assert.equal(body.awayScore, 2);
  });

  it('returns 404 for non-existent fixture', async () => {
    const res = await fetch(`${baseUrl}/api/fixtures/non_existent_fixture_999/live-status`);
    assert.equal(res.status, 404);
  });
});
