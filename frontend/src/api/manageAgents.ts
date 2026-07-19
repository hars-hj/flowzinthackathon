import { apiFetch } from './client'

export interface Agent {
  id: string
  email: string
  created_at?: string
}

export async function getAgents(): Promise<Agent[]> {
  return apiFetch<Agent[]>('/api/manageAgents', {
    method: 'GET',
  })
}

export async function getAgentscount(): Promise<number> {
  const agents = await getAgents()
  return agents.length
}

export async function createAgent(payload: { email: string; password: string }): Promise<Agent> {
  return apiFetch<Agent>('/api/manageAgents', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteAgent(id: string): Promise<void> {
  await apiFetch<void>(`/api/manageAgents/${id}`, {
    method: 'DELETE',
  })
}