import { useEffect, useRef } from 'react'

export default function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('on')
        })
      },
      { threshold: 0.1 },
    )

    node.querySelectorAll<HTMLElement>('.fu').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return ref
}
