import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

export function requireAgent(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user || req.user.role !== 'agent') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
}

// export function requireUser(
//   req: AuthenticatedRequest,
//   res: Response,
//   next: NextFunction
// ) {
//   if (!req.user) {
//     return res.status(401).json({ error: 'Authentication required' });
//   }
//   // Both 'user' and 'admin' can access user-level routes
//   next();
// }