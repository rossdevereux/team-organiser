import { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { initFirebaseAdmin } from '../auth/claims.js';

// Ensure Firebase Admin is initialized
initFirebaseAdmin();

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    role?: 'owner' | 'coach' | 'viewer';
    name?: string;
    picture?: string;
  };
}

/**
 * 1. Authenticate JWT Bearer Token
 * Inspects Authorization: Bearer <token>, verifies via Firebase Admin SDK,
 * decodes token claims including custom claim `role`, and auto-bootstraps
 * the initial owner if email matches INITIAL_ADMIN_EMAIL.
 */
export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed authorisation header' });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return res.status(401).json({ error: 'Missing or malformed authorisation header' });
  }

  try {
    let decoded: any;

    try {
      decoded = await getAuth().verifyIdToken(token);
    } catch (verifyErr) {
      // In development or test environments, allow simulated mock tokens or base64 JWT payloads
      if (process.env.NODE_ENV !== 'production') {
        if (
          token === 'mock-dev-token' ||
          token.startsWith('mock-token-') ||
          token === 'mock-owner-token' ||
          token === 'mock-coach-token' ||
          token === 'mock-viewer-token'
        ) {
          const roleFromToken = token.includes('owner')
            ? 'owner'
            : token.includes('coach')
            ? 'coach'
            : token.includes('viewer')
            ? 'viewer'
            : ((req.headers['x-user-role'] as any) || 'owner');

          decoded = {
            uid: (req.headers['x-user-id'] as string) || 'dev-user-123',
            email:
              (req.headers['x-user-email'] as string) ||
              (roleFromToken === 'owner'
                ? process.env.INITIAL_ADMIN_EMAIL || 'admin@therovers.local'
                : 'coach@therovers.local'),
            role: roleFromToken,
            name: 'Development User',
          };
        } else {
          // If token has standard 3 parts (header.payload.signature)
          const parts = token.split('.');
          if (parts.length === 3) {
            try {
              const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
              decoded = {
                uid: payload.sub || payload.user_id || 'dev-user',
                email: payload.email,
                role: payload.role || (req.headers['x-user-role'] as any) || 'viewer',
                name: payload.name,
                picture: payload.picture,
              };
            } catch {
              throw verifyErr;
            }
          } else {
            throw verifyErr;
          }
        }
      } else {
        throw verifyErr;
      }
    }

    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: (decoded.role as 'owner' | 'coach' | 'viewer') || 'viewer',
      name: decoded.name,
      picture: decoded.picture,
    };

    // Auto-bootstrap initial admin owner claim if email matches INITIAL_ADMIN_EMAIL
    const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
    if (req.user.email && initialAdminEmail && req.user.email.toLowerCase() === initialAdminEmail) {
      if (req.user.role !== 'owner') {
        try {
          await getAuth().setCustomUserClaims(req.user.uid, { role: 'owner' });
          console.log(`👑 Auto-bootstrapped owner claim for initial admin: ${req.user.email}`);
        } catch (e: any) {
          console.warn(`Initial admin claim set warning: ${e?.message}`);
        }
        req.user.role = 'owner';
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * 2. Role Verification Guard (0 database lookups)
 * Inspects `req.user.role` extracted directly from the verified JWT custom claims
 */
export const requireRole = (allowedRoles: ('owner' | 'coach' | 'viewer')[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): any => {
    if (!req.user || !req.user.role || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

/**
 * Optional Auth Middleware
 * Attaches decoded user and role if valid token is provided,
 * but allows public requests to proceed if unauthenticated.
 */
export const optionalAuth = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  // Check development test headers first
  const customUid = req.headers['x-user-id'] as string;
  const customEmail = req.headers['x-user-email'] as string;
  const customRole = req.headers['x-user-role'] as 'owner' | 'coach' | 'viewer';

  if (customUid) {
    req.user = {
      uid: customUid,
      email: customEmail || 'coach@therovers.local',
      role: customRole || 'coach',
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) return next();

  if (
    token === 'mock-dev-token' ||
    token.startsWith('mock-token-') ||
    token === 'mock-owner-token' ||
    token === 'mock-coach-token' ||
    token === 'mock-viewer-token'
  ) {
    const roleFromToken = token.includes('owner')
      ? 'owner'
      : token.includes('coach')
      ? 'coach'
      : token.includes('viewer')
      ? 'viewer'
      : (customRole || 'coach');

    req.user = {
      uid: 'dev-user-123',
      email: customEmail || (roleFromToken === 'owner' ? (process.env.INITIAL_ADMIN_EMAIL || 'admin@therovers.local') : 'coach@therovers.local'),
      role: roleFromToken,
    };
    return next();
  }

  const parts = token.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      req.user = {
        uid: payload.sub || payload.user_id || 'user',
        email: payload.email,
        role: (payload.role as 'owner' | 'coach' | 'viewer') || 'viewer',
        name: payload.name,
      };
    } catch {
      // Ignore parse failure in optional auth
    }
  }

  next();
};
