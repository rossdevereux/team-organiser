import { Router, Response } from 'express';
import Stripe from 'stripe';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { storage, StorageManager, calculatePaymentExpireDate } from '../db/storage.js';
import { setUserSubscriptionClaims } from '../auth/claims.js';
import {
  UserSubscription,
  SubscriptionTier,
  SubscriptionStatus,
  PaymentRecord,
  AdminUser,
} from '../types.js';
import {
  isSubscriptionActive,
  getTrialDaysRemaining,
} from '../middleware/requireActiveSubscription.js';

const router = Router();

// Pricing catalog (Grassroots Pricing Spec - Infrastructure Recovery)
export const PRICING_PLANS = {
  coach_monthly: {
    id: 'coach_monthly',
    name: 'Coach Monthly',
    priceGbp: 1.50,
    unitAmount: 150,
    interval: 'month' as const,
    description: 'Covers grassroots server & infrastructure costs — automated rotations & live alerts',
  },
  coach_annual: {
    id: 'coach_annual',
    name: 'Coach Annual',
    priceGbp: 15.00,
    unitAmount: 1500,
    interval: 'year' as const,
    description: 'Only £1.25/mo (£15/yr) — covers all team fixtures, automated fair play & PDF sheets',
  },
};

// Initialize Stripe client if secret key is configured
const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia' as any,
    })
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

if (!stripe) {
  console.log('💳 Stripe: No STRIPE_SECRET_KEY found. Running in offline/simulated mode.');
} else {
  console.log('💳 Stripe: Initialized with API key.');
}

/**
 * Maps a Stripe subscription status string to internal SubscriptionStatus.
 */
export function mapStripeSubscriptionStatus(stripeStatus: string): SubscriptionStatus {
  if (stripeStatus === 'past_due') return 'past_due';
  if (stripeStatus === 'canceled' || stripeStatus === 'unpaid') return 'canceled';
  if (stripeStatus === 'incomplete_expired') return 'expired';
  if (stripeStatus === 'active' || stripeStatus === 'trialing') return 'active';
  return 'active';
}

/**
 * Extracts card brand and last4 digits from a Stripe Invoice or expanded Charge/PaymentMethod.
 */
export function extractInvoicePaymentMethod(invoice: any): { brand?: string; last4?: string } {
  const card =
    invoice?.payment_method_details?.card ||
    invoice?.charge?.payment_method_details?.card ||
    invoice?.default_payment_method?.card ||
    invoice?.payment_intent?.payment_method?.card ||
    invoice?.card ||
    null;

  return {
    brand: card?.brand ? String(card.brand).toLowerCase() : undefined,
    last4: card?.last4 ? String(card.last4) : undefined,
  };
}

/**
 * Resolves the target AdminUser for a Stripe webhook payload by customerId, metadata.uid, or email.
 */
async function resolveUserForWebhook(
  storageInstance: StorageManager,
  opts: { customerId?: string; uid?: string; email?: string; allowDevFallback?: boolean }
): Promise<AdminUser | null> {
  if (opts.uid) {
    const byUid = await storageInstance.getAdminUserByUid(opts.uid);
    if (byUid) return byUid;
  }
  if (opts.customerId) {
    const byCustomer = await storageInstance.getAdminUserByStripeCustomerId(opts.customerId);
    if (byCustomer) return byCustomer;
  }
  if (opts.email) {
    const byEmail = await storageInstance.getAdminUserByEmail(opts.email);
    if (byEmail) return byEmail;
  }
  if (opts.allowDevFallback && process.env.NODE_ENV !== 'production') {
    const devUser = await storageInstance.getAdminUserByUid('dev-user-123');
    if (devUser) return devUser;
    const allUsers = await storageInstance.getAdminUsers();
    if (allUsers.length > 0) return allUsers[0];
  }
  return null;
}

export interface WebhookProcessOptions {
  storageInstance?: StorageManager;
  stripeClient?: Stripe | null;
  claimsUpdater?: (uid: string, sub: UserSubscription) => Promise<void>;
  allowDevFallback?: boolean;
}

