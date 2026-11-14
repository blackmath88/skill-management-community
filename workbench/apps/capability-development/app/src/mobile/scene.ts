/**
 * The mobile as a three-dimensional object, projected to a flat picture.
 *
 * Pure geometry: given an arrangement, a time and how far the person has turned it, this returns
 * what to draw, back to front. There is no renderer, no GPU and no DOM here — the output is plain
 * numbers and SVG path strings, so the picture stays an SVG that works everywhere the page does,
 * and the same function draws the still pose and every frame of the moving one.
 *
 * Axes: x to the right, y down, z towards the viewer. Arms and the hoop turn about the vertical
 * thread they hang from; each shape is a flat sheet in a vertical plane that turns about its own
 * thread. The camera sits slightly above and looks slightly down, which is what lets a hoop read
 * as a hoop and an arm turned away read as receding.
 *
 * Balance is authored, not simulated: the arrangements were placed by eye. Nothing here derives
 * from records, and nothing here knows a record exists.
 */
import type { Hang, MobileComposition } from './catalogue'

const TILT = 0.2
const SIN_T = Math.sin(TILT)
const COS_T = Math.cos(TILT)
/** Distance from the camera to the plane the mobile hangs in. Smaller is a stronger perspective. */
const FOCAL = 760
/** The wall the shadow falls on, behind the mobile. */
const WALL_Z = -150
/** Light from the upper left, in front, unless told otherwise. Only its horizontal part shades the sheets. */
const DEFAULT_LIGHT_X = -0.58
/** How far an arm tips for one memory more on one side than the other, and the most it ever tips. */
const TIP_PER_MEMORY = 0.085
const MAX_TIP = 0.19
/** How much lower a sheet hangs when it carries a memory. */
const MEMORY_STRETCH = 7

/**
 * Everything about a moment that is not the arrangement itself.
 *
 * All of it is optional and all of it is cosmetic. `weights` is the one input that comes from the
 * person's choices: one number per slot, 0 for a bare sheet and 1 for a sheet carrying a memory
 * (values in between while a memory settles). A weighted sheet hangs a little lower and tips the
 * arms above it, the way a real mobile answers to what is hung on it. Nothing else about the
 * person reaches this function — not how much they have recorded, not how well anything went.
 */
export interface Moment {
  /** How the threads are swinging, about -0.4 to 0.4. Sheets lag behind a turn and swing back. */
  sway?: number
  weights?: readonly number[]
  /** Horizontal direction of the light, -0.7 (from the left) to 0.7 (from the right). */
  lightX?: number
}

/** The light for an hour of the local day: from the left in the morning, from the right by evening. */
export function lightForHour(hour: number): number {
  const h = Math.max(6, Math.min(20, hour))
  return Number((-0.62 + ((h - 6) / 14) * 1.24).toFixed(3))
}

export interface WireDrawing {
  kind: 'wire'
  d: string
  /** Same wire, where its shadow falls on the wall. */
  shadow: string
  depth: number
  width: number
  /** 0 near, up to about 0.18 far: how much the wire fades towards the paper. */
  haze: number
}

export interface ShapeDrawing {
  kind: 'shape'
  slot: number
  /** Centre of the sheet in the picture. */
  x: number
  y: number
  /** Perspective scale, and how much the sheet is narrowed by being turned away (never zero). */
  scale: number
  squeeze: number
  /** True when the reverse of the sheet faces the viewer. */
  reverse: boolean
  /** 0 in shade to 1 fully lit. */
  light: number
  haze: number
  depth: number
  /** Where the thread meets the wire, for the bead that marks a memory. */
  threadTop: [number, number]
  /** Offset of the shadow on the wall. */
  shadow: [number, number]
}

/** Where a thread is tied to the end of an arm: a small loop bent into the wire. */
export interface JointDrawing {
  kind: 'joint'
  x: number
  y: number
  r: number
  depth: number
  haze: number
}

export type Drawing = WireDrawing | ShapeDrawing | JointDrawing

type Vec = [number, number, number]

function project([x, y, z]: Vec, centreX: number, focal = FOCAL): { x: number; y: number; s: number; z: number } {
  const yy = y * COS_T + z * SIN_T
  const zz = z * COS_T - y * SIN_T * 0.25
  const s = focal / (focal - zz)
  return { x: centreX + (x - centreX) * s, y: 10 + (yy - 10) * s, s, z: zz }
}

function onWall([x, y, z]: Vec, centreX: number, lightX: number, focal = FOCAL): { x: number; y: number } {
  const d = z - WALL_Z
  // The shadow falls away from the light.
  const p = project([x - d * 0.45 * lightX, y + d * 0.2, WALL_Z], centreX, focal)
  return { x: p.x, y: p.y }
}

