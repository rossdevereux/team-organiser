import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import {
  SupportTicketCategory,
  SupportTelemetry,
  SupportTicketRequest,
} from '../types.js';

const router = Router();

export const JIRA_PROJECT_KEY = 'OPS';

/**
 * Maps client-side support categories to Jira Service Management Issue Type IDs in the `OPS` project:
 * - bug -> 10002 (Problem)
 * - feature -> 10003 (Suggestion)
 * - question -> 10001 (Question)
 */
export const JIRA_ISSUE_TYPE_MAP: Record<SupportTicketCategory, string> = {
  bug: '10002',
  feature: '10003',
  question: '10001',
};

export interface AdfNode {
  type: string;
  attrs?: Record<string, any>;
  content?: AdfNode[];
  text?: string;
}

export interface AdfDocument {
  type: 'doc';
  version: 1;
  content: AdfNode[];
}

/**
 * Constructs an Atlassian Document Format (ADF) payload containing the coach's
 * narrative description followed by a structured JSON code block of diagnostic telemetry.
 */
export function buildJiraAdfDescription(
  description: string,
  telemetry: SupportTelemetry
): AdfDocument {
  const paragraphs = description
    .trim()
    .split(/\r?\n\r?\n/)
    .filter((p) => p.trim().length > 0)
    .map((para) => ({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: para.trim(),
        },
      ],
    }));

  if (paragraphs.length === 0) {
    paragraphs.push({
      type: 'paragraph',
      content: [{ type: 'text', text: description.trim() || 'No description provided.' }],
    });
  }

  return {
    type: 'doc',
    version: 1,
    content: [
      ...paragraphs,
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [
          {
            type: 'text',
            text: 'Diagnostic Telemetry',
          },
        ],
      },
      {
        type: 'codeBlock',
        attrs: { language: 'json' },
        content: [
          {
            type: 'text',
            text: JSON.stringify(telemetry, null, 2),
          },
        ],
      },
    ],
  };
}

/**
 * Builds the complete Jira REST API v3 issue creation payload for the `OPS` queue.
 */
export function buildJiraIssuePayload(params: {
  category: SupportTicketCategory;
  summary: string;
  description: string;
  telemetry: SupportTelemetry;
  projectKey?: string;
}) {
  const issueTypeId = JIRA_ISSUE_TYPE_MAP[params.category] || JIRA_ISSUE_TYPE_MAP.question;
  const projectKey = params.projectKey || JIRA_PROJECT_KEY;

  return {
    fields: {
      project: {
        key: projectKey,
      },
      summary: params.summary.trim(),
      issuetype: {
        id: issueTypeId,
      },
      description: buildJiraAdfDescription(params.description, params.telemetry),
    },
  };
}

export interface SubmitSupportTicketOptions {
  jiraHost?: string;
  jiraUserEmail?: string;
  jiraApiToken?: string;
  fetchImpl?: typeof fetch;
}

export interface SubmitSupportTicketResult {
  status: number;
  body: {
    success?: boolean;
    ticketKey?: string;
    issueTypeId?: string;
    simulated?: boolean;
    adfPayload?: AdfDocument;
    error?: string;
    details?: any;
  };
}

/**
 * Validates, formats, and dispatches a support ticket to Jira Service Management (`OPS`).
 * Falls back to simulated mode when Jira credentials are unset in local development.
 */
