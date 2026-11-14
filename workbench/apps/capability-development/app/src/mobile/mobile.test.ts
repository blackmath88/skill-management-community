import { describe, expect, it } from 'vitest'
import { saveAppearance, saveAssemblage, saveMobile, deleteActivity } from '~/application/commands'
import { exportUserData, parseImport } from '~/storage/portability'
import { emptyUserData } from '~/domain/empty'
import type { AppearanceMobile, UserData } from '~/domain/types'
import { NOW, registry, reviewedRealAttempt, testDeps, activity } from '~/test-helpers/fixtures'
import { COMPOSITIONS, PALETTES, SLOT_COUNT, composition, mobilePalette, shapePath } from './catalogue'
import { deriveMobileView } from './view'
import { drawMobile, mix, sheetColours } from './scene'

const deps = testDeps()
const base = (): AppearanceMobile => ({ version: 1, compositionId: 'cascade', paletteId: 'moss-ink', memories: [] })
const attemptedId = (data: UserData) => data.attempts[0]!.activityId
function must<T>(outcome: { ok: true; data: UserData; value: T } | { ok: false; errors: string[] }): UserData {
  if (!outcome.ok) throw new Error(outcome.errors.join('; '))
  return outcome.data
}
const importOptions = () => ({ knownCapabilityIds: registry().capabilityIds(), knownMethodIds: registry().methodIds() })

describe('the mobile catalogue', () => {
  it('gives every composition the same number of shapes, so a memory always has a shape', () => {
    for (const c of COMPOSITIONS) expect(c.shapes).toHaveLength(SLOT_COUNT)
  })
  it('has unique ids and drawable shapes', () => {
    expect(new Set(COMPOSITIONS.map((c) => c.id)).size).toBe(COMPOSITIONS.length)
    expect(new Set(PALETTES.map((p) => p.id)).size).toBe(PALETTES.length)
    for (const c of COMPOSITIONS) for (const s of c.shapes) expect(shapePath(s.kind, s.r)).not.toMatch(/NaN|undefined/)
  })
  it('draws the default for an identifier it does not know', () => {
    expect(composition('from-a-newer-build').id).toBe(COMPOSITIONS[0]!.id)
    expect(mobilePalette(undefined).id).toBe(PALETTES[0]!.id)
  })
})

describe('the mobile is complete with no records', () => {
  it('derives a full drawing, no memories and no candidates from an empty record set', () => {
    const view = deriveMobileView(emptyUserData(NOW))
    expect(view.saved).toBe(false)
    expect(view.drawing.composition.shapes).toHaveLength(SLOT_COUNT)
    expect(view.drawing.marked).toEqual([])
    expect(view.memories).toEqual([])
    expect(view.candidates).toEqual([])
  })
  it('does not change with how much has been recorded', () => {
    const empty = deriveMobileView(emptyUserData(NOW)).drawing
    const busy = deriveMobileView(reviewedRealAttempt()).drawing
    expect(busy).toEqual(empty)
  })
  it('gives the picture geometry and marks only — never a word of anybody’s writing', () => {
    const data = must(saveMobile(reviewedRealAttempt(), { ...base(), memories: [{ slot: 2, activityId: attemptedId(reviewedRealAttempt()) }] }, deps))
    const drawing = JSON.stringify(deriveMobileView(data).drawing)
    for (const review of data.reviews) expect(drawing).not.toContain(review.observation)
    for (const a of data.activities) expect(drawing).not.toContain(a.title)
    expect(drawing).not.toContain(attemptedId(data))
  })
})

describe('saveMobile', () => {
  it('saves a choice and credits nothing', () => {
    const before = reviewedRealAttempt()
    const after = must(saveMobile(before, base(), deps))
    expect(after.profile.appearance?.mobile).toEqual(base())
    expect(after.attempts).toEqual(before.attempts)
    expect(after.reviews).toEqual(before.reviews)
    expect(after.evidence).toEqual(before.evidence)
  })
  it('hangs a memory only on something actually attempted', () => {
    const data = reviewedRealAttempt()
    expect(saveMobile(data, { ...base(), memories: [{ slot: 0, activityId: 'nothing' }] }, deps).ok).toBe(false)
    const planned = { ...data, activities: [...data.activities, activity({ id: 'planned-only', state: 'ready' })] }
    expect(saveMobile(planned, { ...base(), memories: [{ slot: 0, activityId: 'planned-only' }] }, deps).ok).toBe(false)
    expect(saveMobile(data, { ...base(), memories: [{ slot: 0, activityId: attemptedId(data) }] }, deps).ok).toBe(true)
  })
  it('refuses two memories on one shape and a shape that does not exist', () => {
    const data = reviewedRealAttempt()
    const id = attemptedId(data)
    expect(saveMobile(data, { ...base(), memories: [{ slot: 1, activityId: id }, { slot: 1, activityId: id }] }, deps).ok).toBe(false)
    expect(saveMobile(data, { ...base(), memories: [{ slot: 99, activityId: id }] }, deps).ok).toBe(false)
  })
  it('leaves a saved emblem and a saved assemblage exactly as they were', () => {
    let data = must(saveAppearance(reviewedRealAttempt(), { version: 1, mode: 'journey', emblem: '▲', palette: 'moss', accessories: [] }, deps))
    const assemblage = { version: 1 as const, catalogueVersion: 1, paletteId: 'moss-ink', pieces: [] }
    data = must(saveAssemblage(data, assemblage, deps))
    const before = data.profile.appearance!
    const after = must(saveMobile(data, base(), deps)).profile.appearance!
    expect({ ...after, mobile: undefined }).toEqual({ ...before, mobile: undefined })
    expect(after.assemblage).toEqual(assemblage)
  })
  it('is kept when the emblem or the assemblage is saved afterwards', () => {
    let data = must(saveMobile(reviewedRealAttempt(), base(), deps))
    data = must(saveAppearance(data, { version: 1, mode: 'evidence', emblem: '●', palette: 'ink', accessories: [] }, deps))
    expect(data.profile.appearance?.mobile).toEqual(base())
    data = must(saveAssemblage(data, { version: 1, catalogueVersion: 1, paletteId: 'bone-slate', pieces: [] }, deps))
    expect(data.profile.appearance?.mobile).toEqual(base())
  })
})

