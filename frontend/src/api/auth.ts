import {
  apiFetch,
  clearStoredAuth,
  getStoredAuth,
  setStoredAuth,
  type StoredAuth,
} from './client'

export type UserRole = 'user' | 'admin'

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
