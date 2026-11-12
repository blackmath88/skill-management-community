/**
 * The piece catalogue: six original curated forms, four palettes, three marker designs.
 *
 * Everything here is authored in this file. The outlines are explicit radii and angle offsets, so
 * each solid is irregular by intent rather than by a random seed, and `CATALOGUE_VERSION` is what
 * a saved composition records. If a shape ever changes meaningfully the version goes up and old
 * compositions are reported as referring to a catalogue this build no longer draws, instead of
 * being silently redrawn as something else.
 *
 * What a piece is NOT: it is not a unit of competence, a level, or a thing you earn. All six are
 * available from the first visit, and nothing in the application may make a piece bigger,
 * stronger or more numerous because more records exist. See ../domain/experience.ts.
 */
import { buildPierced, buildSolid, meshBounds, meshCorners, type MeshData, type Vec2 } from './geometry'
import type { Aabb, Vec3 } from './math'

/** Catalogue version. Recorded in every saved composition. */
export const CATALOGUE_VERSION = 1 as const

export type PieceId = 'foundation' | 'tall-solid' | 'squat-solid' | 'wedge' | 'bridge' | 'signature-open'

export const PIECE_IDS: readonly PieceId[] = [
  'foundation',
  'tall-solid',
  'squat-solid',
  'wedge',
  'bridge',
  'signature-open',
]

/**
 * A named place on a piece where contact may happen.
 *
 * `rest` frames are undersides a piece can stand on; `receive` frames are surfaces that can carry
 * another piece. A frame is a position plus an outward normal plus a reference tangent: the
 * tangent is what makes orientation zero mean something repeatable, so a composition reloaded
 * tomorrow faces the same way.
 */
export interface ContactFrame {
  id: string
  role: 'rest' | 'receive'
  origin: Vec3
  normal: Vec3
  tangent: Vec3
  /** Spoken in the interface, so a contact position can be chosen without seeing the canvas. */
  label: string
}

export interface PieceDefinition {
  id: PieceId
  title: string
  /** Read out in the piece list and the inspector. Describes the form, never a skill. */
  description: string
  frames: readonly ContactFrame[]
  /** Yaw angles in degrees this piece may be turned to. Bounded by design: no free gimbal. */
  orientations: readonly number[]
  /** Only a piece that can stand on the ground may be the root of a composition. */
  canBeRoot: boolean
  mesh: MeshData
  bounds: Aabb
  corners: readonly Vec3[]
}

/** Deterministic irregular outline. Angles are evenly spaced, then nudged by authored offsets. */
function outline(radii: readonly number[], offsetsDeg: readonly number[]): Vec2[] {
  const n = radii.length
  return radii.map((r, i) => {
    const theta = (i / n) * Math.PI * 2 + ((offsetsDeg[i] ?? 0) * Math.PI) / 180
    // z is negated so the outline winds the way the mesh builders expect: see geometry.ts.
    return [r * Math.cos(theta), -r * Math.sin(theta)] as Vec2
  })
}

function frame(
  id: string,
  role: ContactFrame['role'],
  origin: Vec3,
  normal: Vec3,
  tangent: Vec3,
  label: string,
): ContactFrame {
  return { id, role, origin, normal, tangent, label }
}

const DOWN: Vec3 = [0, -1, 0]
const UP: Vec3 = [0, 1, 0]
const EAST: Vec3 = [1, 0, 0]

function definition(
  id: PieceId,
  title: string,
  description: string,
  mesh: MeshData,
  frames: readonly ContactFrame[],
  orientations: readonly number[],
  canBeRoot: boolean,
): PieceDefinition {
  return { id, title, description, frames, orientations, canBeRoot, mesh, bounds: meshBounds(mesh), corners: meshCorners(mesh) }
}

// ------------------------------------------------------------------ The six pieces

/**
 * Bevels are on for every piece.
 *
 * Three treatments were built and rendered side by side before this was decided; the comparison
 * is in ../../ASSEMBLAGE-NOTES.md. A sharp arris is cheapest (24 triangles for the squat solid)
 * and perfectly legible, but the top and the side meet in one hard line and the result reads as
 * untextured polygon. A chamfer of 7% of the height adds a narrow band along each rim that
 * catches the light at a different angle from both faces it separates, which is what makes the
 * solid read as a worked, painted block — at double the triangles, 48, which is nothing at this
 * scale. A heavy chamfer at 20% costs no more triangles and is worse: the band grows until the
 * piece reads as a rounded pebble and the facet language is gone.
 *
 * So: restrained, not absent and not generous. Every face stays flat either way; a bevel here is
 * extra flat faces, never a smoothing pass.
 */