export interface WebhookProcessResult {
  received: boolean;
  duplicate?: boolean;
  reconciledFromStripe?: boolean;
  staleSkipped?: boolean;
  paymentRecorded?: PaymentRecord;
}

/**
 * Core idempotent and timestamp-ordered Stripe webhook event processor.
 *
 * 1. Checks `stripe_events/{eventId}` for duplicate delivery protection.
 * 2. Compares `event.created` against `user.subscription.lastWebhookCreated`:
 *    - If `event.created < lastWebhookCreated`, skips applying the stale payload directly
 *      and reconciles authoritative status via `stripe.subscriptions.retrieve()`.
 * 3. Persists immutable payment audit records to `users/{uid}/payments/{invoiceId}`
 *    with a 24-month TTL (`expireAt`).
 */
export async function processStripeWebhookEvent(
  event: Stripe.Event,
  options: WebhookProcessOptions = {}
): Promise<WebhookProcessResult> {
  const storageInstance = options.storageInstance || storage;
  const stripeClient = options.stripeClient !== undefined ? options.stripeClient : stripe;
  const updateSubscription =
    options.claimsUpdater ||
    (async (uid: string, sub: UserSubscription) => {
      if (options.storageInstance && options.storageInstance !== storage) {
        await options.storageInstance.saveUserSubscription(uid, sub);
      } else {
        await setUserSubscriptionClaims(uid, sub);
      }
    });

  // 1. Idempotency Guard: Check if this exact Stripe event ID was already processed
  if (event.id) {
    const alreadyProcessed = await storageInstance.hasProcessedStripeEvent(event.id);
    if (alreadyProcessed) {
      console.log(`ℹ️ Stripe Webhook: Duplicate event ${event.id} (${event.type}) skipped.`);
      return { received: true, duplicate: true };
    }
  }

  const eventCreated =
    typeof event.created === 'number' ? event.created : Math.floor(Date.now() / 1000);

  let reconciledFromStripe = false;
  let staleSkipped = false;
  let paymentRecorded: PaymentRecord | undefined;

  /**
   * Reconciles subscription state when an out-of-order (stale) event is detected.
   */
  const reconcileStaleSubscription = async (
    user: AdminUser,
    fallbackSubscriptionId?: string
  ): Promise<void> => {
    const existingSub = user.subscription || (await storageInstance.getUserSubscription(user.uid));
    const lastWebhookCreated = existingSub.lastWebhookCreated || 0;
    const subscriptionId = fallbackSubscriptionId || existingSub.stripeSubscriptionId;

    console.warn(
      `⚠️ Out-of-order Stripe event ${event.id} (${event.type}): event.created=${eventCreated} < lastWebhookCreated=${lastWebhookCreated} for UID ${user.uid}.`
    );

    if (stripeClient && subscriptionId) {
      const liveStripeSub = await stripeClient.subscriptions.retrieve(subscriptionId);
      const authoritativeStatus = mapStripeSubscriptionStatus(liveStripeSub.status);
      const rawPeriodEnd = (liveStripeSub as any).current_period_end;
      const periodEnd = rawPeriodEnd
        ? new Date(rawPeriodEnd * 1000).toISOString()
        : existingSub.currentPeriodEnd;

      const reconciledSub: UserSubscription = {
        ...existingSub,
        status: authoritativeStatus,
        stripeCustomerId:
          typeof liveStripeSub.customer === 'string'
            ? liveStripeSub.customer
            : existingSub.stripeCustomerId,
        stripeSubscriptionId: liveStripeSub.id,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: Boolean(liveStripeSub.cancel_at_period_end),
        lastWebhookCreated: Math.max(lastWebhookCreated, liveStripeSub.created || lastWebhookCreated),
      };

      await updateSubscription(user.uid, reconciledSub);
      reconciledFromStripe = true;
      console.log(
        `🔄 Reconciled ground-truth subscription from Stripe API for UID ${user.uid}: status=${authoritativeStatus}`
      );
    } else {
      staleSkipped = true;
    }
  };

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const uid = session.client_reference_id || (session.metadata?.uid as string);
      const plan = (session.metadata?.plan as SubscriptionTier) || 'coach_monthly';

      if (uid) {
        const existingSub = await storageInstance.getUserSubscription(uid);
        const lastWebhookCreated = existingSub?.lastWebhookCreated || 0;

        if (lastWebhookCreated > 0 && eventCreated < lastWebhookCreated) {
          const user =
            (await storageInstance.getAdminUserByUid(uid)) ||
            ({ uid, email: session.customer_email || '', role: 'coach', subscription: existingSub } as AdminUser);
          await reconcileStaleSubscription(user, (session.subscription as string) || undefined);
        } else {
          const now = Date.now();
          const periodEnd = new Date(
            now + (plan === 'coach_annual' ? 365 : 30) * 24 * 60 * 60 * 1000
          ).toISOString();

          const updatedSub: UserSubscription = {
            ...existingSub,
            status: 'active',
            tier: plan,
            trialStartedAt: existingSub?.trialStartedAt || new Date().toISOString(),
            trialEndsAt: existingSub?.trialEndsAt || new Date().toISOString(),
            stripeCustomerId: (session.customer as string) || existingSub?.stripeCustomerId,
            stripeSubscriptionId: (session.subscription as string) || existingSub?.stripeSubscriptionId,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
            lastWebhookCreated: eventCreated,
          };

          await updateSubscription(uid, updatedSub);
          console.log(`✅ Activated ${plan} subscription for UID: ${uid}`);
        }
      }
      break;
    }

    case 'customer.subscription.updated': {
      const stripeSub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer?.id;
      const user = await resolveUserForWebhook(storageInstance, {
        customerId,
        uid: stripeSub.metadata?.uid,
      });

      if (user) {
        const lastWebhookCreated = user.subscription?.lastWebhookCreated || 0;

        if (lastWebhookCreated > 0 && eventCreated < lastWebhookCreated) {
          await reconcileStaleSubscription(user, stripeSub.id);
        } else {
          const status = mapStripeSubscriptionStatus(stripeSub.status);
          const rawPeriodEnd = (stripeSub as any).current_period_end;
          const periodEnd = rawPeriodEnd
            ? new Date(rawPeriodEnd * 1000).toISOString()
            : user.subscription?.currentPeriodEnd;

          const updatedSub: UserSubscription = {
            ...(user.subscription || {
              trialStartedAt: new Date().toISOString(),
              trialEndsAt: new Date().toISOString(),
              tier: 'coach_monthly',
            }),
            status,
            stripeCustomerId: customerId,
            stripeSubscriptionId: stripeSub.id,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
            lastWebhookCreated: eventCreated,
          };

          await updateSubscription(user.uid, updatedSub);
          console.log(`✅ Synchronized subscription for UID ${user.uid}: status=${status}`);
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const stripeSub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer?.id;
      const user = await resolveUserForWebhook(storageInstance, {
        customerId,
        uid: stripeSub.metadata?.uid,
      });

      if (user) {
        const lastWebhookCreated = user.subscription?.lastWebhookCreated || 0;

        if (lastWebhookCreated > 0 && eventCreated < lastWebhookCreated) {
          await reconcileStaleSubscription(user, stripeSub.id);
        } else {
          const updatedSub: UserSubscription = {
            ...(user.subscription || {
              trialStartedAt: new Date().toISOString(),
              trialEndsAt: new Date().toISOString(),
              tier: 'coach_monthly',
            }),
            status: 'expired',
            stripeCustomerId: customerId,
            stripeSubscriptionId: stripeSub.id,
            lastWebhookCreated: eventCreated,
          };

          await updateSubscription(user.uid, updatedSub);
          console.log(`❌ Subscription deleted/expired for UID: ${user.uid}`);
        }
      }
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice & Record<string, any>;
      const customerId =
        typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      const uidFromMeta =
        invoice.metadata?.uid ||
        invoice.subscription_details?.metadata?.uid ||
        invoice.lines?.data?.[0]?.metadata?.uid;

      const user = await resolveUserForWebhook(storageInstance, {
        customerId,
        uid: uidFromMeta,
        email: (invoice.customer_email as string) || undefined,
        allowDevFallback: options.allowDevFallback,
      });

      if (user) {
        const lastWebhookCreated = user.subscription?.lastWebhookCreated || 0;
        const subscriptionId =
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription?.id || user.subscription?.stripeSubscriptionId;

        if (lastWebhookCreated > 0 && eventCreated < lastWebhookCreated) {
          await reconcileStaleSubscription(user, subscriptionId);
        } else {
          const updatedSub: UserSubscription = {
            ...(user.subscription || {
              trialStartedAt: new Date().toISOString(),
              trialEndsAt: new Date().toISOString(),
              tier: 'coach_monthly',
            }),
            status: 'active',
            stripeCustomerId: customerId || user.subscription?.stripeCustomerId,
            stripeSubscriptionId: subscriptionId,
            lastWebhookCreated: eventCreated,
          };
          await updateSubscription(user.uid, updatedSub);
        }

        // Record immutable payment entry in users/{uid}/payments/{invoiceId}
        const paidTimestampSec =
          invoice.status_transitions?.paid_at || invoice.created || eventCreated;
        const paidDate = new Date(paidTimestampSec * 1000);
        const expireDate = calculatePaymentExpireDate(paidDate);

        const defaultDesc =
          user.subscription?.tier === 'coach_annual'
            ? 'SubShuffle Coach Annual'
            : 'SubShuffle Coach Monthly';
        const lineDesc = invoice.lines?.data?.[0]?.description;

        paymentRecorded = await storageInstance.saveUserPayment(user.uid, {
          id: invoice.id || `in_${eventCreated}`,
          userId: user.uid,
          customerEmail: (invoice.customer_email as string) || user.email,
          amountPaid:
            typeof invoice.amount_paid === 'number'
              ? invoice.amount_paid
              : typeof invoice.total === 'number'
              ? invoice.total
              : 150,
          currency: (invoice.currency || 'gbp').toLowerCase(),
          status: 'paid',
          description: lineDesc || invoice.description || defaultDesc,
          paidAt: paidDate.toISOString(),
          hostedInvoiceUrl: invoice.hosted_invoice_url || undefined,
          invoicePdfUrl: invoice.invoice_pdf || undefined,
          paymentMethod: extractInvoicePaymentMethod(invoice),
          expireAt: expireDate.toISOString(),
        });

        console.log(`🧾 Recorded payment ${paymentRecorded.id} for UID: ${user.uid}`);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice & Record<string, any>;
      const customerId =
        typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      const uidFromMeta =
        invoice.metadata?.uid ||
        invoice.subscription_details?.metadata?.uid ||
        invoice.lines?.data?.[0]?.metadata?.uid;

      const user = await resolveUserForWebhook(storageInstance, {
        customerId,
        uid: uidFromMeta,
        email: (invoice.customer_email as string) || undefined,
        allowDevFallback: options.allowDevFallback,
      });

      if (user) {
        const lastWebhookCreated = user.subscription?.lastWebhookCreated || 0;
        const subscriptionId =
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription?.id || user.subscription?.stripeSubscriptionId;

        if (lastWebhookCreated > 0 && eventCreated < lastWebhookCreated) {
          await reconcileStaleSubscription(user, subscriptionId);
        } else if (user.subscription) {
          const updatedSub: UserSubscription = {
            ...user.subscription,
            status: 'past_due',
            lastWebhookCreated: eventCreated,
          };
          await updateSubscription(user.uid, updatedSub);
          console.warn(`⚠️ Payment failed: marked subscription past_due for UID: ${user.uid}`);
        }

        // Record failed invoice attempt in user payment ledger
        const failedDate = new Date((invoice.created || eventCreated) * 1000);
        const expireDate = calculatePaymentExpireDate(failedDate);
        const defaultDesc =
          user.subscription?.tier === 'coach_annual'
            ? 'SubShuffle Coach Annual'
            : 'SubShuffle Coach Monthly';
        const lineDesc = invoice.lines?.data?.[0]?.description;

        paymentRecorded = await storageInstance.saveUserPayment(user.uid, {
          id: invoice.id || `in_failed_${eventCreated}`,
          userId: user.uid,
          customerEmail: (invoice.customer_email as string) || user.email,
          amountPaid:
            typeof invoice.amount_due === 'number'
              ? invoice.amount_due
              : typeof invoice.total === 'number'
              ? invoice.total
              : 150,
          currency: (invoice.currency || 'gbp').toLowerCase(),
          status: 'failed',
          description: lineDesc || invoice.description || defaultDesc,
          paidAt: failedDate.toISOString(),
          hostedInvoiceUrl: invoice.hosted_invoice_url || undefined,
          invoicePdfUrl: invoice.invoice_pdf || undefined,
          paymentMethod: extractInvoicePaymentMethod(invoice),
          expireAt: expireDate.toISOString(),
        });
      }
      break;
    }

    default:
      // Ignore unhandled event types
      break;
  }

  // Record processed event ID for 30-day idempotency protection
  if (event.id) {
    await storageInstance.recordProcessedStripeEvent(event.id, event.type);
  }

  return {
    received: true,
    reconciledFromStripe: reconciledFromStripe || undefined,
    staleSkipped: staleSkipped || undefined,
    paymentRecorded,
  };
}

/**
 * GET /api/billing/subscription
 * Retrieves the current user's subscription, trial days remaining, and plan details.
 */
router.get('/subscription', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const sub = await storage.getUserSubscription(uid);
    const daysRemaining = getTrialDaysRemaining(sub);
    const active = isSubscriptionActive(sub);

    return res.json({
      subscription: sub,
      trialDaysRemaining: daysRemaining,
      isSubscriptionActive: active,
      stripeConfigured: !!stripe,
      pricingPlans: PRICING_PLANS,
    });
  } catch (err: any) {
    console.error('Error fetching subscription:', err);
    return res.status(500).json({ error: 'Failed to retrieve subscription' });
  }
});

