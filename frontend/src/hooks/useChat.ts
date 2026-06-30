import { useCallback, useEffect, useState } from 'react'
import {
  fetchChatSessions,
  postChat,
  deleteChat,
  type ApiSession,
} from '../api/chat'
import type { Message, Session } from '../types/chat'
import { useAuth } from '../context/AuthContext'

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

      setInputValue('')
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
    [activeSessionId, isLoading, sessions, updateSession],
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
  }
}
