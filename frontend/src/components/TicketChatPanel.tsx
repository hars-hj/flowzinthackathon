import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Send, CheckCircle } from 'lucide-react'
import { getTicketMessages, sendTicketMessage, resolveTicket, getTicketContext } from '../api/tickets'
import { getSocket } from '../lib/socket'
import type { Ticket, TicketMessage } from '../types/ticket'

interface TicketChatPanelProps {
  ticket: Ticket
  currentUser: { id: string; email: string; role: string } | null
  onBack: () => void
}

export function TicketChatPanel({ ticket, currentUser, onBack }: TicketChatPanelProps) {
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [historyCount, setHistoryCount] = useState(0)
  const role = currentUser?.role ?? 'agent'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [messagesRes, contextRes] = await Promise.all([
        getTicketMessages(ticket.id),
        getTicketContext(ticket.id),
      ])

      // Map conversation history to display format
      const history: TicketMessage[] = contextRes.history.map((m, i) => ({
        id: `history_${i}`,
        ticket_id: ticket.id,
        sender_id: null,
        sender_role: m.role === 'user' ? 'user' : 'agent',
        content: m.content,
        created_at: m.created_at,
      }))

      // Merge history + ticket messages, deduplicate by content+time
      const ticketMessages = messagesRes.messages
      const merged = [...history, ...ticketMessages].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )

      setHistoryCount(history.length)
      setMessages(merged)
    } catch (err) {
      console.error('Failed to load messages:', err)
    } finally {
      setLoading(false)
    }
  }, [ticket.id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const socket = getSocket()

    const joinRoom = () => {
      socket.emit('join_ticket', ticket.id)
      console.log('Agent joined ticket room:', ticket.id)
    }

    joinRoom()
    socket.on('connect', joinRoom)

    const onMessage = (message: TicketMessage) => {
      if (message.ticket_id !== ticket.id) return
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev
        return [...prev, message]
      })
    }

    socket.on('message:new', onMessage)

    return () => {
      socket.emit('leave_ticket', ticket.id)
      socket.off('connect', joinRoom)
      socket.off('message:new', onMessage)
    }
  }, [ticket.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || sending) return
    setSending(true)
    setInput('')
    try {
      await sendTicketMessage(ticket.id, trimmed, role)
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setSending(false)
    }
  }

  const handleResolve = async () => {
    setResolving(true)
    try {
      await resolveTicket(ticket.id)
      onBack()
    } catch (err) {
      console.error('Failed to resolve ticket:', err)
    } finally {
      setResolving(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 md:px-6">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-text-hint transition-all hover:bg-surface-muted hover:text-text-secondary"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-ui text-sm font-medium text-text-primary">
            {ticket.user_question || 'Support ticket'}
          </p>
          <p className="font-ui text-xs text-text-hint">
            Session {ticket.session_id.slice(0, 8)}…
          </p>
        </div>

        {ticket.status !== 'resolved' && (
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 font-ui text-xs font-medium text-white transition-all hover:bg-green-600 disabled:opacity-50"
          >
            <CheckCircle className="h-3.5 w-3.5" strokeWidth={2} />
            {resolving ? 'Resolving…' : 'Resolve'}
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
        {loading ? (
          <p className="text-center font-ui text-sm text-text-hint">Loading conversation…</p>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {messages.map((msg) => {
              const isMine = msg.sender_id === currentUser?.id
              const isUser = msg.sender_role === 'user'
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  {!isUser && !isMine && (
                    <span className="mb-1 font-ui text-xs text-text-hint capitalize">
                      {msg.sender_role}
                    </span>
                  )}
                 <div
                    className={`max-w-md rounded-2xl px-4 py-2.5 font-message text-sm whitespace-pre-wrap break-words ${
                      isUser
                        ? 'bg-surface-muted text-text-primary'
                        : isMine
                        ? 'bg-accent text-white'
                        : 'bg-accent-light text-accent-dark'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="mt-1 font-ui text-xs text-text-hint">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {ticket.status !== 'resolved' && (
        <div className="border-t border-border bg-surface px-4 py-4 md:px-6">
          <div className="mx-auto flex max-w-2xl items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your reply…"
              className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 font-ui text-sm text-text-primary outline-none transition-all focus:border-accent"
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white transition-all hover:bg-accent-dark disabled:opacity-50"
            >
              <Send className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}