/**
 * GET /api/billing/history
 * Returns the authenticated user's payment and invoice history ordered by paidAt DESC (limit 24).
 */
router.get('/history', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const payments = await storage.getUserPayments(uid, 24);
    return res.json({ payments });
  } catch (err: any) {
    console.error('Error fetching billing history:', err);
    return res.status(500).json({ error: 'Failed to retrieve billing history' });
  }
});

/**
 * POST /api/billing/create-checkout-session
 * Creates a Stripe Checkout Session for Coach Monthly or Annual.
 */
router.post('/create-checkout-session', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const email = req.user!.email;
    const { plan = 'coach_monthly', successUrl, cancelUrl } = req.body;

    if (plan !== 'coach_monthly' && plan !== 'coach_annual') {
      return res.status(400).json({ error: 'Invalid plan selected. Choose coach_monthly or coach_annual.' });
    }

    const planConfig = PRICING_PLANS[plan as keyof typeof PRICING_PLANS];
    const currentSub = await storage.getUserSubscription(uid);

    // Fallback in dev/test when Stripe is not configured
    if (!stripe) {
      const mockSessionId = `mock_session_${Date.now()}`;
      return res.json({
        url: successUrl ? `${successUrl}?simulated=true&plan=${plan}` : `/#checkout-success?simulated=true&plan=${plan}`,
        sessionId: mockSessionId,
        simulated: true,
      });
    }

    const origin = req.headers.origin || 'http://localhost:5173';
    const finalSuccessUrl = successUrl || `${origin}/#billing-success?session_id={CHECKOUT_SESSION_ID}`;
    const finalCancelUrl = cancelUrl || `${origin}/#billing-canceled`;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      client_reference_id: uid,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `SubShuffle: ${planConfig.name}`,
              description: planConfig.description,
            },
            unit_amount: planConfig.unitAmount,
            recurring: {
              interval: planConfig.interval,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        uid,
        plan,
      },
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
    };

    if (currentSub?.stripeCustomerId) {
      sessionParams.customer = currentSub.stripeCustomerId;
    } else if (email) {
      sessionParams.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (err: any) {
    console.error('Error creating Stripe checkout session:', err);
    return res.status(500).json({ error: err.message || 'Failed to create checkout session' });
  }
});