const BEVEL = 0.07
const BEVEL_INSET = 0.055

/**
 * The foundation is broad by measurement, not by feel.
 *
 * Its three shelves have to sit far enough apart that a column on the centre crown and a block on
 * a side shelf do not share space — the first version of this composition had the column and the
 * counterweight genuinely interpenetrating, which validation caught. The radii below are what
 * holds every shelf piece inside the slab's own footprint at the authored shelf positions.
 */
const foundationMesh = buildSolid({
  outline: outline([1.76, 1.36, 1.53, 1.67, 1.45, 1.25, 1.62], [0, 6, -8, 4, -5, 9, -3]),
  height: 0.4,
  topScale: 0.95,
  topOffset: [0.04, -0.03],
  bevel: BEVEL,
  bevelInset: BEVEL_INSET,
})

const tallMesh = buildSolid({
  outline: outline([0.36, 0.28, 0.33, 0.26, 0.31], [0, -7, 5, -4, 8]),
  height: 1.46,
  topScale: 0.74,
  topOffset: [0.09, 0.05],
  bevel: BEVEL * 0.6,
  bevelInset: BEVEL_INSET * 1.6,
})

const squatMesh = buildSolid({
  outline: outline([0.52, 0.41, 0.47, 0.54, 0.39, 0.45], [0, 8, -6, 3, -9, 5]),
  height: 0.56,
  topScale: 0.78,
  topOffset: [-0.05, 0.04],
  bevel: BEVEL,
  bevelInset: BEVEL_INSET,
})

/**
 * A ramp, not a tent.
 *
 * The first version used a triangular outline shrunk towards its own centre, which is a pyramid:
 * uniform tapering cannot make a ridge. The top face is authored instead — a narrow strip along
 * the east edge — so the solid falls from a high edge to a low one and reads as a direction.
 */
const wedgeMesh = buildSolid({
  outline: [
    [0.34, -0.2],
    [0.31, 0.22],
    [-0.31, 0.2],
    [-0.34, -0.18],
  ],
  topOutline: [
    [0.34, -0.17],
    [0.31, 0.19],
    [0.21, 0.17],
    [0.23, -0.15],
  ],
  height: 0.36,
  topScale: 1,
  topOffset: [0, 0],
  bevel: BEVEL * 0.5,
  bevelInset: BEVEL_INSET * 1.4,
})

/** A long slab. The outline is a flattened hexagon, so the span has a visible taper. */
const bridgeMesh = buildSolid({
  outline: [
    [0.82, -0.08],
    [0.74, 0.17],
    [-0.76, 0.19],
    [-0.84, -0.06],
    [-0.72, -0.2],
    [0.76, -0.22],
  ],
  height: 0.19,
  topScale: 0.95,
  topOffset: [0, 0.01],
  bevel: BEVEL * 1.2,
  bevelInset: BEVEL_INSET * 1.1,
})

/**
 * The signature form: an opening you can see the ground through.
 *
 * `topScale` is exactly 1 so the outer wall is truly vertical. That is what lets the ring stand
 * on one of its own outer facets — upright, with the opening at eye level against the ground —
 * rather than lying flat where the hole reads as a dent. A tapered wall would leave the standing
 * ring resting on a single bottom edge with a visible wedge of daylight under it.
 */
const signatureMesh = buildPierced({
  outer: outline([0.66, 0.56, 0.62, 0.58, 0.68, 0.54, 0.6], [0, 5, -6, 4, -7, 6, -4]),
  inner: outline([0.3, 0.24, 0.28, 0.23, 0.31, 0.22, 0.26], [0, 5, -6, 4, -7, 6, -4]),
  height: 0.42,
  topScale: 1,
})

