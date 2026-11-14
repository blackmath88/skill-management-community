/**
 * The personal mobile: curated compositions and palettes.
 *
 * One visual grammar — bent wire, thread and five hanging shapes — in a small number of authored
 * arrangements. Pure data: no React, no storage, no records. A composition is complete as drawn
 * on the first visit; nothing here grows, unlocks or reacts to what a person has done.
 *
 * Every composition has exactly SLOT_COUNT shapes, so a memory hung on "the third shape" still
 * has a shape to hang on when the person tries a different arrangement.
 */
export const SLOT_COUNT = 5

export type ShapeKind = 'disc' | 'ring' | 'leaf' | 'crescent' | 'bar' | 'drop'

export interface MobileShape {
  kind: ShapeKind
  cx: number
  cy: number
  /** Half-height of the shape, in viewBox units. */
  r: number
  /** Rotation in degrees. */
  rot: number
  /** Which of the palette's three tones fills it. */
  tone: 0 | 1 | 2
  /** Where its thread meets the wire: the point it sways from. */
  pivot: [number, number]
  /** A word for the shape, used in labels: "the large disc". */
  name: string
}

export interface MobileComposition {
  id: string
  title: string
  description: string
  /** SVG path data for the wire, drawn as strokes. */
  wires: string[]
  shapes: MobileShape[]
}

export const VIEW_BOX = '0 0 320 300'

export const COMPOSITIONS: readonly MobileComposition[] = [
  {
    id: 'arc',
    title: 'Arc',
    description: 'One long bow with two smaller ones beneath it and a weight at the centre.',
    wires: [
      'M160 6 V39',
      'M52 70 Q160 8 268 58',
      'M52 70 L63 104',
      'M34 124 Q62 84 96 118',
      'M268 58 L261 98',
      'M222 118 Q262 78 296 108',
    ],
    shapes: [
      { kind: 'disc', cx: 34, cy: 176, r: 20, rot: 0, tone: 0, pivot: [34, 124], name: 'the left disc' },
      { kind: 'leaf', cx: 96, cy: 204, r: 24, rot: 14, tone: 1, pivot: [96, 118], name: 'the leaf' },
      { kind: 'disc', cx: 160, cy: 244, r: 28, rot: 0, tone: 2, pivot: [160, 39], name: 'the large disc' },
      { kind: 'ring', cx: 222, cy: 176, r: 19, rot: 0, tone: 1, pivot: [222, 118], name: 'the ring' },
      { kind: 'crescent', cx: 296, cy: 152, r: 20, rot: -12, tone: 0, pivot: [296, 108], name: 'the crescent' },
    ],
  },
  {
    id: 'cascade',
    title: 'Cascade',
    description: 'Three bows stepping down from left to right, each hanging from the one before.',
    wires: [
      'M96 6 V34',
      'M30 58 Q96 10 176 50',
      'M176 50 L186 86',
      'M124 106 Q186 66 250 100',
      'M250 100 L256 136',
      'M214 156 Q258 116 298 148',
    ],
    shapes: [
      { kind: 'drop', cx: 30, cy: 116, r: 22, rot: 0, tone: 2, pivot: [30, 58], name: 'the drop' },
      { kind: 'bar', cx: 96, cy: 122, r: 26, rot: 8, tone: 0, pivot: [96, 34], name: 'the bar' },
      { kind: 'disc', cx: 124, cy: 176, r: 24, rot: 0, tone: 1, pivot: [124, 106], name: 'the middle disc' },
      { kind: 'leaf', cx: 214, cy: 228, r: 26, rot: -16, tone: 0, pivot: [214, 156], name: 'the leaf' },
      { kind: 'ring', cx: 298, cy: 208, r: 18, rot: 0, tone: 2, pivot: [298, 148], name: 'the ring' },
    ],
  },
  {
    id: 'hoop',
    title: 'Hoop',
    description: 'A single hoop with five shapes hanging at different lengths.',
    wires: ['M160 4 V30', 'M160 30 m-104 44 a104 44 0 1 0 208 0 a104 44 0 1 0 -208 0'],
    shapes: [
      { kind: 'crescent', cx: 62, cy: 150, r: 20, rot: 10, tone: 1, pivot: [62, 89], name: 'the crescent' },
      { kind: 'disc', cx: 112, cy: 218, r: 22, rot: 0, tone: 0, pivot: [112, 113], name: 'the left disc' },
      { kind: 'drop', cx: 160, cy: 168, r: 22, rot: 0, tone: 2, pivot: [160, 118], name: 'the drop' },
      { kind: 'bar', cx: 208, cy: 236, r: 26, rot: -6, tone: 1, pivot: [208, 113], name: 'the bar' },
      { kind: 'ring', cx: 258, cy: 160, r: 19, rot: 0, tone: 0, pivot: [258, 89], name: 'the ring' },
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
