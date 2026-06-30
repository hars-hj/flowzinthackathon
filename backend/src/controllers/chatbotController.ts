import { randomUUID } from 'crypto';
import type { Response } from 'express';
import { supabaseAdmin } from '../../lib/supabaseClient.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { chat } from './ragService.js';

async function ensureUserSession(userId: string, sessionId: string): Promise<void> {
  const { data: existing } = await supabaseAdmin
    .from('user_session')
    .select('session_id')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .maybeSingle();

  if (existing) return;

  const { error } = await supabaseAdmin.from('user_session').insert({
    user_id: userId,
    session_id: sessionId,
  });

  if (error) throw new Error(`Failed to create session: ${error.message}`);
}

async function verifySessionOwnership(userId: string, sessionId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('user_session')
    .select('session_id')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .maybeSingle();

  return !!data;
}

export async function chatHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { sessionId: rawSessionId, message, question } = req.body;
  const userMessage = message ?? question;
  const userId = req.user!.id;

  if (!userMessage?.trim()) {
    res.status(400).json({ error: 'Missing message in request body' });
    return;
  }

  let sessionId: string = rawSessionId;
  const isNewSession = !sessionId || sessionId === 'new';

  try {
    if (isNewSession) {
      sessionId = randomUUID();
      await ensureUserSession(userId, sessionId);
    } else {
      const owned = await verifySessionOwnership(userId, sessionId);
      if (!owned) {
        await ensureUserSession(userId, sessionId);
      }
    }

    const reply = await chat(sessionId, userMessage.trim());
    res.json({ reply, sessionId });
  } catch (error) {
    console.error('Error in chatHandler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteSessionHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id
  const { sessionId } = req.params

  if (!sessionId) {
    res.status(400).json({ error: 'Missing sessionId parameter' })
    return
  }

  const { data: sessionRecord, error: ownershipError } = await supabaseAdmin
    .from('user_session')
    .select('session_id')
    .eq('user_id', userId)
    .eq('session_id', sessionId)
    .maybeSingle()

  if (ownershipError) {
    res.status(500).json({ error: ownershipError.message })
    return
  }

  if (!sessionRecord) {
    res.status(404).json({ error: 'Session not found' })
    return
  }

  const { error: deleteConversationsError } = await supabaseAdmin
    .from('conversations')
    .delete()
    .eq('session_id', sessionId)

  if (deleteConversationsError) {
    res.status(500).json({ error: deleteConversationsError.message })
    return
  }

  const { error: deleteSessionError } = await supabaseAdmin
    .from('user_session')
    .delete()
    .eq('user_id', userId)
    .eq('session_id', sessionId)

  if (deleteSessionError) {
    res.status(500).json({ error: deleteSessionError.message })
    return
  }

  res.status(204).end()
}

export async function getSessionsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id;

  const { data: userSessions, error: sessionError } = await supabaseAdmin
    .from('user_session')
    .select('session_id')
    .eq('user_id', userId);

  if (sessionError) {
    res.status(500).json({ error: sessionError.message });
    return;
  }

  if (!userSessions?.length) {
    res.json({ sessions: [] });
    return;
  }

  const sessionIds = userSessions.map((row) => row.session_id);

  const { data: conversations, error: convError } = await supabaseAdmin
    .from('conversations')
    .select('id, session_id, role, content, created_at')
    .in('session_id', sessionIds)
    .order('created_at', { ascending: true });

  if (convError) {
    res.status(500).json({ error: convError.message });
    return;
  }

  const messagesBySession = new Map<
    string,
    Array<{ id: string; role: string; content: string; timestamp: string }>
  >();

  for (const row of conversations ?? []) {
    const list = messagesBySession.get(row.session_id) ?? [];
    list.push({
      id: row.id,
      role: row.role,
      content: row.content,
      timestamp: row.created_at,
    });
    messagesBySession.set(row.session_id, list);
  }

  const sessions = sessionIds.map((sessionId) => {
    const messages = messagesBySession.get(sessionId) ?? [];
    const firstUserMessage = messages.find((m) => m.role === 'user');
    const title = firstUserMessage?.content ?? messages[0]?.content ?? 'New conversation';
    const timestamp = messages[messages.length - 1]?.timestamp ?? new Date().toISOString();

    return {
      id: sessionId,
      title: title.length > 60 ? `${title.slice(0, 60)}…` : title,
      timestamp,
      messages,
    };
  });

  sessions.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  res.json({ sessions });
}
