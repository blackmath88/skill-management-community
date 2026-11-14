/**
 * The personal mobile, drawn as SVG from a three-dimensional model.
 *
 * ~/mobile/scene does the geometry; this file paints it — matte sheet metal under a soft light,
 * thin wire, a shadow on the wall behind — and lets the person turn it: drag it, or press the
 * labelled "Turn it" button. Left alone it drifts slowly, each arm and each shape at its own
 * pace. With reduced motion it does not move by itself at all: it rests in its authored pose, a
 * drag follows the hand without coasting, and the button steps it round.
 *
 * The picture is still decoration with one convenience (clicking a shape that carries a memory
 * selects it). Every such action exists as a labelled HTML control beside it, so the SVG is
 * hidden from assistive technology and described in a sentence. It receives a MobileDrawing only
 * — geometry, colours and which shapes are marked — never a title or a line of anybody's writing.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { shapePath, VIEW_BOX } from '~/mobile/catalogue'
import { drawMobile, sheetColours, wireColour, type ShapeDrawing } from '~/mobile/scene'
import type { MobileDrawing } from '~/mobile/view'

function useReducedMotion(): boolean {
  const query = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
  const [reduced, setReduced] = useState(() => query?.matches ?? false)
  useEffect(() => {
    if (!query) return
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [query])
  return reduced
}

/** Radians of turn per pixel dragged, and how long a push takes to die away, in seconds. */
const DRAG = 0.011
const EASE = 1.5

