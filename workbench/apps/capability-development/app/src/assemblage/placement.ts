/**
 * Placement: contact-frame alignment, validation, and the list of positions a piece may take.
 *
 * Pure functions over the semantic composition. No gravity, no solver, no physics engine: a
 * placement is an authored pairing of two named frames plus one of a bounded set of turns, and
 * the transform follows from that pairing. Snapping a piece into place therefore proves that the
 * two frames meet — it proves nothing whatsoever about whether the arrangement would stand up in
 * the world, and nothing in this file should ever be read as a stability claim.
 */
import {
  CATALOGUE_VERSION,
  frameOf,
  isPermitted,
  piece,
  PERMITTED,
  type ContactFrame,
  type PieceDefinition,
} from './catalogue'
import type { AssemblageComposition, PlacedPiece } from './types'
import {
  aabbOf,
  basisMatrix,
  boxesOverlap,
  cross,
  frameBasis,
  IDENTITY,
  multiply,
  normalise,
  rotationY,
  scale,
  transformDirection,
  transformPoint,
  type Aabb,
  type Mat4,
  type Vec3,
} from './math'

/**
 * How far two pieces may share space before a placement is refused, in catalogue units.
 *
 * It is conservative in both directions and that is a deliberate trade. Pieces resting on each
 * other have boxes that meet exactly, so the test shrinks both by this much before comparing —
 * which also means a genuine interpenetration shallower than this is accepted. And because the
 * test is on axis-aligned boxes, a piece placed under the signature form's opening can be
 * refused for overlapping a box the ring does not fill. Refusing a legal-looking placement is
 * recoverable: the person picks another contact position. Accepting a visibly broken one is not.
 */
export const OVERLAP_TOLERANCE = 0.045

// ------------------------------------------------------------------ Transforms

function inverseRigid(m: Mat4): Mat4 {
  // Rotation part transposed, translation back-rotated. Valid only for rotation+translation,
  // which is all this module ever builds.
  const r: Vec3[] = [
    [m[0] ?? 0, m[4] ?? 0, m[8] ?? 0],
    [m[1] ?? 0, m[5] ?? 0, m[9] ?? 0],
    [m[2] ?? 0, m[6] ?? 0, m[10] ?? 0],
  ]
  const t: Vec3 = [m[12] ?? 0, m[13] ?? 0, m[14] ?? 0]
  const inv: Vec3 = [
    -((r[0]?.[0] ?? 0) * t[0] + (r[0]?.[1] ?? 0) * t[1] + (r[0]?.[2] ?? 0) * t[2]),
    -((r[1]?.[0] ?? 0) * t[0] + (r[1]?.[1] ?? 0) * t[1] + (r[1]?.[2] ?? 0) * t[2]),
    -((r[2]?.[0] ?? 0) * t[0] + (r[2]?.[1] ?? 0) * t[1] + (r[2]?.[2] ?? 0) * t[2]),
  ]
  return basisMatrix(r[0] as Vec3, r[1] as Vec3, r[2] as Vec3, inv)
}

/** The frame's own basis within its piece: y along the normal, x along the cleaned-up tangent. */
function frameMatrix(f: ContactFrame): Mat4 {
  const { x, y, z } = frameBasis(f.normal, f.tangent)
  return basisMatrix(x, y, z, f.origin)
}

/**
 * The world transform for a piece resting on a surface.
 *
 * The receiving surface contributes a point and an outward normal; the yaw turns the piece about
 * that normal, which is why every permitted orientation keeps contact. The resting frame's normal
 * is aligned *against* the receiving normal, so an underside faces into the surface it stands on.
 */
