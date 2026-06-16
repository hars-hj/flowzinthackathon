import { useState } from 'react'
import { Bot, Check, Copy, ThumbsUp } from 'lucide-react'
import type { Message } from '../types/chat'

interface MessageBubbleProps {
  message: Message
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (message.role === 'user') {
    return (
      <div className="group ml-auto max-w-[65%] animate-message-in">
        <p className="whitespace-pre-wrap text-right font-message text-base leading-[1.65] text-text-primary">
          {message.content}
        </p>
        <p className="mt-1 text-right font-ui text-[11px] text-text-hint opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          {formatTime(message.timestamp)}
        </p>
      </div>
    )
  }

  return (
    <div className="group max-w-[70%] animate-message-in">
      <div className="flex items-start gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-light">
          <Bot className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
        </div>
        <div className="rounded-xl rounded-tl-[4px] bg-surface-muted px-4 py-3">
          <p className="whitespace-pre-wrap font-message text-base leading-[1.65] text-text-primary">
            {message.content}
          </p>
        </div>
      </div>
      <div className="ml-9 mt-1 flex gap-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md p-1 text-text-hint transition-all duration-150 hover:text-text-secondary"
          aria-label="Copy message"
        >
          {copied ? (
            <Check className="h-4 w-4 text-accent" strokeWidth={2} />
          ) : (
            <Copy className="h-4 w-4" strokeWidth={2} />
          )}
        </button>
        <button
          type="button"
          className="rounded-md p-1 text-text-hint transition-all duration-150 hover:text-text-secondary"
          aria-label="Thumbs up"
        >
          <ThumbsUp className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
