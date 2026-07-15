import { Request, Response } from 'express';
import { supabaseAdmin, supabaseAnon } from '../lib/supabaseClient.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';


///////////////  frontend for this file is yet to be implemented. /////////////////////////

export async function createAgent(req: AuthenticatedRequest, res: Response) {
  // match whatever your middleware actually sets.
  const adminUserId = req.user?.id;

  if (!adminUserId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // 1. Confirm the requester is an admin, and find their organization
  const { data: adminMembership, error: adminMembershipError } = await supabaseAdmin
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', adminUserId)
    .single();

  if (adminMembershipError || !adminMembership) {
    return res.status(403).json({ error: 'Organization membership not found' });
  }

  if (adminMembership.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create agent accounts' });
  }

  const orgId = adminMembership.org_id;

  // 2. Create the agent's user account in Supabase Auth
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
  });

  if (error) return res.status(400).json({ error: error.message });

  // 3. Set role to 'agent' in profiles table
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ role: 'agent' })
    .eq('id', data.user.id);

  if (profileError) {
    return res.status(500).json({ error: 'Failed to set agent role' });
  }

  // 4. Add the agent as a member of the admin's organization
  const { error: memberError } = await supabaseAdmin
    .from('organization_members')
    .insert({
      org_id: orgId,
      user_id: data.user.id,
      role: 'agent',
    });

  if (memberError) {
    return res.status(500).json({ error: 'Failed to create organization membership' });
  }

  return res.status(201).json({
    message: 'Agent account created successfully',
    userId: data.user.id,
    orgId,
  });
}