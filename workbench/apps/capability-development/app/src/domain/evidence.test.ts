/**
 * The evidence ladder is the thing a user is most likely to read as "how good am I". These tests
 * pin what each stage actually requires and what makes it go back down.
 */
import { describe, expect, it } from 'vitest'
import { activity, at, attempt, evidence, review, situation } from '~/test-helpers/fixtures'
import { emptyUserData } from './empty'
import { deleteActivityCascade, deleteEvidenceCascade, deleteSituationCascade } from './cascade'
import {
  BROADENING_MIN_ATTEMPTS,
  BROADENING_MIN_CONTEXTS,
  deriveCapabilityEvidence,
  legacyMilestoneFor,
  normaliseContext,
  type EvidenceStage,
} from './evidence'
import type { ActivityKind, UserData } from './types'

const CAP = [{ id: 'clarify-ownership' }]

/** n activities of one kind, each attempted and (optionally) reviewed, in the given contexts. */
function build(options: {
  kind: ActivityKind
  count: number
  reviewed: boolean
  contexts?: string[]
  outcome?: 'as-planned' | 'no-opportunity'
}): UserData {
  const data = emptyUserData(at(0))
  for (let i = 0; i < options.count; i += 1) {
    const context = options.contexts?.[i % (options.contexts.length || 1)] ?? 'group a'
    data.situations.push(situation({ id: `s-${i}`, context, createdAt: at(i), updatedAt: at(i) }))
    data.activities.push(
      activity({
        id: `a-${i}`,
        situationId: `s-${i}`,
        kind: options.kind,
        state: options.reviewed ? 'reviewed' : 'attempted',
      }),
    )
    data.attempts.push(
      attempt({ id: `at-${i}`, activityId: `a-${i}`, outcome: options.outcome ?? 'as-planned', attemptedAt: at(i) }),
    )
    if (options.reviewed) data.reviews.push(review({ id: `r-${i}`, activityId: `a-${i}`, reviewedAt: at(i + 1) }))
  }
  return data
}

const stageOf = (data: UserData): EvidenceStage => {
  const row = deriveCapabilityEvidence(data, CAP)[0]
  expect(row).toBeDefined()
  return row?.stage ?? 'none'
}

describe('the ladder', () => {
  it('is "no records yet" for an empty record set', () => {
    expect(stageOf(emptyUserData(at(0)))).toBe('none')
  })

  it('records an observation as explored', () => {
    expect(stageOf(build({ kind: 'observation', count: 1, reviewed: false }))).toBe('explored')
  })

  it('records a reviewed rehearsal as rehearsed, and an unreviewed one as nothing', () => {
    // A rehearsal only tells you something once you have looked at how it went.
    expect(stageOf(build({ kind: 'rehearsal', count: 1, reviewed: true }))).toBe('rehearsed')
    expect(stageOf(build({ kind: 'rehearsal', count: 1, reviewed: false }))).toBe('none')
  })

  it('never lets a rehearsal reach a stage that means real application', () => {
    // However many rehearsals somebody does, and in however many settings, the records must not
    // say they tried it at work. This is the product's central distinction.
    const many = build({ kind: 'rehearsal', count: 10, reviewed: true, contexts: ['a', 'b', 'c', 'd'] })
    const row = deriveCapabilityEvidence(many, CAP)[0]
    expect(row?.stage).toBe('rehearsed')
    expect(row?.counts.realAttempts).toBe(0)
  })

  it('needs a review before a real attempt counts as tried', () => {
    expect(stageOf(build({ kind: 'real-attempt', count: 1, reviewed: false }))).toBe('none')
    expect(stageOf(build({ kind: 'real-attempt', count: 1, reviewed: true }))).toBe('tried')
  })

  it('records two reviewed real attempts as repeated', () => {
    expect(stageOf(build({ kind: 'real-attempt', count: 2, reviewed: true, contexts: ['group a'] }))).toBe('repeated')
  })

  it('needs both enough attempts and enough settings before it says more than one setting', () => {
    const enoughAttemptsOneSetting = build({
      kind: 'real-attempt',
      count: BROADENING_MIN_ATTEMPTS,
      reviewed: true,
      contexts: ['group a'],
    })
    expect(stageOf(enoughAttemptsOneSetting)).toBe('repeated')

    const twoSettingsTooFew = build({
      kind: 'real-attempt',
      count: BROADENING_MIN_CONTEXTS,
      reviewed: true,
      contexts: ['group a', 'group b'],
    })
    expect(stageOf(twoSettingsTooFew)).toBe('repeated')

    const both = build({
      kind: 'real-attempt',
      count: BROADENING_MIN_ATTEMPTS,
      reviewed: true,
      contexts: ['group a', 'group b'],
    })
    expect(stageOf(both)).toBe('transferred')
  })

  it('does not count an attempt whose cue never arrived as application', () => {
    // Recognising that the opportunity was absent is useful, and it is not doing the thing.
    const data = build({ kind: 'real-attempt', count: 3, reviewed: true, contexts: ['a', 'b'], outcome: 'no-opportunity' })
    const row = deriveCapabilityEvidence(data, CAP)[0]
    expect(row?.stage).toBe('none')
    expect(row?.counts.realAttempts).toBe(0)
    expect(row?.refs.some((ref) => ref.kind === 'no opportunity')).toBe(true)
  })

  it('treats the same setting written differently as one setting', () => {
    const data = build({ kind: 'real-attempt', count: 3, reviewed: true, contexts: ['Group A', ' group   a '] })
    expect(stageOf(data)).toBe('repeated')
    expect(normaliseContext(' Group   A ')).toBe('group a')
  })
})

