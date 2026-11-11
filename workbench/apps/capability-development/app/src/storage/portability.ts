/**
 * Export and import. An import is a validated atomic replacement, never a partial merge:
 * a half-applied file would leave records nobody could explain.
 *
 * Four version numbers stay separate on purpose:
 *   - the export format version (this file),
 *   - the personal-data schema version (domain/types.ts),
 *   - the IndexedDB version (indexeddb.ts),
 *   - the appearance version (domain/types.ts Appearance).
 *
 * Adapted from blackmath88/leader-me src/storage/portability.ts (commit 55114f3b).
 */
import { COLLECTION_KEYS, type CollectionKey, type UserData } from '~/domain/types'
import { validateUserData, type ValidationOptions } from '~/domain/validation'
import { CONVERTIBLE_LEGACY_VERSIONS, convertLeaderMeData, LEGACY_APP_ID } from './legacy'
import type { ExportEnvelope, ImportResult, ImportSummary } from './types'

export const APP_ID = 'skilling-me-softly'

/** Export format version. 1: personal data v1. */
export const EXPORT_FORMAT_VERSION = 1
/** Personal-data versions each readable export format may carry. */
const DATA_VERSIONS_BY_FORMAT: Readonly<Record<number, readonly number[]>> = { 1: [1] }
export const READABLE_EXPORT_VERSIONS: readonly number[] = Object.keys(DATA_VERSIONS_BY_FORMAT).map(Number)

/** Reject absurdly large files before parsing (10 MB of text). */
export const MAX_IMPORT_CHARS = 10_000_000

export function exportUserData(data: UserData, now: string = new Date().toISOString()): string {
  const envelope: ExportEnvelope = { app: APP_ID, schemaVersion: EXPORT_FORMAT_VERSION, exportedAt: now, data }
  return JSON.stringify(envelope, null, 2)
}

export function exportFileName(now: string = new Date().toISOString()): string {
  return `skilling-me-softly-${now.slice(0, 10)}.json`
}

function countsOf(data: UserData): Record<CollectionKey, number> {
  const counts = {} as Record<CollectionKey, number>
  for (const key of COLLECTION_KEYS) counts[key] = data[key].length
  return counts
}

export interface ParseImportOptions extends ValidationOptions {
  /** Timestamp used for records a conversion has to create. */
  now?: string
}

/**
 * Validate shape, versions and relationships. Never throws.
 *
 * A file from this app at a version this build does not know is refused outright rather than
 * read with fields missing. A Leader Me file is converted first and then validated normally.
 */
export function parseImport(json: string, options: ParseImportOptions = {}): ImportResult {
  try {
    if (typeof json !== 'string') return { ok: false, errors: ['The import must be text containing JSON.'] }
    if (json.length > MAX_IMPORT_CHARS) {
      return { ok: false, errors: ['The file is too large to be an export from this app.'] }
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(json)
    } catch {
      return { ok: false, errors: ['The file is not valid JSON.'] }
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ok: false, errors: ['The file does not contain an export envelope.'] }
    }
    const envelope = parsed as Record<string, unknown>
    const app = envelope.app
    if (app !== APP_ID && app !== LEGACY_APP_ID) {
      return {
        ok: false,
        errors: [`The file is not an export this app can read (its "app" field is ${JSON.stringify(app)}).`],
      }
    }
    if (typeof envelope.schemaVersion !== 'number') {
      return { ok: false, errors: ['The file does not say which export version it is.'] }
    }
    const fileVersion = envelope.schemaVersion
    const exportedAt = typeof envelope.exportedAt === 'string' ? envelope.exportedAt : null
    const now = options.now ?? new Date().toISOString()

    if (app === LEGACY_APP_ID) {
      if (!CONVERTIBLE_LEGACY_VERSIONS.includes(fileVersion)) {
        return {
          ok: false,
          errors: [
            `This is a Leader Me export of version ${fileVersion}. This build can convert Leader Me versions ${CONVERTIBLE_LEGACY_VERSIONS.join(' and ')}.`,
          ],
        }
      }
      const { data: converted, notes, unreadable } = convertLeaderMeData(
        envelope.data,
        now,
        // Only when the caller said which content is installed. Without it, references are
        // carried through unchanged and validated as they are.
        options.knownCapabilityIds && options.knownMethodIds
          ? { capabilityIds: options.knownCapabilityIds, methodIds: options.knownMethodIds }
          : undefined,
      )
      if (unreadable) {
        return {
          ok: false,
          errors: [
            'This says it is a Leader Me export, but it holds no records this build can read. Nothing was changed.',
          ],
        }
      }
      const checked = validateUserData(converted, validationOptionsOf(options))
      if (!checked.ok) {
        return {
          ok: false,
          errors: [
            'The Leader Me file was read but the converted records did not pass validation. Nothing was changed.',
            ...checked.errors,
          ],
        }
      }
      return {
        ok: true,
        data: checked.data,
        summary: {
          schemaVersion: fileVersion,
          exportedAt,
          sourceApp: LEGACY_APP_ID,
          converted: true,
          counts: countsOf(checked.data),
          notes,
        },
      }
    }

    if (!READABLE_EXPORT_VERSIONS.includes(fileVersion)) {
      return {
        ok: false,
        errors: [
          `Unsupported export version ${fileVersion}. This build can import versions ${READABLE_EXPORT_VERSIONS.join(' and ')}. Nothing was changed; a newer file is refused rather than read with parts missing.`,
        ],
      }
    }
    const inner = envelope.data
    if (typeof inner === 'object' && inner !== null && !Array.isArray(inner)) {
      const innerVersion = (inner as Record<string, unknown>).schemaVersion
      if (!(DATA_VERSIONS_BY_FORMAT[fileVersion] ?? []).includes(innerVersion as number)) {
        return {
          ok: false,
          errors: [`Unsupported records version ${JSON.stringify(innerVersion)} inside a version ${fileVersion} file.`],
        }
      }
    }
    const result = validateUserData(envelope.data, validationOptionsOf(options))
    if (!result.ok) return result
    const summary: ImportSummary = {
      schemaVersion: fileVersion,
      exportedAt,
      sourceApp: APP_ID,
      converted: false,
      counts: countsOf(result.data),
      notes: [],
    }
    return { ok: true, data: result.data, summary }
  } catch (error) {
    return {
      ok: false,
      errors: [`The import could not be read: ${error instanceof Error ? error.message : 'unknown error'}.`],
    }
  }
}

function validationOptionsOf(options: ParseImportOptions): ValidationOptions {
  const result: ValidationOptions = {}
  if (options.knownCapabilityIds) result.knownCapabilityIds = options.knownCapabilityIds
  if (options.knownMethodIds) result.knownMethodIds = options.knownMethodIds
  if (options.knownCampaignIds) result.knownCampaignIds = options.knownCampaignIds
  return result
}
