---
name: cloud-run-functions-best-practices
description: >-
  Best practices and performance, reliability, cost, and security guidelines for authoring,
  reviewing, and deploying Google Cloud Run services, Cloud Run functions (2nd gen), and
  Firebase Functions. Use this skill whenever writing, refactoring, or reviewing backend
  endpoints, webhooks, background triggers, or Cloud Run / Firebase deployment configurations.
compatibility: universal
triggers:
  - "cloud run function"
  - "cloud functions"
  - "firebase functions"
  - "serverless best practices"
  - "cold start optimization"
  - "cloud run optimization"
  - "webhook handler"
---

# Cloud Run & Firebase Functions Best Practices Skill

This skill encodes official architecture, performance, reliability, and security guidelines from:
- [Google Cloud Run Functions Best Practices (`docs.cloud.google.com/run/docs/tips/functions-best-practices`)](https://docs.cloud.google.com/run/docs/tips/functions-best-practices)
- [Firebase Cloud Functions Tips & Tricks (`firebase.google.com/docs/functions/tips`)](https://firebase.google.com/docs/functions/tips)

For deep-dive examples and code templates, read [references/cloud-run-and-firebase-tips.md](./references/cloud-run-and-firebase-tips.md).

---

##When to Apply This Skill

Activate and apply these rules whenever you:
1. Create or modify an HTTP endpoint, Express route, webhook, or Cloud Function in `server/` or `functions/`.
2. Configure SDK clients (Firebase Admin, Firestore, Stripe, Jira/external REST clients).
3. Author event-driven triggers (Firestore document triggers, Pub/Sub, Stripe webhooks).
4. Modify `Dockerfile`, `.github/workflows/deploy.yml`, `firebase.json`, or `gcloud run deploy` scripts.

---

## Core Rules & Implementation Checklist

### 1. Cold Start Mitigation, Global Scope & Lazy Initialization
- **Reuse Clients in Global Scope**: Initialize stateless SDKs and connection pools (`firebase-admin`, `Firestore`, `Stripe`) at module/global scope outside request handlers so warm container instances reuse them across invocations.
- **Lazy-Initialize Rarely Used Clients**: If an SDK or heavy object is only needed by specific routes (e.g., billing or support), declare the holder in global scope and lazily instantiate it on first invocation (`let stripeClient: Stripe | null = null; function getStripe() { ... }`). Do not eagerly initialize every third-party client on container boot if most requests don't touch it.
- **Keep Dependencies Lean**: Avoid barrel imports of massive libraries; prune unused dependencies from `package.json` and exclude dev/test artifacts from production Docker images.

### 2. Connection Pooling & Outbound HTTP Keep-Alive
- **Reuse Outbound Connections**: Outbound `fetch` or SDK requests to Google APIs, Stripe, or Atlassian/Jira should reuse persistent HTTP/HTTPS connections (Keep-Alive) rather than renegotiating TLS handshakes on every invocation.
- **Set Explicit Timeouts on Outbound Calls**: Always guard external `fetch` calls with an `AbortSignal.timeout(ms)` or SDK timeout so a stalled upstream service never hangs the Cloud Run request until container timeout.

### 3. Request Lifecycle, Promises & Background Work
- **Always Terminate HTTP Requests**: Every code path in an Express/HTTP handler (`try`, `catch`, validation early-returns) **must** send an explicit HTTP status and response (`return res.status(...).json(...)`). Unanswered requests hang until timeout and incur unnecessary billing.
- **Await All Promises Before Responding**: Under Cloud Run's default **CPU allocated only during request processing** (`--no-cpu-throttling` disabled), CPU is throttled to near-zero immediately after the HTTP response is sent. Never fire-and-forget unawaited Promises (`doAsyncWork()` without `await`) after `res.send()` / `res.json()`.
- **Return Promises in Event Triggers**: In background/event functions, always `return` or `await` the top-level Promise chain so the runtime does not freeze the container mid-flight.

### 4. Idempotency, Retries & Infinite Loop Prevention
- **Design Idempotent Handlers**: Webhooks (e.g., Stripe) and event triggers are delivered *at-least-once*. Always check an idempotency ledger (e.g., `stripe_events/{eventId}`) or use deterministic document IDs + preconditions before mutating state or issuing side effects.
- **Guard Against Out-of-Order Events**: Compare event creation timestamps (`event.created`) against the last processed timestamp or reconcile authoritative state from the upstream API when stale deliveries arrive.
- **Prevent Recursive Trigger Loops**: When a Firestore trigger or webhook updates a document it also watches, include an explicit termination guard (e.g., check if the field is already set or unchanged before writing).
- **Distinguish Transient vs. Permanent Errors**: Return `2xx` (or do not retry) on permanent validation/business errors so upstream queues don't enter infinite retry loops; return `429`/`5xx` only when a retry should occur.

### 5. Ephemeral Memory (`/tmp`) & Statelessness
- **Never Rely on Local Disk Across Requests**: Container instances scale up and down dynamically. Any state that must survive across requests belongs in Firestore or Cloud Storage.
- **Always Clean Up `/tmp` Files in `finally`**: In Cloud Run and Cloud Functions, `/tmp` (or `os.tmpdir()`) is an in-memory `tmpfs` mount backed by container RAM. Leaving temporary files in `/tmp` causes memory leaks and Out-Of-Memory (`OOM`) container crashes on warm instances. Always delete temporary files in a `try { ... } finally { await fs.unlink(tmpPath).catch(() => {}); }` block.
- **Thread-Safe Concurrency**: Cloud Run containers handle multiple concurrent requests (`--concurrency`). Never store request-scoped user identity, auth tokens, or mutable state in module-level global variables. Attach request context strictly to `req` (e.g., `AuthenticatedRequest`) or local function scope.

### 6. Security, Secrets & Cost Controls
- **Use Google Cloud Secret Manager**: Never hardcode secrets or overwrite secrets in CI/CD. Bind sensitive keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `JIRA_API_TOKEN`) via Secret Manager (`--update-secrets`) or `defineSecret()`, and use `--update-env-vars` (never `--set-env-vars`, which wipes existing variables).
- **Enforce `--min-instances` & `--max-instances`**:
  - Use `--min-instances 0` for zero-idle cost in grassroots/staging services (`--min-instances 1` only when sub-second cold-start SLA is mandatory).
  - Always set a realistic `--max-instances` cap (e.g., `2` for staging/beta, `10` for production) to protect against runaway billing spikes or DDoS traffic.
- **Native Firestore TTL for Ledger Hygiene**: Attach a Firestore `Timestamp` (`expireAt`) to high-volume event/idempotency collections (`stripe_events`, `payments`) so native Firestore TTL purges expired records automatically at zero compute cost.
- **Structured Logging**: Emit structured logs (`console.error` / `logger` with JSON metadata or clear severity prefixes) so Google Cloud Logging can index and filter errors by `uid`, `eventId`, or `ticketKey`.

---

## Code Review & Verification Checklist

Before finalizing any backend or Cloud Run change, verify:
- [ ] **No per-request SDK initialization**: Are Firebase Admin, Firestore, and third-party clients initialized globally or lazily cached?
- [ ] **No dangling Promises**: Are all async operations `await`ed *before* `res.status(...).json(...)` is returned?
- [ ] **No mutable request state in globals**: Is `req.user` or request data isolated per request so concurrent requests cannot bleed state?
- [ ] **Idempotency verified**: Can the endpoint/webhook safely receive the exact same payload twice without duplicating data?
- [ ] **`/tmp` cleanup**: If any file/buffer is written to `os.tmpdir()`, is it unlinked inside a `finally` block?
- [ ] **Deployment safety**: Does `deploy.yml` or the `gcloud run deploy` command use `--update-env-vars` and `--update-secrets` (never destructive `--set-env-vars`) and enforce `--max-instances`?

