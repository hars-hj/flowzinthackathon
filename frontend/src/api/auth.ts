import {
  apiFetch,
  clearStoredAuth,
  getStoredAuth,
  setStoredAuth,
  type StoredAuth,
} from './client'

export type UserRole = 'user' | 'admin' | 'agent'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export interface MeResponse {
  user: AuthUser
}

export async function loginUser(email: string, password: string): Promise<AuthUser> {
  const data = await apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

  setStoredAuth({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
  })

  return fetchMe()
}

// export async function registerUser(email: string, password: string): Promise<void> {
//   await apiFetch<{ message: string }>('/api/auth/register', {
//     method: 'POST',
//     body: JSON.stringify({ email, password }),
//   })
// }


export async function registerAdmin(
  email: string,
  password: string,
  organizationName:string,
): Promise<void> {
  await apiFetch<{ message: string }>('/api/auth/admin/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, organizationName }),
  })
}

export async function createAgent(payload: { email: string; password: string }) {
  const res = await fetch('/api/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message ?? 'Failed to create agent')
  }
  return res.json()
}

export async function fetchMe(): Promise<AuthUser> {
  const data = await apiFetch<MeResponse>('/api/auth/me')
  const stored = getStoredAuth()
  
  if (stored) {
    setStoredAuth({
      ...stored,
      user: { ...stored.user, role: data.user.role },
    })
  }
  return data.user
}

export function logout() {
  clearStoredAuth()
}

export function restoreSession(): StoredAuth | null {
  return getStoredAuth()
}
