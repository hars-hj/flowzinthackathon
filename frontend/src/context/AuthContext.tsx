import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  fetchMe,
  logout as authLogout,
  restoreSession,
  type AuthUser,
  type UserRole,
} from '../api/auth'

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: AuthUser | null) => void
  refreshUser: () => Promise<AuthUser | null>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const stored = restoreSession()
    if (!stored) {
      setUser(null)
      return null
    }

    try {
      const me = await fetchMe()
      setUser(me)
      return me
    } catch {
      authLogout()
      setUser(null)
      return null
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      const stored = restoreSession()
      if (!stored) {
        setIsLoading(false)
        return
      }

      if (stored.user.role) {
        setUser({
          id: stored.user.id,
          email: stored.user.email,
          role: stored.user.role as UserRole,
        })
      }

      await refreshUser()
      setIsLoading(false)
    }

    init()
  }, [refreshUser])

  const logout = useCallback(() => {
    authLogout()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      setUser,
      refreshUser,
      logout,
    }),
    [user, isLoading, refreshUser, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
