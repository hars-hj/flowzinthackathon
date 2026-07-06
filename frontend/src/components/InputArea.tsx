import { useEffect, useRef } from 'react'
import { ArrowUp } from 'lucide-react'

interface InputAreaProps {
  value: string
  onChange: (value: string) => void
  onSend: (text: string) => void
  isLoading: boolean
  disabled?: boolean
}

export function InputArea({ value, onChange, onSend, isLoading, disabled = false }: InputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const lineHeight = 22.5
    const maxHeight = lineHeight * 5
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
  }

  useEffect(() => {
    adjustHeight()
  }, [value])

  const handleSend = () => {
    if (!value.trim() || isLoading || disabled) return
    onSend(value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSend = value.trim().length > 0 && !isLoading && !disabled

  if (disabled) {
    return (
      <div className="border-t border-border bg-surface p-4">
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-muted px-4 py-4">
          <span className="font-ui text-sm text-text-hint">This ticket has been resolved</span>
        </div>
      </div>
    )
  }

  return (
    <div className="border-t border-border bg-surface p-4">
      <div className="flex items-end gap-2 rounded-xl border border-border bg-surface px-4 py-3 transition-all duration-150 focus-within:border-accent">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question..."
          rows={1}
          disabled={isLoading || disabled}
          className="max-h-[112px] min-h-[22px] flex-1 resize-none bg-transparent font-ui text-base text-text-primary outline-none placeholder:text-text-hint disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-all duration-150 ease-in-out hover:bg-accent-dark active:scale-95 disabled:bg-border disabled:hover:bg-border"
          aria-label="Send message"
        >
          <ArrowUp
            className={`h-[18px] w-[18px] ${canSend ? 'text-white' : 'text-text-hint'}`}
            strokeWidth={2}
          />
        </button>
      </div>
      <p className="mt-2 text-center font-ui text-xs text-text-hint">
        Answers are based on our company knowledge base.
      </p>
    </div>
  )
}