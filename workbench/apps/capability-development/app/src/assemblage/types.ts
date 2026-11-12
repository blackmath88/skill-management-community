/**
 * The semantic composition.
 *
 * This is what is saved, exported and validated. It holds catalogue identifiers, instance
 * identifiers, a frame pairing, a bounded orientation index and opaque marker identifiers —
 * never a renderer object, never a matrix, and never a word the person wrote. A Three.js scene
 * graph is rebuilt from this on every load; it is never the identity of anything.
 *
 * `ASSEMBLAGE_SCHEMA_VERSION` is independent of the records schema version, the export format
 * version, the IndexedDB version, the appearance version and the catalogue version. Six numbers
 * sounds like a lot until one of them has to change without dragging the other five with it.
 */
import type { MarkerDesignId, PaletteId, PieceId } from './catalogue'

export const ASSEMBLAGE_SCHEMA_VERSION = 1 as const
/** Versions this build can read. A newer one is reported, never read with parts missing. */
export const READABLE_ASSEMBLAGE_VERSIONS: readonly number[] = [1]

/**
 * A history marker placed on a piece.
 *
 * `evidenceId` is opaque here: this module neither resolves it nor cares what it points at. The
 * renderer is given the design and a position and nothing else; the application resolves the id
 * into an evidence panel outside the canvas. `null` means the marker is kept as decoration after
 * the record behind it was deleted — an explicit retention choice, never a silent substitution.
 */
export interface PlacedMarker {
  id: string
  designId: MarkerDesignId
  evidenceId: string | null
  /** Hidden markers stay in the composition and keep their link. Hiding is not deleting. */
  hidden: boolean
}

export interface PlacedPiece {
  instanceId: string
  pieceId: PieceId
  /** null for a piece standing on the ground. */
  parentInstanceId: string | null
  /** The frame on the parent this piece rests on. null for a piece on the ground. */
  receiverFrameId: string | null
  restingFrameId: string
  /** Index into the piece's authored `orientations`, not an angle: angles are bounded by design. */
  orientationIndex: number
  /** Where on the ground a root piece stands. Ignored for a piece with a parent. */
  groundX: number
  groundZ: number
  markers: PlacedMarker[]
}

export interface AssemblageComposition {
  schemaVersion: typeof ASSEMBLAGE_SCHEMA_VERSION
  catalogueVersion: number
  paletteId: PaletteId
  pieces: PlacedPiece[]
}
