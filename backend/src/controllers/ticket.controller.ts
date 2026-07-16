import { supabaseAdmin } from '../lib/supabaseClient.js';


export async function createTicket(orgId: string, sessionId: string, userQuestion: string, email?: string) {
  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .insert({ org_id: orgId, session_id: sessionId, user_question: userQuestion, email: email ?? null, status: 'waiting' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getTicketBySession(orgId: string, sessionId: string) {
  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .select('*')
    .eq('org_id', orgId)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTicketByEmail(orgId: string, email: string) {
  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .select('session_id, status, created_at')
    .eq('org_id', orgId)
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function sendUserMessage(orgId: string, ticketId: string, content: string) {
  // Confirm the ticket actually belongs to this org before writing to it
  const { data: ticket } = await supabaseAdmin
    .from('support_tickets')
    .select('id')
    .eq('id', ticketId)
    .eq('org_id', orgId)
    .single();
  if (!ticket) throw new Error('Ticket not found');

  const { data, error } = await supabaseAdmin
    .from('ticket_messages')
    .insert({ ticket_id: ticketId, org_id: orgId, sender_id: null, sender_role: 'user', content })
    .select()
    .single();
  if (error) throw error;
  return data;
}


// export async function createTicket(sessionId: string, userQuestion: string) {
//   const { data, error } = await supabaseAdmin
//     .from('support_tickets')
//     .insert({ session_id: sessionId, user_question: userQuestion, status: 'waiting' })
//     .select()
//     .single();
//   if (error) throw error;
//   return data;
// }

export async function claimTicket(ticketId: string, agentId: string) {
  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .update({ status: 'in_progress', assigned_agent_id: agentId, updated_at: new Date().toISOString() })
    .eq('id', ticketId)
    .eq('status', 'waiting')
    .select()
    .single();
  if (error) throw error;
  if (!data) throw new Error('Ticket already claimed');
  return data;
}

export async function resolveTicket(ticketId: string) {
  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .update({ status: 'resolved', updated_at: new Date().toISOString() })
    .eq('id', ticketId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getWaitingTickets() {
  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .select('*')
    .eq('status', 'waiting')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getActiveTickets(agentId: string, role: string) {
  let query = supabaseAdmin
    .from('support_tickets')
    .select('*')
    .eq('status', 'in_progress');

  if (role !== 'admin') {
    query = query.eq('assigned_agent_id', agentId);
  }

  const { data, error } = await query.order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getResolvedTickets(agentId: string, role: string) {
  let query = supabaseAdmin
    .from('support_tickets')
    .select('*')
    .eq('status', 'resolved');

  if (role !== 'admin') {
    query = query.eq('assigned_agent_id', agentId);
  }

  const { data, error } = await query.order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function sendTicketMessage(ticketId: string, senderId: string | null, senderRole: string, content: string) {
  const { data, error } = await supabaseAdmin
    .from('ticket_messages')
    .insert({ ticket_id: ticketId, sender_id: senderId, sender_role: senderRole, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getTicketMessages(ticketId: string) {
  const { data, error } = await supabaseAdmin
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}