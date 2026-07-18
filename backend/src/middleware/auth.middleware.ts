import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify, errors } from 'jose';
import { supabaseAdmin } from '../lib/supabaseClient.js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const JWKS = createRemoteJWKSet(
  new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'user' | 'admin' | 'agent';
  };
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }
    
  const token = authHeader.split(' ')[1];

  try {
    // 1. Verify JWT signature using Supabase JWKS
    const { payload } = await jwtVerify(token, JWKS);
    
    const userId = payload.sub;
    const email = payload.email as string;

    if (!userId) {
      res.status(401).json({ error: 'Invalid token payload: missing user ID' });
      return;
    }

    // 2. Fetch role from profiles table
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      res.status(401).json({ error: 'User profile not found' });
      return;
    }

    // 3. Attach to request
    req.user = {
      id: userId,
      email,
      role: profile.role as 'user' | 'admin' | 'agent',
    };

    next();
  } catch (err) {
    // 4. Gracefully handle jose-specific errors
    if (err instanceof errors.JWTExpired) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    
    if (err instanceof errors.JWTInvalid || err instanceof errors.JWSSignatureVerificationFailed) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // 5. Log and handle unexpected server errors
    console.error('[Auth Middleware] Unexpected Error:', err);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
}