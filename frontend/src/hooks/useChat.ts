import { useCallback, useEffect, useState } from 'react'
import {
  fetchChatSessions,
  postChat,
  deleteChat,
  type ApiSession,
} from '../api/chat'
import type { Message, Session } from '../types/chat'
import { useAuth } from '../context/AuthContext'
import { escalateTicket, sendTicketMessage } from '../api/tickets'
import { getSocket } from '../lib/socket'

function createId() {
  return crypto.randomUUID()
}

function formatRelativeTime(date: Date): string {
  const now = Date.now()
  const diff = now - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

function mapApiSession(apiSession: ApiSession): Session {
  return {
    id: apiSession.id,
    title: apiSession.title,
    timestamp: new Date(apiSession.timestamp),
    messages: apiSession.messages.map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      timestamp: new Date(row.timestamp),
    })),
  }
}

export function useChat() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [ticketId, setTicketId] = useState<string | null>(null)
  const [ticketStatus, setTicketStatus] = useState<'none' | 'waiting' | 'in_progress' | 'resolved'>('none')
  const [isEscalating, setIsEscalating] = useState(false)
  const [isRestoringTicket, setIsRestoringTicket] = useState(true)

  useEffect(() => {
    if (!user) {
      setSessions([])
      setActiveSessionId(null)
      return
    }

    async function loadSessions() {
      try {
        const apiSessions = await fetchChatSessions()
        const mapped = apiSessions.map(mapApiSession)
        setSessions(mapped)
        setActiveSessionId((prev) => {
          if (prev && mapped.some((s) => s.id === prev)) return prev
          return mapped[0]?.id ?? null
        })
      } catch (err) {
        console.error(err)
      }
    }

    loadSessions()
  }, [user])

  useEffect(() => {
    if (!activeSessionId) return
    const savedTicketId = localStorage.getItem(`ticket_${activeSessionId}`)
    const savedStatus = localStorage.getItem(`ticketStatus_${activeSessionId}`)
    setTicketId(savedTicketId ?? null)
    setTicketStatus((savedStatus as any) ?? 'none')
    setIsRestoringTicket(false)
  }, [activeSessionId])

  useEffect(() => {
    if (ticketId && activeSessionId) {
      localStorage.setItem(`ticket_${activeSessionId}`, ticketId)
    }
  }, [ticketId, activeSessionId])

  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem(`ticketStatus_${activeSessionId}`, ticketStatus)
    }
  }, [ticketStatus, activeSessionId])

  useEffect(() => {
    if (!ticketId) return
    const socket = getSocket()

    const joinRoom = () => {
      socket.emit('join_ticket', ticketId)
    }

    joinRoom()
    socket.on('connect', joinRoom)

    const onClaimed = (ticket: any) => {
      if (ticket.id !== ticketId) return
      setTicketStatus('in_progress')
      localStorage.setItem(`ticketStatus_${activeSessionId}`, 'in_progress')
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: [
                  ...s.messages,
                  {
                    id: createId(),
                    role: 'assistant' as const,
                    content: 'An agent has joined. You can now chat directly.',
                    timestamp: new Date(),
                  },
                ],
              }
            : s
        )
      )
    }

    const onMessage = (message: any) => {
      if (message.sender_role === 'user') return
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: [
                  ...s.messages,
                  {
                    id: createId(),
                    role: 'assistant' as const,
                    content: message.content,
                    timestamp: new Date(message.created_at),
                  },
                ],
              }
            : s
        )
      )
    }

    const onResolved = (ticket: any) => {
      if (ticket.id !== ticketId) return
      setTicketStatus('resolved')
      localStorage.setItem(`ticketStatus_${activeSessionId}`, 'resolved')
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: [
                  ...s.messages,
                  {
                    id: createId(),
                    role: 'assistant' as const,
                    content: 'This conversation has been resolved. Thank you for contacting support.',
                    timestamp: new Date(),
                  },
                ],
              }
            : s
        )
      )
    }

    socket.on('ticket:claimed', onClaimed)
    socket.on('message:new', onMessage)
    socket.on('ticket:resolved', onResolved)

    return () => {
      socket.off('connect', joinRoom)
      socket.off('ticket:claimed', onClaimed)
      socket.off('message:new', onMessage)
      socket.off('ticket:resolved', onResolved)
    }
  }, [ticketId, activeSessionId])

  const activeSession = sessions.find((s) => s.id === activeSessionId)
  const messages = activeSession?.messages ?? []

  const updateSession = useCallback(
    (sessionId: string, updater: (session: Session) => Session) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? updater(s) : s)),
      )
    },
    [],
  )

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      const currentTicketId = ticketId || localStorage.getItem(`ticket_${activeSessionId}`)
      const currentTicketStatus = ticketStatus !== 'none'
        ? ticketStatus
        : (localStorage.getItem(`ticketStatus_${activeSessionId}`) as any) ?? 'none'

      let sessionId = activeSessionId
      let createdLocalSession = false

      if (!sessionId || !sessions.some((s) => s.id === sessionId)) {
        const newSession: Session = {
          id: createId(),
          title: trimmed,
          timestamp: new Date(),
          messages: [],
        }
        sessionId = newSession.id
        createdLocalSession = true
        setSessions((prev) => [newSession, ...prev])
        setActiveSessionId(sessionId)
      }

      const currentSessionId = sessionId
      setInputValue('')

      if ((currentTicketStatus === 'in_progress' || currentTicketStatus === 'waiting') && currentTicketId) {
        const userMessage: Message = {
          id: createId(),
          role: 'user',
          content: trimmed,
          timestamp: new Date(),
        }
        updateSession(currentSessionId, (s) => ({
          ...s,
          messages: [...s.messages, userMessage],
        }))
        if (currentTicketStatus === 'in_progress') {
          try {
            await sendTicketMessage(currentTicketId, trimmed, 'user')
          } catch (err) {
            console.error('Failed to send to agent:', err)
          }
        }
        return
      }

      const userMessage: Message = {
        id: createId(),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      }

      updateSession(currentSessionId, (session) => ({
        ...session,
        title: session.messages.length === 0 ? trimmed : session.title,
        timestamp: new Date(),
        messages: [...session.messages, userMessage],
      }))

      setIsLoading(true)

      try {
        const { reply, sessionId: returnedSessionId } = await postChat(
          currentSessionId,
          trimmed,
        )

        if (returnedSessionId !== currentSessionId) {
          setSessions((prev) =>
            prev.map((s) =>
              s.id === currentSessionId ? { ...s, id: returnedSessionId } : s,
            ),
          )
          setActiveSessionId(returnedSessionId)
          sessionId = returnedSessionId
        }

        const botMessage: Message = {
          id: createId(),
          role: 'assistant',
          content: reply,
          timestamp: new Date(),
        }

        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? { ...s, messages: [...s.messages, botMessage] }
              : s,
          ),
        )
      } catch (error) {
        if (createdLocalSession) {
          setSessions((prev) => prev.filter((s) => s.id !== currentSessionId))
          setActiveSessionId(null)
        }

        const botMessage: Message = {
          id: createId(),
          role: 'assistant',
          content:
            error instanceof Error ? error.message : 'Something went wrong.',
          timestamp: new Date(),
        }

        if (!createdLocalSession) {
          setSessions((prev) =>
            prev.map((s) =>
              s.id === currentSessionId
                ? { ...s, messages: [...s.messages, botMessage] }
                : s,
            ),
          )
        }
      } finally {
        setIsLoading(false)
      }
    },
    [activeSessionId, isLoading, sessions, updateSession, ticketStatus, ticketId],
  )

  const selectSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId)
    setInputValue('')
    setIsLoading(false)
  }, [])

  const newChat = useCallback(() => {
    const newSession: Session = {
      id: createId(),
      title: 'New conversation',
      timestamp: new Date(),
      messages: [],
    }
    setSessions((prev) => [newSession, ...prev])
    setActiveSessionId(newSession.id)
    setInputValue('')
  }, [])

  const deleteConversation = useCallback(
    async (sessionId: string) => {
      try {
        await deleteChat(sessionId)
        setSessions((prev) => prev.filter((session) => session.id !== sessionId))
        setActiveSessionId((prev) => {
          if (prev !== sessionId) return prev
          return sessions.find((session) => session.id !== sessionId)?.id ?? null
        })
      } catch (error) {
        console.error('Failed to delete conversation:', error)
      }
    },
    [sessions],
  )

  const escalateToAgent = useCallback(async () => {
    if (!activeSessionId) return
    if (ticketId) return
    setIsEscalating(true)
    try {
      const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''
      const res = await escalateTicket(activeSessionId, lastUserMessage)
      setTicketId(res.ticket.id)
      setTicketStatus('waiting')
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: [
                  ...s.messages,
                  {
                    id: createId(),
                    role: 'assistant' as const,
                    content: "I'm connecting you to a human agent. Please wait...",
                    timestamp: new Date(),
                  },
                ],
              }
            : s
        )
      )
    } catch (err) {
      console.error('Escalation failed:', err)
    } finally {
      setIsEscalating(false)
    }
  }, [activeSessionId, messages, ticketId])

  return {
    sessions,
    activeSessionId: activeSessionId ?? '',
    messages,
    isLoading,
    inputValue,
    setInputValue,
    sendMessage,
    selectSession,
    newChat,
    deleteConversation,
    formatRelativeTime,
    escalateToAgent,
    isEscalating,
    ticketStatus,
    ticketId,
    isRestoringTicket,
  }
}