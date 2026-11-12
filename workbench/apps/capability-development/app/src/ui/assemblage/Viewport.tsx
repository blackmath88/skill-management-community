/**
 * The viewport: static drawing first, GPU renderer second, static drawing again if that fails.
 *
 * The order matters. The SVG is rendered immediately and stays mounted until a renderer has
 * actually produced a frame, so there is never a blank rectangle and never a layout jump. The
 * Three.js module is imported dynamically, so a browser that will never use it does not download
 * it as part of the first paint.
 *
 * Everything that can stop work stops it: the renderer is paused when the viewport scrolls out of
 * sight or the tab is hidden, resources are disposed on unmount, and the settle animation is the
 * only thing that ever runs more than one frame.
 */
import { useEffect, useRef, useState } from 'react'
import type { AssemblageRenderer, Backend, PickResult } from '~/assemblage/renderer'
import type { AssemblageView } from '~/assemblage/view'
import { StaticAssemblage } from './StaticAssemblage'

/** What the person asked for. 'auto' tries WebGPU, then WebGL 2, then stays static. */
export type RendererChoice = 'auto' | 'webgpu' | 'webgl2' | 'static'

export interface ViewportStatus {
  kind: 'static' | 'starting' | 'live' | 'failed'
  backend: Backend | null
  /** Every attempt and what it said, shown in the diagnostics panel. */
  attempts: { backend: Backend; stage: string; message: string }[]
  shadows: boolean
}

export interface ViewportProps {
  view: AssemblageView
  choice: RendererChoice
  motion: boolean
  yaw: number
  selectedInstanceId: string | null
  description: string
  /** Bumped by the page whenever a placement happened, to trigger one settle. */
  settleToken: number
  onSelectPiece: (instanceId: string) => void
  onSelectMarker: (markerId: string) => void
  onStatus: (status: ViewportStatus) => void
}

const ORDER: Record<RendererChoice, Backend[]> = {
  auto: ['webgpu', 'webgl2'],
  webgpu: ['webgpu'],
  webgl2: ['webgl2'],
  static: [],
}