const n = (v: number) => Number(v.toFixed(2))
const haze = (z: number) => Math.max(0, Math.min(0.18, -z / 520))

/** A slow, never-repeating-looking drift: two sines whose periods do not line up. */
function drift(index: number, t: number, amount: number): number {
  const a = 0.11 + ((index * 37) % 11) * 0.011
  const b = 0.047 + ((index * 53) % 7) * 0.009
  const wave = (at: number) => 0.62 * Math.sin(at * a + index * 1.7) + 0.38 * Math.sin(at * b + index * 2.9)
  // Zero at time zero, so the resting pose is exactly the authored one.
  return amount * (wave(t) - wave(0))
}

/**
 * Everything to draw for one arrangement at one moment.
 *
 * `time` in seconds drives the drift; pass 0 for the resting pose. `turned` is the angle in
 * radians the person has turned it by: the top arm follows it directly and everything hanging
 * lower swings a little further, the way lighter parts of a real mobile do.
 */
export function drawMobile(composition: MobileComposition, time = 0, turned = 0, moment: Moment = {}): Drawing[] {
  const cx = composition.hookX
  const focal = composition.focal ?? FOCAL
  const sway = moment.sway ?? 0
  const lightX = moment.lightX ?? DEFAULT_LIGHT_X
  const lightZ = Math.sqrt(1 - lightX * lightX)
  const weight = (slot: number) => Math.max(0, Math.min(1, moment.weights?.[slot] ?? 0))
  const carried = (hang: Hang | null | undefined): number => {
    if (!hang) return 0
    const node = hang.node
    if (node.kind === 'shape') return weight(node.slot)
    if (node.kind === 'arm') return carried(node.ends[0]) + carried(node.ends[1]) + carried(node.centre)
    return node.hangs.reduce((sum, item) => sum + carried(item.hang), 0)
  }
  const out: Drawing[] = []
  let index = 0

  const wire = (points: Vec[], curve: boolean, width = 2.1) => {
    const p = points.map((v) => project(v, cx, focal))
    const w = points.map((v) => onWall(v, cx, lightX, focal))
    const path = (q: { x: number; y: number }[]) =>
      curve && q.length === 3
        ? `M${n(q[0]!.x)} ${n(q[0]!.y)} Q${n(q[1]!.x)} ${n(q[1]!.y)} ${n(q[2]!.x)} ${n(q[2]!.y)}`
        : `M${q.map((v) => `${n(v.x)} ${n(v.y)}`).join(' L')}`
    const depth = p.reduce((sum, v) => sum + v.z, 0) / p.length
    const scale = p.reduce((sum, v) => sum + v.s, 0) / p.length
    out.push({ kind: 'wire', d: path(p), shadow: path(w), depth, width: n(width * scale), haze: haze(depth) })
  }

  const place = (from: Vec, hang: Hang, level: number): void => {
    const node = hang.node
    const i = index++
    // A thread swings from where it is tied: the further down, the further it lags.
    const stretch = node.kind === 'shape' ? MEMORY_STRETCH * weight(node.slot) : 0
    const lag = node.kind === 'shape' ? -sway * (hang.thread + 30) * 0.55 : -sway * hang.thread * 0.2
    const top: Vec = [from[0] + lag, from[1] + hang.thread + stretch, from[2]]
    if (node.kind === 'shape') {
      const sheet = composition.shapes[node.slot]
      if (!sheet) return
      const angle = node.turn + drift(i + 20, time, 0.85) + turned * (1.5 + Math.min(level, 3) * 0.25)
      const centre: Vec = [top[0], top[1] + sheet.r, top[2]]
      const p = project(centre, cx, focal)
      const a = project(from, cx, focal)
      wire([from, top], false, 1.1)
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      // The sheet's normal, flipped to whichever side faces the viewer.
      const reverse = cos < 0
      const nx = reverse ? sin : -sin
      const nz = Math.abs(cos)
      const lit = Math.max(0, nx * lightX + nz * lightZ)
      const wall = onWall(centre, cx, lightX, focal)
      out.push({
        kind: 'shape',
        slot: node.slot,
        x: n(p.x),
        y: n(p.y),
        scale: n(p.s),
        // Never quite edge-on to nothing: sheet metal has a thickness, and a line is still there.
        squeeze: n(Math.max(0.07, Math.abs(cos))),
        reverse,
        light: n(lit),
        haze: haze(p.z),
        depth: p.z + 0.01,
        threadTop: [n(a.x), n(a.y)],
        shadow: [n(wall.x - p.x), n(wall.y - p.y)],
      })
      return
    }
    wire([from, top], false, 1.2)
    const free = node.kind === 'arm' ? (composition.armTurn ?? 1) : 1
    const angle = node.turn + (drift(i, time, 0.5 - Math.min(level, 2) * 0.08) + turned * (1 + Math.min(level, 3) * 0.4)) * free
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    if (node.kind === 'arm') {
      // The arm tips towards whichever side carries more memories.
      // A long arm tips through a smaller angle, so its ends never fall further than a short one's.
      const lever = Math.min(1, 60 / Math.max(node.left, node.right))
      const tip = Math.max(-MAX_TIP, Math.min(MAX_TIP, (carried(node.ends[1]) - carried(node.ends[0])) * TIP_PER_MEMORY)) * lever
      const reach = Math.cos(tip)
      const fall = Math.sin(tip)
      const a: Vec = [top[0] - node.left * cos * reach, top[1] + node.drop - node.left * fall, top[2] - node.left * sin * reach]
      const b: Vec = [top[0] + node.right * cos * reach, top[1] + node.drop + node.right * fall, top[2] + node.right * sin * reach]
      // The control point that makes the bow pass through the point it hangs from.
      const c: Vec = [2 * top[0] - (a[0] + b[0]) / 2, 2 * top[1] - (a[1] + b[1]) / 2, 2 * top[2] - (a[2] + b[2]) / 2]
      wire([a, c, b], true)
      for (const end of [a, b]) {
        const q = project(end, cx, focal)
        out.push({ kind: 'joint', x: n(q.x), y: n(q.y), r: n(1.9 * q.s), depth: q.z + 0.02, haze: haze(q.z) })
      }
      if (node.ends[0]) place(a, node.ends[0], level + 1)
      if (node.ends[1]) place(b, node.ends[1], level + 1)
      if (node.centre) place(top, node.centre, level + 1)
      return
    }
    // A hoop: a horizontal ring below the point it hangs from, carried by three lines. Drawn as
    // its far half and its near half so things hanging inside it sort correctly between them.
    const centre: Vec = [top[0], top[1] + node.drop, top[2]]
    const at = (theta: number): Vec => [
      centre[0] + node.radius * Math.cos(theta + angle),
      centre[1],
      centre[2] + node.radius * Math.sin(theta + angle),
    ]
    const STEPS = 28
    for (const half of [0, 1]) {
      // Split where the ring crosses the picture plane, so one half is wholly behind.
      const start = -angle + (half === 0 ? Math.PI : 0)
      wire(Array.from({ length: STEPS + 1 }, (_, k) => at(start + (Math.PI * k) / STEPS)), false, 2.3)
    }
    for (const k of [0, 1, 2]) wire([top, at((k * 2 * Math.PI) / 3 + 0.4)], false, 1)
    for (const item of node.hangs) place(at(item.at), item.hang, level + 1)
  }

  const ceiling: Vec = [cx, -6, 0]
  place(ceiling, composition.root, 0)
  return out.sort((p, q) => p.depth - q.depth)
}

