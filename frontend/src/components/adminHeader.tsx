import { useNavigate, useLocation } from 'react-router-dom'
import { LogOut, Shield, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
    { label: 'knowledge Base', path: '/admin' },
    { label: 'Analytics', path: '/analytics' },
  { label: 'Tickets', path: '/dashboard' },
  { label: 'Settings', path: '/settings' },
  { label: 'Manage Agents', path: '/manageAgents' },
] as const

export function AdminHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const role = user?.role ?? 'agent'
  const team = (user as any)?.team as string | null
  const isAdmin = role === 'admin'

  const RoleIcon = isAdmin ? Shield : Users
  const roleLabel = isAdmin ? 'Admin' : `Agent${team ? ` — ${team}` : ''}`

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex h-16 shrink-0 items-center border-b border-border bg-surface px-4 md:px-6">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-accent" />
        <span className="font-ui text-base font-medium text-text-primary">
          NexaSupport Admin
        </span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden items-center gap-1.5 sm:flex">
          <RoleIcon className="h-3.5 w-3.5 text-text-hint" strokeWidth={2} />
          <span className="font-ui text-xs text-text-secondary">{roleLabel}</span>
        </div>

        {isAdmin && (
          <nav className="flex items-center gap-2">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`rounded-lg px-3 py-1.5 font-ui text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-accent text-white'
                      : 'border border-border text-text-secondary hover:bg-accent-light hover:text-accent'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-text-hint transition-all duration-150 hover:bg-surface-muted hover:text-text-secondary"
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </header>
  )
}