export function alignedTransform(
  parentWorld: Mat4,
  receiving: ContactFrame,
  resting: ContactFrame,
  yawDegrees: number,
): Mat4 {
  const point = transformPoint(parentWorld, receiving.origin)
  const normal = normalise(transformDirection(parentWorld, receiving.normal))
  const tangent = transformDirection(parentWorld, receiving.tangent)
  const basis = frameBasis(normal, tangent)
  const turned = multiply(basisMatrix(basis.x, basis.y, basis.z, point), rotationY((yawDegrees * Math.PI) / 180))

  const xT: Vec3 = [turned[0] ?? 0, turned[1] ?? 0, turned[2] ?? 0]
  const yT: Vec3 = scale(normal, -1)
  const zT: Vec3 = normalise(cross(xT, yT))
  const target = basisMatrix(normalise(xT), yT, zT, point)
  return multiply(target, inverseRigid(frameMatrix(resting)))
}

/** A root piece stands on the ground: a virtual upward surface at its chosen spot. */
function groundFrame(x: number, z: number): ContactFrame {
  return { id: 'ground', role: 'receive', origin: [x, 0, z], normal: [0, 1, 0], tangent: [1, 0, 0], label: 'The ground' }
}

export function yawOf(definition: PieceDefinition, orientationIndex: number): number {
  return definition.orientations[orientationIndex] ?? definition.orientations[0] ?? 0
}

export interface ResolvedPiece {
  placed: PlacedPiece
  definition: PieceDefinition
  world: Mat4
  /** World-space axis-aligned bounds, used for the overlap test and to frame the camera. */
  bounds: Aabb
  /** Depth from a root, for palette assignment and for reporting an unsupported part. */
  depth: number
}

/**
 * Resolves every piece to a world transform, parents before children.
 *
 * Pieces whose parent is missing or circular are not resolved at all: they are returned as
 * `unresolved` rather than silently dropped or planted on the ground, because a piece that
 * quietly moves to a different place is worse than one the interface reports it cannot draw.
 */
export function resolveComposition(composition: AssemblageComposition): {
  resolved: ResolvedPiece[]
  unresolved: PlacedPiece[]
} {
  const byId = new Map(composition.pieces.map((p) => [p.instanceId, p]))
  const resolved: ResolvedPiece[] = []
  const done = new Map<string, ResolvedPiece>()
  const unresolved: PlacedPiece[] = []

  const resolveOne = (placed: PlacedPiece, seen: Set<string>): ResolvedPiece | null => {
    const existing = done.get(placed.instanceId)
    if (existing) return existing
    if (seen.has(placed.instanceId)) return null
    seen.add(placed.instanceId)

    const definition = piece(placed.pieceId)
    if (!definition) return null
    const resting = frameOf(placed.pieceId, placed.restingFrameId)
    if (!resting || resting.role !== 'rest') return null
    const yaw = yawOf(definition, placed.orientationIndex)

    let parentWorld: Mat4 = IDENTITY
    let receiving: ContactFrame
    let depth = 0
    if (placed.parentInstanceId === null) {
      receiving = groundFrame(placed.groundX, placed.groundZ)
    } else {
      const parentPlaced = byId.get(placed.parentInstanceId)
      if (!parentPlaced) return null
      const parent = resolveOne(parentPlaced, seen)
      if (!parent) return null
      const parentFrame = placed.receiverFrameId ? frameOf(parentPlaced.pieceId, placed.receiverFrameId) : undefined
      if (!parentFrame || parentFrame.role !== 'receive') return null
      parentWorld = parent.world
      receiving = parentFrame
      depth = parent.depth + 1
    }

    const world = alignedTransform(parentWorld, receiving, resting, yaw)
    const bounds = aabbOf(definition.corners.map((c) => transformPoint(world, c)))
    const entry: ResolvedPiece = { placed, definition, world, bounds, depth }
    done.set(placed.instanceId, entry)
    resolved.push(entry)
    return entry
  }

  for (const placed of composition.pieces) {
    if (resolveOne(placed, new Set()) === null) unresolved.push(placed)
  }
  // Parents before children, so a renderer or a drawing can paint back to front by depth.
  resolved.sort((a, b) => a.depth - b.depth)
  return { resolved, unresolved }
}

// ------------------------------------------------------------------ Validation

