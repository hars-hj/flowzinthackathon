import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../lib/supabaseClient.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

// GET /api/settings
// Returns org info (incl. widget_key for the install snippet) + widget_configs
export async function getSettings(req: AuthenticatedRequest, res: Response) {
  const adminUserId = req.user?.id;
  if (!adminUserId) return res.status(401).json({ error: 'Unauthorized' });

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', adminUserId)
    .single();

  if (membershipError || !membership) {
    return res.status(403).json({ error: 'Organization membership not found' });
  }
  if (membership.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can view settings' });
  }

  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizations')
    .select('id, name, widget_key, plan')
    .eq('id', membership.org_id)
    .single();

  if (orgError || !org) return res.status(500).json({ error: 'Failed to load organization' });

  const { data: widgetConfig, error: widgetConfigError } = await supabaseAdmin
    .from('widget_configs')
    .select('*')
    .eq('org_id', membership.org_id)
    .maybeSingle(); // no row yet is valid — not every org has configured the widget

  if (widgetConfigError) {
    return res.status(500).json({ error: 'Failed to load widget configuration' });
  }

  return res.status(200).json({
    organization: org,
    widgetConfig: widgetConfig ?? null,
  });
}

// PUT /api/settings/widget-config
// Upserts widget_configs for the admin's org
export async function updateWidgetConfig(req: AuthenticatedRequest, res: Response) {
  const adminUserId = req.user?.id;
  if (!adminUserId) return res.status(401).json({ error: 'Unauthorized' });

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', adminUserId)
    .single();

  if (membershipError || !membership) {
    return res.status(403).json({ error: 'Organization membership not found' });
  }
  if (membership.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update widget configuration' });
  }

  const {
    primary_color,
    bot_name,
    avatar_url,
    welcome_message,
    quick_questions,
    bubble_position,
    show_history_tab,
    escalation_enabled,
  } = req.body;

  const { data, error } = await supabaseAdmin
    .from('widget_configs')
    .upsert(
      {
        org_id: membership.org_id,
        primary_color,
        bot_name,
        avatar_url,
        welcome_message,
        quick_questions, // expected as an array stored as jsonb
        bubble_position,
        show_history_tab,
        escalation_enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id' }
    )
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Failed to save widget configuration' });

  return res.status(200).json({ widgetConfig: data });
}

// POST /api/settings/regenerate-key
export async function regenerateWidgetKey(req: AuthenticatedRequest, res: Response) {
  const adminUserId = req.user?.id;
  if (!adminUserId) return res.status(401).json({ error: 'Unauthorized' });

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', adminUserId)
    .single();

  if (membershipError || !membership) {
    return res.status(403).json({ error: 'Organization membership not found' });
  }
  if (membership.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can regenerate the widget key' });
  }

  const newWidgetKey = `wk_live_${randomUUID()}`;

  const { data, error } = await supabaseAdmin
    .from('organizations')
    .update({ widget_key: newWidgetKey })
    .eq('id', membership.org_id)
    .select('widget_key')
    .single();

  if (error) return res.status(500).json({ error: 'Failed to regenerate widget key' });

  return res.status(200).json({ widgetKey: data.widget_key });
}