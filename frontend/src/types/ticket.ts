export interface Ticket {
  id: string
  session_id: string
  user_question: string
  status: 'waiting' | 'in_progress' | 'resolved'
  primary_team: string | null
  assigned_agent_id: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

export interface TicketMessage {
  id: string
  ticket_id: string
  sender_id: string | null
  sender_role: 'user' | 'agent' | 'head' | 'admin'
  content: string
  read?: boolean
  created_at: string
}

export interface AgentProfile {
  id: string
  email: string
  role: 'user' | 'agent' | 'head' | 'admin'
  team: string | null
}