/**
 * POST /api/billing/create-portal-session
 * Generates a Stripe Customer Portal link allowing coaches to manage payment methods,
 * download VAT receipts, and manage renewal.
 */
router.post('/create-portal-session', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uid = req.user!.uid;
    const { returnUrl } = req.body;
    const currentSub = await storage.getUserSubscription(uid);
    const origin = req.headers.origin || 'http://localhost:5173';
    const finalReturnUrl = returnUrl || `${origin}/lineup`;

    if (!stripe || !currentSub?.stripeCustomerId) {
      return res.json({
        url: `${origin}/#billing-portal?simulated=true`,
        simulated: true,
      });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: currentSub.stripeCustomerId,
      return_url: finalReturnUrl,
    });

    return res.json({
      url: portalSession.url,
    });
  } catch (err: any) {
    console.error('Error creating Stripe portal session:', err);
    return res.status(500).json({ error: err.message || 'Failed to create customer portal session' });
  }
});

/**
 * POST /api/billing/webhook
 * Handles incoming Stripe Webhook events with signature verification,
 * idempotency protection, out-of-order reconciliation, and payment ledger persistence.
 */
router.post('/webhook', async (req: AuthenticatedRequest, res: Response) => {
  let event: Stripe.Event;

  try {
    const sig = req.headers['stripe-signature'] as string;

    if (stripe && webhookSecret && sig) {
      const rawBody = req.rawBody || (req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body)));
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } else {
      // In development / testing environments without live Stripe webhook secret
      event = req.body;
    }
  } catch (err: any) {
    console.error(`⚠️ Stripe Webhook signature verification failed:`, err.message);
    return res.status(400).send(`Webhook signature error: ${err.message}`);
  }

  try {
    const result = await processStripeWebhookEvent(event, {
      allowDevFallback: process.env.NODE_ENV !== 'production',
    });
    return res.json(result);
  } catch (err: any) {
    console.error('Error processing Stripe webhook:', err);
    return res.status(500).json({ error: 'Failed to process webhook event' });
  }
});