describe('a memory whose record was deleted', () => {
  it('is reported as missing, never replaced, and can still be taken down', () => {
    const start = reviewedRealAttempt()
    const id = attemptedId(start)
    let data = must(saveMobile(start, { ...base(), memories: [{ slot: 3, activityId: id }] }, deps))
    data = must(deleteActivity(data, id))
    const view = deriveMobileView(data)
    expect(view.memories).toHaveLength(1)
    expect(view.memories[0]).toMatchObject({ present: false, observation: null, evidenceCount: 0, slot: 3 })
    expect(view.memories[0]!.title).not.toContain(start.activities[0]!.title)
    const cleared = must(saveMobile(data, { ...data.profile.appearance!.mobile!, memories: [] }, deps))
    expect(deriveMobileView(cleared).memories).toEqual([])
    // And an unrelated change does not fail because of the dangling one.
    expect(saveMobile(data, { ...data.profile.appearance!.mobile!, paletteId: 'clay-dusk' }, deps).ok).toBe(true)
  })
})

describe('export and import', () => {
  it('round-trips the mobile with the records', () => {
    const start = reviewedRealAttempt()
    const data = must(saveMobile(start, { ...base(), memories: [{ slot: 4, activityId: attemptedId(start) }] }, deps))
    const result = parseImport(exportUserData(data), importOptions())
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.profile.appearance?.mobile).toEqual(data.profile.appearance?.mobile)
  })
  it('reads a record set written before the mobile existed', () => {
    const result = parseImport(exportUserData(reviewedRealAttempt()), importOptions())
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.profile.appearance?.mobile).toBeUndefined()
  })
  it('refuses a malformed mobile instead of half-reading it', () => {
    const data = must(saveMobile(reviewedRealAttempt(), base(), deps))
    const tamper = (edit: (mobile: Record<string, unknown>) => void) => {
      const file = JSON.parse(exportUserData(data)) as { data?: UserData } & UserData
      const profile = (file.data ?? file).profile
      edit(profile.appearance!.mobile as unknown as Record<string, unknown>)
      return parseImport(JSON.stringify(file), importOptions())
    }
    expect(tamper((m) => (m.version = 2)).ok).toBe(false)
    expect(tamper((m) => (m.compositionId = 7)).ok).toBe(false)
    expect(tamper((m) => (m.memories = Array.from({ length: 50 }, (_, i) => ({ slot: i, activityId: 'x' })))).ok).toBe(false)
    expect(tamper((m) => (m.memories = [{ slot: 1, activityId: 'a' }, { slot: 1, activityId: 'b' }])).ok).toBe(false)
  })
})

describe('the three-dimensional drawing', () => {
  it('draws every shape of every arrangement exactly once, with finite numbers', () => {
    for (const c of COMPOSITIONS) {
      for (const [time, turned] of [[0, 0], [37.5, 0], [0, 2.4], [900, -7]] as const) {
        const parts = drawMobile(c, time, turned)
        const slots = parts.flatMap((p) => (p.kind === 'shape' ? [p.slot] : [])).sort()
        expect(slots, `${c.id} at ${time}/${turned}`).toEqual([0, 1, 2, 3, 4])
        expect(JSON.stringify(parts)).not.toMatch(/NaN|null|Infinity/)
      }
    }
  })
  it('is the same picture every time for the resting pose, and a different one once turned', () => {
    const c = COMPOSITIONS[0]!
    expect(drawMobile(c)).toEqual(drawMobile(c, 0, 0))
    expect(drawMobile(c, 0, 0.7)).not.toEqual(drawMobile(c))
    expect(drawMobile(c, 12)).not.toEqual(drawMobile(c))
  })
  it('paints back to front', () => {
    for (const c of COMPOSITIONS) {
      const depths = drawMobile(c, 5, 1).map((p) => p.depth)
      expect(depths).toEqual([...depths].sort((a, b) => a - b))
    }
  })
  it('never narrows a sheet to nothing, and rests with no sheet edge-on', () => {
    for (const c of COMPOSITIONS) {
      for (let turned = 0; turned < 6.3; turned += 0.05) {
        for (const p of drawMobile(c, 0, turned)) if (p.kind === 'shape') expect(p.squeeze).toBeGreaterThan(0)
      }
      for (const p of drawMobile(c)) if (p.kind === 'shape') expect(p.squeeze, `${c.id} slot ${p.slot}`).toBeGreaterThan(0.5)
    }
  })
  it('mixes colours as #rrggbb', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(sheetColours('#b4532a', { light: 1, reverse: false, haze: 0 }).top).toMatch(/^#[0-9a-f]{6}$/)
  })
})