const FOUNDATION = definition(
  'foundation',
  'Broad foundation',
  'A low seven-sided slab, wider than anything that stands on it. It rests directly on the ground.',
  foundationMesh,
  [
    frame('base', 'rest', [0, 0, 0], DOWN, EAST, 'Underside'),
    frame('west-shelf', 'receive', [-0.86, 0.4, 0.3], UP, EAST, 'West shelf'),
    frame('crown', 'receive', [0.02, 0.4, -0.14], UP, EAST, 'Centre crown'),
    frame('east-shelf', 'receive', [1.0, 0.4, 0.2], UP, EAST, 'East shelf'),
  ],
  [0, 15, -15],
  true,
)

const TALL = definition(
  'tall-solid',
  'Tall irregular solid',
  'A five-sided column that leans slightly and narrows towards a canted top face.',
  tallMesh,
  [
    frame('base', 'rest', [0, 0, 0], DOWN, EAST, 'Underside'),
    frame('cap', 'receive', [0.09, 1.46, 0.05], UP, EAST, 'Top face'),
  ],
  [0, 45, 90, 135, 180, 225, 270, 315],
  true,
)

const SQUAT = definition(
  'squat-solid',
  'Squat irregular solid',
  'A chunky six-sided block, about as wide as it is tall, with a tilted top.',
  squatMesh,
  [
    frame('base', 'rest', [0, 0, 0], DOWN, EAST, 'Underside'),
    frame('cap', 'receive', [-0.05, 0.56, 0.04], UP, EAST, 'Top face'),
  ],
  [0, 45, 90, 135, 180, 225, 270, 315],
  true,
)

const WEDGE = definition(
  'wedge',
  'Wedge',
  'A ramp: it falls from a high edge down to the opposite low edge, so it reads as a direction rather than a block.',
  wedgeMesh,
  [
    frame('base', 'rest', [0, 0, 0], DOWN, EAST, 'Underside'),
    frame('ridge', 'receive', [0.27, 0.36, 0.01], UP, EAST, 'Narrow high edge'),
  ],
  [0, 60, 120, 180, 240, 300],
  true,
)

const BRIDGE = definition(
  'bridge',
  'Bridge',
  'A long tapered slab. Laid across a solid it reaches past it on both sides and carries a small piece on top.',
  bridgeMesh,
  [
    frame('base', 'rest', [0, 0, 0], DOWN, EAST, 'Underside'),
    // Deliberately off-centre: a piece on the middle of a lintel reads as a roof on a house.
    frame('deck', 'receive', [0.46, 0.19, 0.02], UP, EAST, 'Deck, east of centre'),
  ],
  [0, 30, 60, 90, 120, 150],
  false,
)

/**
 * The facet the ring stands upright on.
 *
 * It is the outer wall between the first two outline points: a genuine flat quad, so the contact
 * is a face against a face. Its midpoint and outward normal are derived from the same two authored
 * radii the mesh is built from, which is why the numbers here are not round.
 */
const SIGNATURE_FOOT = (() => {
  const outer = outline([0.66, 0.56, 0.62, 0.58, 0.68, 0.54, 0.6], [0, 5, -6, 4, -7, 6, -4])
  const a = outer[0] ?? ([0, 0] as const)
  const b = outer[1] ?? ([0, 0] as const)
  const ax = a[0] ?? 0
  const az = a[1] ?? 0
  const bx = b[0] ?? 0
  const bz = b[1] ?? 0
  const mid: Vec3 = [(ax + bx) / 2, 0.21, (az + bz) / 2]
  // The perpendicular to the facet that points away from the ring's centre.
  const candidate: Vec3 = [bz - az, 0, -(bx - ax)]
  const outward: Vec3 =
    candidate[0] * mid[0] + candidate[2] * mid[2] > 0 ? candidate : [-candidate[0], 0, -candidate[2]]
  const len = Math.hypot(outward[0], outward[2]) || 1
  return { mid, normal: [outward[0] / len, 0, outward[2] / len] as Vec3 }
})()

const SIGNATURE = definition(
  'signature-open',
  'Signature form',
  'A seven-sided ring with an opening through the middle. It is the one piece you can see past, and it can lie flat or stand upright on one of its outer facets.',
  signatureMesh,
  [
    frame('base', 'rest', [0, 0, 0], DOWN, EAST, 'Underside, lying flat'),
    frame('edge-foot', 'rest', SIGNATURE_FOOT.mid, SIGNATURE_FOOT.normal, UP, 'Outer facet, standing upright'),
  ],
  [0, 51.4, 102.9, 154.3, 205.7, 257.1, 308.6],
  true,
)

