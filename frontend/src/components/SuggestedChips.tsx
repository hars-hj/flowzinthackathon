const SUGGESTIONS = [
  'What are your pricing plans?',
  'How do I get started?',
  "What's your refund policy?",
  'How do I contact support?',
]

interface SuggestedChipsProps {
  onSelect: (text: string) => void
}

export function SuggestedChips({ onSelect }: SuggestedChipsProps) {
  return (
    <div className="mt-6 flex max-w-lg flex-wrap justify-center gap-2">
      {SUGGESTIONS.map((text, index) => (
        <button
          key={text}
          type="button"
          onClick={() => onSelect(text)}
          className="animate-chip-in rounded-full border border-border bg-surface px-[14px] py-1.5 font-ui text-xs text-text-secondary transition-all duration-150 ease-in-out hover:border-accent hover:bg-accent-light hover:text-accent"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          {text}
        </button>
      ))}
    </div>
  )
}
