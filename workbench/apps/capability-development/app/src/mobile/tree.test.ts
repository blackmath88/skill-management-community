import { describe, expect, it } from 'vitest'
import { chooseTarget, endSeason, placeSkills, queueBranches, startSeason } from '~/application/commands'
import { capabilityRows, deriveViewModels } from '~/application/queries'
import { TARGETS } from '~/content/targets'
import { emptyUserData } from '~/domain/empty'
import type { UserData } from '~/domain/types'
import { exportUserData, parseImport } from '~/storage/portability'
import { createDemoUserData } from '~/content/demo'
import { NOW, registry, reviewedRealAttempt, testDeps } from '~/test-helpers/fixtures'
import { deriveTree, skillTrail } from './tree'

const deps = testDeps()
const content = registry()
const TODAY = NOW.slice(0, 10)
function must<T>(outcome: { ok: true; data: UserData; value: T } | { ok: false; errors: string[] }): UserData {
  if (!outcome.ok) throw new Error(outcome.errors.join('; '))
  return outcome.data
}
const tree = (data: UserData, today = TODAY) => deriveTree(data, capabilityRows(deriveViewModels(data, content), content), content.capabilityGroups(), today)
const pieceOf = (data: UserData, id: string) => tree(data).pieces.find((p) => p.capabilityId === id)!

describe('the vocabulary and the targets', () => {
  it('holds twenty-four skills on seven branches, each skill on exactly one', () => {
    const t = tree(emptyUserData(NOW))
    expect(t.pieces).toHaveLength(24)
    expect(t.branches).toHaveLength(7)
    expect(new Set(t.pieces.map((p) => p.capabilityId)).size).toBe(24)
    expect(t.pieces.map((p) => p.slot)).toEqual(Array.from({ length: 24 }, (_, i) => i))
  })
  it('only ever points a target at skills that exist', () => {
    for (const target of TARGETS) for (const id of target.capabilityIds) expect(content.capability(id), `${target.id}: ${id}`).toBeDefined()
  })
})

describe('never starting from nothing, honestly', () => {
  it('shows an empty record set as outlines, all of them things that could be added', () => {
    const t = tree(emptyUserData(NOW))
    expect(t.begun).toBe(false)
    expect(t.pieces.every((p) => p.state === 'outline')).toBe(true)
  })
  it('primes a placed skill without ever calling it practised', () => {
    const data = must(placeSkills(emptyUserData(NOW), [{ capabilityId: 'frame-challenge', level: 'regularly' }, { capabilityId: 'plan-experiment', level: 'not-yet' }], deps))
    expect(pieceOf(data, 'frame-challenge').state).toBe('claimed')
    expect(pieceOf(data, 'plan-experiment').state).toBe('outline')
    expect(pieceOf(data, 'plan-experiment').claim).toBe('not-yet')
    expect(tree(data).totals).toMatchObject({ have: 1, practised: 0 })
    // A placement is a statement: no practice, no evidence, no experience.
    expect(deriveViewModels(data, content).experience.total).toBe(0)
    expect(data.attempts).toHaveLength(0)
  })
  it('lets records, not a placement, decide once there are records', () => {
    const base = reviewedRealAttempt()
    const id = base.activities[0]!.capabilityIds[0]!
    const stage = pieceOf(base, id).state
    expect(['tried', 'repeated', 'transferred', 'rehearsed', 'explored']).toContain(stage)
    const downplayed = must(placeSkills(base, [{ capabilityId: id, level: 'not-yet' }], deps))
    expect(pieceOf(downplayed, id).state).toBe(stage)
  })
  it('refuses a placement on a skill that is not installed', () => {
    expect(placeSkills(emptyUserData(NOW), [{ capabilityId: 'made-up', level: 'can-do' }], deps).ok).toBe(false)
  })
})

describe('a target', () => {
  it('marks its pieces and counts what is still open, and switching loses nothing', () => {
    let data = must(placeSkills(emptyUserData(NOW), [{ capabilityId: 'ai-brief-assistant', level: 'can-do' }], deps))
    data = must(chooseTarget(data, 'ai', deps))
    const ai = tree(data)
    expect(ai.target?.id).toBe('ai')
    expect(ai.pieces.filter((p) => p.inTarget)).toHaveLength(8)
    expect(ai.totals.targetOpen).toBe(8)
    data = must(chooseTarget(data, 'leading', deps))
    expect(tree(data).pieces.filter((p) => p.inTarget)).toHaveLength(9)
    expect(pieceOf(data, 'ai-brief-assistant').state).toBe('claimed')
    expect(tree(must(chooseTarget(data, null, deps))).target).toBeNull()
  })
  it('suggests the road from where the target is still open', () => {
    const t = tree(must(chooseTarget(emptyUserData(NOW), 'ai', deps)))
    expect(t.next[0]).toMatchObject({ branchId: 'ai-practice', because: 'target', open: 6 })
  })
})

