import { apiFetch } from './client'
import type { Role } from '../types/chat'

export interface ApiMessage {
  id: string
  role: Role
  content: string
  timestamp: string
}

export interface ApiSession {
  id: string
  title: string
  timestamp: string
  messages: ApiMessage[]
}

interface ChatResponse {
  reply: string
  sessionId: string
}

interface SessionsResponse {
  sessions: ApiSession[]
}

export async function fetchChatSessions(): Promise<ApiSession[]> {
  const data = await apiFetch<SessionsResponse>('/api/chat/sessions')
  return data.sessions
}

export async function postChat(
  sessionId: string | null,
  message: string,
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      sessionId: sessionId ?? 'new',
      message,
    }),
  })
}

export async function deleteChat(sessionId: string): Promise<void> {
  await apiFetch<void>(`/api/chat/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
  })
}