export const CATALOGUE: Readonly<Record<PieceId, PieceDefinition>> = {
  foundation: FOUNDATION,
  'tall-solid': TALL,
  'squat-solid': SQUAT,
  wedge: WEDGE,
  bridge: BRIDGE,
  'signature-open': SIGNATURE,
}

export function piece(id: string): PieceDefinition | undefined {
  return (CATALOGUE as Record<string, PieceDefinition | undefined>)[id]
}

export function frameOf(pieceId: string, frameId: string): ContactFrame | undefined {
  return piece(pieceId)?.frames.find((f) => f.id === frameId)
}

// ------------------------------------------------------------------ Permitted combinations

/**
 * Which piece may rest on which surface, and facing which way.
 *
 * Curated, not computed. A permissive rule set would let a column balance on the narrow ridge of
 * a wedge, which snaps cleanly and looks absurd; this table is the design decision about what the
 * assemblage is willing to show. Free placement, if it is ever added, has to go through these
 * same combinations rather than around them.
 */
export interface PermittedPlacement {
  receiverPieceId: PieceId
  receiverFrameId: string
  restingPieceId: PieceId
  restingFrameId: string
}

/** Receiving surfaces, with the pieces each will carry. */
const ACCEPTS: readonly { on: [PieceId, string]; pieces: readonly PieceId[] }[] = [
  { on: ['foundation', 'west-shelf'], pieces: ['squat-solid', 'wedge', 'signature-open', 'tall-solid'] },
  { on: ['foundation', 'crown'], pieces: ['tall-solid', 'squat-solid', 'signature-open', 'bridge'] },
  { on: ['foundation', 'east-shelf'], pieces: ['squat-solid', 'wedge', 'signature-open'] },
  // A column's top is small: it carries the bridge or a wedge, not another column.
  { on: ['tall-solid', 'cap'], pieces: ['bridge', 'wedge'] },
  { on: ['squat-solid', 'cap'], pieces: ['wedge', 'signature-open', 'bridge', 'tall-solid'] },
  // The wedge's ridge is a near-edge. Nothing rests on it; it is a terminal form.
  { on: ['wedge', 'ridge'], pieces: [] },
  { on: ['bridge', 'deck'], pieces: ['wedge', 'squat-solid', 'signature-open'] },
  // The signature form carries nothing. It is the composition's punctuation, and anything balanced
  // on a ring hides the opening that makes it the signature form.
]

export const PERMITTED: readonly PermittedPlacement[] = ACCEPTS.flatMap(({ on, pieces }) =>
  pieces.flatMap((restingPieceId) => {
    const resting = piece(restingPieceId)
    if (!resting) return []
    return resting.frames
      .filter((f) => f.role === 'rest')
      .map((f) => ({
        receiverPieceId: on[0],
        receiverFrameId: on[1],
        restingPieceId,
        restingFrameId: f.id,
      }))
  }),
)

export function isPermitted(
  receiverPieceId: string,
  receiverFrameId: string,
  restingPieceId: string,
  restingFrameId: string,
): boolean {
  return PERMITTED.some(
    (p) =>
      p.receiverPieceId === receiverPieceId &&
      p.receiverFrameId === receiverFrameId &&
      p.restingPieceId === restingPieceId &&
      p.restingFrameId === restingFrameId,
  )
}

// ------------------------------------------------------------------ Palettes

export type PaletteId = 'chalk-terracotta' | 'moss-ink' | 'clay-dusk' | 'bone-slate'

export const PALETTE_IDS: readonly PaletteId[] = ['chalk-terracotta', 'moss-ink', 'clay-dusk', 'bone-slate']

export interface Palette {
  id: PaletteId
  title: string
  /** The warm off-white ground the composition sits on. */
  ground: string
  /**
   * Matte body colours, one per piece, in `PIECE_IDS` order.
   *
   * Keyed by piece rather than by position in the stack, so the same form keeps the same colour
   * wherever it is put and recomposing does not repaint the sculpture. In every palette the one
   * saturated colour belongs to the wedge — the smallest piece — so the brighter note is an
   * accent on a detail rather than a 1.5-unit column of it.
   */
  bodies: readonly string[]
  /** The one brighter colour used by the interface: marker inlays and the selected outline. */
  accent: string
  /** Ink for the second marker colour and the static drawing's lines. */
  ink: string
}

