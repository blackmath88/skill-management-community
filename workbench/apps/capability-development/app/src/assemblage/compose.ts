/**
 * Operations on a composition, and the composition everybody starts with.
 *
 * Pure functions: each takes a composition and returns either a new one or a refusal. Nothing
 * here touches storage, React or a renderer, so the same operation runs in a unit test, behind a
 * keyboard control and behind a pointer click without three implementations of the rules.
 */
import {
  CATALOGUE_VERSION,
  frameOf,
  isPermitted,
  MARKER_DESIGNS,
  palette as paletteOf,
  piece,
  PALETTE_IDS,
  type MarkerDesignId,
  type PaletteId,
  type PieceId,
} from './catalogue'
import {
  candidatesFor,
  canTurn,
  describeProblem,
  descendantIds,
  groundCandidatesFor,
  validateComposition,
  type CompositionProblem,
} from './placement'
import { ASSEMBLAGE_SCHEMA_VERSION, type AssemblageComposition, type PlacedMarker, type PlacedPiece } from './types'

export type ComposeResult =
  | { ok: true; composition: AssemblageComposition }
  | { ok: false; problems: CompositionProblem[]; message: string }

function refuse(message: string, problems: CompositionProblem[] = []): ComposeResult {
  return { ok: false, problems, message }
}

/**
 * The composition the assemblage opens with.
 *
 * Six pieces, placed by hand: a broad foundation; a leaning column carrying a cantilevered bridge
 * with the small bright wedge perched off its east end; a squat dark counterweight low on one
 * side; and the pierced signature form standing upright on the other, so you look through the
 * opening at the ground behind it. The asymmetry, the cantilever and the hole are the
 * composition — it is not a default arrangement waiting to be filled in.
 *
 * It is complete on the first visit. Nothing is unlocked, and recording more practice adds no
 * piece, no size and no ornament here.
 */
export function defaultComposition(paletteId: PaletteId = 'chalk-terracotta'): AssemblageComposition {
  const place = (
    instanceId: string,
    pieceId: PieceId,
    parentInstanceId: string | null,
    receiverFrameId: string | null,
    orientationIndex: number,
    restingFrameId = 'base',
  ): PlacedPiece => ({
    instanceId,
    pieceId,
    parentInstanceId,
    receiverFrameId,
    restingFrameId,
    orientationIndex,
    groundX: 0,
    groundZ: 0,
    markers: [],
  })

  return {
    schemaVersion: ASSEMBLAGE_SCHEMA_VERSION,
    catalogueVersion: CATALOGUE_VERSION,
    paletteId,
    pieces: [
      place('base', 'foundation', null, null, 0),
      place('column', 'tall-solid', 'base', 'crown', 3),
      place('lintel', 'bridge', 'column', 'cap', 1),
      place('perch', 'wedge', 'lintel', 'deck', 2),
      place('counterweight', 'squat-solid', 'base', 'west-shelf', 1),
      // Standing on an outer facet, not lying flat: the opening is the point of this piece.
      place('ring', 'signature-open', 'base', 'east-shelf', 2, 'edge-foot'),
    ],
  }
}

export function emptyComposition(paletteId: PaletteId = 'chalk-terracotta'): AssemblageComposition {
  return { schemaVersion: ASSEMBLAGE_SCHEMA_VERSION, catalogueVersion: CATALOGUE_VERSION, paletteId, pieces: [] }
}

/** Which pieces are not currently on display. The repertoire tray shows these. */
export function trayFor(composition: AssemblageComposition, all: readonly PieceId[]): PieceId[] {
  const placed = new Set(composition.pieces.map((p) => p.pieceId))
  return all.filter((id) => !placed.has(id))
}

/**
 * Places a piece on a contact position.
 *
 * Validates the whole composition afterwards rather than trusting the candidate list: the list is
 * a convenience for the interface, and a command that only works when the interface asked nicely
 * is not a rule.
 */
