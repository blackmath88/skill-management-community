/**
 * Saving, loading, exporting and importing a composition.
 *
 * The invariants here are the ones that protect somebody's records from their sculpture: an
 * import is validated whole before anything is replaced, a file this build cannot read is refused
 * rather than partly applied, and nothing about the composition can reach into the record set.
 */
import { describe, expect, it } from 'vitest'
import { CATALOGUE_VERSION, PIECE_IDS } from './catalogue'
import { addMarker, defaultComposition, removePiece, setPalette } from './compose'
import { compositionFor, fromStored, toStored } from './storage'
import {
  COMPOSITION_APP_ID,
  COMPOSITION_EXPORT_VERSION,
  MAX_COMPOSITION_CHARS,
  compositionFileName,
  exportComposition,
  parseCompositionImport,
} from './portability'
import { validateComposition } from './placement'
import type { AppearanceAssemblage } from '~/domain/types'

describe('saving and loading', () => {
  it('round-trips a composition through the stored form exactly', () => {
    const marked = addMarker(defaultComposition('moss-ink'), {
      instanceId: 'ring',
      markerId: 'm1',
      designId: 'linked-loop',
      evidenceId: 'ev-1',
    })
    expect(marked.ok).toBe(true)
    if (!marked.ok) return
    const back = fromStored(toStored(marked.composition))
    expect(back.ok).toBe(true)
    if (!back.ok) return
    expect(back.composition).toEqual(marked.composition)
  })

  it('opens the day-one composition when nothing is saved', () => {
    const result = compositionFor(undefined)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.composition.pieces).toHaveLength(6)
    expect(validateComposition(result.composition)).toEqual([])
  })

  it('refuses a piece that is not in this catalogue instead of dropping it', () => {
    const stored = toStored(defaultComposition())
    const broken: AppearanceAssemblage = {
      ...stored,
      pieces: stored.pieces.map((p) => (p.instanceId === 'ring' ? { ...p, pieceId: 'obelisk' } : p)),
    }
    const result = fromStored(broken)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.join(' ')).toContain('obelisk')
  })

  it('refuses an unknown marker design', () => {
    const stored = toStored(defaultComposition())
    const broken: AppearanceAssemblage = {
      ...stored,
      pieces: stored.pieces.map((p) =>
        p.instanceId === 'base'
          ? { ...p, markers: [{ id: 'm', designId: 'gold-star', evidenceId: null, hidden: false }] }
          : p,
      ),
    }
    expect(fromStored(broken).ok).toBe(false)
  })

  it('refuses a composition that cannot be built, rather than drawing part of it', () => {
    const stored = toStored(defaultComposition())
    const cyclic: AppearanceAssemblage = {
      ...stored,
      pieces: stored.pieces.map((p) =>
        p.instanceId === 'base' ? { ...p, parentInstanceId: 'column', receiverFrameId: 'cap' } : p,
      ),
    }
    const result = fromStored(cyclic)
    expect(result.ok).toBe(false)
  })

  it('reports an unfamiliar catalogue version as a note, and still draws it', () => {
    const stored = { ...toStored(defaultComposition()), catalogueVersion: CATALOGUE_VERSION + 1 }
    const result = fromStored(stored)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.notes.join(' ')).toContain('catalogue version')
  })

  it('refuses a stored format this build does not know', () => {
    const stored = { ...toStored(defaultComposition()), version: 9 } as unknown as AppearanceAssemblage
    expect(fromStored(stored).ok).toBe(false)
  })
})

