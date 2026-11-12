/**
 * The presentation model the renderer is given.
 *
 * This is the boundary the companion brief insists on. Everything in this file is geometry,
 * colour and opaque identifiers: there is no journal text, no situation description, no
 * colleague's name, no feedback, no evidence identifier and no count of anything. A marker
 * carries only its own opaque id and a shape; the application turns that id into a record, in
 * the DOM, outside the canvas.
 *
 * It is also the reason the renderer can fail without taking meaning with it: the static drawing
 * is built from exactly this model, so a composition looks like itself whether or not a GPU
 * answered.
 */
import { bodyColour, MARKER_DESIGNS, palette as paletteOf, type MarkerDesign, type PieceDefinition } from './catalogue'
import { resolveComposition, type ResolvedPiece } from './placement'
import { transformPoint, type Aabb, type Mat4, type Vec3 } from './math'
import type { AssemblageComposition } from './types'

export interface MarkerView {
  /** The marker's own identifier. Opaque: the renderer never learns what it points at. */
  id: string
  shape: MarkerDesign['shape']
  /** Where the inlay sits, in world space. */
  at: Vec3
  /** Radius of the inlay, in catalogue units. */
  size: number
}

export interface PieceView {
  instanceId: string
  pieceId: string
  /** Column-major world transform, ready for Matrix4.fromArray. */
  matrix: Mat4
  definition: PieceDefinition
  bodyColour: string
  markers: MarkerView[]
  bounds: Aabb
  depth: number
}

export interface AssemblageView {
  groundColour: string
  accentColour: string
  inkColour: string
  pieces: PieceView[]
  /** Bounds of everything placed, used to frame the camera and the static drawing. */
  bounds: Aabb
  /** Pieces that could not be resolved, reported by identifier only. */
  unresolvedInstanceIds: string[]
}

/**
 * Where a marker inlay sits: somewhere on the piece's top surface that is not covered.
 *
 * Two earlier rules failed for the same reason. The centre of the bounding box is, for the
 * upright signature form, a point in the middle of the opening. The centre of the top face is,
 * for the broad foundation, directly under the column standing on it. A third attempt — step away
 * from whatever rests on this piece — pushed the foundation's marker to the back of the slab,
 * behind the column, because "away from the children" is not the same as "where it can be seen".
 *
 * So the rule is explicit: try the front of the top face first, because the camera is a fixed
 * elevated three-quarter view and the front is what it sees; then the two sides, then the back;
 * then give up and use the centre. The first candidate that does not fall inside the footprint of
 * something resting on this piece wins. Deterministic, and it does not need the camera.
 */
function markerAnchors(
  entry: ResolvedPiece,
  children: readonly ResolvedPiece[],
  count: number,
): { at: Vec3; size: number }[] {
  const corners = entry.definition.corners.map((c) => transformPoint(entry.world, c))
  const top = entry.bounds.max[1] ?? 0
  const height = Math.max(0.02, top - (entry.bounds.min[1] ?? 0))
  const upper = corners.filter((c) => (c[1] ?? 0) >= top - height * 0.08)
  const sample = upper.length > 0 ? upper : corners
  const centreX = sample.reduce((a, c) => a + (c[0] ?? 0), 0) / sample.length
  const centreY = sample.reduce((a, c) => a + (c[1] ?? 0), 0) / sample.length
  const centreZ = sample.reduce((a, c) => a + (c[2] ?? 0), 0) / sample.length

  const minX = entry.bounds.min[0] ?? 0
  const maxX = entry.bounds.max[0] ?? 0
  const minZ = entry.bounds.min[2] ?? 0
  const maxZ = entry.bounds.max[2] ?? 0
  const halfX = Math.max(0.01, (maxX - minX) / 2)
  const halfZ = Math.max(0.01, (maxZ - minZ) / 2)
  const size = Math.max(0.05, Math.min(0.11, halfX * 0.24))
  const margin = size * 1.7
  const step = 0.55

  // Front first, then east, west, back, then the centre as a last resort.
  const candidates: readonly (readonly [number, number])[] = [
    [0, 1],
    [1, 0],
    [-1, 0],
    [0, -1],
    [0, 0],
  ]
  const covered = (x: number, z: number) =>
    children.some(
      (child) =>
        x >= (child.bounds.min[0] ?? 0) - size &&
        x <= (child.bounds.max[0] ?? 0) + size &&
        z >= (child.bounds.min[2] ?? 0) - size &&
        z <= (child.bounds.max[2] ?? 0) + size,
    )

  let anchorX = centreX
  let anchorZ = centreZ
  for (const [dx, dz] of candidates) {
    const x = clamp(centreX + dx * halfX * step, minX + margin, maxX - margin)
    const z = clamp(centreZ + dz * halfZ * step, minZ + margin, maxZ - margin)
    if (!covered(x, z)) {
      anchorX = x
      anchorZ = z
      break
    }
  }

  const spread = size * 2.6
  return Array.from({ length: count }, (_, i) => {
    const offset = (i - (count - 1) / 2) * spread
    return {
      at: [clamp(anchorX + offset, minX + size, maxX - size), centreY + 0.005, anchorZ] as Vec3,
      size,
    }
  })
}

function clamp(value: number, low: number, high: number): number {
  if (low > high) return (low + high) / 2
  return Math.max(low, Math.min(high, value))
}

/**
 * Builds the view from a composition.
 *
 * Body colours come from the palette by which piece it is, not from anything the person
 * recorded: a piece is never coloured by how much practice it is "worth", because it is not
 * worth any, and the same form keeps its colour wherever it is moved to.
 */
export function buildView(composition: AssemblageComposition): AssemblageView {
  const palette = paletteOf(composition.paletteId)
  const { resolved, unresolved } = resolveComposition(composition)

  const pieces: PieceView[] = resolved.map((entry) => {
    const visible = entry.placed.markers.filter((m) => !m.hidden)
    const children = resolved.filter((other) => other.placed.parentInstanceId === entry.placed.instanceId)
    const anchors = markerAnchors(entry, children, visible.length)
    return {
      instanceId: entry.placed.instanceId,
      pieceId: entry.definition.id,
      matrix: entry.world,
      definition: entry.definition,
      bodyColour: bodyColour(palette, entry.definition.id),
      markers: visible.map((m, i) => ({
        id: m.id,
        shape: MARKER_DESIGNS[m.designId].shape,
        at: anchors[i]?.at ?? [0, 0, 0],
        size: anchors[i]?.size ?? 0.06,
      })),
      bounds: entry.bounds,
      depth: entry.depth,
    }
  })

  const min: [number, number, number] = [Infinity, Infinity, Infinity]
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  for (const p of pieces) {
    for (let i = 0; i < 3; i += 1) {
      min[i] = Math.min(min[i] ?? Infinity, p.bounds.min[i] ?? 0)
      max[i] = Math.max(max[i] ?? -Infinity, p.bounds.max[i] ?? 0)
    }
  }
  const empty = pieces.length === 0

  return {
    groundColour: palette.ground,
    accentColour: palette.accent,
    inkColour: palette.ink,
    pieces,
    bounds: empty ? { min: [-1, 0, -1], max: [1, 1, 1] } : { min, max },
    unresolvedInstanceIds: unresolved.map((p) => p.instanceId),
  }
}
