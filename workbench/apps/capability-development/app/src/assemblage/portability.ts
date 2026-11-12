/**
 * Export and import for the composition alone.
 *
 * Deliberately a separate file format from the records export in ~/storage/portability. Somebody
 * who wants to carry their sculpture to another browser, or send it to somebody else, should not
 * have to hand over their journal to do it — and somebody exporting their records should not have
 * to think about whether a sculpture is in there. One file holds appearance and nothing else; the
 * other holds records, with the appearance inside them because it belongs to that record set.
 *
 * An import here replaces the composition and touches no record of any kind.
 */
import { validateAppearanceAssemblage } from '~/domain/validation'
import type { AppearanceAssemblage } from '~/domain/types'
import { fromStored, toStored } from './storage'
import type { AssemblageComposition } from './types'

export const COMPOSITION_APP_ID = 'skilling-me-softly-assemblage'
/** Export format version for this file, independent of every other version in the app. */
export const COMPOSITION_EXPORT_VERSION = 1
export const READABLE_COMPOSITION_VERSIONS: readonly number[] = [1]
/** A composition is a few kilobytes. Anything near this is not one. */
export const MAX_COMPOSITION_CHARS = 200_000

export interface CompositionEnvelope {
  app: typeof COMPOSITION_APP_ID
  schemaVersion: number
  exportedAt: string
  assemblage: AppearanceAssemblage
}

export function exportComposition(composition: AssemblageComposition, now = new Date().toISOString()): string {
  const envelope: CompositionEnvelope = {
    app: COMPOSITION_APP_ID,
    schemaVersion: COMPOSITION_EXPORT_VERSION,
    exportedAt: now,
    assemblage: toStored(composition),
  }
  return JSON.stringify(envelope, null, 2)
}

export function compositionFileName(now = new Date().toISOString()): string {
  return `skilling-me-softly-assemblage-${now.slice(0, 10)}.json`
}

export type CompositionImportResult =
  | { ok: true; composition: AssemblageComposition; notes: string[] }
  | { ok: false; errors: string[] }

/**
 * Reads an exported composition. Never throws.
 *
 * Checked in three stages, each of which refuses rather than repairs: the envelope and its
 * version, then the shape and its caps, then whether the pieces form a composition that can
 * actually be built. A file from a future version is refused whole — reading it with the parts
 * this build understands would silently drop somebody's pieces.
 */
export function parseCompositionImport(json: string): CompositionImportResult {
  try {
    if (typeof json !== 'string') return { ok: false, errors: ['The import must be text containing JSON.'] }
    if (json.length > MAX_COMPOSITION_CHARS) {
      return { ok: false, errors: ['That file is far too large to be an exported composition.'] }
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(json)
    } catch {
      return { ok: false, errors: ['The file is not valid JSON.'] }
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ok: false, errors: ['The file does not contain a composition export.'] }
    }
    const envelope = parsed as Record<string, unknown>
    if (envelope.app !== COMPOSITION_APP_ID) {
      return {
        ok: false,
        errors: [
          `That is not a composition export from this app (its "app" field is ${JSON.stringify(envelope.app)}). A full records export is imported from the Settings page instead.`,
        ],
      }
    }
    if (typeof envelope.schemaVersion !== 'number') {
      return { ok: false, errors: ['The file does not say which export version it is.'] }
    }
    if (!READABLE_COMPOSITION_VERSIONS.includes(envelope.schemaVersion)) {
      return {
        ok: false,
        errors: [
          `Unsupported composition export version ${envelope.schemaVersion}. This build reads version ${READABLE_COMPOSITION_VERSIONS.join(' and ')}. Nothing was changed; a newer file is refused rather than read with parts missing.`,
        ],
      }
    }
    const shape = validateAppearanceAssemblage(envelope.assemblage)
    if (!shape.ok) return { ok: false, errors: shape.errors }
    const loaded = fromStored(shape.data)
    if (!loaded.ok) return { ok: false, errors: loaded.errors }
    return { ok: true, composition: loaded.composition, notes: loaded.notes }
  } catch (error) {
    return {
      ok: false,
      errors: [`The composition could not be read: ${error instanceof Error ? error.message : 'unknown error'}.`],
    }
  }
}
