import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { broadcastNewTicket, broadcastTicketClaimed, broadcastNewMessage, broadcastTicketResolved } from '../socket.js';
import { supabaseAdmin } from '../lib/supabaseClient.js';
import {
  createTicket, claimTicket, resolveTicket,
  getWaitingTickets, getActiveTickets, getResolvedTickets,
  sendTicketMessage, getTicketMessages,
  getTicketBySession, getTicketByEmail, sendUserMessage
} from '../controllers/ticket.controller.js';

const router = express.Router();

async function resolveOrgId(widgetKey: string): Promise<string | null> {
  const { data: org } = await supabaseAdmin.from('organizations').select('id').eq('widget_key', widgetKey).single();
  return org?.id ?? null;
}


router.post('/escalate', async (req, res) => {
  try {
    const { widgetKey, sessionId, question, email } = req.body;
    if (!widgetKey || !sessionId) {
      return res.status(400).json({ error: 'Missing widgetKey or sessionId' });
    }

    const orgId = await resolveOrgId(widgetKey);
    if (!orgId) return res.status(404).json({ error: 'Invalid widget key' });

    const ticket = await createTicket(orgId, sessionId, question ?? '', email);
    broadcastNewTicket(ticket);
    return res.status(201).json({ ticket });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create ticket' });
  }
});

router.get('/:id/public-messages', async (req, res) => {
  try {
    const { widgetKey } = req.query as { widgetKey?: string };
    if (!widgetKey) return res.status(400).json({ error: 'Missing widgetKey' });

    const orgId = await resolveOrgId(widgetKey);
    if (!orgId) return res.status(404).json({ error: 'Invalid widget key' });

    // confirm the ticket belongs to this org before returning anything
    const { data: ticket } = await supabaseAdmin
      .from('support_tickets')
      .select('id')
      .eq('id', req.params.id)
      .eq('org_id', orgId)
      .single();
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const messages = await getTicketMessages(req.params.id); // already exists in your controller
    return res.json({ messages });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/:id/user-message', async (req, res) => {
  try {
    const { widgetKey, content } = req.body;
    if (!widgetKey || !content?.trim()) {
      return res.status(400).json({ error: 'Missing widgetKey or content' });
    }

    const orgId = await resolveOrgId(widgetKey);
    if (!orgId) return res.status(404).json({ error: 'Invalid widget key' });

    const message = await sendUserMessage(orgId, req.params.id, content.trim());
    broadcastNewMessage(req.params.id, message);
    return res.status(201).json({ message });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to send message' });
  }
});

router.get('/status', async (req, res) => {
  try {
    const { widgetKey, sessionId } = req.query as { widgetKey?: string; sessionId?: string };
    if (!widgetKey || !sessionId) return res.status(400).json({ error: 'Missing widgetKey or sessionId' });

    const orgId = await resolveOrgId(widgetKey);
    if (!orgId) return res.status(404).json({ error: 'Invalid widget key' });

    const ticket = await getTicketBySession(orgId, sessionId);
    return res.json({ ticket: ticket ?? null });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch ticket status' });
  }
});

router.get('/lookup', async (req, res) => {
  try {
    const { widgetKey, email } = req.query as { widgetKey?: string; email?: string };
    if (!widgetKey || !email) return res.status(400).json({ error: 'Missing widgetKey or email' });

    const orgId = await resolveOrgId(widgetKey);
    if (!orgId) return res.status(404).json({ error: 'Invalid widget key' });

    const ticket = await getTicketByEmail(orgId, email);
    return res.json({ ticket: ticket ?? null });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to lookup ticket' });
  }
});

router.get('/inbox', authenticateToken, async (req, res) => {
  try {
    const tickets = await getWaitingTickets();
    return res.json({ tickets });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch inbox' });
  }
});

router.get('/active', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const tickets = await getActiveTickets(req.user!.id, req.user!.role);
    return res.json({ tickets });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch active tickets' });
  }
});

router.get('/resolved', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const tickets = await getResolvedTickets(req.user!.id, req.user!.role);
    return res.json({ tickets });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch resolved tickets' });
  }
});

router.post('/:id/claim', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const ticket = await claimTicket(req.params.id, req.user!.id);
    broadcastTicketClaimed(ticket);
    return res.json({ ticket });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to claim' });
  }
});

router.get('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const messages = await getTicketMessages(req.params.id);
    return res.json({ messages });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/:id/messages', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { content, senderRole } = req.body;
    if (!content) return res.status(400).json({ error: 'Missing content' });
    const message = await sendTicketMessage(req.params.id, req.user!.id, senderRole ?? 'agent', content);
    broadcastNewMessage(req.params.id, message);
    return res.status(201).json({ message });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

router.post('/:id/resolve', authenticateToken, async (req, res) => {
  try {
    const ticket = await resolveTicket(req.params.id);
    broadcastTicketResolved(ticket);
    return res.json({ ticket });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to resolve' });
  }
});

router.get('/:id/context', authenticateToken, async (req, res) => {
  try {
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select('session_id')
      .eq('id', req.params.id)
      .single();

    if (ticketError || !ticket) return res.status(404).json({ error: 'Ticket not found' });

    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('role, content, created_at')
      .eq('session_id', ticket.session_id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return res.json({ history: data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch context' });
  }
});

export default router;