/**
 * Practice experience is the part of this product most likely to be read as a score. These tests
 * pin the rules that stop it from behaving like one.
 */
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { activity, at, attempt, evidence, review, situation } from '~/test-helpers/fixtures'
import { emptyUserData } from './empty'
import { appearanceSurvivesEvidenceDeletion, derivePracticeExperience, policyForVersion, POLICY_V1 } from './experience'
import { deleteEvidenceCascade } from './cascade'
import { ACTIVITY_KINDS, ATTEMPT_OUTCOMES, type ActivityKind, type AttemptOutcome, type UserData } from './types'

function oneActivity(options: {
  kind?: ActivityKind
  outcome?: AttemptOutcome
  reviewed?: boolean
  alternative?: string
  feedback?: boolean
  capabilityIds?: string[]
}): UserData {
  const data = emptyUserData(at(0))
  data.situations.push(situation())
  data.activities.push(
    activity({
      kind: options.kind ?? 'real-attempt',
      state: options.reviewed ? 'reviewed' : 'attempted',
      ...(options.capabilityIds ? { capabilityIds: options.capabilityIds } : {}),
    }),
  )
  data.attempts.push(attempt({ outcome: options.outcome ?? 'as-planned' }))
  if (options.reviewed) {
    data.reviews.push(review({ alternativeExplanation: options.alternative ?? 'A competing explanation.' }))
  }
  if (options.feedback) data.evidence.push(evidence())
  return data
}

describe('what earns credit', () => {
  it('gives a real attempt more than a rehearsal, and a rehearsal more than nothing', () => {
    // A rehearsal is preparation. If it were worth the same as doing the thing at work, the
    // number would stop distinguishing the two, which is the distinction the product exists for.
    const real = derivePracticeExperience(oneActivity({ kind: 'real-attempt' })).total
    const rehearsal = derivePracticeExperience(oneActivity({ kind: 'rehearsal' })).total
    expect(real).toBeGreaterThan(rehearsal)
    expect(rehearsal).toBeGreaterThan(0)
  })

  it('adds credit for a review that offers a competing explanation, and not for one that does not', () => {
    const withAlternative = derivePracticeExperience(oneActivity({ reviewed: true })).total
    const withoutAlternative = derivePracticeExperience(oneActivity({ reviewed: true, alternative: '   ' })).total
    const unreviewed = derivePracticeExperience(oneActivity({})).total
    expect(withAlternative).toBe(unreviewed + POLICY_V1.reviewBonus)
    expect(withoutAlternative).toBe(unreviewed)
  })

  it('adds credit when somebody else’s account is linked', () => {
    const alone = derivePracticeExperience(oneActivity({})).total
    const withFeedback = derivePracticeExperience(oneActivity({ feedback: true })).total
    expect(withFeedback).toBe(alone + POLICY_V1.feedbackBonus)
  })

  it('counts a changed, stopped or interrupted attempt the same as one that went to plan', () => {
    // Punishing an attempt for not working would make the honest record the expensive one.
    const asPlanned = derivePracticeExperience(oneActivity({ outcome: 'as-planned' })).total
    for (const outcome of ['changed', 'stopped', 'interrupted'] as const) {
      expect(derivePracticeExperience(oneActivity({ outcome })).total, outcome).toBe(asPlanned)
    }
  })

  it('gives nothing for an attempt whose cue never arrived, and 1 for reviewing why', () => {
    const unreviewed = derivePracticeExperience(oneActivity({ outcome: 'no-opportunity' }))
    expect(unreviewed.total).toBe(0)
    const reviewed = derivePracticeExperience(oneActivity({ outcome: 'no-opportunity', reviewed: true }))
    expect(reviewed.total).toBe(POLICY_V1.noOpportunityReviewCredit)
    expect(reviewed.entries[0]?.explanation).toMatch(/cue never arrived/i)
  })

  it('explains every entry in words, not just a number', () => {
    const result = derivePracticeExperience(oneActivity({ reviewed: true, feedback: true }))
    const entry = result.entries[0]
    expect(entry).toBeDefined()
    expect(entry?.explanation.length).toBeGreaterThan(40)
    expect(result.policyLabel).toMatch(/prototype/i)
  })
})

