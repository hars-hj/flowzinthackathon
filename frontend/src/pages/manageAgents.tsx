import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Settings as SettingsIcon,
  Users,
  Plus,
  Trash2,
  LogOut,
} from 'lucide-react'
import {
  getAgents,
  createAgent,
  deleteAgent,
  type Agent,
} from '../api/manageAgents'
import { useAuth } from '../context/AuthContext'

export function AgentsPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [agentEmail, setAgentEmail] = useState('')
  const [agentPassword, setAgentPassword] = useState('')
  const [isCreatingAgent, setIsCreatingAgent] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    loadAgents()
  }, [])

  async function loadAgents() {
    setIsLoading(true)
    setLoadError('')
    try {
      const data = await getAgents()
      setAgents(data)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load agents')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateAgent() {
    setFormError('')
    setFormSuccess('')

    if (!agentEmail.trim() || !agentPassword) {
      setFormError('Email and password are required.')
      return
    }
    if (agentPassword.length < 8) {
      setFormError('Password must be at least 8 characters.')
      return
    }

    setIsCreatingAgent(true)
    try {
      const newAgent = await createAgent({
        email: agentEmail.trim(),
        password: agentPassword,
      })
      setAgents((prev) => [...prev, newAgent])
      setFormSuccess('Agent created.')
      setAgentEmail('')
      setAgentPassword('')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create agent')
    } finally {
      setIsCreatingAgent(false)
    }
  }

  async function handleDeleteAgent(agent: Agent) {
    const confirmed = window.confirm(`Remove ${agent.email} as an agent?`)
    if (!confirmed) return

    setDeleteError('')
    setDeletingId(agent.id)
    try {
      await deleteAgent(agent.id)
      setAgents((prev) => prev.filter((a) => a.id !== agent.id))
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete agent')
    } finally {
      setDeletingId(null)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'AD'

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center border-b border-border bg-surface px-4 md:px-6">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="font-ui text-base font-medium text-text-primary">
            NexaSupport Admin
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden font-ui text-xs text-text-secondary sm:inline">
            {user?.email}
          </span>

          <button
            type="button"
            onClick={() => navigate('/analytics')}
            className="rounded-lg border border-border px-3 py-1.5 font-ui text-xs text-text-secondary transition-all duration-150 hover:bg-accent-light hover:text-accent"
          >
            Analytics
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="rounded-lg border border-border px-3 py-1.5 font-ui text-xs text-text-secondary transition-all duration-150 hover:bg-accent-light hover:text-accent"
          >
            Tickets
          </button>
          
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="rounded-lg border border-border px-3 py-1.5 font-ui text-xs text-text-secondary transition-all duration-150 hover:bg-accent-light hover:text-accent"
          >
            Settings
          </button>
          <button
            type="button"
            onClick={() => navigate('/agents')}
            className="rounded-lg border border-accent bg-accent-light px-3 py-1.5 font-ui text-xs font-medium text-accent"
          >
            Manage Agents
          </button>
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

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 md:px-6">
        <div className="mb-8">
          <h1 className="font-ui text-2xl font-medium text-text-primary">Agents</h1>
          <p className="mt-1 font-ui text-sm text-text-secondary">
            Add and manage the support agents who can handle escalated tickets
          </p>
        </div>

        {/* Create agent */}
        <section className="mb-8 rounded-xl border border-border bg-surface p-6">
          <div className="mb-1 flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-accent" strokeWidth={2} />
            <h2 className="font-ui text-base font-medium text-text-primary">
              Create agent
            </h2>
          </div>
          <p className="mb-5 font-ui text-sm text-text-secondary">
            The agent will use these credentials to log in.
          </p>

          {formError && (
            <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 font-ui text-sm text-red-600">
              {formError}
            </p>
          )}
          {formSuccess && (
            <p className="mb-4 rounded-lg bg-accent-light px-4 py-3 font-ui text-sm text-accent-dark">
              {formSuccess}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-ui text-xs font-medium text-text-secondary">
                Email
              </label>
              <input
                type="email"
                value={agentEmail}
                onChange={(e) => setAgentEmail(e.target.value)}
                placeholder="agent@example.com"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-ui text-sm text-text-primary outline-none transition-all duration-150 focus:border-accent"
              />
            </div>

            <div>
              <label className="mb-1 block font-ui text-xs font-medium text-text-secondary">
                Password
              </label>
              <input
                type="password"
                value={agentPassword}
                onChange={(e) => setAgentPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-ui text-sm text-text-primary outline-none transition-all duration-150 focus:border-accent"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateAgent}
            disabled={isCreatingAgent}
            className="mt-6 flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 font-ui text-xs font-medium text-white transition-all duration-150 hover:bg-accent-dark disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            {isCreatingAgent ? 'Creating…' : 'Create agent'}
          </button>
        </section>

        {/* Agent list */}
        <section className="rounded-xl border border-border bg-surface p-6">
          <div className="mb-1 flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" strokeWidth={2} />
            <h2 className="font-ui text-base font-medium text-text-primary">
              All agents
            </h2>
          </div>
          <p className="mb-5 font-ui text-sm text-text-secondary">
            {agents.length} agent{agents.length === 1 ? '' : 's'} with access
          </p>

          {deleteError && (
            <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 font-ui text-sm text-red-600">
              {deleteError}
            </p>
          )}

          {isLoading ? (
            <div className="rounded-lg border border-border bg-surface-muted px-4 py-8 text-center font-ui text-sm text-text-hint">
              Loading agents…
            </div>
          ) : loadError ? (
            <p className="rounded-lg bg-red-50 px-4 py-3 font-ui text-sm text-red-600">
              {loadError}
            </p>
          ) : agents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center font-ui text-sm text-text-hint">
              No agents yet. Create one above to get started.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {agents.map((agent) => (
                <li
                  key={agent.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-light">
                      <span className="font-ui text-xs font-medium text-accent">
                        {agent.email.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-ui text-sm text-text-primary">
                        {agent.email}
                      </p>
                      {agent.created_at && (
                        <p className="truncate font-ui text-xs text-text-hint">
                          Added {new Date(agent.created_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteAgent(agent)}
                    disabled={deletingId === agent.id}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-hint transition-all duration-150 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    aria-label={`Remove ${agent.email}`}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="border-t border-border bg-surface px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-light">
            <span className="font-ui text-xs font-medium text-accent">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="truncate font-ui text-xs text-text-primary">Admin</p>
            <p className="truncate font-ui text-xs text-text-hint">{user?.email}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}