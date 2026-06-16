import { Plus, Settings } from 'lucide-react'
import type { Session } from '../types/chat'

interface SidebarProps {
  sessions: Session[]
  activeSessionId: string
  onSelectSession: (id: string) => void
  onNewChat: () => void
  formatRelativeTime: (date: Date) => string
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  formatRelativeTime,
  isOpen,
  onClose,
}: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-border bg-surface transition-transform duration-150 md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 shrink-0 items-center border-b border-border px-4">
          <span className="mr-2 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
          <span className="font-ui text-base font-medium text-text-primary">
            NexaSupport
          </span>
        </div>

        <div className="px-3 pt-3">
          <button
            type="button"
            onClick={() => {
              onNewChat()
              onClose()
            }}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border font-ui text-base text-text-secondary transition-all duration-150 hover:bg-accent-light hover:text-accent"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            New chat
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto px-3">
          <p className="mb-2 px-3 font-ui text-[11px] uppercase tracking-[0.08em] text-text-hint">
            Recent
          </p>
          <ul className="space-y-0.5">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId
              return (
                <li key={session.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSession(session.id)
                      onClose()
                    }}
                    className={`flex h-14 w-full flex-col justify-center rounded-lg px-3 text-left transition-all duration-150 ${
                      isActive
                        ? 'border-l-2 border-accent bg-accent-light'
                        : 'border-l-2 border-transparent hover:bg-sidebar-hover'
                    }`}
                  >
                    <span
                      className={`truncate font-ui text-sm ${
                        isActive ? 'text-accent' : 'text-text-primary'
                      }`}
                    >
                      {session.title}
                    </span>
                    <span className="font-ui text-xs text-text-secondary">
                      {formatRelativeTime(session.timestamp)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="flex h-14 shrink-0 items-center border-t border-border px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-light">
            <span className="font-ui text-xs font-medium text-accent">AJ</span>
          </div>
          <span className="ml-3 flex-1 font-ui text-xs text-text-primary">
            Arjun J.
          </span>
          <button
            type="button"
            className="text-text-hint transition-all duration-150 hover:text-text-secondary"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </aside>
    </>
  )
}