export type CompositionProblem =
  | { kind: 'unknown-catalogue'; version: number }
  | { kind: 'unsupported-schema'; version: number }
  | { kind: 'unknown-piece'; instanceId: string; pieceId: string }
  | { kind: 'duplicate-instance'; instanceId: string }
  | { kind: 'missing-parent'; instanceId: string; parentInstanceId: string }
  | { kind: 'cycle'; instanceId: string }
  | { kind: 'root-not-allowed'; instanceId: string; pieceId: string }
  | { kind: 'unknown-frame'; instanceId: string; frameId: string }
  | { kind: 'not-permitted'; instanceId: string }
  | { kind: 'contact-occupied'; parentInstanceId: string; frameId: string }
  | { kind: 'orientation-out-of-range'; instanceId: string; index: number }
  | { kind: 'overlap'; instanceId: string; otherInstanceId: string }
  | { kind: 'unsupported'; instanceId: string }
  | { kind: 'no-root' }
  | { kind: 'below-ground'; instanceId: string }

export function describeProblem(problem: CompositionProblem): string {
  switch (problem.kind) {
    case 'unknown-catalogue':
      return `This composition was made with piece catalogue version ${problem.version}. This build draws version ${CATALOGUE_VERSION}, so the shapes cannot be guaranteed to be the ones that were placed.`
    case 'unsupported-schema':
      return `This composition is saved in format version ${problem.version}, which this build cannot read.`
    case 'unknown-piece':
      return `One placed piece refers to "${problem.pieceId}", which is not in this catalogue.`
    case 'duplicate-instance':
      return 'Two placed pieces share the same identifier.'
    case 'missing-parent':
      return 'A piece rests on another piece that is not in the composition.'
    case 'cycle':
      return 'A piece ends up resting on itself, which cannot be drawn.'
    case 'root-not-allowed':
      return `"${problem.pieceId}" is not a piece that stands on the ground on its own.`
    case 'unknown-frame':
      return `A contact position called "${problem.frameId}" does not exist on that piece.`
    case 'not-permitted':
      return 'That piece is not one this contact position carries.'
    case 'contact-occupied':
      return 'Something is already resting on that contact position.'
    case 'orientation-out-of-range':
      return 'That piece cannot be turned to the saved orientation.'
    case 'overlap':
      return 'Those two pieces would share the same space.'
    case 'unsupported':
      return 'That piece would hang off the edge of the one below it with nothing under its middle.'
    case 'no-root':
      return 'Nothing in the composition stands on the ground.'
    case 'below-ground':
      return 'That piece would end up below the ground.'
  }
}

/**
 * Checks a whole composition. Collects every problem rather than stopping at the first, so a
 * person importing a file is told what is wrong with it once.
 */