describe('feedback and conflicting accounts', () => {
  it('reports feedback from somebody else separately from the stage', () => {
    // Having feedback is a fact about the records, not a rung on a ladder; a person can be at any
    // stage with or without it.
    const data = build({ kind: 'real-attempt', count: 1, reviewed: true })
    expect(deriveCapabilityEvidence(data, CAP)[0]?.feedbackAvailable).toBe(false)
    data.evidence.push(evidence({ activityId: 'a-0' }))
    const row = deriveCapabilityEvidence(data, CAP)[0]
    expect(row?.feedbackAvailable).toBe(true)
    expect(row?.stage).toBe('tried')
  })

  it('keeps an account that contradicts the user rather than resolving it', () => {
    const data = build({ kind: 'real-attempt', count: 1, reviewed: true })
    data.evidence.push(
      evidence({ id: 'ev-other', activityId: 'a-0', kind: 'other-account', text: 'They saw it differently.' }),
    )
    const row = deriveCapabilityEvidence(data, CAP)[0]
    expect(row?.counts.conflictingAccounts).toBe(1)
    expect(row?.explanation).toMatch(/differently/i)
    // The contradicting account does not lower the stage: the attempt still happened.
    expect(row?.stage).toBe('tried')
  })

  it('counts a written exploration that is not attached to any activity', () => {
    const data = emptyUserData(at(0))
    data.situations.push(situation())
    data.evidence.push(
      evidence({ id: 'ev-written', kind: 'self-observation', text: 'How this lens applies here.', situationId: 'sit-1' }),
    )
    const stripped = { ...data, evidence: data.evidence.map(({ activityId: _drop, ...rest }) => rest) }
    expect(stageOf(stripped)).toBe('explored')
  })
})

describe('deletion recomputes the claim', () => {
  it('cannot leave a stage standing after its activity is deleted', () => {
    // The rule the architecture asks for: an evidence-linked view may never keep a claim its
    // evidence no longer supports.
    const data = build({ kind: 'real-attempt', count: 3, reviewed: true, contexts: ['a', 'b'] })
    expect(stageOf(data)).toBe('transferred')
    let pruned = deleteActivityCascade(data, 'a-0')
    expect(stageOf(pruned)).toBe('repeated')
    pruned = deleteActivityCascade(pruned, 'a-1')
    expect(stageOf(pruned)).toBe('tried')
    pruned = deleteActivityCascade(pruned, 'a-2')
    expect(stageOf(pruned)).toBe('none')
  })

  it('drops the feedback fact when the evidence item goes', () => {
    const data = build({ kind: 'real-attempt', count: 1, reviewed: true })
    data.evidence.push(evidence({ activityId: 'a-0' }))
    expect(deriveCapabilityEvidence(data, CAP)[0]?.feedbackAvailable).toBe(true)
    const pruned = deleteEvidenceCascade(data, new Set(['ev-1']))
    expect(deriveCapabilityEvidence(pruned, CAP)[0]?.feedbackAvailable).toBe(false)
  })

  it('ignores an evidence item left pointing at a record that no longer exists', () => {
    // Dangling evidence must not keep supporting a claim; that is how a deletion would quietly
    // fail to remove what it said.
    const data = build({ kind: 'real-attempt', count: 1, reviewed: true })
    data.evidence.push(evidence({ activityId: 'a-0' }))
    const orphaned: UserData = { ...data, activities: [] }
    expect(deriveCapabilityEvidence(orphaned, CAP)[0]?.feedbackAvailable).toBe(false)
  })

  it('removes everything when the whole situation goes', () => {
    const data = build({ kind: 'real-attempt', count: 1, reviewed: true })
    data.evidence.push(evidence({ activityId: 'a-0' }))
    const pruned = deleteSituationCascade(data, 's-0')
    const row = deriveCapabilityEvidence(pruned, CAP)[0]
    expect(row?.stage).toBe('none')
    expect(pruned.attempts).toHaveLength(0)
    expect(pruned.reviews).toHaveLength(0)
    expect(pruned.evidence).toHaveLength(0)
  })
})

describe('the predecessor’s vocabulary is retained', () => {
  it('maps every stage onto the milestone it used to be called', () => {
    // Leader Me's "Broadening" meant three reflected quests across two contexts. That is exactly
    // this app's "transferred", so an imported record keeps the meaning it had.
    expect(legacyMilestoneFor('none')).toBe('unexplored')
    expect(legacyMilestoneFor('explored')).toBe('exploring')
    expect(legacyMilestoneFor('rehearsed')).toBe('practising')
    expect(legacyMilestoneFor('tried')).toBe('practising')
    expect(legacyMilestoneFor('repeated')).toBe('practising')
    expect(legacyMilestoneFor('transferred')).toBe('broadening')
  })

  it('reports the milestone alongside the stage so an old record is still readable', () => {
    const data = build({ kind: 'real-attempt', count: BROADENING_MIN_ATTEMPTS, reviewed: true, contexts: ['a', 'b'] })
    expect(deriveCapabilityEvidence(data, CAP)[0]?.legacyMilestone).toBe('broadening')
  })
})

describe('the explanation', () => {
  it('says what would be recorded next, without telling the person to do it', () => {
    const explored = deriveCapabilityEvidence(build({ kind: 'observation', count: 1, reviewed: false }), CAP)[0]
    expect(explored?.explanation).toMatch(/would be recorded next/i)
    const top = deriveCapabilityEvidence(
      build({ kind: 'real-attempt', count: 3, reviewed: true, contexts: ['a', 'b'] }),
      CAP,
    )[0]
    expect(top?.explanation).toMatch(/not mastery|not an assessment/i)
  })
})
