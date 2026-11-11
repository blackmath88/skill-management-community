/**
 * Validation is what stops an untrusted file from putting records into somebody's journal that
 * nothing could explain. These tests cover the structural, relationship and privacy rules.
 */
import { describe, expect, it } from 'vitest'
import { at, reviewedRealAttempt, situation } from '~/test-helpers/fixtures'
import { createContentRegistry } from '~/content/index'
import { emptyUserData } from './empty'
import { SCHEMA_VERSION } from './types'
import { MAX_ATTRIBUTION_LENGTH, validateUserData } from './validation'

const content = createContentRegistry()
const knownIds = {
  knownCapabilityIds: content.capabilityIds(),
  knownMethodIds: content.methodIds(),
}

function errorsFor(input: unknown, options = {}): string[] {
  const result = validateUserData(input, options)
  return result.ok ? [] : result.errors
}

describe('accepting valid records', () => {
  it('accepts an empty record set and a populated one', () => {
    expect(validateUserData(emptyUserData(at(0))).ok).toBe(true)
    const result = validateUserData(reviewedRealAttempt(), knownIds)
    expect(result.ok, result.ok ? '' : result.errors.join('; ')).toBe(true)
  })

  it('returns records normalised to the current schema version', () => {
    const result = validateUserData(reviewedRealAttempt())
    expect(result.ok && result.data.schemaVersion).toBe(SCHEMA_VERSION)
  })
})

describe('refusing what cannot be read safely', () => {
  it('refuses something that is not an object', () => {
    for (const input of [null, 42, 'text', [], undefined]) {
      expect(validateUserData(input).ok, JSON.stringify(input)).toBe(false)
    }
  })

  it('refuses an unknown schema version without trying to read the rest', () => {
    // A newer file must be refused rather than read with fields silently missing.
    const errors = errorsFor({ ...emptyUserData(at(0)), schemaVersion: 99 })
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/schemaVersion/)
  })

  it('names the path of a bad field so a person can find it', () => {
    const data = emptyUserData(at(0))
    const broken = { ...data, situations: [{ ...situation(), authority: 'whatever' }] }
    expect(errorsFor(broken)[0]).toMatch(/^situations\[0\]\.authority:/)
  })

  it('drops unknown extra fields rather than storing them', () => {
    const data = emptyUserData(at(0))
    const result = validateUserData({ ...data, somethingElse: 'kept?', profile: { ...data.profile, extra: 1 } })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect('somethingElse' in result.data).toBe(false)
      expect('extra' in result.data.profile).toBe(false)
    }
  })

  it('refuses duplicate ids in a collection', () => {
    const data = emptyUserData(at(0))
    data.situations.push(situation({ id: 'same' }), situation({ id: 'same' }))
    expect(errorsFor(data).join(' ')).toMatch(/duplicate id "same"/)
  })

  it('refuses a collection that is absurdly large', () => {
    const data = emptyUserData(at(0))
    const huge = { ...data, situations: Array.from({ length: 5_001 }, (_unused, i) => situation({ id: `s-${i}` })) }
    expect(errorsFor(huge).join(' ')).toMatch(/more than 5000 entries/)
  })
})

