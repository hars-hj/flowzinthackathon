import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { supabaseAdmin } from '../lib/supabaseClient.js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const JWKS = createRemoteJWKSet(
  new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'user' | 'admin';
  };
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
   
  const token = authHeader.split(' ')[1];

  try {
    // 1. Verify JWT signature using Supabase JWKS
    const { payload } = await jwtVerify(token, JWKS);
    const userId = payload.sub!;
    const email = payload.email as string;

    // 2. Fetch role from profiles table
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return res.status(401).json({ error: 'User profile not found' });
    }

    // 3. Attach to request
    req.user = {
      id: userId,
      email,
      role: profile.role as 'user' | 'admin',
    };

    next();
  } catch (err) {
    console.error(err);
  return res.status(401).json({
    error: "Invalid or expired token",
    details: err instanceof Error ? err.message : err,
  });
  }
}