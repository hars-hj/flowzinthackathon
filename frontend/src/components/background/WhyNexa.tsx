import type { JSX, ReactNode } from 'react'
import useScrollReveal from '../../hooks/useScrollReveal'

interface Feature {
  icon: ReactNode
  title: string
  desc: string
}

const features: Feature[] = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" />
      </svg>
    ),
    title: 'Sub-second answers',
    desc: 'Vector retrieval + streaming responses mean replies feel like keystrokes, not page loads.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: 'Cites every source',
    desc: 'Every claim links back to the doc, ticket or policy it came from. No hallucinations, no surprises.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    title: '47 languages, one voice',
    desc: "Trained on your tone. Detects the customer's language and replies natively — same brand voice everywhere.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: 'Escalates gracefully',
    desc: "When confidence drops, Nexa hands off to a human with full context attached. No 'please repeat your issue'.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    title: 'Learns from every chat',
    desc: 'Resolved threads become training data. The bot literally gets smarter while you sleep.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
    title: 'Plugs into anything',
    desc: 'Zendesk, Intercom, Notion, Drive, Stripe, your own Postgres. If it has an API, we sync it.',
  },
]

export default function WhyNexa(): JSX.Element {
  const ref = useScrollReveal<HTMLElement>()

  return (
    <section id="why" ref={ref} className="py-16 sm:py-20 lg:py-25 px-5 sm:px-8 lg:px-15 scroll-mt-[68px]">
      <div className="max-w-[1100px] mx-auto">
        {/* Tag */}
        <div className="fu text-[10.5px] font-semibold tracking-[2.2px] uppercase text-teal mb-5 before:content-['/\00a0'] before:opacity-50">
          01 — Why Nexa
        </div>

        {/* Heading */}
        <h2
          className="fu delay-100 font-serif font-bold leading-[1.12] tracking-[-0.5px] mb-4 max-w-[640px] text-white"
          style={{ fontSize: 'clamp(32px, 4.2vw, 52px)' }}
        >
          Your team shouldn't be answering<br />
          the same five questions all day.
        </h2>

        {/* Sub */}
        <p className="fu delay-200 text-[15px] text-white/62 leading-[1.8] max-w-[520px] mb-13">
          Nexa resolves the repetitive 70% so your humans handle what humans
          are actually good at — empathy, judgment, edge cases.
        </p>

        {/* Grid */}
        <div className="fu delay-300 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border border-white/9 rounded-2xl overflow-hidden bg-[#1a3543] backdrop-blur-2xl">
          {features.map((f, i) => {
            const isRightColLg  = (i + 1) % 3 === 0
            const isLastRowLg   = i >= 3
            const isRightColSm  = (i + 1) % 2 === 0
            const isLastRowSm   = i >= features.length - (features.length % 2 === 0 ? 2 : 1)
            return (
              <div
                key={f.title}
                className={[
                  'p-6 sm:p-8 transition-colors hover:bg-teal/4',
                  'border-b border-white/7 sm:border-b-0',
                  isLastRowSm ? 'sm:border-b-0' : 'sm:border-b',
                  isRightColSm ? '' : 'sm:border-r',
                  isLastRowLg ? 'lg:border-b-0' : 'lg:border-b',
                  isRightColLg ? 'lg:border-r-0' : 'lg:border-r',
                  'border-white/7',
                ].join(' ')}
              >
                <span className="text-teal block mb-4">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    {f.icon}
                  </svg>
                </span>
                <div className="font-serif text-[17px] font-bold mb-2.5 text-white leading-snug">
                  {f.title}
                </div>
                <p className="text-[13px] text-white/58 leading-[1.72]">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}