describe('the composition export file', () => {
  it('round-trips through export and import', () => {
    const changed = setPalette(defaultComposition(), 'clay-dusk')
    expect(changed.ok).toBe(true)
    if (!changed.ok) return
    const json = exportComposition(changed.composition, '2026-11-12T10:00:00.000Z')
    const result = parseCompositionImport(json)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.composition).toEqual(changed.composition)
  })

  it('names the file after the day it was made', () => {
    expect(compositionFileName('2026-11-12T10:00:00.000Z')).toBe('skilling-me-softly-assemblage-2026-11-12.json')
  })

  it('carries appearance only: no record of any kind is in the file', () => {
    const marked = addMarker(defaultComposition(), {
      instanceId: 'base',
      markerId: 'm1',
      designId: 'paired-inlay',
      evidenceId: 'evidence-123',
    })
    if (!marked.ok) throw new Error('fixture failed')
    const json = exportComposition(marked.composition)
    const envelope = JSON.parse(json)
    expect(Object.keys(envelope).sort()).toEqual(['app', 'assemblage', 'exportedAt', 'schemaVersion'])
    expect(envelope.app).toBe(COMPOSITION_APP_ID)
    expect(envelope.schemaVersion).toBe(COMPOSITION_EXPORT_VERSION)
    // The marker's evidence identifier is the only thing in the file that refers to a record, and
    // it is an opaque identifier: no text, no attribution, no date, no kind.
    const text = JSON.stringify(envelope)
    expect(text).toContain('evidence-123')
    for (const forbidden of ['situation', 'attempt', 'review', 'hypothesis', 'attribution', 'journal']) {
      expect(text.toLowerCase()).not.toContain(forbidden)
    }
  })

  it('refuses a records export, and says where that one goes', () => {
    const result = parseCompositionImport(JSON.stringify({ app: 'skilling-me-softly', schemaVersion: 1, data: {} }))
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.join(' ')).toContain('Settings')
  })

  it('refuses a newer export version whole, rather than reading the parts it knows', () => {
    const json = exportComposition(defaultComposition())
    const bumped = JSON.stringify({ ...JSON.parse(json), schemaVersion: 2 })
    const result = parseCompositionImport(bumped)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.join(' ')).toContain('Nothing was changed')
  })

  it('never throws, whatever it is given', () => {
    for (const input of [
      '',
      'not json',
      '[]',
      'null',
      '42',
      '{"app":"skilling-me-softly-assemblage"}',
      '{"app":"skilling-me-softly-assemblage","schemaVersion":1}',
      '{"app":"skilling-me-softly-assemblage","schemaVersion":1,"assemblage":null}',
      '{"app":"skilling-me-softly-assemblage","schemaVersion":1,"assemblage":{"version":1,"catalogueVersion":1,"paletteId":"moss-ink","pieces":"nope"}}',
      JSON.stringify({ app: COMPOSITION_APP_ID, schemaVersion: 1, assemblage: { version: 1, catalogueVersion: 1, paletteId: 'moss-ink', pieces: [{ instanceId: 1 }] } }),
    ]) {
      const result = parseCompositionImport(input)
      expect(result.ok, input.slice(0, 50)).toBe(false)
    }
  })

  it('refuses a file far too large to be a composition', () => {
    expect(parseCompositionImport('x'.repeat(MAX_COMPOSITION_CHARS + 1)).ok).toBe(false)
  })

  it('refuses a composition with absurdly many pieces', () => {
    const stored = toStored(defaultComposition())
    const many = {
      ...stored,
      pieces: Array.from({ length: 200 }, (_, i) => ({ ...(stored.pieces[0] as object), instanceId: `p${i}` })),
    }
    const json = JSON.stringify({ app: COMPOSITION_APP_ID, schemaVersion: 1, exportedAt: '', assemblage: many })
    expect(parseCompositionImport(json).ok).toBe(false)
  })

  it('imports a five-piece composition that somebody else made', () => {
    const smaller = removePiece(defaultComposition(), 'perch')
    if (!smaller.ok) throw new Error('fixture failed')
    const result = parseCompositionImport(exportComposition(smaller.composition))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.composition.pieces).toHaveLength(5)
    expect(new Set(result.composition.pieces.map((p) => p.pieceId)).size).toBe(5)
    expect(PIECE_IDS.length).toBe(6)
  })
})
