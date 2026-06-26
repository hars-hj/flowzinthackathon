import type { JSX } from 'react/jsx-runtime'
import useScrollReveal from '../../hooks/useScrollReveal'

interface HeroProps {
  onStartFree?: () => void
}

export default function Hero({ onStartFree }: HeroProps): JSX.Element {
  const ref = useScrollReveal<HTMLElement>()

  return (
    <section
      ref={ref}
      className="min-h-screen flex flex-col justify-center px-5 sm:px-8 lg:px-15 pt-[100px] pb-20"
    >
      <div className="max-w-[680px] w-full">
        {/* Live pill */}
        <div className="fu inline-flex items-center gap-2 bg-teal/10 border border-teal/25 px-3.5 py-1.5 rounded text-[11px] font-semibold tracking-[1.6px] text-teal mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-teal shrink-0 blink" />
          LIVE &nbsp;·&nbsp; V2.4 SHIPPED
        </div>

        {/* Headline */}
        <h1
          className="fu delay-100 font-serif font-bold leading-[1.05] tracking-[-1px] mb-6 text-white"
          style={{ fontSize: 'clamp(48px, 6.5vw, 82px)' }}
        >
          Customer support<br />
          that <em className="text-teal not-italic italic">remembers</em><br />
          everything<br />
          <span className="text-white/40">you've ever written.</span>
        </h1>

        {/* Sub */}
        <p className="fu delay-200 text-[15.5px] text-white/65 leading-[1.8] max-w-[460px] mb-9 font-normal">
          Nexa is a retrieval-augmented chatbot trained on your docs, tickets,
          and policies. It answers in your voice, cites its sources, and never
          invents an SLA it can't keep.
        </p>

        {/* Buttons */}
        <div className="fu delay-300 flex flex-wrap gap-3 mb-13">
          <button
            onClick={onStartFree}
            className="bg-teal text-[#0a2028] border-none px-6.5 py-3 rounded-full text-[14px] font-semibold cursor-pointer transition-all hover:bg-teal-dark hover:-translate-y-px"
          >
            Deploy in 4 minutes ↗
          </button>
          <button
            onClick={onStartFree}
            className="bg-[#08161e]/40 border border-white/20 text-white px-6.5 py-3 rounded-full text-[14px] font-normal cursor-pointer backdrop-blur-sm transition-all hover:bg-[#08161e]/60"
          >
            See the RAG pipeline
          </button>
        </div>

        {/* Stats bar */}
        <div className="fu delay-400 flex w-full sm:w-fit flex-wrap bg-[#1a3543] border border-white/10 rounded-xl overflow-hidden backdrop-blur-2xl">
          {[
            { num: '92%', label: 'Auto-Resolved' },
            { num: '1.4s', label: 'Median Reply' },
            { num: '47',   label: 'Languages' },
          ].map((s, i) => (
            <div
              key={s.label}
              className={`flex-1 sm:flex-none px-5 sm:px-7.5 py-4 ${i < 2 ? 'border-r border-white/8' : ''}`}
            >
              <div className="font-serif text-[28px] font-bold text-white leading-none mb-1">
                {s.num}
              </div>
              <div className="text-[10px] font-semibold tracking-[1.3px] uppercase text-white/35">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}