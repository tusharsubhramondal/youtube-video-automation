import { Request, Response, NextFunction } from 'express';
import { AuthService, UserPayload } from '../services/auth.service.js';

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = AuthService.verifyToken(token);
    if (user) {
      req.user = user;
      return next();
    }
  }

  // Graceful fallback for local development / test harness
  try {
    const defaultUser = await AuthService.getOrCreateDefaultUser();
    req.user = {
      id: defaultUser.id,
      email: defaultUser.email,
      name: defaultUser.name,
      role: defaultUser.role,
    };
  } catch {
    // If DB offline, continue
  }

  next();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = AuthService.verifyToken(token);
    if (user) {
      req.user = user;
      return next();
    }
  }

  return res.status(401).json({
    success: false,
    error: 'Authentication required. Please log in or provide a valid Bearer token.',
  });
}

