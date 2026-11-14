/**
 * The mobile, drawn as SVG from a three-dimensional model, and how it behaves.
 *
 * ~/mobile/scene does the geometry; this file paints it — matte sheet metal under a soft light,
 * thin wire, a shadow on the wall behind — and gives it its manners:
 *
 *   - Left alone it drifts, each arm and sheet at its own pace.
 *   - It can be turned: drag it, or press the labelled "Turn it" button. A push eases out, and
 *     the sheets lag behind on their threads and swing back.
 *   - Under a mouse it leans a little towards the pointer.
 *   - It settles into place when it first appears, and stirs when something is saved nearby.
 *   - When a memory is hung, its bead slides down the thread and the arms above it tip.
 *   - Its light comes from where the day's light would: left in the morning, right by evening.
 *
 * With reduced motion none of that happens by itself. It rests in its authored pose; a drag
 * follows the hand without coasting; the button steps it round; a new memory is simply there.
 *
 * The picture is never the only way to anything. Whatever a click on a sheet does is also a
 * labelled HTML control beside it, so the SVG is hidden from assistive technology and described
 * in a sentence. It receives a MobileDrawing only — geometry, colours and which sheets are
 * marked — never a title or a line of anybody's writing.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { shapePath, VIEW_BOX } from '~/mobile/catalogue'
import { drawMobile, lightForHour, roomLight, sheetColours, wireColour, type ShapeDrawing } from '~/mobile/scene'
import type { MobileDrawing } from '~/mobile/view'
import { onMobileNudge } from './nudge'
import { SheetArt } from './SheetArt'

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
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const easeOut = (t: number) => 1 - (1 - t) * (1 - t)

interface Pose {
  time: number
  turned: number
  sway: number
  tilt: number
  weights: number[]
}

/** The camera's resting height, and how far a vertical drag may raise or lower it. */
const TILT = 0.2
const TILT_RANGE: [number, number] = [0.04, 0.5]

