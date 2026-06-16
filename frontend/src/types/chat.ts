export type Role = 'user' | 'assistant'

export interface Message {
  id: string
  role: Role
  content: string
  timestamp: Date
}

export interface Session {
  id: string
  title: string
  timestamp: Date
  messages: Message[]
}
