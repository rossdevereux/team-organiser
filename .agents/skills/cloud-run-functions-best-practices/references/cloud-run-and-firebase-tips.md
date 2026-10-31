# Reference Guide: Cloud Run Functions & Firebase Functions Best Practices

Distilled from:
- [Google Cloud Run Functions Best Practices (`docs.cloud.google.com/run/docs/tips/functions-best-practices`)](https://docs.cloud.google.com/run/docs/tips/functions-best-practices)
- [Firebase Cloud Functions Tips & Tricks (`firebase.google.com/docs/functions/tips`)](https://firebase.google.com/docs/functions/tips)

---

## 1. Global Scope vs. Lazy Initialization

### Anti-Pattern: Instantiating SDK Clients Inside the Request Handler
Creating a new SDK client or database connection inside a route handler forces TLS handshakes, credential metadata lookups, and memory allocations on every single request:

```typescript
// ❌ BAD: Re-initializes Stripe and Firestore on every request
router.post('/checkout', async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const db = getFirestore();
  // ...
});
```

### Best Practice: Lazy Singleton in Module Scope
Lazily initialize expensive clients on first use so:
1. Cold starts for unrelated routes (e.g., `/api/health` or `/api/teams`) don't pay the initialization penalty of unused SDKs.
2. Subsequent invocations on the same warm container reuse the cached instance and its underlying HTTP keep-alive pool.

```typescript
// ✅ GOOD: Lazy singleton reused across warm invocations
let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe | null {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY.trim(), {
      maxNetworkRetries: 2,
      timeout: 10_000,
    });
  }
  return stripeClient;
}
```

---

## 2. Synchronous vs. Asynchronous Lifecycle & CPU Throttling

In Cloud Run (with default request-based billing) and Cloud Functions:
- **CPU is only allocated while an HTTP request is actively being processed.**
- As soon as `res.send()`, `res.json()`, or `res.end()` is called, the container's CPU is throttled. Any unawaited background Promise started before returning may freeze indefinitely or execute minutes later when the next request arrives.

### Anti-Pattern: Fire-and-Forget Promises After Sending Response
```typescript
// ❌ BAD: CPU is throttled immediately after res.json(); background write may stall or fail
router.post('/webhook', async (req, res) => {
  res.status(200).json({ received: true });
  // Danger: runs after HTTP response finished!
  recordProcessedStripeEvent(req.body.id, req.body.type);
});
```

### Best Practice: Await All Work Before Returning
```typescript
// ✅ GOOD: All async side effects complete while CPU is actively allocated
router.post('/webhook', async (req, res) => {
  await processStripeEvent(req.body);
  await recordProcessedStripeEvent(req.body.id, req.body.type);
  return res.status(200).json({ received: true });
});
```

---

## 3. Concurrency & Request Isolation

Cloud Run containers process up to 80 concurrent requests per instance by default (`--concurrency 80`).

### Anti-Pattern: Storing Request Context in Module-Scope Variables
```typescript
// ❌ BAD: Concurrent requests from Coach A and Coach B overwrite currentUserId!
let currentUserId: string | null = null;

router.post('/teams', requireAuth, async (req: AuthenticatedRequest, res) => {
  currentUserId = req.user!.uid;
  await doSomethingAsync();
  // By the time doSomethingAsync() resolves, another request may have mutated currentUserId
  await saveTeamForUser(currentUserId, req.body);
});
```

### Best Practice: Pass Request Context Explicitly
Always pass `req.user.uid` (or a context object) as function parameters down the call stack.

---

## 4. Ephemeral `/tmp` Storage (`tmpfs`) Cleanup

In Cloud Run and Firebase Functions, `os.tmpdir()` (`/tmp`) is an in-memory `tmpfs` mount that directly consumes the container's RAM limit (e.g., `512Mi`).

```typescript
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';

// ✅ GOOD: Always unlink temp files inside a finally block
export async function withTempFile<T>(
  prefix: string,
  content: Buffer | string,
  fn: (filePath: string) => Promise<T>
): Promise<T> {
  const tempPath = path.join(os.tmpdir(), `${prefix}-${crypto.randomUUID()}`);
  await fs.writeFile(tempPath, content);
  try {
    return await fn(tempPath);
  } finally {
    await fs.unlink(tempPath).catch(() => {});
  }
}
```

---

## 5. Idempotency & Out-of-Order Event Protection

Distributed queues (Pub/Sub, Cloud Tasks, Stripe Webhooks, Firestore Triggers) guarantee *at-least-once* delivery and do not guarantee strict ordering.

1. **Idempotency Ledger with Native Firestore TTL**:
   - Store processed event IDs in a dedicated collection (e.g., `stripe_events/{eventId}`) with an `expireAt: Timestamp` field configured for Firestore TTL cleanup.
   - Check `hasProcessedEvent(eventId)` before executing state changes.
2. **Out-of-Order Timestamp Guard**:
   - Store `lastWebhookCreated` on the entity document.
   - If an incoming event has `event.created < entity.lastWebhookCreated`, do not blindly apply the stale payload—fetch the latest authoritative state from the upstream API (`stripe.subscriptions.retrieve(...)`).

---

## 6. Outbound Network Calls & Error Handling

When calling external APIs (such as Jira Cloud REST API or Stripe):
- **Enforce Timeouts**: Use `AbortSignal.timeout(10_000)` on `fetch()` so hung upstream sockets fail fast instead of consuming container concurrency slots.
- **Handle Rate Limits (`429`) & Upstream Errors (`5xx`)**: Map upstream `429` responses cleanly and avoid leaking internal stack traces or credentials in client error responses.
- **Strip Trailing Whitespace/CRLF on Secrets**: Secrets pasted via Windows terminals or Secret Manager often include trailing `\r\n`. Always `.trim()` secret environment variables (`process.env.STRIPE_SECRET_KEY?.trim()`) before passing them to HTTP headers or SDK constructors.

---

## 7. Cloud Run Deployment & Cost Hygiene

When configuring `.github/workflows/deploy.yml` or running `gcloud run deploy`:
- **Preserve Existing Environment Variables**: Always use `--update-env-vars` and `--update-secrets` instead of `--set-env-vars` (which deletes all other environment variables on the service).
- **Scale to Zero When Idle**: Set `--min-instances 0` to keep idle cost at `$0/month` unless sub-second cold starts are strictly required.
- **Cap Maximum Instances**: Set `--max-instances` (e.g., `2` on `backend-api-beta`, `10` on `team-organiser-api`) to prevent unexpected cost spikes during traffic surges.