export function Mobile({
  drawing,
  selectedSlot = null,
  onSelect,
  selectable = 'marked',
  size = 'regular',
  still = false,
}: {
  drawing: MobileDrawing
  selectedSlot?: number | null
  onSelect?: (slot: number) => void
  /** Which sheets a click selects: only those carrying a mark, or every one. */
  selectable?: 'marked' | 'all'
  size?: 'regular' | 'small' | 'wide'
  /** A quiet picture: no motion, no controls, no shadow. For use as a mark. */
  still?: boolean
}) {
  const { composition, palette, marked, finish, labels, groups } = drawing
  const [hovered, setHovered] = useState<number | null>(null)
  const id = useId().replace(/:/g, '')
  const prefersReduced = useReducedMotion()
  const reduced = prefersReduced || still
  const count = composition.shapes.length
  const targets: number[] = Array.from({ length: count }, (_, slot) => drawing.weights?.[slot] ?? (marked.includes(slot) ? 1 : 0))
  const markKey = targets.map((w) => w.toFixed(2)).join(',')
  const [hour] = useState(() => new Date().getHours())
  const lightX = lightForHour(hour)
  const room = roomLight(hour)
  const [pose, setPose] = useState<Pose>(() => ({ time: 0, turned: 0, sway: 0, tilt: TILT, weights: targets }))
  const motion = useRef({
    turned: 0, velocity: 0, sway: 0, swayVelocity: 0, lean: 0, leanTarget: 0,
    time: 0, last: 0, dragging: false, lastX: 0, lastY: 0, travelled: 0, visible: true, tilt: TILT, calm: false,
    weights: targets, targets, entered: false,
  })
  const figure = useRef<HTMLElement>(null)

  // What is hung changed: tell the loop, or under reduced motion simply show it.
  useEffect(() => {
    const m = motion.current
    const next = markKey === '' ? [] : markKey.split(',').map(Number)
    const changed = m.targets.map((w) => w.toFixed(2)).join(',') !== markKey
    m.targets = next
    if (m.weights.length !== next.length) m.weights = next
    if (reduced) {
      m.weights = next
      setPose((p) => ({ ...p, weights: next }))
    } else if (changed) {
      // Hanging something sets the whole thing moving a little.
      m.velocity += 0.45
    }
  }, [markKey, reduced])

  useEffect(() => {
    const m = motion.current
    if (reduced || typeof requestAnimationFrame !== 'function') return
    if (!m.entered) {
      // Settle into place on arrival: wound back a little, easing to the authored pose.
      m.entered = true
      m.turned = -0.9
      m.velocity = 0.9 / EASE
    }
    let frame = 0
    const tick = (now: number) => {
      const dt = m.last === 0 ? 0 : Math.min(0.05, (now - m.last) / 1000)
      m.last = now
      if (m.visible) {
        // Under the pointer it all but holds still, so a moving target can be aimed at.
        m.time += dt * (m.calm ? 0.12 : 1)
        if (!m.dragging) {
          m.turned += m.velocity * dt
          m.velocity *= Math.exp(-dt / EASE)
        }
        // The threads are a spring chasing the turn: they lag, overshoot and settle.
        const want = clamp(m.velocity * 0.09, -0.4, 0.4)
        m.swayVelocity += ((want - m.sway) * 34 - m.swayVelocity * 4.2) * dt
        m.sway += m.swayVelocity * dt
        m.lean += (m.leanTarget - m.lean) * Math.min(1, dt * 3.5)
        m.weights = m.weights.map((w, i) => {
          const target = m.targets[i] ?? 0
          return Math.abs(target - w) < 0.002 ? target : w + (target - w) * Math.min(1, dt * 2.6)
        })
        setPose({ time: m.time, turned: m.turned + m.lean, sway: m.sway, tilt: m.tilt, weights: m.weights })
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
    const stopListening = onMobileNudge((strength) => {
      m.velocity += 0.7 * strength
    })
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      stopListening()
      m.last = 0
    }
  }, [reduced])

  const turnBy = (angle: number) => {
    const m = motion.current
    if (reduced) {
      m.turned += angle
      setPose((p) => ({ ...p, time: 0, turned: m.turned }))
    } else {
      m.velocity += angle * 2.4
    }
  }

  /** A click that ended a drag is not a click on a sheet. */
  const pick = (slot: number) => {
    if (motion.current.travelled < 5) onSelect?.(slot)
  }

  const pointer = still
    ? {}
    : {
        onPointerDown: (e: React.PointerEvent) => {
          const m = motion.current
          m.dragging = true
          m.lastX = e.clientX
          m.lastY = e.clientY
          m.travelled = 0
          m.velocity = 0
        },
        onPointerMove: (e: React.PointerEvent) => {
          const m = motion.current
          if (!m.dragging) {
            if (e.pointerType === 'mouse' && !reduced) {
              const box = e.currentTarget.getBoundingClientRect()
              m.leanTarget = ((e.clientX - box.left) / box.width - 0.5) * 0.3
            }
            return
          }
          const dx = e.clientX - m.lastX
          const dy = e.clientY - m.lastY
          m.lastX = e.clientX
          m.lastY = e.clientY
          m.travelled += Math.abs(dx) + Math.abs(dy)
          m.turned += dx * DRAG
          // Dragging down looks from higher up; dragging up, from nearer level.
          m.tilt = clamp(m.tilt + dy * 0.004, TILT_RANGE[0], TILT_RANGE[1])
          m.velocity = reduced ? 0 : dx * DRAG * 40
          if (reduced) setPose((p) => ({ ...p, time: 0, turned: m.turned, tilt: m.tilt }))
        },
        onPointerUp: () => {
          motion.current.dragging = false
        },
        onPointerLeave: () => {
          motion.current.dragging = false
          motion.current.leanTarget = 0
        },
      }

  const parts = drawMobile(composition, reduced ? 0 : pose.time, pose.turned, {
    sway: reduced ? 0 : pose.sway,
    weights: pose.weights.length === count ? pose.weights : targets,
    lightX,
    tilt: pose.tilt,
  })
  const description =
    `A mobile: the “${composition.title}” arrangement in ${palette.title.toLowerCase()}. ` +
    (marked.length === 0
      ? 'None of its sheets is marked.'
      : `${marked.length} of its ${count} sheets ${marked.length === 1 ? 'is' : 'are'} marked, listed next to it.`)

  const sheet = (shape: ShapeDrawing) => {
    const def = composition.shapes[shape.slot]
    if (!def) return null
    const band = def.r * 0.42
    const d = def.kind === 'ring' ? shapePath('ring', def.r - band / 2) : shapePath(def.kind, def.r)
    return { def, d, band, transform: `translate(${shape.x} ${shape.y}) scale(${(shape.scale * shape.squeeze).toFixed(3)} ${shape.scale}) rotate(${def.rot})` }
  }

  const sheets = parts.filter((p): p is ShapeDrawing => p.kind === 'shape')
  const named = labels ? sheets.filter((p) => p.slot === selectedSlot || p.slot === hovered) : []
  const captionSize = Number((composition.viewBox ?? VIEW_BOX).split(' ')[2]) / 54
  const captions: { title: string; x: number; y: number; active: boolean }[] = []
  for (const group of [...(groups ?? [])]
    .map((g) => {
      const own = sheets.filter((p) => g.slots.includes(p.slot))
      return own.length === 0
        ? null
        : {
            title: g.title,
            active: g.active ?? false,
            x: own.reduce((sum, p) => sum + p.x, 0) / own.length,
            y: Math.max(...own.map((p) => p.y + (composition.shapes[p.slot]?.r ?? 0) * p.scale * (finish?.[p.slot]?.state === 'transferred' ? 2.1 : 1))) + captionSize * 1.7,
          }
    })
    .filter((g) => g !== null)
    .sort((a, b) => a.x - b.x)) {
    const width = (t: string) => t.length * captionSize * 0.7
    let y = group.y
    for (let pass = 0; pass < 6; pass += 1) {
      const clash = captions.find((c) => Math.abs(c.x - group.x) < (width(c.title) + width(group.title)) / 2 + captionSize && Math.abs(c.y - y) < captionSize * 1.4)
      if (!clash) break
      y = clash.y + captionSize * 1.5
    }
    captions.push({ ...group, y })
  }
  const [boxX, boxY, boxW, boxH] = (composition.viewBox ?? VIEW_BOX).split(' ').map(Number) as [number, number, number, number]
  const hookX = composition.hookX

  return (
    <figure className={`mobile mobile--${size}${still ? ' mobile--still' : ''}`} ref={figure}>
      <svg viewBox={composition.viewBox ?? VIEW_BOX} aria-hidden="true" focusable="false" className={reduced ? undefined : 'mobile__arrive'} {...pointer}>
        <defs>
          <radialGradient id={`${id}-room`}>
            <stop offset="0" stopColor={room.colour} stopOpacity={room.strength} />
            <stop offset="0.55" stopColor={room.colour} stopOpacity={room.strength * 0.35} />
            <stop offset="1" stopColor={room.colour} stopOpacity="0" />
          </radialGradient>
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
          {finish
            ? composition.shapes.map((def, slot) =>
                def.kind === 'ring' ? null : (
                  <clipPath key={slot} id={`${id}-c${slot}`}>
                    <path d={shapePath(def.kind, def.r)} />
                  </clipPath>
                ),
              )
            : null}
        </defs>

        {/* The room: light falling on the wall from the side the light comes from, and the fixing
            the whole thing hangs from. They are what make the shadow a shadow on something. */}
        {still ? null : (
          <>
            <ellipse cx={boxX + boxW / 2 - lightX * boxW * 0.16} cy={boxY + boxH * 0.46} rx={boxW * 0.52} ry={boxH * 0.56} fill={`url(#${id}-room)`} />
            <g className="mobile__fixing">
              <rect x={hookX - 9} y={boxY} width="18" height="3.2" rx="1.6" fill={palette.wire} opacity="0.85" />
              <circle cx={hookX} cy={boxY + 6.4} r="2.4" fill="none" stroke={palette.wire} strokeWidth="1.2" />
            </g>
          </>
        )}

        {/* The shadow on the wall: the same sheets, displaced by the light and blurred. */}
        {still ? null : (
          <g filter={`url(#${id}-soft)`} opacity="0.1" fill="#2a251d" stroke="#2a251d">
            {parts.map((part, i) => {
              if (part.kind !== 'shape' || finish?.[part.slot]?.state === 'outline') return null
              const s = sheet(part)
              if (!s) return null
              return (
                <g key={i} transform={`translate(${part.shadow[0]} ${part.shadow[1]})`} opacity={finish?.[part.slot]?.state === 'claimed' ? 0.5 : 1}>
                  <path d={s.d} transform={s.transform} {...(s.def.kind === 'ring' ? { fill: 'none', strokeWidth: s.band } : { stroke: 'none' })} />
                </g>
              )
            })}
          </g>
        )}

        {parts.map((part, i) => {
          if (part.kind === 'wire') {
            return <path key={i} d={part.d} fill="none" stroke={wireColour(palette.wire, part.haze)} strokeWidth={part.width} strokeLinecap="round" />
          }
          if (part.kind === 'joint') {
            return <circle key={i} cx={part.x} cy={part.y} r={part.r} fill="#f3efe6" stroke={wireColour(palette.wire, part.haze)} strokeWidth={Math.max(0.8, part.r * 0.55)} />
          }
          const s = sheet(part)
          if (!s) return null
          const { def } = s
          const colours = sheetColours(palette.tones[def.tone], part)
          const weight = pose.weights[part.slot] ?? 0
          const clickable = onSelect !== undefined && (selectable === 'all' || marked.includes(part.slot))
          const made = finish?.[part.slot]
          const solid = made === undefined || (made.state !== 'outline' && made.state !== 'claimed')
          const top = part.y - def.r * part.scale
          // The far edge of the sheet's thickness shows on the side turned away from the viewer.
          const rim = (part.reverse ? -1 : 1) * 1.7 * (1 - part.squeeze)
          // The bead slides down the thread as it settles.
          const isMarked = marked.includes(part.slot)
          const along = 0.1 + 0.4 * easeOut(made ? 1 : weight)
          const inlay = Math.max(2.5, def.r * 0.18) * part.scale * weight
          const subject = selectedSlot === part.slot || hovered === part.slot
          return (
            <g
              key={i}
              className={clickable ? 'is-clickable' : undefined}
              opacity={made?.quiet && !subject ? 0.5 : 1}
              onClick={() => (clickable ? pick(part.slot) : undefined)}
              onPointerEnter={() => {
                if (!labels && !clickable) return
                motion.current.calm = true
                setHovered(part.slot)
              }}
              onPointerLeave={() => {
                motion.current.calm = false
                setHovered((h) => (h === part.slot ? null : h))
              }}
            >
              {/* A generous target: the sheet is small and it moves. */}
              {clickable ? <circle cx={part.x} cy={part.y} r={(def.r + 7) * part.scale} fill="transparent" /> : null}
              {selectedSlot === part.slot ? (
                <ellipse cx={part.x} cy={part.y} rx={(def.r + 8) * part.scale * Math.max(0.4, part.squeeze)} ry={(def.r + 8) * part.scale} fill="none" stroke={palette.wire} strokeWidth="1.4" strokeDasharray="3 4" />
              ) : null}
              {solid ? (
                <path d={s.d} transform={`translate(${rim} 0) ${s.transform}`} {...(def.kind === 'ring' ? { fill: 'none', stroke: colours.bottom, strokeWidth: s.band } : { fill: colours.bottom })} />
              ) : null}
              <g transform={s.transform}>
                <SheetArt def={def} d={s.d} band={s.band} finish={made} colours={colours} tone={palette.tones[def.tone]} wire={palette.wire} gradient={`${id}-g${part.slot}`} clip={`${id}-c${part.slot}`} />
              </g>
              {/* A mark is carried by form, not by colour: a bead on the thread and, on the
                  personal mobile, an inlay on the sheet. */}
              {(made ? isMarked : weight > 0.01) ? (
                <>
                  {made ? null : <ellipse cx={part.x} cy={part.y} rx={inlay * Math.max(0.3, part.squeeze)} ry={inlay} fill="#fffdf8" stroke={palette.wire} strokeWidth="1" />}
                  <circle
                    cx={part.threadTop[0] + (part.x - part.threadTop[0]) * along}
                    cy={part.threadTop[1] + (top - part.threadTop[1]) * along}
                    r={Math.min(3.2, def.r * 0.24) * part.scale}
                    fill={palette.wire}
                    opacity={made ? 1 : Math.min(1, weight * 3)}
                  />
                </>
              ) : null}
            </g>
          )
        })}
        {/* A caption under each bough, so the picture reads as branches and not only as pieces.
            Captions that would run into each other step down a line. */}
        {captions.map((c) => (
          <text key={c.title} className={`mobile__caption${c.active ? ' is-active' : ''}`} x={c.x} y={c.y} textAnchor="middle" style={{ fontSize: captionSize, strokeWidth: boxW / 160 }}>
            {c.title}
          </text>
        ))}
        {/* The name of the piece under the pointer, or the selected one, above everything. */}
        {named.map((part) => (
          <text key={part.slot} className="mobile__label" x={part.x} y={part.y - ((composition.shapes[part.slot]?.r ?? 0) + 7) * part.scale} textAnchor="middle" style={{ fontSize: boxW / 44, strokeWidth: boxW / 130 }}>
            {labels?.[part.slot]}
          </text>
        ))}
      </svg>
      {still ? null : <figcaption className="visually-hidden">{description}</figcaption>}
      {still ? null : (
        <p className="mobile__controls">
          <button type="button" className="btn-link" onClick={() => turnBy(0.7)}>
            Turn it
          </button>
          <span className="meta" aria-hidden="true">
            {' '}
            · or drag
          </span>
        </p>
      )}
    </figure>
  )
}