export function validateComposition(composition: AssemblageComposition): CompositionProblem[] {
  const problems: CompositionProblem[] = []
  if (!(READABLE as readonly number[]).includes(composition.schemaVersion)) {
    problems.push({ kind: 'unsupported-schema', version: composition.schemaVersion })
    return problems
  }
  if (composition.catalogueVersion !== CATALOGUE_VERSION) {
    problems.push({ kind: 'unknown-catalogue', version: composition.catalogueVersion })
  }

  const seen = new Set<string>()
  const occupied = new Set<string>()
  const byId = new Map<string, PlacedPiece>()
  for (const p of composition.pieces) {
    if (seen.has(p.instanceId)) problems.push({ kind: 'duplicate-instance', instanceId: p.instanceId })
    seen.add(p.instanceId)
    byId.set(p.instanceId, p)
  }

  let roots = 0
  for (const p of composition.pieces) {
    const definition = piece(p.pieceId)
    if (!definition) {
      problems.push({ kind: 'unknown-piece', instanceId: p.instanceId, pieceId: p.pieceId })
      continue
    }
    if (p.orientationIndex < 0 || p.orientationIndex >= definition.orientations.length) {
      problems.push({ kind: 'orientation-out-of-range', instanceId: p.instanceId, index: p.orientationIndex })
    }
    const resting = frameOf(p.pieceId, p.restingFrameId)
    if (!resting || resting.role !== 'rest') {
      problems.push({ kind: 'unknown-frame', instanceId: p.instanceId, frameId: p.restingFrameId })
    }

    if (p.parentInstanceId === null) {
      roots += 1
      if (!definition.canBeRoot) {
        problems.push({ kind: 'root-not-allowed', instanceId: p.instanceId, pieceId: p.pieceId })
      }
      continue
    }

    const parent = byId.get(p.parentInstanceId)
    if (!parent) {
      problems.push({ kind: 'missing-parent', instanceId: p.instanceId, parentInstanceId: p.parentInstanceId })
      continue
    }
    // Walk up to the root. A cycle is found by revisiting an identifier, not by a depth limit.
    const chain = new Set<string>([p.instanceId])
    let cursor: PlacedPiece | undefined = parent
    let cyclic = false
    while (cursor) {
      if (chain.has(cursor.instanceId)) {
        cyclic = true
        break
      }
      chain.add(cursor.instanceId)
      cursor = cursor.parentInstanceId === null ? undefined : byId.get(cursor.parentInstanceId)
    }
    if (cyclic) {
      problems.push({ kind: 'cycle', instanceId: p.instanceId })
      continue
    }

    if (p.receiverFrameId === null) {
      problems.push({ kind: 'unknown-frame', instanceId: p.instanceId, frameId: '(none)' })
      continue
    }
    const receiving = frameOf(parent.pieceId, p.receiverFrameId)
    if (!receiving || receiving.role !== 'receive') {
      problems.push({ kind: 'unknown-frame', instanceId: p.instanceId, frameId: p.receiverFrameId })
      continue
    }
    const slot = `${p.parentInstanceId}/${p.receiverFrameId}`
    if (occupied.has(slot)) {
      problems.push({ kind: 'contact-occupied', parentInstanceId: p.parentInstanceId, frameId: p.receiverFrameId })
    }
    occupied.add(slot)
    if (!isPermitted(parent.pieceId, p.receiverFrameId, p.pieceId, p.restingFrameId)) {
      problems.push({ kind: 'not-permitted', instanceId: p.instanceId })
    }
  }

  if (composition.pieces.length > 0 && roots === 0) problems.push({ kind: 'no-root' })

  // Geometry checks run on what actually resolved, so a broken parent chain is reported once.
  const { resolved } = resolveComposition(composition)
  const byInstance = new Map(resolved.map((e) => [e.placed.instanceId, e]))
  for (const entry of resolved) {
    if ((entry.bounds.min[1] ?? 0) < -OVERLAP_TOLERANCE) {
      problems.push({ kind: 'below-ground', instanceId: entry.placed.instanceId })
    }
    if (!isSupported(entry, byInstance)) problems.push({ kind: 'unsupported', instanceId: entry.placed.instanceId })
  }
  for (let i = 0; i < resolved.length; i += 1) {
    for (let j = i + 1; j < resolved.length; j += 1) {
      const a = resolved[i] as ResolvedPiece
      const b = resolved[j] as ResolvedPiece
      // A piece and the piece it rests on are meant to touch.
      if (a.placed.parentInstanceId === b.placed.instanceId || b.placed.parentInstanceId === a.placed.instanceId) {
        continue
      }
      if (boxesOverlap(a.bounds, b.bounds, OVERLAP_TOLERANCE)) {
        problems.push({ kind: 'overlap', instanceId: a.placed.instanceId, otherInstanceId: b.placed.instanceId })
      }
    }
  }
  return problems
}

const READABLE: readonly number[] = [1]

/**
 * Whether a piece has something under the middle of it.
 *
 * The horizontal centre of the piece's own extent must fall inside the extent of the piece it
 * rests on. This is a crude check and is meant to be: it catches a piece hanging off an edge with
 * nothing beneath its bulk, which looks broken. It is emphatically NOT a stability calculation —
 * it says nothing about mass, friction or where a real centre of gravity would be, and a
 * composition that passes it could still be impossible to build out of wood.
 */
