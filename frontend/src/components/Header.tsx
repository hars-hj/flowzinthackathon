import { Menu, Trash2, Headset, CheckCircle } from 'lucide-react'

interface HeaderProps {
  onDelete: () => void
  onMenuOpen: () => void
  isDeleteDisabled?: boolean
  onEscalate: () => void
  isEscalating: boolean
  ticketStatus: 'none' | 'waiting' | 'in_progress' | 'resolved'
  isRestoringTicket: boolean
}

export function Header({ onDelete, onMenuOpen, isDeleteDisabled, onEscalate, isEscalating, ticketStatus, isRestoringTicket }: HeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center border-b border-border bg-surface px-4 md:px-6">
      <button
        type="button"
        onClick={onMenuOpen}
        className="mr-3 flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-all duration-150 hover:bg-surface-muted md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" strokeWidth={2} />
      </button>

      <div className="flex flex-1 flex-col">
        <h1 className="font-ui text-base font-medium text-text-primary">NexaSupport AI</h1>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-online" />
          <span className="font-ui text-xs text-text-secondary">Online</span>
        </div>
      </div>

      {!isRestoringTicket && ticketStatus === 'none' && (
        <button
          type="button"
          onClick={onEscalate}
          disabled={isEscalating}
          className="mr-2 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 font-ui text-xs text-text-secondary transition-all duration-150 hover:bg-accent-light hover:text-accent disabled:opacity-50"
        >
          <Headset className="h-3.5 w-3.5" strokeWidth={2} />
          {isEscalating ? 'Connecting...' : 'Talk to an agent'}
        </button>
      )}

      {ticketStatus === 'waiting' && (
        <span className="mr-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 font-ui text-xs text-amber-600">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
          Waiting for agent...
        </span>
      )}

      {ticketStatus === 'in_progress' && (
        <span className="mr-2 flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 font-ui text-xs text-green-600">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Agent connected
        </span>
      )}

      {ticketStatus === 'resolved' && (
        <span className="mr-2 flex items-center gap-1.5 rounded-lg bg-surface-muted px-3 py-1.5 font-ui text-xs text-text-hint">
          <CheckCircle className="h-3.5 w-3.5" strokeWidth={2} />
          Ticket resolved
        </span>
      )}

      <div className="group relative">
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleteDisabled}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-text-hint transition-all duration-150 hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Delete conversation"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} />
        </button>
        <span className="pointer-events-none absolute -bottom-8 right-0 whitespace-nowrap rounded-md bg-text-primary px-2 py-1 font-ui text-xs text-surface opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          Delete conversation
        </span>
      </div>
    </header>
  )
}