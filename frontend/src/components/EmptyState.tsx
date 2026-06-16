import { MessageCircle } from 'lucide-react'

export function EmptyState() {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent">
        <MessageCircle className="h-6 w-6 text-white" strokeWidth={2} />
      </div>
      <h2 className="mb-2 font-ui text-lg font-medium text-text-primary">
        How can I help you today?
      </h2>
      <p className="max-w-sm font-ui text-sm text-text-secondary">
        Ask me anything about our products, pricing, or policies.
      </p>
    </div>
  )
}
