import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import { storage } from '../db/storage.js';
import { UserSubscription } from '../types.js';

/**
 * Checks whether a UserSubscription is currently active and entitled to write operations.
 *
 * Rules:
 * - 'active': Fully entitled.
 * - 'trialing': Entitled if current time is before trialEndsAt.
 * - 'past_due': Entitled during 3-day grace period.
 * - 'canceled': Entitled until current period end date.
 * - 'expired': Gated (read-only access only).
 */
export function isSubscriptionActive(sub?: UserSubscription | null): boolean {
  if (!sub) return false;
  if (sub.status === 'lifetime' || sub.tier === 'free_for_life') {
    return true;
  }
  const now = Date.now();

  switch (sub.status) {
    case 'active':
      return true;

    case 'trialing':
      return new Date(sub.trialEndsAt).getTime() > now;

    case 'past_due': {
      // 3-day grace period for failed renewal attempts
      if (sub.currentPeriodEnd) {
        const graceEnd = new Date(sub.currentPeriodEnd).getTime() + 3 * 24 * 60 * 60 * 1000;
        return graceEnd > now;
      }
      return true;
    }

    case 'canceled': {
      if (sub.currentPeriodEnd) {
        return new Date(sub.currentPeriodEnd).getTime() > now;
      }
      return false;
    }

    case 'expired':
    default:
      return false;
  }
}

/**
 * Calculates remaining days in trial. Returns 0 if expired or not trialing.
 */
export function getTrialDaysRemaining(sub?: UserSubscription | null): number {
  if (!sub || sub.status !== 'trialing') return 0;
  const now = Date.now();
  const ends = new Date(sub.trialEndsAt).getTime();
  const diffMs = ends - now;
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Feature Gating Middleware:
 * Protects active match planning, rotation generation, and squad additions.
 * Preserves read-only operations and data exports even after trial expiry.
 *
 * Returns 402 Payment Required with { code: 'TRIAL_EXPIRED', requiresSubscription: true }
 */
export const requireActiveSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  // Allow explicit bypass for testing or background dev seeding
  if (req.headers['x-bypass-subscription'] === 'true') {
    return next();
  }

  // If user is not authenticated yet, let auth middleware handle 401 first
  if (!req.user || !req.user.uid) {
    return next();
  }

  // Fast path: Zero-lookup check via custom claim if active or lifetime
  if (
    req.user.subscriptionStatus === 'active' ||
    req.user.subscriptionStatus === 'lifetime' ||
    req.user.subscriptionTier === 'free_for_life'
  ) {
    return next();
  }

  // If claim explicitly indicates expired, block immediately
  if (req.user.subscriptionStatus === 'expired') {
    return res.status(402).json({
      error: 'Free trial has expired. Please upgrade your subscription to continue managing fixtures and rotations.',
      code: 'TRIAL_EXPIRED',
      requiresSubscription: true,
    });
  }

  try {
    const sub = await storage.getUserSubscription(req.user.uid);

    if (isSubscriptionActive(sub)) {
      return next();
    }

    return res.status(402).json({
      error: 'Free trial has expired. Please upgrade your subscription to continue managing fixtures and rotations.',
      code: 'TRIAL_EXPIRED',
      requiresSubscription: true,
      trialEndsAt: sub.trialEndsAt,
      tier: sub.tier,
    });
  } catch (err: any) {
    console.error('Error verifying user subscription:', err);
    // In case of transient storage errors, fail safely to avoid locking out legitimate coaches
    return next();
  }
};
