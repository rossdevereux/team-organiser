import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Timestamp } from '@google-cloud/firestore';
import { StorageManager, calculatePaymentExpireDate } from '../db/storage.js';
import { processStripeWebhookEvent } from '../routes/billing.js';

/**
 * In-memory Mock Firestore supporting subcollections (`users/{uid}/payments`)
 * and `stripe_events/{eventId}` for unit testing.
 */
class MockBillingFirestore {
  public collections: Map<string, Map<string, any>> = new Map();

  private getCollectionMap(name: string): Map<string, any> {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
    }
    return this.collections.get(name)!;
  }

  collection(name: string): any {
    const colMap = this.getCollectionMap(name);
    return {
      doc: (id: string) => ({
        id,
        collection: (subName: string) => this.collection(`${name}/${id}/${subName}`),
        set: async (data: any, options?: { merge?: boolean }) => {
          for (const [key, value] of Object.entries(data)) {
            if (value === undefined) {
              throw new Error(`Firestore Error: Cannot use "undefined" in field "${key}"`);
            }
          }
          if (options?.merge && colMap.has(id)) {
            colMap.set(id, { ...colMap.get(id), ...data });
          } else {
            colMap.set(id, { ...data });
          }
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
    };
  }
}

describe('Resilient Stripe Webhooks, Payment Ledger & 24-Month TTL Suite (Issue #35)', () => {
  it('calculates expireAt exactly 24 months ahead of paidAt and stores a valid Firestore Timestamp', async () => {
    const mockFirestore = new MockBillingFirestore();
    const storage = new StorageManager(mockFirestore);

    const paidDate = new Date('2026-10-18T10:30:00.000Z');
    const expectedExpireDate = calculatePaymentExpireDate(paidDate);
    assert.strictEqual(expectedExpireDate.toISOString(), '2028-10-18T10:30:00.000Z');

    const saved = await storage.saveUserPayment('user_ttl_1', {
      id: 'in_test_ttl_1',
      customerEmail: 'coach@rovers.local',
      amountPaid: 1500,
      currency: 'gbp',
      status: 'paid',
      description: 'SubShuffle Coach Annual',
      paidAt: paidDate.toISOString(),
      hostedInvoiceUrl: 'https://invoice.stripe.com/i/test_1',
      invoicePdfUrl: 'https://pay.stripe.com/invoice/test_1/pdf',
      paymentMethod: {
        brand: 'visa',
        last4: '4242',
      },
    });

    assert.strictEqual(saved.expireAt, '2028-10-18T10:30:00.000Z');

    // Verify raw Firestore document stores a native Firestore Timestamp for TTL purging
    const rawDoc = await mockFirestore
      .collection('users')
      .doc('user_ttl_1')
      .collection('payments')
      .doc('in_test_ttl_1')
      .get();

    assert.strictEqual(rawDoc.exists, true);
    const rawData = rawDoc.data();
    assert.ok(
      rawData.expireAt instanceof Timestamp,
      'Expected expireAt in Firestore to be an instance of Firestore Timestamp'
    );
    assert.strictEqual(rawData.expireAt.toDate().toISOString(), '2028-10-18T10:30:00.000Z');
  });

  it('prevents duplicate webhook processing using stripe_events idempotency collection', async () => {
    const mockFirestore = new MockBillingFirestore();
    const storage = new StorageManager(mockFirestore);

    await storage.upsertAdminUser({
      uid: 'coach_idem_1',
      email: 'idem@rovers.local',
      role: 'coach',
      subscription: {
        status: 'trialing',
        tier: 'free_trial',
        trialStartedAt: '2026-10-01T00:00:00.000Z',
        trialEndsAt: '2026-10-31T00:00:00.000Z',
        stripeCustomerId: 'cus_idem_1',
        stripeSubscriptionId: 'sub_idem_1',
      },
    });

    const event: any = {
      id: 'evt_duplicate_test_1',
      type: 'invoice.payment_succeeded',
      created: 1760000000,
      data: {
        object: {
          id: 'in_idem_1',
          customer: 'cus_idem_1',
          subscription: 'sub_idem_1',
          amount_paid: 150,
          currency: 'gbp',
          customer_email: 'idem@rovers.local',
          hosted_invoice_url: 'https://invoice.stripe.com/i/in_idem_1',
          invoice_pdf: 'https://pay.stripe.com/invoice/in_idem_1/pdf',
          payment_method_details: {
            card: { brand: 'MasterCard', last4: '8888' },
          },
          lines: {
            data: [{ description: 'Coach Monthly Plan' }],
          },
        },
      },
    };

    // First delivery
    const firstResult = await processStripeWebhookEvent(event, {
      storageInstance: storage,
      stripeClient: null,
    });
    assert.strictEqual(firstResult.received, true);
    assert.strictEqual(firstResult.duplicate, undefined);
    assert.strictEqual(firstResult.paymentRecorded?.id, 'in_idem_1');
    assert.strictEqual(firstResult.paymentRecorded?.paymentMethod.brand, 'mastercard');
    assert.strictEqual(firstResult.paymentRecorded?.paymentMethod.last4, '8888');

    // Verify event ID stored in stripe_events with 30-day TTL Timestamp
    const eventDoc = await mockFirestore.collection('stripe_events').doc('evt_duplicate_test_1').get();
    assert.strictEqual(eventDoc.exists, true);
    assert.ok(eventDoc.data().expireAt instanceof Timestamp);

    // Second (duplicate) delivery
    const secondResult = await processStripeWebhookEvent(event, {
      storageInstance: storage,
      stripeClient: null,
    });
    assert.strictEqual(secondResult.received, true);
    assert.strictEqual(secondResult.duplicate, true);

    const payments = await storage.getUserPayments('coach_idem_1');
    assert.strictEqual(payments.length, 1);
  });

  it('detects out-of-order webhook delivery and reconciles ground truth via stripe.subscriptions.retrieve()', async () => {
    const mockFirestore = new MockBillingFirestore();
    const storage = new StorageManager(mockFirestore);

    await storage.upsertAdminUser({
      uid: 'coach_order_1',
      email: 'order@rovers.local',
      role: 'coach',
      subscription: {
        status: 'trialing',
        tier: 'free_trial',
        trialStartedAt: '2026-10-01T00:00:00.000Z',
        trialEndsAt: '2026-10-31T00:00:00.000Z',
        stripeCustomerId: 'cus_order_1',
        stripeSubscriptionId: 'sub_order_1',
      },
    });

    // 1. Newer event arrives FIRST (t = 2000): Subscription renewed & active
    const newerActiveEvent: any = {
      id: 'evt_newer_active_2000',
      type: 'customer.subscription.updated',
      created: 2000,
      data: {
        object: {
          id: 'sub_order_1',
          customer: 'cus_order_1',
          status: 'active',
          current_period_end: 3000,
          cancel_at_period_end: false,
        },
      },
    };

    await processStripeWebhookEvent(newerActiveEvent, {
      storageInstance: storage,
      stripeClient: null,
    });

    const subAfterNewer = await storage.getUserSubscription('coach_order_1');
    assert.strictEqual(subAfterNewer.status, 'active');
    assert.strictEqual(subAfterNewer.lastWebhookCreated, 2000);

    // 2. Older/stale event arrives LATER (t = 1500): Delayed cancellation or past_due webhook
    let retrieveCalledWithSubId: string | null = null;
    const mockStripeClient: any = {
      subscriptions: {
        retrieve: async (subId: string) => {
          retrieveCalledWithSubId = subId;
          return {
            id: subId,
            customer: 'cus_order_1',
            status: 'active', // Ground truth on Stripe is active!
            current_period_end: 3000,
            cancel_at_period_end: false,
            created: 2000,
          };
        },
      },
    };

    const staleCanceledEvent: any = {
      id: 'evt_stale_canceled_1500',
      type: 'customer.subscription.deleted',
      created: 1500, // Older than lastWebhookCreated (2000)
      data: {
        object: {
          id: 'sub_order_1',
          customer: 'cus_order_1',
          status: 'canceled',
        },
      },
    };

    const staleResult = await processStripeWebhookEvent(staleCanceledEvent, {
      storageInstance: storage,
      stripeClient: mockStripeClient,
    });

    // Verify fallback reconciliation called stripe.subscriptions.retrieve() and preserved 'active'
    assert.strictEqual(staleResult.reconciledFromStripe, true);
    assert.strictEqual(retrieveCalledWithSubId, 'sub_order_1');

    const subAfterStale = await storage.getUserSubscription('coach_order_1');
    assert.strictEqual(
      subAfterStale.status,
      'active',
      'Stale cancellation event must not downgrade active subscriber'
    );
    assert.strictEqual(subAfterStale.lastWebhookCreated, 2000);
  });

  it('orders user payment history by paidAt DESC and limits to 24 records', async () => {
    const mockFirestore = new MockBillingFirestore();
    const storage = new StorageManager(mockFirestore);

    await storage.saveUserPayment('coach_hist_1', {
      id: 'in_older',
      customerEmail: 'hist@rovers.local',
      amountPaid: 150,
      currency: 'gbp',
      status: 'paid',
      description: 'Coach Monthly (Sep)',
      paidAt: '2026-09-15T10:00:00.000Z',
      paymentMethod: { brand: 'visa', last4: '1111' },
    });

    await storage.saveUserPayment('coach_hist_1', {
      id: 'in_newer',
      customerEmail: 'hist@rovers.local',
      amountPaid: 1500,
      currency: 'gbp',
      status: 'paid',
      description: 'Coach Annual (Oct)',
      paidAt: '2026-10-15T10:00:00.000Z',
      paymentMethod: { brand: 'visa', last4: '4242' },
    });

    const history = await storage.getUserPayments('coach_hist_1', 24);
    assert.strictEqual(history.length, 2);
    assert.strictEqual(history[0].id, 'in_newer');
    assert.strictEqual(history[1].id, 'in_older');
  });
});

