import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { broadcastNewTicket, broadcastTicketClaimed, broadcastNewMessage, broadcastTicketResolved } from '../socket.js';
import {
  createTicket, claimTicket, resolveTicket,
  getWaitingTickets, getActiveTickets, getResolvedTickets,
  sendTicketMessage, getTicketMessages
} from '../controllers/ticket.controller.js';
import { supabaseAdmin } from '../lib/supabaseClient.js';

const router = express.Router();

router.post('/escalate', async (req, res) => {
  try {
    const { sessionId, question } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' });
    const ticket = await createTicket(sessionId, question ?? '');
    broadcastNewTicket(ticket);
    return res.status(201).json({ ticket });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create ticket' });
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