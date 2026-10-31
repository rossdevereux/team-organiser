import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  JIRA_PROJECT_KEY,
  JIRA_ISSUE_TYPE_MAP,
  buildJiraAdfDescription,
  buildJiraIssuePayload,
  submitSupportTicket,
} from '../routes/support.js';
import { SupportTelemetry } from '../types.js';

const sampleTelemetry: SupportTelemetry = {
  userEmail: 'coach@subshuffle.com',
  userId: 'uid-coach-1',
  activeTeamId: 'team-u10-tigers',
  activeFixtureId: 'fix-sat-morning',
  currentPath: '/team/team-u10-tigers/fixture/fix-sat-morning',
  viewport: '390x844',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
  appVersion: '1.6.1',
  onlineStatus: true,
  timestamp: '2026-10-31T09:30:00.000Z',
};

describe('Support Ticket & Jira Service Management (JSM) Integration (Issue #36)', () => {
  it('maps bug, feature, and question categories to exact OPS Issue Type IDs', () => {
    assert.equal(JIRA_PROJECT_KEY, 'OPS');
    assert.equal(JIRA_ISSUE_TYPE_MAP.bug, '10002');
    assert.equal(JIRA_ISSUE_TYPE_MAP.feature, '10003');
    assert.equal(JIRA_ISSUE_TYPE_MAP.question, '10001');
  });

  it('constructs valid Atlassian Document Format (ADF) with narrative paragraphs and JSON telemetry codeBlock', () => {
    const description = 'First paragraph about substitution timer.\n\nSecond paragraph with steps to reproduce.';
    const adf = buildJiraAdfDescription(description, sampleTelemetry);

    assert.equal(adf.type, 'doc');
    assert.equal(adf.version, 1);
    assert.equal(adf.content.length, 4);

    assert.equal(adf.content[0].type, 'paragraph');
    assert.equal(adf.content[0].content?.[0].text, 'First paragraph about substitution timer.');

    assert.equal(adf.content[1].type, 'paragraph');
    assert.equal(adf.content[1].content?.[0].text, 'Second paragraph with steps to reproduce.');

    assert.equal(adf.content[2].type, 'heading');
    assert.equal(adf.content[2].attrs?.level, 3);
    assert.equal(adf.content[2].content?.[0].text, 'Diagnostic Telemetry');

    assert.equal(adf.content[3].type, 'codeBlock');
    assert.equal(adf.content[3].attrs?.language, 'json');
    const parsedTelemetry = JSON.parse(adf.content[3].content?.[0].text || '{}');
    assert.equal(parsedTelemetry.userEmail, 'coach@subshuffle.com');
    assert.equal(parsedTelemetry.activeTeamId, 'team-u10-tigers');
    assert.equal(parsedTelemetry.activeFixtureId, 'fix-sat-morning');
    assert.equal(parsedTelemetry.viewport, '390x844');
  });

  it('builds complete Jira REST API v3 issue payload targeting project OPS', () => {
    const payload = buildJiraIssuePayload({
      category: 'feature',
      summary: '  Add dark mode toggle on pitch view  ',
      description: 'Would help with evening floodlit matches.',
      telemetry: sampleTelemetry,
    });

    assert.equal(payload.fields.project.key, 'OPS');
    assert.equal(payload.fields.summary, 'Add dark mode toggle on pitch view');
    assert.equal(payload.fields.issuetype.id, '10003');
    assert.equal(payload.fields.description.type, 'doc');
  });

  it('validates required category, summary, and description fields with 400 status', async () => {
    const invalidCategory = await submitSupportTicket(
      {
        category: 'invalid' as any,
        summary: 'Test',
        description: 'Test description',
        telemetry: sampleTelemetry,
      },
      { uid: 'u1', email: 'coach@subshuffle.com' }
    );
    assert.equal(invalidCategory.status, 400);

    const missingSummary = await submitSupportTicket(
      {
        category: 'bug',
        summary: '   ',
        description: 'Test description',
        telemetry: sampleTelemetry,
      },
      { uid: 'u1', email: 'coach@subshuffle.com' }
    );
    assert.equal(missingSummary.status, 400);

    const missingDescription = await submitSupportTicket(
      {
        category: 'question',
        summary: 'How do I export CSV?',
        description: '',
        telemetry: sampleTelemetry,
      },
      { uid: 'u1', email: 'coach@subshuffle.com' }
    );
    assert.equal(missingDescription.status, 400);
  });

  it('falls back to simulated mode when Jira credentials are unset', async () => {
    const res = await submitSupportTicket(
      {
        category: 'question',
        summary: 'How do I add a co-coach?',
        description: 'Looking for team invite link.',
        telemetry: sampleTelemetry,
      },
      { uid: 'uid-coach-1', email: 'coach@subshuffle.com' },
      {
        jiraHost: 'subshuffle.atlassian.net',
        jiraUserEmail: '',
        jiraApiToken: '',
      }
    );

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.simulated, true);
    assert.equal(res.body.issueTypeId, '10001');
    assert.match(res.body.ticketKey || '', /^OPS-\d+$/);
  });

  it('dispatches authenticated POST request to Jira Cloud REST API v3 and returns created ticket key', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = null;

    const mockFetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedHeaders = (init?.headers as Record<string, string>) || {};
      capturedBody = JSON.parse(String(init?.body || '{}'));
      return new Response(JSON.stringify({ id: '10142', key: 'OPS-42' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    const res = await submitSupportTicket(
      {
        category: 'bug',
        summary: 'Goalie rotation badge overlaps on iPhone SE',
        description: 'Happens in Q3 when 3 subs are queued.',
        telemetry: sampleTelemetry,
      },
      { uid: 'uid-coach-1', email: 'coach@subshuffle.com' },
      {
        jiraHost: 'subshuffle.atlassian.net',
        jiraUserEmail: 'bot@subshuffle.com',
        jiraApiToken: 'secret-jira-token-123',
        fetchImpl: mockFetch,
      }
    );

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.simulated, false);
    assert.equal(res.body.ticketKey, 'OPS-42');
    assert.equal(res.body.issueTypeId, '10002');

    assert.equal(capturedUrl, 'https://subshuffle.atlassian.net/rest/api/3/issue');
    const expectedAuth = `Basic ${Buffer.from('bot@subshuffle.com:secret-jira-token-123').toString('base64')}`;
    assert.equal(capturedHeaders.Authorization, expectedAuth);
    assert.equal(capturedBody.fields.project.key, 'OPS');
    assert.equal(capturedBody.fields.issuetype.id, '10002');
    assert.equal(capturedBody.fields.summary, 'Goalie rotation badge overlaps on iPhone SE');
  });

  it('handles Jira 429 rate-limiting and 502 network failures gracefully', async () => {
    const rateLimitedFetch = (async () =>
      new Response(JSON.stringify({ errorMessages: ['Rate limit exceeded'] }), {
        status: 429,
      })) as typeof fetch;

    const rateLimitRes = await submitSupportTicket(
      {
        category: 'bug',
        summary: 'Rate limit check',
        description: 'Testing 429',
        telemetry: sampleTelemetry,
      },
      { uid: 'uid-coach-1', email: 'coach@subshuffle.com' },
      {
        jiraHost: 'subshuffle.atlassian.net',
        jiraUserEmail: 'bot@subshuffle.com',
        jiraApiToken: 'token',
        fetchImpl: rateLimitedFetch,
      }
    );
    assert.equal(rateLimitRes.status, 429);
    assert.match(rateLimitRes.body.error || '', /rate-limited/i);

    const networkFailFetch = (async () => {
      throw new Error('ECONNRESET');
    }) as typeof fetch;

    const networkFailRes = await submitSupportTicket(
      {
        category: 'bug',
        summary: 'Network failure check',
        description: 'Testing 502',
        telemetry: sampleTelemetry,
      },
      { uid: 'uid-coach-1', email: 'coach@subshuffle.com' },
      {
        jiraHost: 'subshuffle.atlassian.net',
        jiraUserEmail: 'bot@subshuffle.com',
        jiraApiToken: 'token',
        fetchImpl: networkFailFetch,
      }
    );
    assert.equal(networkFailRes.status, 502);
  });
});

