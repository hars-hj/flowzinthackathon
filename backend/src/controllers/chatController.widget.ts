import { json, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../lib/supabaseClient.js';
import { chat } from './ragService.js'; 

interface ChatRequestBody {
  widget_key: string;
  session_id?: string;
  message?: string;
  question?: string; // kept for backward compatibility with old clients
}

export async function chatHandler(req: Request, res: Response): Promise<void> {


  const { widget_key: widgetKey, session_id: session_id, message, question } = req.body;
  const userMessage = (message ?? question)?.trim();

  if (!widgetKey) {
    res.status(400).json({ error: 'Missing widget_key in request body' });
    return;
  }

  if (!userMessage) {
    res.status(400).json({ error: 'Missing message in request body' });
    return;
  }

  // Client generates its own session_id (localStorage) and always sends it,
  // but fall back to generating one server-side just in case.
  const sessionId: string = session_id || randomUUID();

  try {
    // 1. Resolve org_id from widget_key — every downstream query is scoped to this.
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('widget_key', widgetKey)
      .single();

    if (orgError || !org) {
      res.status(404).json({ error: 'Invalid widget key' });
      return;
    }
    const orgId = org.id as string;

    // 3. Generate the bot's reply, scoped to this org's documents/chunks.
 

        const { reply, escalated } = await chat(orgId, sessionId, userMessage);

        const { error: botInsertError } = await supabaseAdmin.from('conversations').insert({
        org_id: orgId,
        session_id: sessionId,
        role: 'assistant',   // matches this file's convention — not 'bot'
        content: reply,
        escalated: escalated ?? false,
       
        });

    if (botInsertError) {
      console.error('Error saving bot message:', botInsertError);
     
    }

    res.json({ reply, sessionId, escalated: escalated ?? false });
  } catch (error) {
    console.error('Error in chatHandler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}