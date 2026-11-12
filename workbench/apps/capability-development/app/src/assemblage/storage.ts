/**
 * The bridge between what the domain stores and what the catalogue understands.
 *
 * The domain holds catalogue identifiers as plain strings: it must not depend on which shapes a
 * presentation happens to draw, and it must be able to carry a composition made with a catalogue
 * this build does not have. This module is the one place that narrows those strings, and it
 * refuses rather than guesses — an unknown piece, palette or marker design is reported, never
 * silently swapped for a similar one.
 */
import { MARKER_DESIGNS, PALETTE_IDS, piece, type PaletteId } from './catalogue'
import { defaultComposition } from './compose'
import { describeProblem, validateComposition } from './placement'
import { ASSEMBLAGE_SCHEMA_VERSION, type AssemblageComposition, type PlacedPiece } from './types'
import type { AppearanceAssemblage, AppearancePiece } from '~/domain/types'

export type LoadResult =
  | { ok: true; composition: AssemblageComposition; notes: string[] }
  | { ok: false; errors: string[] }

/** Widening: every catalogue identifier is already a string. */
export function toStored(composition: AssemblageComposition): AppearanceAssemblage {
  return {
    version: 1,
    catalogueVersion: composition.catalogueVersion,
    paletteId: composition.paletteId,
    pieces: composition.pieces.map((p) => ({
      instanceId: p.instanceId,
      pieceId: p.pieceId,
      parentInstanceId: p.parentInstanceId,
      receiverFrameId: p.receiverFrameId,
      restingFrameId: p.restingFrameId,
      orientationIndex: p.orientationIndex,
      groundX: p.groundX,
      groundZ: p.groundZ,
      markers: p.markers.map((m) => ({ id: m.id, designId: m.designId, evidenceId: m.evidenceId, hidden: m.hidden })),
    })),
  }
}

/**
 * Narrowing, with every identifier checked against the catalogue.
 *
 * Returns errors instead of a best-effort composition. The interface shows the reported problem
 * next to the day-one composition and leaves every control working, which is a better answer
 * than a sculpture quietly missing the piece somebody placed last week.
 */
export function fromStored(stored: AppearanceAssemblage): LoadResult {
  const errors: string[] = []
  if (stored.version !== 1) {
    return { ok: false, errors: [`This assemblage is saved in format version ${stored.version}, which this build cannot read.`] }
  }
  if (!(PALETTE_IDS as readonly string[]).includes(stored.paletteId)) {
    errors.push(`"${stored.paletteId}" is not a palette this build has.`)
  }
  const pieces: PlacedPiece[] = []
  for (const p of stored.pieces) {
    const definition = piece(p.pieceId)
    if (!definition) {
      errors.push(`"${p.pieceId}" is not a piece in this catalogue.`)
      continue
    }
    for (const marker of p.markers) {
      if (!(marker.designId in MARKER_DESIGNS)) {
        errors.push(`"${marker.designId}" is not a marker design this build has.`)
      }
    }
    pieces.push(narrow(p, definition.id))
  }
  if (errors.length > 0) return { ok: false, errors }

  const composition: AssemblageComposition = {
    schemaVersion: ASSEMBLAGE_SCHEMA_VERSION,
    catalogueVersion: stored.catalogueVersion,
    paletteId: stored.paletteId as PaletteId,
    pieces,
  }
  const problems = validateComposition(composition)
  // An unknown catalogue version is a note, not a refusal: the pieces all resolved, so the
  // composition can be drawn — the caller just cannot promise the shapes are the ones that were
  // placed. Anything else means it cannot be built, and that is an error.
  const notes = problems.filter((p) => p.kind === 'unknown-catalogue').map(describeProblem)
  const blocking = problems.filter((p) => p.kind !== 'unknown-catalogue')
  if (blocking.length > 0) return { ok: false, errors: blocking.map(describeProblem) }
  return { ok: true, composition, notes }
}

function narrow(p: AppearancePiece, pieceId: AssemblageComposition['pieces'][number]['pieceId']): PlacedPiece {
  return {
    instanceId: p.instanceId,
    pieceId,
    parentInstanceId: p.parentInstanceId,
    receiverFrameId: p.receiverFrameId,
    restingFrameId: p.restingFrameId,
    orientationIndex: p.orientationIndex,
    groundX: p.groundX,
    groundZ: p.groundZ,
    markers: p.markers.map((m) => ({
      id: m.id,
      designId: m.designId as PlacedPiece['markers'][number]['designId'],
      evidenceId: m.evidenceId,
      hidden: m.hidden,
    })),
  }
}

/**
 * The composition to show: the saved one, or the day-one one when nothing is saved.
 *
 * An absent assemblage is the normal case for every record set written before this existed, and
 * for everybody's first visit. It is not an error and not an empty state: the day-one composition
 * is complete, which is the whole point of it.
 */
export function compositionFor(stored: AppearanceAssemblage | undefined): LoadResult {
  if (!stored) return { ok: true, composition: defaultComposition(), notes: [] }
  return fromStored(stored)
}