export async function submitSupportTicket(
  request: SupportTicketRequest,
  userContext: { uid: string; email?: string; role?: string },
  options: SubmitSupportTicketOptions = {}
): Promise<SubmitSupportTicketResult> {
  const { category, summary, description, telemetry: clientTelemetry } = request || ({} as any);

  if (!category || !['bug', 'feature', 'question'].includes(category)) {
    return {
      status: 400,
      body: { error: 'Invalid ticket category. Must be bug, feature, or question.' },
    };
  }

  if (!summary || typeof summary !== 'string' || summary.trim().length === 0) {
    return {
      status: 400,
      body: { error: 'Summary is required.' },
    };
  }

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return {
      status: 400,
      body: { error: 'Description is required.' },
    };
  }

  const telemetry: SupportTelemetry = {
    userEmail: userContext.email || clientTelemetry?.userEmail || 'unknown@subshuffle.local',
    userId: userContext.uid || clientTelemetry?.userId || 'unknown',
    activeTeamId: clientTelemetry?.activeTeamId,
    activeFixtureId: clientTelemetry?.activeFixtureId,
    currentPath: clientTelemetry?.currentPath || '/',
    viewport: clientTelemetry?.viewport || 'unknown',
    userAgent: clientTelemetry?.userAgent || 'unknown',
    appVersion: clientTelemetry?.appVersion || '1.6.1',
    onlineStatus: clientTelemetry?.onlineStatus ?? true,
    timestamp: clientTelemetry?.timestamp || new Date().toISOString(),
  };

  const issueTypeId = JIRA_ISSUE_TYPE_MAP[category];
  const jiraPayload = buildJiraIssuePayload({
    category,
    summary,
    description,
    telemetry,
  });

  const jiraHost = (options.jiraHost ?? process.env.JIRA_HOST ?? 'subshuffle.atlassian.net')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');
  const jiraUserEmail = (options.jiraUserEmail ?? process.env.JIRA_USER_EMAIL ?? '').trim();
  const jiraApiToken = (options.jiraApiToken ?? process.env.JIRA_API_TOKEN ?? '').trim();
  const fetchFn = options.fetchImpl || globalThis.fetch;

  // Simulated fallback when Jira credentials are not configured in local dev
  if (!jiraUserEmail || !jiraApiToken) {
    const mockNum = Math.floor(10 + Math.random() * 90);
    const simulatedKey = `${JIRA_PROJECT_KEY}-${mockNum}`;
    console.log(
      `🎫 [Support JSM Simulated] Created ${simulatedKey} (IssueType ${issueTypeId}) for UID ${telemetry.userId}: "${summary.trim()}"`
    );
    return {
      status: 201,
      body: {
        success: true,
        ticketKey: simulatedKey,
        issueTypeId,
        simulated: true,
        adfPayload: jiraPayload.fields.description,
      },
    };
  }

  const basicAuth = Buffer.from(`${jiraUserEmail}:${jiraApiToken}`).toString('base64');
  const endpoint = `https://${jiraHost}/rest/api/3/issue`;

  try {
    const response = await fetchFn(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jiraPayload),
    });

    if (response.status === 429) {
      return {
        status: 429,
        body: {
          error: 'Support service is temporarily rate-limited. Please wait a moment and try again.',
        },
      };
    }

    const responseData: any = await response.json().catch(() => ({}));

    if (!response.ok) {
      const jiraErrorMsg =
        responseData?.errorMessages?.[0] ||
        (responseData?.errors && Object.values(responseData.errors)[0]) ||
        `Jira API returned status ${response.status}`;
      console.error(`⚠️ Jira Service Management API error (${response.status}):`, responseData);
      return {
        status: response.status >= 400 && response.status < 600 ? response.status : 502,
        body: {
          error: String(jiraErrorMsg),
          details: responseData?.errors,
        },
      };
    }

    const ticketKey = responseData?.key || `${JIRA_PROJECT_KEY}-1`;
    console.log(
      `✅ [Support JSM] Created ticket ${ticketKey} (IssueType ${issueTypeId}) for UID ${telemetry.userId}`
    );

    return {
      status: 201,
      body: {
        success: true,
        ticketKey,
        issueTypeId,
        simulated: false,
      },
    };
  } catch (err: any) {
    console.error('❌ Network error communicating with Jira Service Management:', err);
    return {
      status: 502,
      body: {
        error: 'Failed to reach support desk service. Please try again shortly.',
      },
    };
  }
}

/**
 * POST /api/support/ticket
 * Creates a support or feedback issue in Jira Service Management (`OPS`).
 */
router.post('/ticket', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const result = await submitSupportTicket(req.body, {
    uid: req.user!.uid,
    email: req.user!.email,
    role: req.user!.role,
  });
  return res.status(result.status).json(result.body);
});

export default router;