describe('what earns nothing', () => {
  it('gives nothing for a planned activity that was never attempted', () => {
    const data = emptyUserData(at(0))
    data.situations.push(situation())
    data.activities.push(activity({ state: 'ready' }))
    expect(derivePracticeExperience(data).total).toBe(0)
  })

  it('ignores an activity whose situation has been deleted', () => {
    // Practice nobody can place in a situation is not interpretable, so it is not counted.
    const data = oneActivity({ reviewed: true })
    data.situations = []
    expect(derivePracticeExperience(data).total).toBe(0)
  })

  it('does not pay for length', () => {
    const short = oneActivity({ reviewed: true })
    const long = oneActivity({ reviewed: true })
    const firstAttempt = long.attempts[0]
    const firstReview = long.reviews[0]
    expect(firstAttempt && firstReview).toBeTruthy()
    if (firstAttempt) firstAttempt.note = 'x'.repeat(5_000)
    if (firstReview) firstReview.observation = 'y'.repeat(5_000)
    expect(derivePracticeExperience(long).total).toBe(derivePracticeExperience(short).total)
  })

  it('does not pay for a second review of the same activity', () => {
    const data = oneActivity({ reviewed: true })
    const once = derivePracticeExperience(data).total
    data.reviews.push(review({ id: 'rev-2', reviewedAt: at(20), alternativeExplanation: 'Another one.' }))
    expect(derivePracticeExperience(data).total).toBe(once)
  })

  it('does not pay for a second attempt record on the same activity', () => {
    const data = oneActivity({ reviewed: true })
    const once = derivePracticeExperience(data).total
    data.attempts.push(attempt({ id: 'att-2', attemptedAt: at(30) }))
    expect(derivePracticeExperience(data).total).toBe(once)
  })

  it('does not pay for saying it went well', () => {
    const plain = oneActivity({ reviewed: true })
    const boastful = oneActivity({ reviewed: true })
    const firstReview = boastful.reviews[0]
    if (firstReview) {
      firstReview.interpretation = 'It went extremely well and I handled it perfectly.'
      firstReview.nextAdjustment = 'Nothing to change; this was a complete success.'
    }
    expect(derivePracticeExperience(boastful).total).toBe(derivePracticeExperience(plain).total)
  })
})

describe('credit is per activity, never per tag', () => {
  it('does not multiply the total when more capabilities are tagged', () => {
    // The cheapest way to game a per-tag total would be to tick every capability box. The total
    // has to be blind to that, and the per-capability view is display attribution only.
    const one = derivePracticeExperience(oneActivity({ reviewed: true, capabilityIds: ['clarify-ownership'] }))
    const many = derivePracticeExperience(
      oneActivity({
        reviewed: true,
        capabilityIds: ['clarify-ownership', 'invite-disagreement', 'frame-challenge', 'plan-experiment'],
      }),
    )
    expect(many.total).toBe(one.total)
    expect(Object.keys(many.byCapability)).toHaveLength(4)
    for (const credit of Object.values(many.byCapability)) expect(credit).toBe(one.total)
  })

  it('counts a duplicated capability tag once', () => {
    const data = oneActivity({ reviewed: true, capabilityIds: ['clarify-ownership', 'clarify-ownership'] })
    const result = derivePracticeExperience(data)
    expect(result.entries[0]?.capabilityIds).toEqual(['clarify-ownership'])
  })
})

describe('the total is always derived, never stored', () => {
  it('drops to nothing when the activity is removed', () => {
    const data = oneActivity({ reviewed: true, feedback: true })
    expect(derivePracticeExperience(data).total).toBeGreaterThan(0)
    data.activities = []
    expect(derivePracticeExperience(data).total).toBe(0)
  })

  it('loses the feedback credit when the linked evidence is deleted', () => {
    const data = oneActivity({ reviewed: true, feedback: true })
    const withFeedback = derivePracticeExperience(data).total
    const pruned = deleteEvidenceCascade(data, new Set(['ev-1']))
    expect(derivePracticeExperience(pruned).total).toBe(withFeedback - POLICY_V1.feedbackBonus)
  })
})

describe('the policy is versioned', () => {
  it('can still explain the version a record was counted under', () => {
    // Recalculating somebody's history under new weights without saying so would rewrite their
    // past. The old policy stays readable so a number can always be explained.
    expect(policyForVersion(1)).toBe(POLICY_V1)
    expect(policyForVersion(99)).toBeUndefined()
    expect(derivePracticeExperience(oneActivity({})).policyVersion).toBe(POLICY_V1.version)
  })
})

describe('appearance retention is a decision, not an accident', () => {
  it('keeps a chosen appearance when evidence is deleted', () => {
    expect(appearanceSurvivesEvidenceDeletion()).toBe(true)
    const data = oneActivity({ reviewed: true, feedback: true })
    data.profile.appearance = { version: 1, mode: 'character', emblem: '◆', palette: 'slate', accessories: [] }
    const pruned = deleteEvidenceCascade(data, new Set(['ev-1']))
    expect(pruned.profile.appearance).toEqual(data.profile.appearance)
  })
})

