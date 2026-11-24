import { describe, expect, it } from 'vitest'
import {
  appearanceExport,
  initialComposition,
  parseComposition,
  placements,
  poses,
  removePiece,
} from './model'
import { validateUserData } from '~/domain/validation'
import { emptyUserData } from '~/domain/empty'
import { deleteEvidenceCascade } from '~/domain/cascade'
import { createDemoUserData } from '~/content/demo'
import { saveAssemblage } from '~/application/assemblage'
import { createContentRegistry } from '~/content/index'
import { AppSession } from '~/application/session'
import { createMemoryStore } from '~/storage/memory'
const deps = {
  clock: { today: () => '1970-01-01', now: () => new Date(0).toISOString() },
  newId: () => 'new-id',
  content: createContentRegistry(),
}
describe('authored assemblage', () => {
  it('preserves opaque identifiers from existing imported evidence records', () => {
    const c = initialComposition()
    c.markers = [
      {
        id: 'memory',
        instanceId: 'standing',
        motif: 'loop',
        visible: true,
        evidenceId: 'legacy:observation/1',
        retainUnlinked: false,
      },
    ]
    expect(parseComposition(c).markers[0]?.evidenceId).toBe('legacy:observation/1')
  })

  it('aligns each resting frame exactly and round trips deterministically', () => {
    const c = initialComposition()
    expect(parseComposition(JSON.parse(JSON.stringify(c)))).toEqual(c)
    const p = poses(c)
    expect(p.get('standing')?.at).toEqual([-1.15, 0.65, 0])
    expect(p.get('river')?.at[1]).toBeCloseTo(2.1)
    expect(appearanceExport(parseComposition(JSON.parse(appearanceExport(c))))).toBe(appearanceExport(c))
  })
  it.each([
    ['future schema', (c: ReturnType<typeof initialComposition>) => ({ ...c, schemaVersion: 2 })],
    ['future catalogue', (c: ReturnType<typeof initialComposition>) => ({ ...c, catalogueVersion: 7 })],
    ['missing root', (c: ReturnType<typeof initialComposition>) => ({ ...c, pieces: c.pieces.slice(1) })],
    [
      'second root',
      (c: ReturnType<typeof initialComposition>) => ({
        ...c,
        pieces: c.pieces.map((p) => (p.id === 'standing' ? { ...p, parentId: null } : p)),
      }),
    ],
    [
      'occupied contact',
      (c: ReturnType<typeof initialComposition>) => ({
        ...c,
        pieces: c.pieces.map((p) => (p.id === 'span' ? { ...p, contactId: 'left' } : p)),
      }),
    ],
    [
      'unsupported part',
      (c: ReturnType<typeof initialComposition>) => ({
        ...c,
        pieces: c.pieces.map((p) => (p.id === 'turn' ? { ...p, partId: 'unknown' } : p)),
      }),
    ],
    [
      'cycle',
      (c: ReturnType<typeof initialComposition>) => ({
        ...c,
        pieces: c.pieces.map((p) =>
          p.id === 'standing' ? { ...p, parentId: 'river', contactId: 'crown' } : p,
        ),
      }),
    ],
    [
      'unbounded rotation',
      (c: ReturnType<typeof initialComposition>) => ({
        ...c,
        pieces: c.pieces.map((p) => ({ ...p, orientation: 45 })),
      }),
    ],
  ])('rejects %s atomically', (_name, change) => {
    const c = initialComposition()
    const before = JSON.stringify(c)
    expect(() => parseComposition(change(c))).toThrow()
    expect(JSON.stringify(c)).toBe(before)
  })
  it('returns a supported subtree to the tray without deleting its history', () => {
    const c = initialComposition()
    const next = removePiece(c, 'standing')
    expect(next.pieces.map((p) => p.id)).toEqual(['base', 'span', 'opening'])
    expect(next.markers).toEqual(c.markers)
    expect(parseComposition(next)).toEqual(next)
    expect(placements(next, 'spire').map((p) => p.contactId)).toEqual(['left'])
  })
  it('strips linkable identifiers and all evidence associations from appearance exports', () => {
    const c = initialComposition()
    c.markers[0] = {
      id: 'private-marker',
      instanceId: 'standing',
      motif: 'loop',
      visible: true,
      evidenceId: 'private-evidence',
      retainUnlinked: false,
    }
    const raw = appearanceExport(c)
    expect(raw).not.toContain('private')
    expect(raw).not.toContain('standing')
    expect(raw).not.toContain('exampleId')
    expect(parseComposition(JSON.parse(raw)).markers.every((m) => !m.evidenceId)).toBe(true)
  })
  it('keeps old records readable and includes composition in full validated snapshots', () => {
    const old = emptyUserData()
    expect(validateUserData(old).ok).toBe(true)
    const data = { ...old, profile: { ...old.profile, assemblage: initialComposition() } }
    expect(validateUserData(data)).toEqual({ ok: true, data })
    expect(
      validateUserData({
        ...data,
        profile: { ...data.profile, assemblage: { ...initialComposition(), schemaVersion: 9 } },
      }).ok,
    ).toBe(false)
  })
  it('unlinks deleted evidence and retains decoration only by explicit choice', () => {
    const data = createDemoUserData()
    const evidenceId = data.evidence[0]!.id
    data.profile.assemblage = initialComposition()
    data.profile.assemblage.markers = [
      {
        id: 'linked',
        instanceId: 'standing',
        motif: 'loop',
        visible: true,
        evidenceId,
        retainUnlinked: false,
      },
      {
        id: 'retained',
        instanceId: 'standing',
        motif: 'inlay',
        visible: true,
        evidenceId,
        retainUnlinked: true,
      },
    ]
    const next = deleteEvidenceCascade(data, new Set([evidenceId]))
    expect(next.profile.assemblage?.markers).toEqual([
      { id: 'retained', instanceId: 'standing', motif: 'inlay', visible: true, retainUnlinked: true },
    ])
    expect(validateUserData(next).ok).toBe(true)
  })
  it('refuses stale appearance edits and missing evidence, preserving records', () => {
    const data = emptyUserData()
    data.profile.assemblage = { ...initialComposition(), palette: 'tidal' }
    expect(saveAssemblage(data, initialComposition(), initialComposition(), deps).ok).toBe(false)
    const next = initialComposition()
    next.markers = [
      {
        id: 'bad',
        instanceId: 'standing',
        motif: 'loop',
        visible: true,
        evidenceId: 'missing',
        retainUnlinked: false,
      },
    ]
    expect(saveAssemblage(data, next, data.profile.assemblage, deps).ok).toBe(false)
  })
  it('persists through the actual queue and reloads without changing evidence', async () => {
    const store = createMemoryStore()
    const session = new AppSession({ store, ...deps })
    await session.start()
    const next = { ...initialComposition(), palette: 'tidal' as const }
    expect((await session.run((data, d) => saveAssemblage(data, next, initialComposition(), d))).ok).toBe(
      true,
    )
    await session.reload()
    expect(session.getState().data.profile.assemblage).toEqual(next)
    session.dispose()
  })
})
