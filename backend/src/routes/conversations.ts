// src/routes/conversations.ts
import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabaseClient.js';

const router = Router();

interface ConversationRow {
  id: string;
  created_at: string;
  session_id: string;
  role: string;        // 'user' | 'bot' | 'agent'
  content: string;
  sentiment: string | null;
  escalated: boolean;
  seq: number;
  org_id: string;
}

router.get('/', async (req: Request, res: Response) => {
  const widgetKey = req.query.org as string | undefined;
  const sessionId = req.query.session_id as string | undefined;

  if (!widgetKey || !sessionId) {
    return res.status(400).json({ error: 'Missing key or session_id parameter' });
  }

  // 1. Resolve org_id from widget_key (never trust org_id from the client directly)
  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('widget_key', widgetKey)
    .single();

  if (orgError || !org) {
    return res.status(404).json({ error: 'Invalid widget key' });
  }

  // 2. Fetch all message rows for this org + session, ordered by seq
  const { data: rows, error: rowsError } = await supabaseAdmin
    .from('conversations')
    .select('id, created_at, role, content, sentiment, escalated, seq')
    .eq('org_id', org.id)
    .eq('session_id', sessionId)
    .order('seq', { ascending: true });

  if (rowsError) {
    return res.status(500).json({ error: 'Failed to fetch conversation history' });
  }

  // 3. No history yet is a valid state (new visitor), not an error
  return res.status(200).json({ messages: rows ?? [] });
});

export default router;