/**
 * The room's light for an hour of the local day: its colour on the wall and how strong it is.
 * Cool and clear in the morning, warm towards evening, low at night. A clock, not a mood.
 */
export function roomLight(hour: number): { colour: string; strength: number } {
  const h = ((hour % 24) + 24) % 24
  if (h < 6 || h >= 21) return { colour: '#fff3dc', strength: 0.3 }
  if (h < 11) return { colour: '#ffffff', strength: 0.75 }
  if (h < 16) return { colour: '#fffdf4', strength: 0.7 }
  return { colour: '#ffeccb', strength: 0.62 }
}

/** Linear mix of two #rrggbb colours. */
export function mix(a: string, b: string, t: number): string {
  const k = Math.max(0, Math.min(1, t))
  const part = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
  return `#${[0, 1, 2]
    .map((i) => Math.round(part(a, i) + (part(b, i) - part(a, i)) * k).toString(16).padStart(2, '0'))
    .join('')}`
}

const PAPER = '#f3efe6'

/**
 * The two ends of a sheet's top-to-bottom shading: matte paint under a soft light from above.
 * The reverse side is a little duller, and anything far away fades a little towards the paper.
 */
export function sheetColours(tone: string, shape: Pick<ShapeDrawing, 'light' | 'reverse' | 'haze'>): { top: string; bottom: string; edge: string } {
  const base = shape.reverse ? mix(tone, '#3a342c', 0.16) : tone
  const lit = mix(mix(base, '#000000', 0.26 * (1 - shape.light)), '#ffffff', 0.1 * shape.light)
  const fade = (colour: string) => mix(colour, PAPER, shape.haze)
  return {
    top: fade(mix(lit, '#ffffff', 0.13)),
    bottom: fade(mix(lit, '#000000', 0.15)),
    edge: fade(mix(lit, '#ffffff', 0.34)),
  }
}

export function wireColour(wire: string, fade: number): string {
  return mix(wire, PAPER, fade * 1.4)
}
