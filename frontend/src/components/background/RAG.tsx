import type { JSX } from 'react/jsx-runtime'
import useScrollReveal from '../../hooks/useScrollReveal'

interface RAGProps {
  onSeePipeline?: () => void
}

interface PipelineStep {
  num: string
  title: string
  desc: string
}

const steps: PipelineStep[] = [
  { num: '01', title: 'Query intake',        desc: 'Customer message normalized, intent classified, language detected.' },
  { num: '02', title: 'Hybrid retrieval',    desc: 'Top-50 candidates pulled from vector store + BM25 in parallel.' },
  { num: '03', title: 'Rerank & fuse',       desc: 'Cross-encoder scores each chunk against the query. Top-8 survive.' },
  { num: '04', title: 'Grounded generation', desc: 'LLM answers with strict citation constraints. No source → no claim.' },
  { num: '05', title: 'Confidence gate',     desc: 'Below threshold? Escalate to human with full retrieval context.' },
]

const bullets: string[] = [
  'Hybrid search: dense embeddings + sparse BM25 fused with Reciprocal Rank Fusion',
  'Cross-encoder reranker scoring relevance against the actual question, not just similarity',
  'Recursive chunking with semantic boundaries — never splits a paragraph mid-thought',
  'Per-tenant namespaces with row-level encryption. Your data never trains a shared model.',
]

export default function RAG({ onSeePipeline }: RAGProps): JSX.Element {
  const ref = useScrollReveal<HTMLElement>()

  return (
    <section id="rag" ref={ref} className="py-16 sm:py-20 lg:py-25 px-5 sm:px-8 lg:px-15 scroll-mt-[68px]">
      <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">

        {/* Left */}
        <div>
          <div className="fu text-[10.5px] font-semibold tracking-[2.2px] uppercase text-teal mb-5 before:content-['/\00a0'] before:opacity-50">
            02 — Our RAG
          </div>
          <h2
            className="fu delay-100 font-serif font-bold leading-[1.1] tracking-[-0.4px] mb-4 text-white"
            style={{ fontSize: 'clamp(28px, 3.6vw, 46px)' }}
          >
            Not just <em className="italic text-teal">another</em><br />
            wrapper around GPT.
          </h2>
          <p className="fu delay-200 text-[14.5px] text-white/62 leading-[1.82] mb-7">
            We built a hybrid retrieval pipeline that combines semantic vectors,
            keyword BM25, and a re-ranker tuned for support content. The result:
            answers grounded in <em>your</em> truth — not the model's guess at it.
          </p>
          <ul className="fu delay-300 flex flex-col gap-3 list-none">
            {bullets.map((b) => (
              <li key={b} className="flex gap-3 text-[13.5px] text-white/62 leading-[1.65] items-start">
                <span className="mt-0.5 w-[17px] h-[17px] min-w-[17px] border border-teal rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="#2DD4BF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                {b}
              </li>
            ))}
          </ul>

          <button
            onClick={onSeePipeline}
            className="mt-8 bg-teal text-[#0a2028] border-none px-6 py-3 rounded-full text-[14px] font-semibold cursor-pointer transition-all hover:bg-teal-dark hover:-translate-y-px"
          >
            Try it live ↗
          </button>
        </div>

        {/* Right — Pipeline panel */}
        <div className="fu delay-200 bg-[#1a3543] border border-white/9 rounded-2xl p-1.5 backdrop-blur-2xl">
          <div className="flex items-center gap-2 px-4 pt-3 pb-1.5 text-[10px] font-semibold tracking-[2px] text-white/30">
            <span className="w-1.5 h-1.5 rounded-full bg-teal" />
            PIPELINE.LIVE
          </div>

          {steps.map((s, i) => (
            <div
              key={s.num}
              className={`flex items-start gap-3 px-3 py-3 rounded-lg transition-colors hover:bg-teal/6 cursor-default ${i > 0 ? 'border-t border-white/5' : ''}`}
            >
              <div className="w-6 h-6 bg-teal/13 rounded-md flex items-center justify-center text-[9px] font-bold text-teal shrink-0 tracking-wide">
                {s.num}
              </div>
              <div>
                <div className="text-[13px] font-semibold text-white mb-0.5">{s.title}</div>
                <div className="text-[11.5px] text-white/55 leading-[1.5]">{s.desc}</div>
              </div>
            </div>
          ))}

          <div className="mt-1.5 mb-1 mx-0 bg-[#142a36] border border-white/7 rounded-lg px-5 py-4">
            <div className="text-[10px] text-white/30 tracking-wide mb-1.5 font-mono">
              // avg pipeline latency
            </div>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="font-serif text-[32px] font-bold text-white">847</span>
                <span className="text-[11.5px] text-white/45 ml-1">ms · p50</span>
              </div>
              <span className="text-[10.5px] text-teal font-semibold">▲ retrieval grounded</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}