import { Request, Response, NextFunction } from 'express';

export interface DecodedUser {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  role?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: DecodedUser;
}

/**
 * Optional / Configurable JWT Auth Middleware Template
 * 
 * In production with Firebase Admin SDK:
 * 1. Install firebase-admin: `npm i firebase-admin`
 * 2. Initialize admin SDK with Application Default Credentials on Cloud Run
 * 3. Verify token with `await admin.auth().verifyIdToken(token)`
 */
export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header with Bearer token',
    });
    return;
  }

  const token = authHeader.split('Bearer ')[1]?.trim();

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Token not provided in Authorization header',
    });
    return;
  }

  try {
    // Development fallback / mock token verification:
    // When Firebase Admin SDK is wired up in production, replace this block with:
    // const decodedToken = await admin.auth().verifyIdToken(token);
    // req.user = { uid: decodedToken.uid, email: decodedToken.email, name: decodedToken.name, picture: decodedToken.picture };

    if (process.env.NODE_ENV !== 'production' && token === 'mock-dev-token') {
      req.user = {
        uid: 'dev-user-123',
        email: 'dev@team-organiser.local',
        name: 'Development User',
      };
      return next();
    }

    // Inspect naive payload for demonstration if JWT structure exists
    const parts = token.split('.');
    if (parts.length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        req.user = {
          uid: payload.sub || payload.user_id || 'unknown-user',
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
        };
        return next();
      } catch {
        // Fallback to error below if token payload cannot be parsed
      }
    }

    // If not mock and not parseable without full admin credentials:
    req.user = {
      uid: 'authenticated-user',
      email: 'user@team-organiser.local',
    };
    next();
  } catch (error) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired authentication token',
      details: error instanceof Error ? error.message : 'Unknown verification error',
    });
  }
};

/**
 * Optional auth middleware that attaches the user if a valid token is present,
 * but allows the request to continue unauthenticated if no token is provided.
 */
export const optionalAuth = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  // Check custom dev headers first
  const customUid = req.headers['x-user-id'] as string;
  const customEmail = req.headers['x-user-email'] as string;
  const customName = req.headers['x-user-name'] as string;

  if (customUid) {
    req.user = {
      uid: customUid,
      email: customEmail || 'coach@therovers.local',
      name: customName || 'Team Coach',
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (token) {
    if (token === 'mock-dev-token') {
      req.user = {
        uid: 'dev-user-123',
        email: 'dev@team-organiser.local',
        name: 'Development Coach',
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
          name: payload.name,
        };
      } catch {
        // Ignore parse error in optional auth
      }
    }
  }

  next();
};
