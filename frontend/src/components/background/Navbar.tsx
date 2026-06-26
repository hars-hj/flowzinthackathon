import type { JSX } from "react/jsx-runtime"

interface NavbarProps {
  onStartFree?: () => void
}

export default function Navbar({ onStartFree }: NavbarProps): JSX.Element {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-[68px] flex items-center px-15 gap-9 bg-transparent">
      {/* Logo */}
      <a href="#" className="flex items-center gap-2.5 no-underline text-white font-semibold text-[15px] tracking-tight">
        <div className="w-[30px] h-[30px] bg-teal-dark rounded-lg flex items-center justify-center shrink-0">
          <svg
            className="w-[15px] h-[15px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
        Nexa
      </a>

      {/* Nav links */}
      <ul className="flex gap-8 ml-auto list-none">
        {['#why', '#rag', '#deploy', '#'].map((href, i) => {
          const labels = ['Why Nexa', 'Our RAG', 'How it works', 'Pricing']
          return (
            <li key={labels[i]}>
              <a
                href={href}
                className="text-white/75 no-underline text-[13.5px] font-normal transition-colors hover:text-white"
              >
                {labels[i]}
              </a>
            </li>
          )
        })}
      </ul>

      {/* Buttons */}
      <div className="flex items-center gap-2.5 ml-6">
        <button
          onClick={onStartFree}
          className="bg-transparent border border-white/30 text-white px-5 py-2 rounded-full text-[13px] font-medium cursor-pointer transition-all hover:bg-white/10 hover:border-white/50"
        >
          Sign in
        </button>
        <button
          onClick={onStartFree}
          className="bg-white text-[#0f2830] border-none px-5 py-2 rounded-full text-[13px] font-semibold cursor-pointer transition-opacity hover:opacity-90"
        >
          Start free ↗
        </button>
      </div>
    </nav>
  )
}