import { useCallback, useState } from 'react'
import { postChat } from '../api/chat'
import type { Message, Session } from '../types/chat'

const MOCK_RESPONSES = [
  'Based on our knowledge base, our pricing starts at $29/month for the Starter plan, which includes up to 1,000 conversations per month.',
  'Our refund policy allows pro-rata refunds on annual plans within 14 days of purchase. Monthly plans are non-refundable.',
  'To get started, simply sign up at our website, upload your knowledge base documents, and deploy the chatbot to your site within minutes.',
  'You can reach our support team at support@nexasupport.ai or use the live chat on our website during business hours.',
]

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

const INITIAL_SESSIONS: Session[] = [
  {
    id: '1',
    title: 'New conversation',
    timestamp: new Date(Date.now() - 5 * 60000),
    messages: [],
  },
  {
    id: '2',
    title: 'What are your pricing plans?',
    timestamp: new Date(Date.now() - 2 * 3600000),
    messages: [
      {
        id: 'm1',
        role: 'user',
        content: 'What are your pricing plans?',
        timestamp: new Date(Date.now() - 2 * 3600000),
      },
      {
        id: 'm2',
        role: 'assistant',
        content: MOCK_RESPONSES[0],
        timestamp: new Date(Date.now() - 2 * 3600000 + 1500),
      },
    ],
  },
  {
    id: '3',
    title: 'How do I get started?',
    timestamp: new Date(Date.now() - 5 * 3600000),
    messages: [
      {
        id: 'm3',
        role: 'user',
        content: 'How do I get started?',
        timestamp: new Date(Date.now() - 5 * 3600000),
      },
      {
        id: 'm4',
        role: 'assistant',
        content: MOCK_RESPONSES[2],
        timestamp: new Date(Date.now() - 5 * 3600000 + 1500),
      },
    ],
  },
  {
    id: '4',
    title: "What's your refund policy?",
    timestamp: new Date(Date.now() - 86400000),
    messages: [
      {
        id: 'm5',
        role: 'user',
        content: "What's your refund policy?",
        timestamp: new Date(Date.now() - 86400000),
      },
      {
        id: 'm6',
        role: 'assistant',
        content: MOCK_RESPONSES[1],
        timestamp: new Date(Date.now() - 86400000 + 1500),
      },
    ],
  },
  {
    id: '5',
    title: 'How do I contact support?',
    timestamp: new Date(Date.now() - 2 * 86400000),
    messages: [
      {
        id: 'm7',
        role: 'user',
        content: 'How do I contact support?',
        timestamp: new Date(Date.now() - 2 * 86400000),
      },
      {
        id: 'm8',
        role: 'assistant',
        content: MOCK_RESPONSES[3],
        timestamp: new Date(Date.now() - 2 * 86400000 + 1500),
      },
    ],
  },
  {
    id: '6',
    title: 'Do you offer enterprise plans?',
    timestamp: new Date(Date.now() - 3 * 86400000),
    messages: [
      {
        id: 'm9',
        role: 'user',
        content: 'Do you offer enterprise plans?',
        timestamp: new Date(Date.now() - 3 * 86400000),
      },
      {
        id: 'm10',
        role: 'assistant',
        content: MOCK_RESPONSES[0],
        timestamp: new Date(Date.now() - 3 * 86400000 + 1500),
      },
    ],
  },
]

export function useChat() {
  const [sessions, setSessions] = useState<Session[]>(INITIAL_SESSIONS)
  const [activeSessionId, setActiveSessionId] = useState('1')
  const [isLoading, setIsLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')

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

      const sessionId = activeSessionId

      const userMessage: Message = {
        id: createId(),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      }

      updateSession(sessionId, (session) => ({
        ...session,
        title:
          session.messages.length === 0 ? trimmed : session.title,
        timestamp: new Date(),
        messages: [...session.messages, userMessage],
      }))

      setInputValue('')
      setIsLoading(true)

      try {
        const reply = await postChat(sessionId, trimmed)

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
        const botMessage: Message = {
          id: createId(),
          role: 'assistant',
          content:
            error instanceof Error
              ? `Sorry, I couldn't get a response: ${error.message}`
              : "Sorry, something went wrong. Please try again.",
          timestamp: new Date(),
        }

        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? { ...s, messages: [...s.messages, botMessage] }
              : s,
          ),
        )
      } finally {
        setIsLoading(false)
      }
    },
    [activeSessionId, isLoading, updateSession],
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
    setIsLoading(false)
  }, [])

  const clearConversation = useCallback(() => {
    updateSession(activeSessionId, (session) => ({
      ...session,
      title: 'New conversation',
      messages: [],
    }))
    setIsLoading(false)
  }, [activeSessionId, updateSession])

  return {
    sessions,
    activeSessionId,
    messages,
    isLoading,
    inputValue,
    setInputValue,
    sendMessage,
    selectSession,
    newChat,
    clearConversation,
    formatRelativeTime,
  }
}
