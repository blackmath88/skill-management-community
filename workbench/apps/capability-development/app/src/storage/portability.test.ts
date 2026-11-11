/**
 * Export and import of this app's own files.
 *
 * An import replaces the whole record set, so the cases here are about refusing a file outright
 * rather than reading part of it: a half-applied import would leave a journal containing records
 * the user could not explain, and a file written by a newer build must never be read with fields
 * quietly missing.
 */
import { describe, expect, it } from 'vitest'
import { COLLECTION_KEYS, type UserData } from '~/domain/types'
import { at, reviewedRealAttempt, withSituation } from '~/test-helpers/fixtures'
import {
  APP_ID,
  EXPORT_FORMAT_VERSION,
  MAX_IMPORT_CHARS,
  exportUserData,
  parseImport,
} from './portability'
import type { ImportResult, ImportSummary } from './types'

/** Unwraps an accepted import, reporting the refusal reasons if it was refused. */
function accepted(result: ImportResult): { data: UserData; summary: ImportSummary } {
  if (!result.ok) throw new Error(`expected the import to be accepted, but it was refused: ${result.errors.join('; ')}`)
  return { data: result.data, summary: result.summary }
}

/** Unwraps a refusal, failing the test if the file was accepted. */
function refusal(result: ImportResult): string[] {
  if (result.ok) throw new Error('expected the import to be refused, but it was accepted')
  expect(result.errors.length).toBeGreaterThan(0)
  return result.errors
}

function envelope(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    app: APP_ID,
    schemaVersion: EXPORT_FORMAT_VERSION,
    exportedAt: at(0),
    data: reviewedRealAttempt(),
    ...overrides,
  })
}

describe('exportUserData', () => {
  it('writes a parseable envelope naming the app and the export format version', () => {
    const parsed: unknown = JSON.parse(exportUserData(reviewedRealAttempt(), at(0)))

    // The app and version fields are what lets a later build decide whether it may read the file
    // at all; without them an import would have to guess.
    expect(parsed).toMatchObject({ app: 'skilling-me-softly', schemaVersion: EXPORT_FORMAT_VERSION, exportedAt: at(0) })
  })

  it('round-trips every record through export and import unchanged', () => {
    const original = reviewedRealAttempt()

    const { data } = accepted(parseImport(exportUserData(original, at(0))))

    // An export is the user's only copy of their journal. Anything lost here is lost for good.
    expect(data).toEqual(original)
  })
})

describe('parseImport', () => {
  it('refuses text that is not JSON', () => {
    expect(refusal(parseImport('this is a note, not an export')).join(' ')).toMatch(/JSON/i)
  })

  it('refuses JSON that is an array rather than an export envelope', () => {
    expect(refusal(parseImport('[]')).join(' ')).toMatch(/envelope/i)
  })

  it('refuses a file written by a different application', () => {
    // Reading another app's records would invent meanings for fields this app never defined.
    expect(refusal(parseImport(envelope({ app: 'some-other-journal' }))).join(' ')).toMatch(/some-other-journal/)
  })

  it('refuses a file that does not say which export version it is', () => {
    const { schemaVersion: _omitted, ...withoutVersion } = JSON.parse(envelope()) as Record<string, unknown>

    expect(refusal(parseImport(JSON.stringify(withoutVersion))).join(' ')).toMatch(/version/i)
  })

  it('refuses a newer export rather than reading it with fields missing', () => {
    const newer = EXPORT_FORMAT_VERSION + 1

    const errors = refusal(parseImport(envelope({ schemaVersion: newer })))

    // Naming the version is what tells the user to update the app instead of assuming a bad file.
    expect(errors.join(' ')).toContain(String(newer))
  })

  it('refuses a records version the export format cannot carry', () => {
    const data: Record<string, unknown> = { ...reviewedRealAttempt(), schemaVersion: 2 }

    const errors = refusal(parseImport(envelope({ data })))

    expect(errors.join(' ')).toMatch(/records version/i)
  })

  it('refuses a file over the size limit before trying to parse it', () => {
    // Valid JSON, so reaching the parser would give the "not an envelope" error instead: the size
    // error proves nothing that large is ever handed to JSON.parse.
    const tooLarge = `"${'a'.repeat(MAX_IMPORT_CHARS)}"`

    expect(refusal(parseImport(tooLarge)).join(' ')).toMatch(/too large/i)
  })

  it('refuses a record naming a capability this build does not have, but only when asked to check', () => {
    const file = exportUserData(reviewedRealAttempt(), at(0))

    // Content packs come and go. Checking against the installed packs is the caller's choice,
    // because refusing by default would make an export unreadable after a pack is removed.
    expect(refusal(parseImport(file, { knownCapabilityIds: ['something-else'] })).join(' ')).toMatch(/clarify-ownership/)
    expect(accepted(parseImport(file)).data.activities).toHaveLength(1)
  })

  it('refuses a file whose activity points at a situation the file does not contain', () => {
    const data = reviewedRealAttempt()
    data.situations = []

    const errors = refusal(parseImport(envelope({ data })))

    // A dangling reference would show an activity with no situation to explain it.
    expect(errors.join(' ')).toMatch(/missing situation/i)
  })

  it('drops fields it does not know rather than storing them', () => {
    const situationWithExtra = { ...withSituation().situations[0], trackingPixel: 'https://example.invalid/1.gif' }
    const data = { ...withSituation(), situations: [situationWithExtra], analyticsId: 'abc-123' }

    const { data: imported } = accepted(parseImport(envelope({ data })))

    // A hand-edited or third-party file must not be able to smuggle extra state into the journal.
    expect(Object.hasOwn(imported, 'analyticsId')).toBe(false)
    expect(imported.situations.some((situation) => Object.hasOwn(situation, 'trackingPixel'))).toBe(false)
  })

  it('summarises the file with counts per collection and no conversion', () => {
    const { summary } = accepted(parseImport(exportUserData(reviewedRealAttempt(), at(0))))

    // The summary is what the user confirms before an import replaces their records, so the
    // numbers have to be the file's own, not a guess.
    expect(summary.counts).toEqual({
      directions: 0,
      situations: 1,
      campaigns: 0,
      hypotheses: 0,
      activities: 1,
      attempts: 1,
      evidence: 1,
      reviews: 1,
      perks: 0,
      proposals: 0,
      sharePackages: 0,
    })
    expect(Object.keys(summary.counts)).toHaveLength(COLLECTION_KEYS.length)
    expect(summary.converted).toBe(false)
    expect(summary.sourceApp).toBe(APP_ID)
  })
})
