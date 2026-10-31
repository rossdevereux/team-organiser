import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../');

describe('Multi-Site Staging & Dual-Branch CI/CD Pipeline Suite (Issue #33)', () => {
  it('defines live and beta Firebase Hosting targets in .firebaserc', () => {
    const raw = fs.readFileSync(path.join(ROOT_DIR, '.firebaserc'), 'utf-8');
    const parsed = JSON.parse(raw);

    assert.strictEqual(parsed.projects?.default, 'team-organiser-prod');
    const hostingTargets = parsed.targets?.['team-organiser-prod']?.hosting;
    assert.ok(hostingTargets, 'Expected hosting targets for team-organiser-prod');
    assert.deepEqual(hostingTargets.live, ['team-organiser-prod']);
    assert.deepEqual(hostingTargets.beta, ['subshuffle-beta']);
  });

  it('configures multi-site hosting array with live and beta Cloud Run rewrites in firebase.json', () => {
    const raw = fs.readFileSync(path.join(ROOT_DIR, 'firebase.json'), 'utf-8');
    const parsed = JSON.parse(raw);

    assert.ok(Array.isArray(parsed.hosting), 'Expected hosting in firebase.json to be an array');
    assert.strictEqual(parsed.hosting.length, 2);

    const liveTarget = parsed.hosting.find((t: any) => t.target === 'live');
    const betaTarget = parsed.hosting.find((t: any) => t.target === 'beta');

    assert.ok(liveTarget, 'Expected live hosting target in firebase.json');
    assert.ok(betaTarget, 'Expected beta hosting target in firebase.json');

    const liveApiRewrite = liveTarget.rewrites.find((r: any) => r.source === '/api/**');
    const betaApiRewrite = betaTarget.rewrites.find((r: any) => r.source === '/api/**');

    assert.strictEqual(liveApiRewrite?.run?.serviceId, 'team-organiser-api');
    assert.strictEqual(liveApiRewrite?.run?.region, 'europe-west1');
    assert.strictEqual(betaApiRewrite?.run?.serviceId, 'backend-api-beta');
    assert.strictEqual(betaApiRewrite?.run?.region, 'europe-west1');
  });

  it('configures dual-branch deployment logic for main and beta in .github/workflows/deploy.yml', () => {
    const workflow = fs.readFileSync(
      path.join(ROOT_DIR, '.github/workflows/deploy.yml'),
      'utf-8'
    );

    assert.ok(workflow.includes('- main'), 'Expected main branch trigger');
    assert.ok(workflow.includes('- beta'), 'Expected beta branch trigger');
    assert.ok(workflow.includes('set-env:'), 'Expected set-env job');
    assert.ok(workflow.includes('cloud_run_service=team-organiser-api'), 'Expected production Cloud Run service');
    assert.ok(workflow.includes('cloud_run_service=backend-api-beta'), 'Expected beta Cloud Run service');
    assert.ok(workflow.includes('hosting_target=live'), 'Expected live hosting target');
    assert.ok(workflow.includes('hosting_target=beta'), 'Expected beta hosting target');
    assert.ok(
      workflow.includes('target: ${{ needs.set-env.outputs.hosting_target }}'),
      'Expected Firebase Hosting deploy step to use dynamic hosting_target'
    );
  });
});

