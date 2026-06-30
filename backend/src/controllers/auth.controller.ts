import { Request, Response } from 'express';
import { supabaseAnon, supabaseAdmin } from '../../lib/supabaseClient.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export async function register(req: Request, res: Response) {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { data, error } = await supabaseAnon.auth.signUp({ email, password });

  if (error) return res.status(400).json({ error: error.message });

  return res.status(201).json({
    message: 'Registration successful. Check your email to confirm.',
    userId: data.user?.id,
  });
}

export async function registerAdmin(req: Request, res: Response) {
  const { email, password, adminSecret } = req.body;

  if (adminSecret !== process.env.ADMIN_REGISTRATION_SECRET) {
    return res.status(403).json({ error: 'Invalid admin secret' });
  }

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // 1. Create user in Supabase Auth
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    
  });

  if (error) return res.status(400).json({ error: error.message });

  // 2. Set role to admin in profiles table
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', data.user.id);

  if (profileError) return res.status(500).json({ error: 'Failed to set admin role' });

  return res.status(201).json({
    message: 'Admin account created successfully',
    userId: data.user.id,
  });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });

  if (error) return res.status(401).json({ error: error.message });

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    return res.status(500).json({ error: 'Failed to load user profile' });
  }

  return res.status(200).json({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: {
      id: data.user.id,
      email: data.user.email ?? '',
      role: (profile.role as 'user' | 'admin') ?? 'user',
    },
  });
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  return res.status(200).json({ user: req.user });
}

export async function refreshToken(req: Request, res: Response) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

  const { data, error } = await supabaseAnon.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error) return res.status(401).json({ error: error.message });

  return res.status(200).json({
    accessToken: data.session!.access_token,
    refreshToken: data.session!.refresh_token,
  });
}