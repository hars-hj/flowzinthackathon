import { Menu, Trash2 } from 'lucide-react'

interface HeaderProps {
  onClear: () => void
  onMenuOpen: () => void
}

export function Header({ onClear, onMenuOpen }: HeaderProps) {
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
        <h1 className="font-ui text-base font-medium text-text-primary">
          NexaSupport AI
        </h1>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-online" />
          <span className="font-ui text-xs text-text-secondary">Online</span>
        </div>
      </div>

      <div className="group relative">
        <button
          type="button"
          onClick={onClear}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-text-hint transition-all duration-150 hover:bg-surface-muted"
          aria-label="Clear conversation"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} />
        </button>
        <span className="pointer-events-none absolute -bottom-8 right-0 whitespace-nowrap rounded-md bg-text-primary px-2 py-1 font-ui text-xs text-surface opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          Clear conversation
        </span>
      </div>
    </header>
  )
}
