/**
 * The personal mobile: curated compositions and palettes.
 *
 * One visual grammar — bent wire, thread and five hanging sheet-metal shapes — in a small number
 * of authored arrangements. Each is described as the object it would be (what hangs from what,
 * on how much thread), and ./scene.ts turns that into a picture. Pure data: no React, no storage,
 * no records. A composition is complete as drawn
 * on the first visit; nothing here grows, unlocks or reacts to what a person has done.
 *
 * Every composition has exactly SLOT_COUNT shapes, so a memory hung on "the third shape" still
 * has a shape to hang on when the person tries a different arrangement.
 */
export const SLOT_COUNT = 5

export type ShapeKind = 'disc' | 'ring' | 'leaf' | 'crescent' | 'bar' | 'drop'

export interface MobileShape {
  kind: ShapeKind
  /** Half-height of the shape, in scene units. */
  r: number
  /** Rotation within its own sheet, in degrees. */
  rot: number
  /** Which of the palette's three tones it is painted in. */
  tone: 0 | 1 | 2
  /** A word for the shape, used in labels: "the large disc". */
  name: string
}

/** Something hanging on a thread of a given length. */
export interface Hang {
  thread: number
  node: MobileNode
}

/**
 * The structure of a mobile, as it would be built by hand.
 *
 * An arm is a bowed wire that turns freely around the thread it hangs from; things hang from its
 * two ends and, optionally, from its middle. A hoop is a horizontal ring carried by three lines.
 * `turn` is the resting angle in radians — the pose drawn when nothing moves — chosen by eye so
 * each arrangement reads as three-dimensional and no shape rests edge-on.
 */
export type MobileNode =
  | { kind: 'shape'; slot: number; turn: number }
  | { kind: 'arm'; left: number; right: number; drop: number; turn: number; ends: [Hang | null, Hang | null]; centre?: Hang }
  | { kind: 'hoop'; radius: number; drop: number; turn: number; hangs: { at: number; hang: Hang }[] }

export interface MobileComposition {
  id: string
  title: string
  description: string
  /** Where the top thread meets the ceiling, in scene units from the left of the view. */
  hookX: number
  root: Hang
  shapes: MobileShape[]
}

export const VIEW_BOX = '-30 -6 380 288'

const shape = (slot: number, thread: number, turn: number): Hang => ({ thread, node: { kind: 'shape', slot, turn } })

export const COMPOSITIONS: readonly MobileComposition[] = [
  {
    id: 'arc',
    title: 'Arc',
    description: 'One long bow with two smaller ones beneath it and a weight at the centre.',
    hookX: 160,
    root: {
      thread: 30,
      node: {
        kind: 'arm', left: 112, right: 112, drop: 30, turn: 0.32,
        centre: shape(2, 148, -0.35),
        ends: [
          { thread: 30, node: { kind: 'arm', left: 36, right: 36, drop: 18, turn: -0.75, ends: [shape(0, 34, 0.45), shape(1, 62, -0.6)] } },
          { thread: 34, node: { kind: 'arm', left: 40, right: 40, drop: 18, turn: 0.85, ends: [shape(3, 38, -0.4), shape(4, 22, 0.55)] } },
        ],
      },
    },
    shapes: [
      { kind: 'disc', r: 20, rot: 0, tone: 0, name: 'the left disc' },
      { kind: 'leaf', r: 24, rot: 14, tone: 1, name: 'the leaf' },
      { kind: 'disc', r: 28, rot: 0, tone: 2, name: 'the large disc' },
      { kind: 'ring', r: 19, rot: 0, tone: 1, name: 'the ring' },
      { kind: 'crescent', r: 20, rot: -12, tone: 0, name: 'the crescent' },
    ],
  },
  {
    id: 'cascade',
    title: 'Cascade',
    description: 'Three bows stepping down from left to right, each hanging from the one before.',
    hookX: 160,
    root: {
      thread: 26,
      node: {
        kind: 'arm', left: 66, right: 70, drop: 24, turn: 0.28,
        centre: shape(1, 44, 0.5),
        ends: [
          shape(0, 36, -0.5),
          {
            thread: 32,
            node: {
              kind: 'arm', left: 54, right: 54, drop: 22, turn: -0.45,
              ends: [
                shape(2, 46, 0.35),
                { thread: 32, node: { kind: 'arm', left: 36, right: 36, drop: 18, turn: 0.8, ends: [shape(3, 46, -0.55), shape(4, 34, 0.4)] } },
              ],
            },
          },
        ],
      },
    },
    shapes: [
      { kind: 'drop', r: 22, rot: 0, tone: 2, name: 'the drop' },
      { kind: 'bar', r: 26, rot: 8, tone: 0, name: 'the bar' },
      { kind: 'disc', r: 24, rot: 0, tone: 1, name: 'the middle disc' },
      { kind: 'leaf', r: 26, rot: -16, tone: 0, name: 'the leaf' },
      { kind: 'ring', r: 18, rot: 0, tone: 2, name: 'the ring' },
    ],
  },
  {
    id: 'hoop',
    title: 'Hoop',
    description: 'A single hoop with five shapes hanging at different lengths.',
    hookX: 160,
    root: {
      thread: 6,
      node: {
        kind: 'hoop', radius: 104, drop: 58, turn: 0.3,
        hangs: [
          { at: 0.2, hang: shape(0, 50, 0.5) },
          { at: 1.45, hang: shape(1, 118, -0.4) },
          { at: 2.7, hang: shape(2, 66, 0.6) },
          { at: 3.95, hang: shape(3, 124, -0.5) },
          { at: 5.2, hang: shape(4, 56, 0.35) },
        ],
      },
    },
    shapes: [
      { kind: 'crescent', r: 20, rot: 10, tone: 1, name: 'the crescent' },
      { kind: 'disc', r: 22, rot: 0, tone: 0, name: 'the left disc' },
      { kind: 'drop', r: 22, rot: 0, tone: 2, name: 'the drop' },
      { kind: 'bar', r: 26, rot: -6, tone: 1, name: 'the bar' },
      { kind: 'ring', r: 19, rot: 0, tone: 0, name: 'the ring' },
    ],
  },
]

