import { getAccessToken } from './client'

export async function postChat(
  sessionId: string,
  message: string,
): Promise<string> {
  const token = getAccessToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({ sessionId, message }),
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(body?.error ?? `Request failed (${res.status})`)
  }

  const data = (await res.json()) as { reply: string }
  return data.reply
}