describe('relationships', () => {
  it('refuses an activity pointing at a situation that is not there', () => {
    const data = reviewedRealAttempt()
    data.situations = []
    expect(errorsFor(data).join(' ')).toMatch(/refers to missing situation/)
  })

  it('refuses a review of an activity that was never attempted', () => {
    // A review of something that did not happen could not be interpreted, and would feed the
    // evidence ladder a rung nothing supports.
    const data = reviewedRealAttempt()
    data.attempts = []
    const firstActivity = data.activities[0]
    if (firstActivity) firstActivity.state = 'ready'
    expect(errorsFor(data).join(' ')).toMatch(/has not been attempted/)
  })

  it('refuses a second attempt record for one activity', () => {
    const data = reviewedRealAttempt()
    const first = data.attempts[0]
    if (first) data.attempts.push({ ...first, id: 'att-2', attemptedAt: at(20) })
    expect(errorsFor(data).join(' ')).toMatch(/attempt records \(one per activity\)/)
  })

  it('refuses a second review for one activity', () => {
    const data = reviewedRealAttempt()
    const first = data.reviews[0]
    if (first) data.reviews.push({ ...first, id: 'rev-2', reviewedAt: at(20) })
    expect(errorsFor(data).join(' ')).toMatch(/reviews \(one per activity\)/)
  })

  it('refuses an attempt on an activity that is still being planned', () => {
    const data = reviewedRealAttempt()
    const firstActivity = data.activities[0]
    if (firstActivity) firstActivity.state = 'ready'
    data.reviews = []
    expect(errorsFor(data).join(' ')).toMatch(/which is still ready/)
  })

  it('refuses a capability id no installed pack defines, when the known ids are supplied', () => {
    const data = reviewedRealAttempt()
    const firstActivity = data.activities[0]
    if (firstActivity) firstActivity.capabilityIds = ['not-a-capability']
    expect(errorsFor(data, knownIds).join(' ')).toMatch(/unknown capability "not-a-capability"/)
    // Without the option the same file passes: content may legitimately not be installed.
    expect(validateUserData(data).ok).toBe(true)
  })

  it('refuses an evidence item anchored to nothing', () => {
    const data = reviewedRealAttempt()
    data.evidence = [
      {
        id: 'floating',
        kind: 'self-observation',
        text: 'Something.',
        source: 'user',
        visibility: 'private',
        capabilityIds: [],
        recordedAt: at(1),
        updatedAt: at(1),
      },
    ]
    expect(errorsFor(data).join(' ')).toMatch(/must be anchored/)
  })

  it('refuses a closed campaign that still claims a current step', () => {
    const data = reviewedRealAttempt()
    data.campaigns.push({
      id: 'camp-1',
      situationId: 'sit-1',
      definitionId: 'recurring-discussion-to-next-decision',
      definitionVersion: 1,
      purpose: 'Something bounded.',
      state: 'completed',
      path: [{ stepId: 'orient', enteredAt: at(1), activityIds: [] }],
      currentStepId: 'orient',
      createdAt: at(1),
      updatedAt: at(1),
    })
    expect(errorsFor(data).join(' ')).toMatch(/must be null once a campaign is completed/)
  })

  it('accepts a campaign whose definition is no longer installed', () => {
    // Content can be removed. A person's history must stay readable regardless, which is why the
    // campaign pins its definition id and version rather than depending on the pack being present.
    const data = reviewedRealAttempt()
    data.campaigns.push({
      id: 'camp-old',
      situationId: 'sit-1',
      definitionId: 'a-campaign-that-was-removed',
      definitionVersion: 3,
      purpose: 'From an older content pack.',
      state: 'paused',
      path: [{ stepId: 'some-step', enteredAt: at(1), activityIds: [] }],
      currentStepId: 'some-step',
      createdAt: at(1),
      updatedAt: at(1),
    })
    const result = validateUserData(data, { ...knownIds, knownCampaignIds: content.campaigns().map((c) => c.id) })
    expect(result.ok, result.ok ? '' : result.errors.join('; ')).toBe(true)
  })

  it('refuses an offered AI suggestion that refers to a record which does not exist', () => {
    // A provider inventing a record id is the clearest signal its output should not be trusted.
    const data = reviewedRealAttempt()
    data.proposals.push({
      id: 'prop-1',
      kind: 'hypothesis',
      text: 'Building on your review of the budget meeting…',
      referencedIds: ['a-record-that-never-existed'],
      baseRevision: 1,
      provenance: { providerId: 'local-stand-in', model: 'x', promptId: 'p', requestedAt: at(1) },
      state: 'offered',
      createdAt: at(1),
      updatedAt: at(1),
    })
    expect(errorsFor(data).join(' ')).toMatch(/refers to records that do not exist/)
  })

  it('accepts a refused suggestion that refers to an invented record', () => {
    // The refusal is kept on purpose, so the boundary stays visible after the fact.
    const data = reviewedRealAttempt()
    data.proposals.push({
      id: 'prop-2',
      kind: 'hypothesis',
      text: 'Invented reference.',
      referencedIds: ['nope'],
      baseRevision: 1,
      provenance: { providerId: 'local-stand-in', model: 'x', promptId: 'p', requestedAt: at(1) },
      state: 'invalid',
      createdAt: at(1),
      updatedAt: at(1),
    })
    expect(validateUserData(data).ok).toBe(true)
  })
})

describe('data minimisation about other people', () => {
  it('refuses an attribution that looks like an email address', () => {
    const data = reviewedRealAttempt()
    const first = data.evidence[0]
    if (first) first.attribution = 'j.smith@example.org'
    expect(errorsFor(data).join(' ')).toMatch(/must describe a role, not a contact detail/)
  })

  it('refuses an attribution that looks like a phone number', () => {
    const data = reviewedRealAttempt()
    const first = data.evidence[0]
    if (first) first.attribution = '+41 44 123 45 67'
    expect(errorsFor(data).join(' ')).toMatch(/must describe a role, not a contact detail/)
  })

  it('accepts a role', () => {
    const data = reviewedRealAttempt()
    const first = data.evidence[0]
    if (first) first.attribution = 'the service desk coordinator'
    expect(validateUserData(data, knownIds).ok).toBe(true)
  })

  it('caps how long an attribution may be, so it stays a role rather than a dossier', () => {
    const data = reviewedRealAttempt()
    const first = data.evidence[0]
    if (first) first.attribution = 'x'.repeat(MAX_ATTRIBUTION_LENGTH + 1)
    expect(errorsFor(data).join(' ')).toMatch(new RegExp(`longer than ${MAX_ATTRIBUTION_LENGTH}`))
  })
})

describe('timestamps and dates', () => {
  it('refuses a timestamp that is not ISO-8601 UTC', () => {
    const data = reviewedRealAttempt()
    const first = data.situations[0]
    if (first) first.createdAt = '11 November 2026'
    expect(errorsFor(data).join(' ')).toMatch(/ISO-8601 UTC timestamp/)
  })

  it('allows an empty review date while a plan is still a draft', () => {
    const data = reviewedRealAttempt()
    const first = data.activities[0]
    if (first) first.plan.reviewOn = ''
    expect(validateUserData(data, knownIds).ok).toBe(true)
  })

  it('refuses a review date that is not a calendar date', () => {
    const data = reviewedRealAttempt()
    const first = data.activities[0]
    if (first) first.plan.reviewOn = '2026-13-45'
    expect(errorsFor(data).join(' ')).toMatch(/must be a date \(YYYY-MM-DD\)/)
  })
})

describe('appearance', () => {
  it('refuses an appearance written by a version this build does not know', () => {
    // Guessing at an unknown appearance format would show somebody a figure they never chose.
    const data = emptyUserData(at(0))
    const broken = { ...data, profile: { ...data.profile, appearance: { version: 2, mode: 'character', emblem: 'x', palette: 'y', accessories: [] } } }
    expect(errorsFor(broken).join(' ')).toMatch(/appearance version 1/)
  })

  it('accepts a valid appearance', () => {
    const data = emptyUserData(at(0))
    data.profile.appearance = { version: 1, mode: 'journey', emblem: '◆', palette: 'slate', accessories: [] }
    expect(validateUserData(data).ok).toBe(true)
  })
})