export const DEFAULT_COMPOSITION_ID = 'arc'

export interface MobilePalette {
  id: string
  title: string
  /** Wire and thread. */
  wire: string
  /** Three fills. Each is at least 3:1 against the app's paper surface, since shapes are large marks. */
  tones: [string, string, string]
}

/** Named after the legacy assemblage palettes so the two feel related; the colours are their own. */
export const PALETTES: readonly MobilePalette[] = [
  { id: 'chalk-terracotta', title: 'Chalk and terracotta', wire: '#3a342c', tones: ['#b4532a', '#8c8576', '#2f4a45'] },
  { id: 'moss-ink', title: 'Moss and ink', wire: '#20302b', tones: ['#4c6b4a', '#1f2f3d', '#8a7a3f'] },
  { id: 'clay-dusk', title: 'Clay and dusk', wire: '#3b2f3a', tones: ['#a3563f', '#5a4a72', '#7d6a58'] },
  { id: 'bone-slate', title: 'Bone and slate', wire: '#2b2f33', tones: ['#566573', '#8b8478', '#2b2f33'] },
]

export const DEFAULT_PALETTE_ID = 'chalk-terracotta'

/** An unknown identifier draws the default. The saved value is left alone by the caller. */
export function composition(id: string | undefined): MobileComposition {
  return COMPOSITIONS.find((c) => c.id === id) ?? COMPOSITIONS[0]!
}

export function mobilePalette(id: string | undefined): MobilePalette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0]!
}

/** Path data for one shape centred on the origin. Rings are stroked, everything else is filled. */
export function shapePath(kind: ShapeKind, r: number): string {
  const f = (n: number) => Number(n.toFixed(2))
  switch (kind) {
    case 'disc':
    case 'ring':
      return `M${-r} 0 a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0Z`
    case 'leaf':
      return `M0 ${-r} Q${f(r * 0.95)} 0 0 ${r} Q${f(-r * 0.95)} 0 0 ${-r}Z`
    case 'crescent':
      return `M0 ${-r} A${r} ${r} 0 0 0 0 ${r} A${f(r * 0.5)} ${r} 0 0 1 0 ${-r}Z`
    case 'bar': {
      const w = f(r * 0.34)
      return `M${-w} ${-r + w} a${w} ${w} 0 0 1 ${2 * w} 0 V${r - w} a${w} ${w} 0 0 1 ${-2 * w} 0Z`
    }
    case 'drop':
      return `M0 ${-r} C${f(r * 0.95)} ${f(-r * 0.05)} ${f(r * 0.85)} ${r} 0 ${r} C${f(-r * 0.85)} ${r} ${f(-r * 0.95)} ${f(-r * 0.05)} 0 ${-r}Z`
  }
}
