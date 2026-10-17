import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { storage } from '../db/storage.js';
import { Team } from '../types.js';

describe('Team Admin Visibility & Access Suite', () => {
  const adminAlice = {
    uid: 'admin_alice_123',
    email: 'alice@clubadmin.local',
  };

  const adminBob = {
    uid: 'admin_bob_456',
    email: 'bob@clubadmin.local',
  };

  const coachCharlie = {
    uid: 'coach_charlie_789',
    email: 'charlie@grassroots.org',
  };

  const teamAliceCreated: Team = {
    id: 'team_alice_u10',
    name: 'Alice All-Stars U10',
    ageGroup: 'U10',
    ownerId: adminAlice.uid,
    ownerEmail: adminAlice.email,
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
    createdAt: new Date().toISOString(),
  };

  const teamBobCreated: Team = {
    id: 'team_bob_u12',
    name: 'Bob Dynamos U12',
    ageGroup: 'U12',
    ownerId: adminBob.uid,
    ownerEmail: adminBob.email,
    sharedWith: [adminAlice.email.toUpperCase()], // shared with Alice with uppercase email
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
    createdAt: new Date().toISOString(),
  };

  const teamCharlieCreated: Team = {
    id: 'team_charlie_u14',
    name: 'Charlie Champions U14',
    ageGroup: 'U14',
    ownerId: coachCharlie.uid,
    ownerEmail: coachCharlie.email,
    sharedWith: [],
    settings: {
      pitchPlayerCount: 11,
      matchdaySquadCap: 14,
      subCount: 3,
      matchPeriodCount: 2,
      periodDurationMinutes: 35,
      targetGameTimePercent: 50,
      defaultFormation: '4-4-2',
      customFormations: [],
    },
    createdAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    // Save test teams
    await storage.saveTeam(teamAliceCreated);
    await storage.saveTeam(teamBobCreated);
    await storage.saveTeam(teamCharlieCreated);
  });

  describe('hasTeamAccess check', () => {
    it('grants access to the team creator / owner by userId', () => {
      const hasAccess = storage.hasTeamAccess(teamAliceCreated, adminAlice.uid, adminAlice.email);
      assert.strictEqual(hasAccess, true);
    });

    it('grants access to the team creator / owner by email case-insensitively', () => {
      const hasAccess = storage.hasTeamAccess(teamAliceCreated, 'different_uid', 'ALICE@CLUBADMIN.LOCAL');
      assert.strictEqual(hasAccess, true);
    });

    it('grants access to users explicitly shared by email case-insensitively', () => {
      // teamBobCreated shared with Alice's email
      const hasAccess = storage.hasTeamAccess(teamBobCreated, adminAlice.uid, adminAlice.email.toLowerCase());
      assert.strictEqual(hasAccess, true);
    });

    it('grants access to users explicitly shared by userId', () => {
      const teamSharedByUid: Team = {
        ...teamCharlieCreated,
        sharedWith: [adminAlice.uid],
      };
      const hasAccess = storage.hasTeamAccess(teamSharedByUid, adminAlice.uid, 'unmatched@email.com');
      assert.strictEqual(hasAccess, true);
    });

    it('DENIES access to teams not created by the admin and not shared with them', () => {
      // Alice tries to access Charlie's team (not created by Alice, not shared with Alice)
      const hasAccess = storage.hasTeamAccess(teamCharlieCreated, adminAlice.uid, adminAlice.email);
      assert.strictEqual(hasAccess, false);

      // Charlie tries to access Alice's team
      const charlieAccess = storage.hasTeamAccess(teamAliceCreated, coachCharlie.uid, coachCharlie.email);
      assert.strictEqual(charlieAccess, false);
    });

    it('allows unauthenticated guest browsing fallback for demo teams', () => {
      const unauthAccess = storage.hasTeamAccess(teamAliceCreated, undefined, undefined);
      assert.strictEqual(unauthAccess, true);
    });
  });

  describe('getTeams user filtering', () => {
    it('returns ONLY teams created by the user or explicitly shared with them', async () => {
      const aliceTeams = await storage.getTeams(adminAlice.uid, adminAlice.email);
      const teamIds = aliceTeams.map((t) => t.id);

      // Alice created teamAliceCreated
      assert.ok(teamIds.includes('team_alice_u10'), 'Alice should see her own created team');

      // Bob explicitly shared teamBobCreated with Alice
      assert.ok(teamIds.includes('team_bob_u12'), 'Alice should see team shared with her');

      // Charlie never shared with Alice
      assert.ok(!teamIds.includes('team_charlie_u14'), 'Alice MUST NOT see Charlie team');
    });

    it('returns empty array [] when an authenticated admin has no created or shared teams', async () => {
      const newAdmin = {
        uid: 'brand_new_admin_999',
        email: 'newadmin@domain.local',
      };
      const teams = await storage.getTeams(newAdmin.uid, newAdmin.email);
      assert.strictEqual(Array.isArray(teams), true);
      assert.strictEqual(teams.length, 0, 'New admin with no teams must receive an empty array, never demo teams');
    });

    it('returns demo seed teams when unauthenticated (no userId)', async () => {
      const demoTeams = await storage.getTeams(undefined, undefined);
      assert.ok(demoTeams.length > 0, 'Unauthenticated visitor receives demo teams');
    });
  });

  describe('shareTeam helper', () => {
    it('adds email to sharedWith array case-insensitively without duplicates', async () => {
      const updated = await storage.shareTeam('team_charlie_u14', 'BOB@CLUBADMIN.LOCAL');
      assert.ok(updated);
      assert.ok(updated.sharedWith.includes('bob@clubadmin.local'));

      // Check Bob now has access
      const bobAccess = storage.hasTeamAccess(updated, adminBob.uid, adminBob.email);
      assert.strictEqual(bobAccess, true);
    });
  });
});