export function Viewport({
  view,
  choice,
  motion,
  yaw,
  selectedInstanceId,
  description,
  settleToken,
  onSelectPiece,
  onSelectMarker,
  onStatus,
}: ViewportProps) {
  const holder = useRef<HTMLDivElement | null>(null)
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const renderer = useRef<AssemblageRenderer | null>(null)
  const [live, setLive] = useState(false)
  const [size, setSize] = useState({ width: 720, height: 460 })
  // Kept in a ref so the start effect does not re-run every time the parent re-renders with a new
  // callback identity: starting a renderer is expensive, and the only thing that should restart
  // one is a change of backend. Written in an effect, never during render.
  const report = useRef(onStatus)
  useEffect(() => {
    report.current = onStatus
  }, [onStatus])

  // ---------------------------------------------------------------- start and stop
  useEffect(() => {
    let cancelled = false
    const target = canvas.current
    if (!target) return

    const order = ORDER[choice]
    if (order.length === 0) {
      setLive(false)
      report.current({ kind: 'static', backend: null, attempts: [], shadows: false })
      return
    }

    report.current({ kind: 'starting', backend: null, attempts: [], shadows: false })
    const attempts: ViewportStatus['attempts'] = []

    void (async () => {
      const module = await import('~/assemblage/renderer').catch((error: unknown) => {
        attempts.push({
          backend: order[0] ?? 'webgl2',
          stage: 'module',
          message: error instanceof Error ? error.message : 'The renderer module could not be loaded.',
        })
        return null
      })
      if (cancelled) return
      if (!module) {
        setLive(false)
        report.current({ kind: 'failed', backend: null, attempts, shadows: false })
        return
      }
      for (const backend of order) {
        try {
          const made = await module.createAssemblageRenderer({
            canvas: target,
            backend,
            maxPixelRatio: 2,
            onLost: (reason) => {
              // Device loss is recoverable here because nothing about the composition lived in
              // the renderer: the semantic composition is still in React state and in storage,
              // so dropping back to the static drawing loses a technique, not any work.
              renderer.current?.dispose()
              renderer.current = null
              setLive(false)
              report.current({
                kind: 'failed',
                backend: null,
                attempts: [...attempts, { backend, stage: 'lost', message: reason }],
                shadows: false,
              })
            },
          })
          if (cancelled) {
            made.dispose()
            return
          }
          renderer.current = made
          made.setMotionEnabled(motion)
          made.setView(view)
          made.setSelected(selectedInstanceId)
          made.resize(size.width, size.height)
          setLive(true)
          report.current({ kind: 'live', backend: made.backend, attempts, shadows: made.shadows })
          return
        } catch (error) {
          const failure = (error as { failure?: { stage: string; message: string } }).failure
          attempts.push({
            backend,
            stage: failure?.stage ?? 'init',
            message: failure?.message ?? (error instanceof Error ? error.message : 'Unknown failure.'),
          })
        }
      }
      if (cancelled) return
      setLive(false)
      report.current({ kind: 'failed', backend: null, attempts, shadows: false })
    })()

    return () => {
      cancelled = true
      renderer.current?.dispose()
      renderer.current = null
      setLive(false)
    }
    // `view`, `motion`, `selectedInstanceId` and `size` are applied by the effects below. Starting
    // a renderer is expensive and must not happen again because a piece moved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choice])

  // ---------------------------------------------------------------- size
  useEffect(() => {
    const element = holder.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setSize({ width: Math.round(width), height: Math.round(height) })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    renderer.current?.resize(size.width, size.height)
  }, [size])

  // ---------------------------------------------------------------- pause offscreen and hidden
  useEffect(() => {
    const element = holder.current
    if (!element) return
    let visible = true
    let onScreen = true
    const apply = () => renderer.current?.setPaused(!(visible && onScreen))

    const onVisibility = () => {
      visible = document.visibilityState !== 'hidden'
      apply()
    }
    document.addEventListener('visibilitychange', onVisibility)

    let observer: IntersectionObserver | null = null
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver((entries) => {
        const entry = entries[0]
        if (!entry) return
        onScreen = entry.isIntersecting
        apply()
      })
      observer.observe(element)
    }
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      observer?.disconnect()
    }
  }, [live])

  // ---------------------------------------------------------------- state into the renderer
  useEffect(() => {
    renderer.current?.setView(view)
  }, [view])

  useEffect(() => {
    renderer.current?.setSelected(selectedInstanceId)
  }, [selectedInstanceId])

  useEffect(() => {
    renderer.current?.setMotionEnabled(motion)
  }, [motion])

  useEffect(() => {
    renderer.current?.resetView()
    // The static drawing and the canvas share one yaw value, so the two paths cannot drift.
    const current = renderer.current
    if (current && yaw !== 0) current.orbitBy(yaw)
  }, [yaw])

  useEffect(() => {
    if (settleToken > 0) renderer.current?.settle()
  }, [settleToken])

  const handlePick = (clientX: number, clientY: number) => {
    const hit: PickResult | null = renderer.current?.pick(clientX, clientY) ?? null
    if (!hit) return
    if (hit.kind === 'marker') onSelectMarker(hit.id)
    else onSelectPiece(hit.id)
  }

  return (
    <div className="assemblage-viewport" ref={holder}>
      {/*
        The canvas is not a control. Every action it offers also exists as a labelled button or a
        list item below it, so it carries aria-hidden and is skipped entirely by keyboard and
        screen-reader users rather than presenting itself as something it is not.
      */}
      <canvas
        ref={canvas}
        className={live ? 'assemblage-canvas is-live' : 'assemblage-canvas'}
        aria-hidden="true"
        onClick={(event) => handlePick(event.clientX, event.clientY)}
      />
      {live ? null : (
        <StaticAssemblage
          view={view}
          yaw={yaw}
          selectedInstanceId={selectedInstanceId}
          onSelectPiece={onSelectPiece}
          onSelectMarker={onSelectMarker}
          description={description}
          width={size.width}
          height={size.height}
        />
      )}
    </div>
  )
}