/**
 * Four palettes: restrained, matte, and warm rather than neutral-grey.
 *
 * No palette carries meaning — choosing one records nothing and says nothing about anybody's
 * practice. Each pairs light stone with one dark anchor and one saturated accent, so a
 * composition reads by value as well as by hue and does not collapse in greyscale.
 */
export const PALETTES: Readonly<Record<PaletteId, Palette>> = {
  'chalk-terracotta': {
    id: 'chalk-terracotta',
    title: 'Chalk and terracotta',
    ground: '#efe9df',
    //        foundation  tall       squat      wedge      bridge     signature
    bodies: ['#d8cdbc', '#ece6da', '#8a7f72', '#c9633f', '#efe9df', '#b5a596'],
    accent: '#1f4f8f',
    ink: '#2b2721',
  },
  'moss-ink': {
    id: 'moss-ink',
    title: 'Moss and ink',
    ground: '#eceadf',
    bodies: ['#cfd2bf', '#e4e3d4', '#2b2f2b', '#c47a28', '#eceadf', '#6f7f5c'],
    accent: '#35566e',
    ink: '#21251f',
  },
  'clay-dusk': {
    id: 'clay-dusk',
    title: 'Clay and dusk',
    ground: '#f0e8e1',
    bodies: ['#e0cfc2', '#efe3da', '#3c3741', '#b2705a', '#f3ebe4', '#95786c'],
    accent: '#3f7d74',
    ink: '#2a252a',
  },
  'bone-slate': {
    id: 'bone-slate',
    title: 'Bone and slate',
    ground: '#f1efe8',
    bodies: ['#cdd0d2', '#f0ece2', '#4e5560', '#b4603c', '#f5f2ea', '#8e9299'],
    accent: '#3c6e66',
    ink: '#24282e',
  },
}

/** The body colour for a piece, by catalogue position. */
export function bodyColour(p: Palette, pieceId: string): string {
  const index = PIECE_IDS.indexOf(pieceId as PieceId)
  return p.bodies[index >= 0 ? index : 0] ?? p.bodies[0] ?? '#cccccc'
}

export function palette(id: string): Palette {
  return PALETTES[id as PaletteId] ?? PALETTES['chalk-terracotta']
}

// ------------------------------------------------------------------ Marker designs

export type MarkerDesignId = 'linked-loop' | 'turned-route' | 'paired-inlay'

export const MARKER_DESIGN_IDS: readonly MarkerDesignId[] = ['linked-loop', 'turned-route', 'paired-inlay']

/**
 * The three marker designs.
 *
 * A marker is a recall aid: something to select so the record behind it can be read. It is not an
 * assessment, a badge or a score, and the labels say what kind of experience it points at, not
 * how well it went. Markers never accumulate on their own — one exists only because a person put
 * it there, and hiding one does not delete the record it points at.
 */
export interface MarkerDesign {
  id: MarkerDesignId
  title: string
  /** What this design is for, in the interface's own words. */
  meaning: string
  /** Drawn as an inlay: a loop, a turn, or two linked pieces. */
  shape: 'loop' | 'turn' | 'pair'
}

export const MARKER_DESIGNS: Readonly<Record<MarkerDesignId, MarkerDesign>> = {
  'linked-loop': {
    id: 'linked-loop',
    title: 'Linked loop',
    meaning: 'Something you did with help from somebody else.',
    shape: 'loop',
  },
  'turned-route': {
    id: 'turned-route',
    title: 'Turned route',
    meaning: 'An attempt that did not work out as planned and changed what you did next.',
    shape: 'turn',
  },
  'paired-inlay': {
    id: 'paired-inlay',
    title: 'Paired inlay',
    meaning: 'Two accounts of the same thing that do not agree.',
    shape: 'pair',
  },
}

export function markerDesign(id: string): MarkerDesign | undefined {
  return MARKER_DESIGNS[id as MarkerDesignId]
}
