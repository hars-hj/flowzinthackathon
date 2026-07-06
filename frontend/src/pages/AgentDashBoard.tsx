import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Ticket as TicketIcon, CheckCircle, Users, LogOut, Shield } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getInbox, getActiveTickets, getResolvedTickets, claimTicket } from '../api/tickets'
import { getSocket } from '../lib/socket'
import type { Ticket } from '../types/ticket'
import { TicketChatPanel } from '../components/TicketChatPanel'

type Tab = 'inbox' | 'active' | 'resolved'

export function AgentDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [tab, setTab] = useState<Tab>('inbox')
  const [inbox, setInbox] = useState<Ticket[]>([])
  const [active, setActive] = useState<Ticket[]>([])
  const [resolved, setResolved] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [claimingId, setClaimingId] = useState<string | null>(null)

  const role = user?.role ?? 'agent'
  const team = (user as any)?.team as string | null

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [inboxRes, activeRes, resolvedRes] = await Promise.all([
        getInbox(),
        getActiveTickets(),
        getResolvedTickets(),
      ])
      setInbox(inboxRes.tickets)
      setActive(activeRes.tickets)
      setResolved(resolvedRes.tickets)
    } catch (err) {
      console.error('Failed to load tickets:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // --- Live WebSocket updates ---
  useEffect(() => {
    const socket = getSocket()
    if (user?.id) {
      socket.emit('register_staff', user.id)
    }

    socket.on('ticket:new', (ticket: Ticket) => {
      setInbox((prev) => [...prev, ticket])
    })

    socket.on('ticket:claimed', (ticket: Ticket) => {
      setInbox((prev) => prev.filter((t) => t.id !== ticket.id))
      setActive((prev) => {
        const exists = prev.some((t) => t.id === ticket.id)
        return exists ? prev.map((t) => (t.id === ticket.id ? ticket : t)) : [...prev, ticket]
      })
    })

    return () => {
      socket.off('ticket:new')
      socket.off('ticket:claimed')
    }
  }, [user?.id, loadAll])

  const handleClaim = async (ticket: Ticket) => {
    setClaimingId(ticket.id)
    try {
      const res = await claimTicket(ticket.id)
      setSelectedTicket(res.ticket)
      setTab('active')
    } catch (err) {
      console.error('Failed to claim ticket:', err)
    } finally {
      setClaimingId(null)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const myActiveCount = active.length

  const roleLabel = role === 'admin' ? 'Admin' : `Agent — ${team ?? ''}`
  const RoleIcon = role === 'admin' ? Shield : Users

  const list = tab === 'inbox' ? inbox : tab === 'active' ? active : resolved

  if (selectedTicket) {
    return (
      <TicketChatPanel
        ticket={selectedTicket}
        currentUser={user}
        onBack={() => {
          setSelectedTicket(null)
          loadAll()
        }}
      />
    )
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-gradient-to-r from-accent to-accent-dark px-4 md:px-6">
  <div>
    <h1 className="font-ui text-lg font-semibold text-white">Dashboard</h1>
    <div className="flex items-center gap-1.5">
      <RoleIcon className="h-3.5 w-3.5 text-white/80" strokeWidth={2} />
      <span className="font-ui text-xs text-white/80">{roleLabel}</span>
    </div>
  </div>

  <div className="flex items-center gap-2">
    {role === 'admin' && (
      <>
        <button
          onClick={() => navigate('/admin')}
          className="rounded-lg bg-white/15 px-3 py-1.5 font-ui text-xs text-white transition-all hover:bg-white/25"
        >
          Knowledge base
        </button>
        <button
          onClick={() => navigate('/analytics')}
          className="rounded-lg bg-white/15 px-3 py-1.5 font-ui text-xs text-white transition-all hover:bg-white/25"
        >
          Analytics
        </button>
      </>
    )}
    <button
      type="button"
      onClick={handleLogout}
      className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 font-ui text-xs text-white transition-all hover:bg-white/25"
    >
      <LogOut className="h-3.5 w-3.5" strokeWidth={2} />
      Sign out
    </button>
  </div>
</header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6">

        {/* KPI cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border-l-4 border-amber-400 bg-surface p-4">
            <div className="mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" strokeWidth={2} />
              <span className="font-ui text-xs text-text-hint">Waiting</span>
            </div>
            <p className="font-ui text-2xl font-bold text-text-primary">{inbox.length}</p>
          </div>
          <div className="rounded-xl border-l-4 border-accent bg-surface p-4">
            <div className="mb-2 flex items-center gap-2">
              <TicketIcon className="h-4 w-4 text-accent" strokeWidth={2} />
              <span className="font-ui text-xs text-text-hint">
                {role === 'admin' ? 'Total Agents' : 'Teammates'}
              </span>
            </div>
            <p className="font-ui text-2xl font-bold text-text-primary">{myActiveCount}</p>
          </div>
          <div className="rounded-xl border-l-4 border-green-400 bg-surface p-4">
            <div className="mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" strokeWidth={2} />
              <span className="font-ui text-xs text-text-hint">Resolved</span>
            </div>
            <p className="font-ui text-2xl font-bold text-text-primary">{resolved.length}</p>
          </div>
          <div className="rounded-xl border-l-4 border-blue-400 bg-surface p-4">
            <div className="mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-400" strokeWidth={2} />
              <span className="font-ui text-xs text-text-hint">
                {role === 'admin' ? 'Total Agents' : 'Teammates'}
              </span>
            </div>
            <p className="font-ui text-2xl font-bold text-text-primary">—</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex items-center gap-1 rounded-xl bg-surface p-1.5 border border-border">
          {(['inbox', 'active', 'resolved'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-ui text-sm font-medium transition-all ${
                tab === t
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:bg-surface-muted'
              }`}
            >
              {t === 'inbox' ? 'Inbox' : t === 'active' ? (role === 'agent' ? 'My Active' : 'Active') : 'Resolved'}
              <span className={`rounded-full px-2 py-0.5 text-xs ${tab === t ? 'bg-white/20' : 'bg-surface-muted'}`}>
                {t === 'inbox' ? inbox.length : t === 'active' ? active.length : resolved.length}
              </span>
            </button>
          ))}
        </div>

        {/* Ticket list */}
        {loading ? (
          <p className="text-center font-ui text-sm text-text-hint py-12">Loading tickets…</p>
        ) : list.length === 0 ? (
          <p className="text-center font-ui text-sm text-text-hint py-12">No tickets here</p>
        ) : (
          <ul className="space-y-2">
            {list.map((ticket) => (
              <li
                key={ticket.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-surface px-5 py-4 transition-all hover:border-accent/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-ui text-sm font-medium text-text-primary">
                    {ticket.user_question || 'New support request'}
                  </p>
                  <p className="font-ui text-xs text-text-hint">
                    Session {ticket.session_id.slice(0, 8)}… · {new Date(ticket.created_at).toLocaleString()}
                    {ticket.primary_team && ` · ${ticket.primary_team}`}
                  </p>
                </div>

                {tab === 'inbox' && (
                  <button
                    onClick={() => handleClaim(ticket)}
                    disabled={claimingId === ticket.id}
                    className="shrink-0 rounded-lg bg-accent px-4 py-2 font-ui text-xs font-medium text-white transition-all hover:bg-accent-dark disabled:opacity-50"
                  >
                    {claimingId === ticket.id ? 'Claiming…' : 'Claim'}
                  </button>
                )}

                {tab !== 'inbox' && (
                  <button
                    onClick={() => setSelectedTicket(ticket)}
                    className="shrink-0 rounded-lg border border-border px-4 py-2 font-ui text-xs font-medium text-text-secondary transition-all hover:bg-accent-light hover:text-accent"
                  >
                    Open
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}