export function placeOnContact(
  composition: AssemblageComposition,
  input: {
    instanceId: string
    pieceId: string
    parentInstanceId: string
    receiverFrameId: string
    restingFrameId: string
    orientationIndex: number
  },
): ComposeResult {
  const definition = piece(input.pieceId)
  if (!definition) return refuse(`"${input.pieceId}" is not a piece in this catalogue.`)
  if (composition.pieces.some((p) => p.instanceId === input.instanceId)) {
    return refuse('That piece identifier is already in the composition.')
  }
  const parent = composition.pieces.find((p) => p.instanceId === input.parentInstanceId)
  if (!parent) return refuse('The piece it would rest on is not in the composition.')
  const receiving = frameOf(parent.pieceId, input.receiverFrameId)
  if (!receiving || receiving.role !== 'receive') return refuse('That contact position does not exist.')
  if (!isPermitted(parent.pieceId, input.receiverFrameId, input.pieceId, input.restingFrameId)) {
    return refuse(`The ${receiving.label.toLowerCase()} does not carry the ${definition.title.toLowerCase()}.`)
  }
  const next: AssemblageComposition = {
    ...composition,
    pieces: [
      ...composition.pieces,
      {
        instanceId: input.instanceId,
        pieceId: definition.id,
        parentInstanceId: input.parentInstanceId,
        receiverFrameId: input.receiverFrameId,
        restingFrameId: input.restingFrameId,
        orientationIndex: input.orientationIndex,
        groundX: 0,
        groundZ: 0,
        markers: [],
      },
    ],
  }
  return check(next)
}

/** Places a piece directly on the ground, at one of the curated spots. */
export function placeOnGround(
  composition: AssemblageComposition,
  input: { instanceId: string; pieceId: string; restingFrameId: string; orientationIndex: number; groundX: number; groundZ: number },
): ComposeResult {
  const definition = piece(input.pieceId)
  if (!definition) return refuse(`"${input.pieceId}" is not a piece in this catalogue.`)
  if (!definition.canBeRoot) return refuse(`The ${definition.title.toLowerCase()} does not stand on the ground on its own.`)
  if (composition.pieces.some((p) => p.instanceId === input.instanceId)) {
    return refuse('That piece identifier is already in the composition.')
  }
  const next: AssemblageComposition = {
    ...composition,
    pieces: [
      ...composition.pieces,
      {
        instanceId: input.instanceId,
        pieceId: definition.id,
        parentInstanceId: null,
        receiverFrameId: null,
        restingFrameId: input.restingFrameId,
        orientationIndex: input.orientationIndex,
        groundX: input.groundX,
        groundZ: input.groundZ,
        markers: [],
      },
    ],
  }
  return check(next)
}

/**
 * Takes a piece off display, along with anything resting on it.
 *
 * Markers on the removed pieces leave the composition with them. The records those markers
 * pointed at are untouched: a marker is a way back to a record, not the record. The interface
 * says so where it offers this, because "remove" next to something that represents your own
 * history should never be ambiguous about what it destroys.
 */
export function removePiece(composition: AssemblageComposition, instanceId: string): ComposeResult & { removedMarkers?: PlacedMarker[] } {
  if (!composition.pieces.some((p) => p.instanceId === instanceId)) {
    return refuse('That piece is not in the composition.')
  }
  const going = descendantIds(composition, instanceId)
  going.add(instanceId)
  const removedMarkers = composition.pieces.filter((p) => going.has(p.instanceId)).flatMap((p) => p.markers)
  const next: AssemblageComposition = {
    ...composition,
    pieces: composition.pieces.filter((p) => !going.has(p.instanceId)),
  }
  const result = check(next)
  return result.ok ? { ...result, removedMarkers } : result
}

/** Turns a piece to the next (or previous) permitted orientation that does not clash. */
export function turnPiece(composition: AssemblageComposition, instanceId: string, delta: 1 | -1): ComposeResult {
  const index = canTurn(composition, instanceId, delta)
  if (index === null) return refuse('There is no orientation it can turn to from here without meeting another piece.')
  return check({
    ...composition,
    pieces: composition.pieces.map((p) => (p.instanceId === instanceId ? { ...p, orientationIndex: index } : p)),
  })
}

