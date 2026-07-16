import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../lib/supabaseClient.js';
import { chat, saveMessage, logQuery } from './ragService.js';
import { handleCasualQuery } from './casualQueryHandler.js';
import { getTicketBySession, sendUserMessage } from '../controllers/ticket.controller.js';
import { broadcastNewMessage } from '../socket.js';

interface ChatRequestBody {
  widget_key: string;
  session_id?: string;
  message?: string;
  question?: string;
}

export async function chatHandler(req: Request, res: Response): Promise<void> {
  const start = Date.now();
  const { widget_key: widgetKey, session_id: sessionIdRaw, message, question } = req.body as ChatRequestBody;
  const userMessage = (message ?? question)?.trim();

  if (!widgetKey) {
    res.status(400).json({ error: 'Missing widget_key in request body' });
    return;
  }
  if (!userMessage) {
    res.status(400).json({ error: 'Missing message in request body' });
    return;
  }

  const sessionId: string = sessionIdRaw || randomUUID();

  try {
    // 1. Resolve org_id from widget_key
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

    // 2. If there's an open ticket, route to the agent — never touch RAG or casual handling
    const openTicket = await getTicketBySession(orgId, sessionId);
    if (openTicket && (openTicket.status === 'waiting' || openTicket.status === 'in_progress')) {
      const savedMessage = await sendUserMessage(orgId, openTicket.id, userMessage);
      broadcastNewMessage(openTicket.id, savedMessage);

      res.json({
        reply: openTicket.status === 'waiting' ? "You're in the queue — an agent will join shortly." : null,
        sessionId,
        ticketId: openTicket.id,
        mode: 'ticket',
      });
      return;
    }

    // 3. Casual query short-circuit (greetings, thanks, etc.) — skip RAG entirely
    const casualResponse = handleCasualQuery(userMessage);
    if (casualResponse.ok) {
      await saveMessage(orgId, sessionId, 'user', userMessage);
      await saveMessage(orgId, sessionId, 'assistant', casualResponse.message);
      await logQuery({
        orgId,
        sessionId,
        question: userMessage,
        chunksRetrieved: 0,
        topChunkScore: 0,
        finalAnswer: casualResponse.message,
        latencyMs: Date.now() - start,
        escalated: false,
      });

      res.json({ reply: casualResponse.message, sessionId, mode: 'bot', escalated: false });
      return;
    }

    // 4. Normal RAG path
    const result = await chat(orgId, sessionId, userMessage);
    res.json({ reply: result.reply, sessionId, mode: 'bot', escalated: result.escalated ?? false });
  } catch (error) {
    console.error('Error in chatHandler:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}