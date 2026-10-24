import { Router, Response } from 'express';
import Stripe from 'stripe';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { storage } from '../db/storage.js';
import { setUserSubscriptionClaims } from '../auth/claims.js';
import {
  UserSubscription,
  SubscriptionTier,
  SubscriptionStatus,
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
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia' as any,
    })
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripe) {
  console.log('💳 Stripe: No STRIPE_SECRET_KEY found. Running in offline/simulated mode.');
} else {
  console.log('💳 Stripe: Initialized with API key.');
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
 * Handles incoming Stripe Webhook events with signature verification.
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
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const uid = session.client_reference_id || (session.metadata?.uid as string);
        const plan = (session.metadata?.plan as SubscriptionTier) || 'coach_monthly';

        if (uid) {
          const now = Date.now();
          const periodEnd = new Date(
            now + (plan === 'coach_annual' ? 365 : 30) * 24 * 60 * 60 * 1000
          ).toISOString();

          const updatedSub: UserSubscription = {
            status: 'active',
            tier: plan,
            trialStartedAt: new Date().toISOString(),
            trialEndsAt: new Date().toISOString(),
            stripeCustomerId: (session.customer as string) || undefined,
            stripeSubscriptionId: (session.subscription as string) || undefined,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
          };

          await setUserSubscriptionClaims(uid, updatedSub);
          console.log(`✅ Activated ${plan} subscription for UID: ${uid}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const stripeSub = event.data.object as Stripe.Subscription;
        const customerId = stripeSub.customer as string;
        const user = await storage.getAdminUserByStripeCustomerId(customerId);

        if (user) {
          let status: SubscriptionStatus = 'active';
          if (stripeSub.status === 'past_due') status = 'past_due';
          else if (stripeSub.status === 'canceled' || stripeSub.status === 'unpaid') status = 'canceled';
          else if (stripeSub.status === 'active' || stripeSub.status === 'trialing') status = 'active';

          const rawPeriodEnd = (stripeSub as any).current_period_end;
          const periodEnd = rawPeriodEnd
            ? new Date(rawPeriodEnd * 1000).toISOString()
            : undefined;

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
          };

          await setUserSubscriptionClaims(user.uid, updatedSub);
          console.log(`✅ Synchronized subscription for UID ${user.uid}: status=${status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object as Stripe.Subscription;
        const customerId = stripeSub.customer as string;
        const user = await storage.getAdminUserByStripeCustomerId(customerId);

        if (user) {
          const updatedSub: UserSubscription = {
            ...(user.subscription || {
              trialStartedAt: new Date().toISOString(),
              trialEndsAt: new Date().toISOString(),
              tier: 'coach_monthly',
            }),
            status: 'expired',
            stripeCustomerId: customerId,
            stripeSubscriptionId: stripeSub.id,
          };

          await setUserSubscriptionClaims(user.uid, updatedSub);
          console.log(`❌ Subscription deleted/expired for UID: ${user.uid}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const user = await storage.getAdminUserByStripeCustomerId(customerId);

        if (user && user.subscription) {
          const updatedSub: UserSubscription = {
            ...user.subscription,
            status: 'past_due',
          };
          await setUserSubscriptionClaims(user.uid, updatedSub);
          console.warn(`⚠️ Payment failed: marked subscription past_due for UID: ${user.uid}`);
        }
        break;
      }

      default:
        // Ignore unhandled event types
        break;
    }

    return res.json({ received: true });
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
      const { status = 'active', tier = 'coach_monthly', trialEndsAt, currentPeriodEnd } = req.body;

      const sub: UserSubscription = {
        status,
        tier,
        trialStartedAt: new Date().toISOString(),
        trialEndsAt: trialEndsAt || (status === 'trialing' ? new Date(Date.now() + 30 * 86400000).toISOString() : new Date().toISOString()),
        currentPeriodEnd: currentPeriodEnd || (status === 'active' ? new Date(Date.now() + 30 * 86400000).toISOString() : undefined),
        stripeCustomerId: `cus_mock_${uid}`,
        stripeSubscriptionId: `sub_mock_${uid}`,
      };

      await setUserSubscriptionClaims(uid, sub);
      return res.json({ success: true, subscription: sub });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });
}

export default router;
