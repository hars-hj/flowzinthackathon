import type { JSX } from 'react/jsx-runtime'
import useScrollReveal from '../../hooks/useScrollReveal'

interface CTAProps {
  onStartTrial?: () => void
  onBookDemo?: () => void
}

export default function CTA({ onStartTrial, onBookDemo }: CTAProps): JSX.Element {
  const ref = useScrollReveal<HTMLElement>()

  return (
    <section ref={ref} className="pt-16 sm:pt-20 lg:pt-25 px-5 sm:px-8 lg:px-15 pb-0">
      <div className="max-w-[1100px] mx-auto">
        <div className="fu bg-[#1a3543] border border-white/9 rounded-[18px] px-6 sm:px-10 lg:px-13 py-10 sm:py-12 lg:py-15 backdrop-blur-2xl">
          <h2
            className="font-serif font-bold leading-[1.08] tracking-[-0.4px] mb-3.5 text-white"
            style={{ fontSize: 'clamp(28px, 4vw, 54px)' }}
          >
            Stop answering. Start{' '}
            <em className="italic text-teal">resolving</em>.
          </h2>
          <p className="text-[15px] text-white/62 max-w-[480px] leading-[1.8] mb-8">
            14-day trial. No credit card. Onboard your knowledge base in under
            an hour — or we'll do it for you.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onStartTrial}
              className="bg-white text-[#0f2830] border-none px-6.5 py-3 rounded-full text-[14.5px] font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-opacity hover:opacity-90"
            >
              Start your trial ↗
            </button>
            <button
              onClick={onBookDemo}
              className="bg-[#06121a]/35 border border-white/26 text-white px-6.5 py-3 rounded-full text-[14.5px] cursor-pointer backdrop-blur-sm transition-all hover:bg-[#06121a]/55"
            >
              Book a demo
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}