describe('properties that must hold for any record set', () => {
  const kindArb = fc.constantFrom<ActivityKind>(...ACTIVITY_KINDS)
  const outcomeArb = fc.constantFrom<AttemptOutcome>(...ATTEMPT_OUTCOMES)
  const capabilityArb = fc.uniqueArray(
    fc.constantFrom('clarify-ownership', 'invite-disagreement', 'frame-challenge', 'plan-experiment', 'reflect-revise'),
    { minLength: 0, maxLength: 5 },
  )

  const recordSetArb = fc
    .array(
      fc.record({
        kind: kindArb,
        outcome: outcomeArb,
        reviewed: fc.boolean(),
        alternative: fc.boolean(),
        feedback: fc.boolean(),
        capabilityIds: capabilityArb,
        context: fc.constantFrom('group a', 'group b', ''),
      }),
      { minLength: 0, maxLength: 8 },
    )
    .map((specs) => {
      const data = emptyUserData(at(0))
      data.situations.push(situation())
      specs.forEach((spec, index) => {
        const id = `a-${index}`
        data.situations.push(
          situation({ id: `s-${index}`, context: spec.context, createdAt: at(index), updatedAt: at(index) }),
        )
        data.activities.push(
          activity({
            id,
            situationId: `s-${index}`,
            kind: spec.kind,
            capabilityIds: spec.capabilityIds,
            state: spec.reviewed ? 'reviewed' : 'attempted',
          }),
        )
        data.attempts.push(attempt({ id: `at-${index}`, activityId: id, outcome: spec.outcome, attemptedAt: at(index) }))
        if (spec.reviewed) {
          data.reviews.push(
            review({
              id: `r-${index}`,
              activityId: id,
              reviewedAt: at(index),
              alternativeExplanation: spec.alternative ? 'A competing explanation.' : '',
            }),
          )
        }
        if (spec.feedback) {
          data.evidence.push(evidence({ id: `e-${index}`, activityId: id, capabilityIds: spec.capabilityIds }))
        }
      })
      return data
    })

  it('never produces a negative total, and the total is the sum of its entries', () => {
    fc.assert(
      fc.property(recordSetArb, (data) => {
        const result = derivePracticeExperience(data)
        expect(result.total).toBeGreaterThanOrEqual(0)
        expect(result.total).toBe(result.entries.reduce((sum, entry) => sum + entry.credit, 0))
      }),
      { numRuns: 200 },
    )
  })

  it('produces exactly one entry per attempted activity, whatever order the records are in', () => {
    fc.assert(
      fc.property(recordSetArb, (data) => {
        const result = derivePracticeExperience(data)
        const ids = result.entries.map((entry) => entry.activityId)
        expect(new Set(ids).size).toBe(ids.length)
      }),
      { numRuns: 200 },
    )
  })

  it('gives the same total however the record arrays are ordered', () => {
    // Order independence matters because storage, import and the UI all build these arrays
    // differently; a total that depended on insertion order would drift between them.
    fc.assert(
      fc.property(recordSetArb, (data) => {
        const reversed: UserData = {
          ...data,
          activities: [...data.activities].reverse(),
          attempts: [...data.attempts].reverse(),
          reviews: [...data.reviews].reverse(),
          evidence: [...data.evidence].reverse(),
          situations: [...data.situations].reverse(),
        }
        expect(derivePracticeExperience(reversed).total).toBe(derivePracticeExperience(data).total)
      }),
      { numRuns: 200 },
    )
  })

  it('never credits more for a rehearsal than for the same record set as a real attempt', () => {
    fc.assert(
      fc.property(recordSetArb, (data) => {
        const asRehearsals: UserData = {
          ...data,
          activities: data.activities.map((a) => ({ ...a, kind: 'rehearsal' as const })),
        }
        const asReal: UserData = {
          ...data,
          activities: data.activities.map((a) => ({ ...a, kind: 'real-attempt' as const })),
        }
        expect(derivePracticeExperience(asRehearsals).total).toBeLessThanOrEqual(
          derivePracticeExperience(asReal).total,
        )
      }),
      { numRuns: 200 },
    )
  })

  it('never increases the total when a capability tag is added to every activity', () => {
    fc.assert(
      fc.property(recordSetArb, (data) => {
        const before = derivePracticeExperience(data).total
        const tagged: UserData = {
          ...data,
          activities: data.activities.map((a) => ({
            ...a,
            capabilityIds: [...new Set([...a.capabilityIds, 'reflect-revise', 'explore-perspective'])],
          })),
        }
        expect(derivePracticeExperience(tagged).total).toBe(before)
      }),
      { numRuns: 200 },
    )
  })

  it('never increases the total when a record is deleted', () => {
    fc.assert(
      fc.property(recordSetArb, (data) => {
        const before = derivePracticeExperience(data).total
        const fewer: UserData = { ...data, activities: data.activities.slice(1) }
        expect(derivePracticeExperience(fewer).total).toBeLessThanOrEqual(before)
      }),
      { numRuns: 200 },
    )
  })
})
