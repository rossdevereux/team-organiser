import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Firestore } from '@google-cloud/firestore';
import { StorageManager, cleanUndefined } from '../db/storage.js';
import { Player, Fixture, Team, ClubSettings, AdminUser } from '../types.js';

/**
 * In-memory Mock Firestore instance replicating the Firestore SDK behaviour
 * used by StorageManager.
 */
class MockFirestore {
  public collections: Map<string, Map<string, any>> = new Map();

  private getCollectionMap(name: string): Map<string, any> {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
    }
    return this.collections.get(name)!;
  }

  collection(name: string) {
    const colMap = this.getCollectionMap(name);
    return {
      doc: (id: string) => ({
        id,
        set: async (data: any) => {
          // Verify that no undefined properties were passed
          for (const [key, value] of Object.entries(data)) {
            if (value === undefined) {
              throw new Error(`Firestore Error: Cannot use "undefined" as a Firestore value (found in field "${key}")`);
            }
          }
          colMap.set(id, { ...data });
        },
        get: async () => {
          const data = colMap.get(id);
          return {
            id,
            exists: Boolean(data),
            data: () => (data ? { ...data } : undefined),
          };
        },
        delete: async () => {
          colMap.delete(id);
        },
      }),
      where: (field: string, _op: string, value: any) => ({
        get: async () => {
          const matching = Array.from(colMap.entries())
            .filter(([_, data]) => data[field] === value)
            .map(([id, data]) => ({ id, data: () => ({ ...data }) }));
          return {
            empty: matching.length === 0,
            docs: matching,
          };
        },
      }),
      get: async () => {
        const docs = Array.from(colMap.entries()).map(([id, data]) => ({
          id,
          data: () => ({ ...data }),
        }));
        return {
          empty: docs.length === 0,
          docs,
        };
      },
      limit: (count: number) => ({
        get: async () => {
          const docs = Array.from(colMap.entries())
            .slice(0, count)
            .map(([id, data]) => ({
              id,
              data: () => ({ ...data }),
            }));
          return {
            empty: docs.length === 0,
            docs,
          };
        },
      }),
    };
  }

  batch() {
    const operations: (() => void)[] = [];
    return {
      set: (docRef: any, data: any) => {
        for (const [key, value] of Object.entries(data)) {
          if (value === undefined) {
            throw new Error(`Firestore Error: Cannot use "undefined" as a Firestore value (found in field "${key}")`);
          }
        }
        operations.push(() => {
          const colMap = this.getCollectionMap(docRef.parent?.id || 'players');
          colMap.set(docRef.id, { ...data });
        });
      },
      commit: async () => {
        for (const op of operations) {
          op();
        }
      },
    };
  }
}

