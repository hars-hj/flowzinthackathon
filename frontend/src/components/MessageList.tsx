import { EmptyState } from './EmptyState'
import { MessageBubble } from './MessageBubble'
import { SuggestedChips } from './SuggestedChips'
import { TypingIndicator } from './TypingIndicator'
import type { Message } from '../types/chat'

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
  onSuggestedSelect: (text: string) => void
  bottomRef: React.RefObject<HTMLDivElement | null>
}

export function MessageList({
  messages,
  isLoading,
  onSuggestedSelect,
  bottomRef,
}: MessageListProps) {
  const isEmpty = messages.length === 0 && !isLoading

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      {isEmpty ? (
        <div className="flex h-full flex-col items-center justify-center">
          <EmptyState />
          <SuggestedChips onSelect={onSuggestedSelect} />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