describe('a season', () => {
  const started = () => must(startSeason(must(chooseTarget(emptyUserData(NOW), 'ai', deps)), { branchId: 'ai-practice', capabilityIds: ['ai-brief-assistant'], reviewOn: '2026-12-23' }, deps))

  it('makes one branch active, with a date to look back on', () => {
    const t = tree(started())
    expect(t.season).toMatchObject({ branchId: 'ai-practice', title: 'Working with AI', weeks: 6, due: false, daysLeft: 42 })
    expect(t.branches.find((b) => b.active)?.id).toBe('ai-practice')
    expect(pieceOf(started(), 'ai-brief-assistant').inFocus).toBe(true)
    expect(pieceOf(started(), 'ai-check-before-trust').inFocus).toBe(false)
    expect(t.next.some((n) => n.branchId === 'ai-practice')).toBe(false)
  })
  it('is due a look after its date, and takes nothing away', () => {
    const data = started()
    const late = tree(data, '2027-02-01')
    expect(late.season?.due).toBe(true)
    expect(late.pieces.map((p) => p.state)).toEqual(tree(data).pieces.map((p) => p.state))
  })
  it('refuses a date in the past and a missing branch', () => {
    expect(startSeason(emptyUserData(NOW), { branchId: 'direction', capabilityIds: [], reviewOn: '2020-01-01' }, deps).ok).toBe(false)
    expect(startSeason(emptyUserData(NOW), { branchId: '', capabilityIds: [], reviewOn: '2026-12-23' }, deps).ok).toBe(false)
  })
  it('closes the one in progress when another starts, so there is only ever one', () => {
    const data = must(startSeason(started(), { branchId: 'direction', capabilityIds: [], reviewOn: '2026-12-30' }, deps))
    expect(data.profile.journey!.seasons.filter((s) => s.endedOn === undefined)).toHaveLength(1)
    expect(tree(data).season?.branchId).toBe('direction')
    expect(tree(data).pastSeasons).toHaveLength(1)
  })
  it('ends with the person’s own note, and keeps it', () => {
    const data = must(endSeason(started(), { closing: 'Briefs got shorter and better.' }, deps))
    expect(tree(data).season).toBeNull()
    expect(tree(data).pastSeasons[0]).toMatchObject({ closing: 'Briefs got shorter and better.', title: 'Working with AI' })
    expect(endSeason(data, {}, deps).ok).toBe(false)
  })
  it('puts queued branches first on the road', () => {
    const data = must(queueBranches(started(), ['relationships', 'relationships', ''], deps))
    expect(tree(data).next[0]).toMatchObject({ branchId: 'relationships', because: 'chosen' })
  })
})

describe('the trail of one skill', () => {
  it('is dated, oldest first, and starts with the placement', () => {
    const base = reviewedRealAttempt()
    const id = base.activities[0]!.capabilityIds[0]!
    const data = must(placeSkills(base, [{ capabilityId: id, level: 'with-help' }], deps))
    const trail = skillTrail(data, id)
    expect(trail.length).toBeGreaterThan(2)
    expect([...trail].sort((a, b) => a.at.localeCompare(b.at))).toEqual(trail)
    expect(trail.some((e) => e.what.startsWith('You placed yourself'))).toBe(true)
    expect(skillTrail(data, 'ai-know-when-to-stop')).toEqual([])
  })
})

describe('the journey travels with the records', () => {
  const options = () => ({ knownCapabilityIds: content.capabilityIds(), knownMethodIds: content.methodIds() })
  it('round-trips through export and import, demo included', () => {
    for (const data of [createDemoUserData(), must(startSeason(must(chooseTarget(emptyUserData(NOW), 'future', deps)), { branchId: 'learning', capabilityIds: [], reviewOn: '2026-12-23' }, deps))]) {
      const result = parseImport(exportUserData(data), options())
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.data.profile.journey).toEqual(data.profile.journey)
    }
  })
  it('reads records written before the journey existed, and refuses a malformed one', () => {
    const old = parseImport(exportUserData(reviewedRealAttempt()), options())
    expect(old.ok && old.data.profile.journey).toBeUndefined()
    const file = JSON.parse(exportUserData(createDemoUserData())) as { data?: UserData } & UserData
    ;((file.data ?? file).profile.journey as unknown as { claims: unknown[] }).claims = [{ capabilityId: 'x', level: 'expert', at: NOW }]
    expect(parseImport(JSON.stringify(file), options()).ok).toBe(false)
  })
})
