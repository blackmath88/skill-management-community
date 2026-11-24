import { useEffect, useRef, useState } from 'react'
import { StaticAssemblage } from './Static'
import type { Backend, SceneInput } from './renderer'
export function Viewport({
  input,
  backend,
  onSelect,
}: {
  input: SceneInput
  backend: Backend
  onSelect(id: string): void
}) {
  const host = useRef<HTMLDivElement>(null)
  const latest = useRef(input)
  const select = useRef(onSelect)
  const controller = useRef<{ update(): void; dispose(): void } | null>(null)
  const [status, setStatus] = useState('Static view')
  useEffect(() => {
    latest.current = input
    select.current = onSelect
    controller.current?.update()
  }, [input, onSelect])
  useEffect(() => {
    let cancelled = false
    const abort = new AbortController()
    if (backend === 'static' || !host.current || typeof IntersectionObserver === 'undefined') return
    const target = host.current
    let started = false
    let inView = false
    const begin = () => {
      if (started || cancelled || !inView || document.hidden) return
      started = true
      void import('./renderer')
        .then(async ({ mountScene }) => {
          for (const mode of backend === 'auto' ? (['auto', 'webgl'] as const) : (['webgl'] as const)) {
            if (cancelled) return
            try {
              const result = await mountScene(
                target,
                mode,
                () => latest.current,
                (id) => select.current(id),
                (s) => {
                  if (!cancelled) setStatus(s)
                },
                abort.signal,
              )
              if (cancelled) result.dispose()
              else controller.current = result
              return
            } catch {
              /* Next bounded fallback; never discard semantic state. */
            }
          }
          if (!cancelled) setStatus('Static view · graphics could not start')
        })
        .catch(() => {
          if (!cancelled) setStatus('Static view · graphics could not load')
        })
    }
    const observer = new IntersectionObserver((entries) => {
      inView = entries[0]?.isIntersecting ?? false
      begin()
    })
    observer.observe(target)
    document.addEventListener('visibilitychange', begin)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', begin)
      cancelled = true
      abort.abort()
      controller.current?.dispose()
      controller.current = null
    }
  }, [backend])
  return (
    <div className="assemblage-view">
      <StaticAssemblage
        composition={input.composition}
        azimuth={input.azimuth}
        selected={input.selected}
        onSelect={onSelect}
      />
      <div className="assemblage-gpu" ref={host} />
      <span className="assemblage-backend" role="status">
        {backend === 'static' ? 'Static view' : status}
      </span>
    </div>
  )
}