function isSupported(entry: ResolvedPiece, byInstance: Map<string, ResolvedPiece>): boolean {
  const parentId = entry.placed.parentInstanceId
  if (parentId === null) return true
  const parent = byInstance.get(parentId)
  if (!parent) return true
  const centreX = ((entry.bounds.min[0] ?? 0) + (entry.bounds.max[0] ?? 0)) / 2
  const centreZ = ((entry.bounds.min[2] ?? 0) + (entry.bounds.max[2] ?? 0)) / 2
  const insideX = centreX >= (parent.bounds.min[0] ?? 0) && centreX <= (parent.bounds.max[0] ?? 0)
  const insideZ = centreZ >= (parent.bounds.min[2] ?? 0) && centreZ <= (parent.bounds.max[2] ?? 0)
  return insideX && insideZ
}

// ------------------------------------------------------------------ Candidate placements

export interface PlacementCandidate {
  parentInstanceId: string
  receiverFrameId: string
  restingFrameId: string
  orientationIndex: number
  /** Spoken label: "Top face of the tall irregular solid, turned 45°". */
  label: string
}

/**
 * Every contact position a piece could currently take, with the first permitted orientation.
 *
 * Assisted placement, not free dragging: the interface offers this list, the person picks one,
 * and a pick is a command. Occupied contacts and placements that would overlap something are
 * left out, so a candidate in this list is one the composition will actually accept.
 */
export function candidatesFor(
  composition: AssemblageComposition,
  pieceId: string,
  options: { excludeInstanceId?: string } = {},
): PlacementCandidate[] {
  const definition = piece(pieceId)
  if (!definition) return []
  const live = options.excludeInstanceId
    ? { ...composition, pieces: composition.pieces.filter((p) => p.instanceId !== options.excludeInstanceId) }
    : composition
  const { resolved } = resolveComposition(live)
  const occupied = new Set(
    live.pieces
      .filter((p) => p.parentInstanceId !== null && p.receiverFrameId !== null)
      .map((p) => `${p.parentInstanceId}/${p.receiverFrameId}`),
  )

  const out: PlacementCandidate[] = []
  for (const entry of resolved) {
    for (const receiving of entry.definition.frames) {
      if (receiving.role !== 'receive') continue
      if (occupied.has(`${entry.placed.instanceId}/${receiving.id}`)) continue
      for (const rule of PERMITTED) {
        if (rule.receiverPieceId !== entry.definition.id) continue
        if (rule.receiverFrameId !== receiving.id) continue
        if (rule.restingPieceId !== definition.id) continue
        const orientationIndex = firstFittingOrientation(live, entry, receiving.id, definition, rule.restingFrameId)
        if (orientationIndex === null) continue
        out.push({
          parentInstanceId: entry.placed.instanceId,
          receiverFrameId: receiving.id,
          restingFrameId: rule.restingFrameId,
          orientationIndex,
          label: `${receiving.label} of the ${entry.definition.title.toLowerCase()}`,
        })
      }
    }
  }
  return out
}

/** The first bounded orientation at which the piece does not share space with anything else. */
function firstFittingOrientation(
  composition: AssemblageComposition,
  parent: ResolvedPiece,
  receiverFrameId: string,
  definition: PieceDefinition,
  restingFrameId: string,
): number | null {
  const receiving = frameOf(parent.definition.id, receiverFrameId)
  const resting = frameOf(definition.id, restingFrameId)
  if (!receiving || !resting) return null
  const { resolved } = resolveComposition(composition)
  for (let index = 0; index < definition.orientations.length; index += 1) {
    const world = alignedTransform(parent.world, receiving, resting, yawOf(definition, index))
    const bounds = aabbOf(definition.corners.map((c) => transformPoint(world, c)))
    if ((bounds.min[1] ?? 0) < -OVERLAP_TOLERANCE) continue
    const clashes = resolved.some(
      (other) => other.placed.instanceId !== parent.placed.instanceId && boxesOverlap(bounds, other.bounds, OVERLAP_TOLERANCE),
    )
    if (!clashes) return index
  }
  return null
}