/**
 * POST /api/billing/mock-activate
 * Development & Testing helper to simulate switching subscription states
 * (trialing, active, expired, past_due) without requiring live Stripe webhooks.
 */
if (process.env.NODE_ENV !== 'production') {
  router.post('/mock-activate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || 'coach@therovers.local';
      const {
        status = 'active',
        tier = 'coach_monthly',
        trialEndsAt,
        currentPeriodEnd,
        recordMockPayment = false,
      } = req.body;

      const sub: UserSubscription = {
        status,
        tier,
        trialStartedAt: new Date().toISOString(),
        trialEndsAt:
          trialEndsAt ||
          (status === 'trialing'
            ? new Date(Date.now() + 30 * 86400000).toISOString()
            : new Date().toISOString()),
        currentPeriodEnd:
          currentPeriodEnd ||
          (status === 'active'
            ? new Date(Date.now() + 30 * 86400000).toISOString()
            : undefined),
        stripeCustomerId: `cus_mock_${uid}`,
        stripeSubscriptionId: `sub_mock_${uid}`,
        lastWebhookCreated: Math.floor(Date.now() / 1000),
      };

      await setUserSubscriptionClaims(uid, sub);

      if (recordMockPayment) {
        const isAnnual = tier === 'coach_annual';
        await storage.saveUserPayment(uid, {
          id: `in_mock_${Date.now()}`,
          userId: uid,
          customerEmail: email,
          amountPaid: isAnnual ? 1500 : 150,
          currency: 'gbp',
          status: status === 'past_due' ? 'failed' : 'paid',
          description: isAnnual ? 'Coach Annual Plan' : 'Coach Monthly Plan',
          paidAt: new Date().toISOString(),
          hostedInvoiceUrl: `https://invoice.stripe.com/i/acct_mock/test_${uid}`,
          invoicePdfUrl: `https://pay.stripe.com/invoice/acct_mock/test_${uid}/pdf`,
          paymentMethod: {
            brand: 'visa',
            last4: '4242',
          },
        });
      }

      return res.json({ success: true, subscription: sub });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });
}

export default router;