export function Mobile({
  drawing,
  selectedSlot = null,
  onSelect,
  size = 'regular',
}: {
  drawing: MobileDrawing
  selectedSlot?: number | null
  onSelect?: (slot: number) => void
  size?: 'regular' | 'small'
}) {
  const { composition, palette, marked } = drawing
  const id = useId().replace(/:/g, '')
  const reduced = useReducedMotion()
  const [pose, setPose] = useState({ time: 0, turned: 0 })
  const motion = useRef({ turned: 0, velocity: 0, time: 0, last: 0, dragging: false, lastX: 0, travelled: 0, visible: true })
  const figure = useRef<HTMLElement>(null)

  // The drift. Only while the mobile is on screen, and never under reduced motion.
  useEffect(() => {
    const m = motion.current
    if (reduced || typeof requestAnimationFrame !== 'function') return
    let frame = 0
    const tick = (now: number) => {
      const dt = m.last === 0 ? 0 : Math.min(0.05, (now - m.last) / 1000)
      m.last = now
      if (m.visible) {
        m.time += dt
        if (!m.dragging) {
          m.turned += m.velocity * dt
          m.velocity *= Math.exp(-dt / EASE)
        }
        setPose({ time: m.time, turned: m.turned })
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    const observer =
      typeof IntersectionObserver === 'function' && figure.current
        ? new IntersectionObserver(([entry]) => {
            m.visible = entry?.isIntersecting ?? true
          })
        : null
    if (observer && figure.current) observer.observe(figure.current)
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      m.last = 0
    }
  }, [reduced])

  const turnBy = (angle: number) => {
    const m = motion.current
    if (reduced) {
      m.turned += angle
      setPose({ time: 0, turned: m.turned })
    } else {
      m.velocity += angle * 2.4
    }
  }

  /** A click that ended a drag is not a click on a shape. */
  const pick = (slot: number) => {
    if (motion.current.travelled < 5) onSelect?.(slot)
  }

  const pointer = {
    onPointerDown: (e: React.PointerEvent) => {
      const m = motion.current
      m.dragging = true
      m.lastX = e.clientX
      m.travelled = 0
      m.velocity = 0
    },
    onPointerMove: (e: React.PointerEvent) => {
      const m = motion.current
      if (!m.dragging) return
      const dx = e.clientX - m.lastX
      m.lastX = e.clientX
      m.travelled += Math.abs(dx)
      m.turned += dx * DRAG
      m.velocity = reduced ? 0 : dx * DRAG * 40
      if (reduced) setPose({ time: 0, turned: m.turned })
    },
    onPointerUp: () => {
      motion.current.dragging = false
    },
    onPointerLeave: () => {
      motion.current.dragging = false
    },
  }

  const parts = drawMobile(composition, reduced ? 0 : pose.time, pose.turned)
  const description =
    `Your mobile: the “${composition.title}” arrangement in ${palette.title.toLowerCase()}. ` +
    (marked.length === 0
      ? 'No memories are hung on it.'
      : `${marked.length} of its ${composition.shapes.length} shapes ${marked.length === 1 ? 'carries a memory' : 'carry memories'}, listed next to it.`)

  const sheet = (shape: ShapeDrawing) => {
    const def = composition.shapes[shape.slot]
    if (!def) return null
    const d = def.kind === 'ring' ? shapePath('ring', def.r - 4) : shapePath(def.kind, def.r)
    return { def, d, transform: `translate(${shape.x} ${shape.y}) scale(${(shape.scale * shape.squeeze).toFixed(3)} ${shape.scale}) rotate(${def.rot})` }
  }

  return (
    <figure className={`mobile mobile--${size}`} ref={figure}>
      <svg viewBox={VIEW_BOX} aria-hidden="true" focusable="false" {...pointer}>
        <defs>
          <filter id={`${id}-soft`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          {parts.map((part) => {
            if (part.kind !== 'shape') return null
            const def = composition.shapes[part.slot]
            if (!def) return null
            const colours = sheetColours(palette.tones[def.tone], part)
            return (
              <linearGradient key={part.slot} id={`${id}-g${part.slot}`} gradientUnits="userSpaceOnUse" x1="0" y1={-def.r} x2="0" y2={def.r} gradientTransform={`rotate(${-def.rot})`}>
                <stop offset="0" stopColor={colours.top} />
                <stop offset="1" stopColor={colours.bottom} />
              </linearGradient>
            )
          })}
        </defs>

        {/* The shadow on the wall: the same sheets, displaced by the light and blurred. */}
        <g filter={`url(#${id}-soft)`} opacity="0.1" fill="#2a251d" stroke="#2a251d">
          {parts.map((part, i) => {
            if (part.kind === 'wire') return null
            const s = sheet(part)
            if (!s) return null
            return (
              <g key={i} transform={`translate(${part.shadow[0]} ${part.shadow[1]})`}>
                <path d={s.d} transform={s.transform} {...(s.def.kind === 'ring' ? { fill: 'none', strokeWidth: 8 } : { stroke: 'none' })} />
              </g>
            )
          })}
        </g>

        {parts.map((part, i) => {
          if (part.kind === 'wire') {
            return <path key={i} d={part.d} fill="none" stroke={wireColour(palette.wire, part.haze)} strokeWidth={part.width} strokeLinecap="round" />
          }
          const s = sheet(part)
          if (!s) return null
          const { def } = s
          const colours = sheetColours(palette.tones[def.tone], part)
          const isMarked = marked.includes(part.slot)
          const selectable = isMarked && onSelect !== undefined
          const top = part.y - def.r * part.scale
          // The far edge of the sheet's thickness shows on the side turned away from the viewer.
          const rim = (part.reverse ? -1 : 1) * 1.7 * (1 - part.squeeze)
          return (
            <g key={i} className={selectable ? 'is-clickable' : undefined} onClick={() => (selectable ? pick(part.slot) : undefined)}>
              {selectedSlot === part.slot ? (
                <ellipse
                  cx={part.x}
                  cy={part.y}
                  rx={(def.r + 9) * part.scale * Math.max(0.4, part.squeeze)}
                  ry={(def.r + 9) * part.scale}
                  fill="none"
                  stroke={palette.wire}
                  strokeWidth="1.4"
                  strokeDasharray="3 4"
                />
              ) : null}
              {def.kind === 'ring' ? (
                <>
                  <path d={s.d} transform={`translate(${rim} 0) ${s.transform}`} fill="none" stroke={colours.bottom} strokeWidth="8" />
                  <path d={s.d} transform={s.transform} fill="none" stroke={`url(#${id}-g${part.slot})`} strokeWidth="8" />
                </>
              ) : (
                <>
                  <path d={s.d} transform={`translate(${rim} 0) ${s.transform}`} fill={colours.bottom} />
                  <path d={s.d} transform={s.transform} fill={`url(#${id}-g${part.slot})`} stroke={colours.edge} strokeWidth="0.8" vectorEffect="non-scaling-stroke" strokeOpacity="0.55" />
                </>
              )}
              {/* A memory is carried by a mark, not by a colour: an inlay on the sheet and a
                  bead on its thread. */}
              {isMarked ? (
                <>
                  <ellipse cx={part.x} cy={part.y} rx={Math.max(2.5, def.r * 0.18) * part.scale * Math.max(0.3, part.squeeze)} ry={Math.max(2.5, def.r * 0.18) * part.scale} fill="#fffdf8" stroke={palette.wire} strokeWidth="1" />
                  <circle cx={(part.threadTop[0] + part.x) / 2} cy={(part.threadTop[1] + top) / 2} r={3.2 * part.scale} fill={palette.wire} />
                </>
              ) : null}
            </g>
          )
        })}
      </svg>
      <figcaption className="visually-hidden">{description}</figcaption>
      {size === 'regular' ? (
        <p className="mobile__controls">
          <button type="button" className="btn-link" onClick={() => turnBy(0.7)}>
            Turn it
          </button>
          <span className="meta" aria-hidden="true">
            {' '}
            · or drag
          </span>
        </p>
      ) : null}
    </figure>
  )
}