describe('Storage & Firestore Integration Suite', () => {
  describe('cleanUndefined Utility', () => {
    it('removes top-level undefined properties while keeping null, false, 0, and empty string', () => {
      const input = {
        name: 'John',
        missing: undefined,
        count: 0,
        active: false,
        notes: null,
        empty: '',
      };
      const cleaned = cleanUndefined(input);
      assert.deepEqual(cleaned, {
        name: 'John',
        count: 0,
        active: false,
        notes: null,
        empty: '',
      });
      assert.strictEqual('missing' in cleaned, false);
    });

    it('recursively removes nested undefined properties', () => {
      const input = {
        team: 'Rovers',
        settings: {
          pitchSize: 7,
          notes: undefined,
          nested: {
            deep: 'value',
            orphan: undefined,
          },
        },
      };
      const cleaned = cleanUndefined(input);
      assert.deepEqual(cleaned, {
        team: 'Rovers',
        settings: {
          pitchSize: 7,
          nested: {
            deep: 'value',
          },
        },
      });
      assert.strictEqual('notes' in cleaned.settings, false);
      assert.strictEqual('orphan' in cleaned.settings.nested, false);
    });

    it('cleans arrays of objects containing undefined properties', () => {
      const input = [
        { id: '1', score: undefined, active: true },
        { id: '2', score: 10, name: undefined },
      ];
      const cleaned = cleanUndefined(input);
      assert.deepEqual(cleaned, [
        { id: '1', active: true },
        { id: '2', score: 10 },
      ]);
    });
  });

  describe('StorageManager Firestore Persistence', () => {
    it('saves players with undefined fields into Firestore without throwing errors', async () => {
      const mockFirestore = new MockFirestore();
      const storage = new StorageManager(mockFirestore);

      const playerWithUndefined: Player = {
        id: 'p_test_1',
        teamId: 'team_alpha',
        name: 'Alex Striker',
        squadNumber: undefined,
        preferredPositions: ['Attack'],
        specificPositions: [],
        unavailableDates: [],
        signOnDate: undefined,
        leaveDate: undefined,
        matchesPlayed: 0,
        totalMinutesPlayed: 0,
      };

      const saved = await storage.savePlayer(playerWithUndefined);
      assert.strictEqual(saved.id, 'p_test_1');

      // Verify Firestore has the player stored without the undefined properties
      const firestorePlayerDoc = await mockFirestore.collection('players').doc('p_test_1').get();
      assert.strictEqual(firestorePlayerDoc.exists, true);
      const data = firestorePlayerDoc.data();
      assert.strictEqual(data.name, 'Alex Striker');
      assert.strictEqual('squadNumber' in data, false);
      assert.strictEqual('signOnDate' in data, false);
    });

    it('saves fixtures with undefined fields into Firestore without throwing errors', async () => {
      const mockFirestore = new MockFirestore();
      const storage = new StorageManager(mockFirestore);

      const fixtureWithUndefined: Fixture = {
        id: 'fix_test_1',
        teamId: 'team_alpha',
        date: '2026-11-15',
        opponent: 'Hilltop Wanderers',
        venue: 'Home',
        status: 'Upcoming',
        meetTime: undefined,
        groundAddress: undefined,
        mapsUrl: undefined,
        captainId: undefined,
        playerOfTheMatchId: undefined,
        matchdaySquadCap: undefined,
        pitchPlayerCount: undefined,
        matchPeriodCount: undefined,
        periodDurationMinutes: undefined,
        formation: undefined,
      };

      const saved = await storage.saveFixture(fixtureWithUndefined);
      assert.strictEqual(saved.id, 'fix_test_1');

      // Verify Firestore has the fixture document without undefined fields
      const firestoreDoc = await mockFirestore.collection('fixtures').doc('fix_test_1').get();
      assert.strictEqual(firestoreDoc.exists, true);
      const data = firestoreDoc.data();
      assert.strictEqual(data.opponent, 'Hilltop Wanderers');
      assert.strictEqual('meetTime' in data, false);
      assert.strictEqual('captainId' in data, false);
    });

    it('bulk saves multiple players containing undefined fields via batch without throwing', async () => {
      const mockFirestore = new MockFirestore();
      const storage = new StorageManager(mockFirestore);

      const players: Player[] = [
        {
          id: 'p_bulk_1',
          teamId: 'team_beta',
          name: 'Player One',
          squadNumber: undefined,
          preferredPositions: ['Midfield'],
          unavailableDates: [],
          matchesPlayed: 0,
          totalMinutesPlayed: 0,
        },
        {
          id: 'p_bulk_2',
          teamId: 'team_beta',
          name: 'Player Two',
          squadNumber: 10,
          signOnDate: undefined,
          preferredPositions: ['Defence'],
          unavailableDates: [],
          matchesPlayed: 0,
          totalMinutesPlayed: 0,
        },
      ];

      const saved = await storage.bulkSavePlayers(players);
      assert.strictEqual(saved.length, 2);
    });

    it('retrieves fixtures sorted by date descending without composite index error', async () => {
      const mockFirestore = new MockFirestore();
      const storage = new StorageManager(mockFirestore);

      // Seed 2 fixtures with different dates for the same team
      await storage.saveFixture({
        id: 'fix_earlier',
        teamId: 'team_gamma',
        date: '2026-10-01',
        opponent: 'Early Opponent',
        venue: 'Home',
        status: 'Completed',
      });
      await storage.saveFixture({
        id: 'fix_later',
        teamId: 'team_gamma',
        date: '2026-11-01',
        opponent: 'Later Opponent',
        venue: 'Away',
        status: 'Upcoming',
      });

      const fixtures = await storage.getFixtures('team_gamma');
      assert.strictEqual(fixtures.length, 2);
      assert.strictEqual(fixtures[0].id, 'fix_later'); // 2026-11-01 comes first
      assert.strictEqual(fixtures[1].id, 'fix_earlier'); // 2026-10-01 comes second
    });

    it('returns empty array [] when querying players for an existing team that has no players in DB', async () => {
      const mockFirestore = new MockFirestore();
      const storage = new StorageManager(mockFirestore);

      // Seed one player for a different team so collection is not empty
      await storage.savePlayer({
        id: 'p_other',
        teamId: 'team_other',
        name: 'Other Player',
        preferredPositions: ['Defence'],
        unavailableDates: [],
        matchesPlayed: 0,
        totalMinutesPlayed: 0,
      });

      // Querying an empty team should return [] and NOT resurrect default seed players
      const emptyTeamPlayers = await storage.getPlayers('team_empty_new');
      assert.deepEqual(emptyTeamPlayers, []);
    });

    it('persists and retrieves clubSettings to/from Firestore collection settings/club', async () => {
      const mockFirestore = new MockFirestore();
      const storage = new StorageManager(mockFirestore);

      const updatedClub = await storage.updateClubSettings({
        clubName: 'Riverside Athletic',
        primaryColor: '#ff0000',
      });

      assert.strictEqual(updatedClub.clubName, 'Riverside Athletic');
      assert.strictEqual(updatedClub.primaryColor, '#ff0000');

      // Verify directly from Firestore doc
      const doc = await mockFirestore.collection('settings').doc('club').get();
      assert.strictEqual(doc.exists, true);
      assert.strictEqual(doc.data().clubName, 'Riverside Athletic');
      assert.strictEqual(doc.data().primaryColor, '#ff0000');

      // Verify from storage.getClubSettings()
      const retrieved = await storage.getClubSettings();
      assert.strictEqual(retrieved.clubName, 'Riverside Athletic');
    });

    it('persists, queries, and deletes admin users in Firestore collection adminUsers', async () => {
      const mockFirestore = new MockFirestore();
      const storage = new StorageManager(mockFirestore);

      const created = await storage.upsertAdminUser({
        uid: 'user_coach_1',
        email: 'coach1@rovers.local',
        displayName: 'Coach Smith',
        role: 'coach',
      });

      assert.strictEqual(created.uid, 'user_coach_1');
      assert.strictEqual(created.role, 'coach');

      // Verify stored in Firestore
      const doc = await mockFirestore.collection('adminUsers').doc('user_coach_1').get();
      assert.strictEqual(doc.exists, true);
      assert.strictEqual(doc.data().displayName, 'Coach Smith');

      // Fetch by uid
      const user = await storage.getAdminUserByUid('user_coach_1');
      assert.strictEqual(user?.email, 'coach1@rovers.local');

      // Delete user
      const deleted = await storage.deleteAdminUser('user_coach_1');
      assert.strictEqual(deleted, true);

      // Verify deleted in Firestore
      const docAfter = await mockFirestore.collection('adminUsers').doc('user_coach_1').get();
      assert.strictEqual(docAfter.exists, false);
    });
  });

  describe('Official Firestore SDK Configuration Validation', () => {
    it('throws validation error when saving undefined properties without ignoreUndefinedProperties: true', () => {
      const rawDb = new Firestore({ projectId: 'test-project' });
      assert.throws(
        () => {
          rawDb.collection('players').doc('test').set({
            name: 'Leo',
            squadNumber: undefined,
          });
        },
        {
          name: 'Error',
          message: /Cannot use "undefined" as a Firestore value/,
        }
      );
    });

    it('does NOT throw validation error when instantiated with ignoreUndefinedProperties: true', async () => {
      const safeDb = new Firestore({
        projectId: 'test-project',
        ignoreUndefinedProperties: true,
      });

      // Stub low-level request to prevent background gRPC network/auth calls in test runner
      (safeDb as any).request = async () => ({ writeResults: [{ updateTime: {} }] });

      // Validates that synchronous document argument validation passes without error
      await assert.doesNotReject(async () => {
        await safeDb.collection('players').doc('test').set({
          name: 'Leo',
          squadNumber: undefined,
        });
      });
    });
  });
});


