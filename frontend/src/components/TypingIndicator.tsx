import { Bot } from 'lucide-react'

export function TypingIndicator() {
  return (
    <div className="flex max-w-[70%] animate-message-in items-start gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-light">
        <Bot className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
      </div>
      <div className="rounded-xl rounded-tl-[4px] bg-surface-muted px-4 py-3">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-accent animate-typing-dot"
              style={{ animationDelay: `${i * 0.4}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