/** Ground spots a root piece may stand on. Curated, so a root cannot be dropped anywhere. */
export const GROUND_STATIONS: readonly { x: number; z: number; label: string }[] = [
  { x: 0, z: 0, label: 'Centre of the ground' },
  { x: 1.9, z: 0.35, label: 'East of centre' },
  { x: -1.9, z: -0.3, label: 'West of centre' },
]

/** Which ground spots are free for a piece that stands on its own. */
export function groundCandidatesFor(
  composition: AssemblageComposition,
  pieceId: string,
  options: { excludeInstanceId?: string } = {},
): { groundX: number; groundZ: number; restingFrameId: string; orientationIndex: number; label: string }[] {
  const definition = piece(pieceId)
  if (!definition || !definition.canBeRoot) return []
  const live = options.excludeInstanceId
    ? { ...composition, pieces: composition.pieces.filter((p) => p.instanceId !== options.excludeInstanceId) }
    : composition
  const { resolved } = resolveComposition(live)
  const resting = definition.frames.find((f) => f.role === 'rest')
  if (!resting) return []
  const out: { groundX: number; groundZ: number; restingFrameId: string; orientationIndex: number; label: string }[] = []
  for (const station of GROUND_STATIONS) {
    const world = alignedTransform(IDENTITY, groundFrame(station.x, station.z), resting, yawOf(definition, 0))
    const bounds = aabbOf(definition.corners.map((c) => transformPoint(world, c)))
    if (resolved.some((other) => boxesOverlap(bounds, other.bounds, OVERLAP_TOLERANCE))) continue
    out.push({
      groundX: station.x,
      groundZ: station.z,
      restingFrameId: resting.id,
      orientationIndex: 0,
      label: station.label,
    })
  }
  return out
}

/** Whether a piece can be turned to the next orientation without clashing with anything. */
export function canTurn(composition: AssemblageComposition, instanceId: string, delta: number): number | null {
  const placed = composition.pieces.find((p) => p.instanceId === instanceId)
  if (!placed) return null
  const definition = piece(placed.pieceId)
  if (!definition || definition.orientations.length === 0) return null
  const count = definition.orientations.length
  const others = { ...composition, pieces: composition.pieces.filter((p) => p.instanceId !== instanceId) }
  const { resolved } = resolveComposition(others)
  const descendants = descendantIds(composition, instanceId)

  for (let step = 1; step <= count; step += 1) {
    const index = (((placed.orientationIndex + delta * step) % count) + count) % count
    if (index === placed.orientationIndex) break
    const trial: AssemblageComposition = {
      ...composition,
      pieces: composition.pieces.map((p) => (p.instanceId === instanceId ? { ...p, orientationIndex: index } : p)),
    }
    const { resolved: after } = resolveComposition(trial)
    const moved = after.filter((e) => e.placed.instanceId === instanceId || descendants.has(e.placed.instanceId))
    if (moved.length === 0) continue
    const clash = moved.some((m) => {
      if ((m.bounds.min[1] ?? 0) < -OVERLAP_TOLERANCE) return true
      return resolved.some(
        (other) =>
          !descendants.has(other.placed.instanceId) &&
          other.placed.instanceId !== m.placed.parentInstanceId &&
          boxesOverlap(m.bounds, other.bounds, OVERLAP_TOLERANCE),
      )
    })
    if (!clash) return index
  }
  return null
}

/** Every piece resting on this one, directly or further up. */
export function descendantIds(composition: AssemblageComposition, instanceId: string): Set<string> {
  const out = new Set<string>()
  let changed = true
  while (changed) {
    changed = false
    for (const p of composition.pieces) {
      if (p.parentInstanceId === null) continue
      if (out.has(p.instanceId)) continue
      if (p.parentInstanceId === instanceId || out.has(p.parentInstanceId)) {
        out.add(p.instanceId)
        changed = true
      }
    }
  }
  return out
}