export function setPalette(composition: AssemblageComposition, paletteId: string): ComposeResult {
  if (!(PALETTE_IDS as readonly string[]).includes(paletteId)) return refuse('That is not one of the palettes.')
  return check({ ...composition, paletteId: paletteOf(paletteId).id })
}

/** Adds a marker to a piece. `evidenceId` is opaque here and is never shown to the renderer. */
export function addMarker(
  composition: AssemblageComposition,
  input: { instanceId: string; markerId: string; designId: string; evidenceId: string | null },
): ComposeResult {
  if (!(input.designId in MARKER_DESIGNS)) return refuse('That is not one of the marker designs.')
  const target = composition.pieces.find((p) => p.instanceId === input.instanceId)
  if (!target) return refuse('That piece is not in the composition.')
  if (composition.pieces.some((p) => p.markers.some((m) => m.id === input.markerId))) {
    return refuse('That marker identifier is already in use.')
  }
  if (target.markers.length >= MAX_MARKERS_PER_PIECE) {
    return refuse(`A piece carries at most ${MAX_MARKERS_PER_PIECE} markers, so a composition cannot fill up with them.`)
  }
  const marker: PlacedMarker = {
    id: input.markerId,
    designId: input.designId as MarkerDesignId,
    evidenceId: input.evidenceId,
    hidden: false,
  }
  return check({
    ...composition,
    pieces: composition.pieces.map((p) =>
      p.instanceId === input.instanceId ? { ...p, markers: [...p.markers, marker] } : p,
    ),
  })
}

/** Markers never accumulate on their own, and a piece cannot become an ornament rack. */
export const MAX_MARKERS_PER_PIECE = 3

export function setMarkerHidden(composition: AssemblageComposition, markerId: string, hidden: boolean): ComposeResult {
  if (!composition.pieces.some((p) => p.markers.some((m) => m.id === markerId))) {
    return refuse('That marker is not in the composition.')
  }
  return check({
    ...composition,
    pieces: composition.pieces.map((p) => ({
      ...p,
      markers: p.markers.map((m) => (m.id === markerId ? { ...m, hidden } : m)),
    })),
  })
}

export function removeMarker(composition: AssemblageComposition, markerId: string): ComposeResult {
  if (!composition.pieces.some((p) => p.markers.some((m) => m.id === markerId))) {
    return refuse('That marker is not in the composition.')
  }
  return check({
    ...composition,
    pieces: composition.pieces.map((p) => ({ ...p, markers: p.markers.filter((m) => m.id !== markerId) })),
  })
}

/**
 * Drops the evidence link from every marker that pointed at records that no longer exist.
 *
 * This is the retention half of evidence deletion: the marker stays as a decoration the person
 * chose, with its link gone and the interface saying the record behind it is no longer there.
 * The alternative — leaving a dangling identifier — would let the interface offer a record it
 * cannot show, and substituting a different record would be a quiet lie.
 */
export function unlinkMissingEvidence(
  composition: AssemblageComposition,
  evidenceExists: (id: string) => boolean,
): { composition: AssemblageComposition; unlinked: number } {
  let unlinked = 0
  const pieces = composition.pieces.map((p) => ({
    ...p,
    markers: p.markers.map((m) => {
      if (m.evidenceId === null || evidenceExists(m.evidenceId)) return m
      unlinked += 1
      return { ...m, evidenceId: null }
    }),
  }))
  return { composition: { ...composition, pieces }, unlinked }
}

/** Rejects a composition that does not validate, so a refusal costs one click, not a reload. */
function check(composition: AssemblageComposition): ComposeResult {
  const problems = validateComposition(composition)
  if (problems.length > 0) {
    const first = problems[0]
    return { ok: false, problems, message: first ? describeProblem(first) : 'That change was not accepted.' }
  }
  return { ok: true, composition }
}

/** Convenience re-exports so the interface imports one module for composition work. */
export { candidatesFor, canTurn, describeProblem, groundCandidatesFor, validateComposition }
