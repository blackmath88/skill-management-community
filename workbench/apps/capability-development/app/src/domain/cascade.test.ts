/**
 * Deletion is the test of whether a person actually controls their records. These tests check
 * that removing something removes what depended on it — and that it stops there.
 */
import { describe, expect, it } from 'vitest'
import { activity, at, attempt, evidence, hypothesis, review, situation } from '~/test-helpers/fixtures'
import { emptyUserData } from './empty'
import {
  deleteActivityCascade,
  deleteCampaignCascade,
  deleteDirectionCascade,
  deleteEvidenceCascade,
  deleteReviewCascade,
  deleteSituationCascade,
} from './cascade'
import type { UserData } from './types'

function full(): UserData {
  const data = emptyUserData(at(0))
  data.situations.push(situation())
  data.directions.push({
    id: 'dir-1',
    text: 'An aspiration.',
    state: 'active',
    createdAt: at(0),
    updatedAt: at(0),
    history: [{ at: at(0), text: 'An aspiration.', state: 'active' }],
  })
  data.campaigns.push({
    id: 'camp-1',
    directionId: 'dir-1',
    situationId: 'sit-1',
    definitionId: 'recurring-discussion-to-next-decision',
    definitionVersion: 1,
    purpose: 'Something bounded.',
    state: 'active',
    path: [{ stepId: 'real-attempt', enteredAt: at(1), activityIds: ['act-1'] }],
    currentStepId: 'real-attempt',
    createdAt: at(1),
    updatedAt: at(1),
  })
  data.activities.push(activity({ campaignId: 'camp-1', directionId: 'dir-1', stepId: 'real-attempt', state: 'reviewed' }))
  data.attempts.push(attempt())
  data.reviews.push(review())
  data.evidence.push(evidence())
  data.hypotheses.push(hypothesis({ campaignId: 'camp-1', evidenceIds: ['ev-1'] }))
  data.perks.push({
    id: 'perk-1',
    description: 'I notice when a group agrees in order to end a meeting.',
    evidenceActivityIds: ['act-1'],
    createdAt: at(10),
    updatedAt: at(10),
  })
  data.proposals.push({
    id: 'prop-1',
    kind: 'hypothesis',
    text: 'A possibility.',
    referencedIds: ['act-1'],
    baseRevision: 1,
    provenance: { providerId: 'local-stand-in', model: 'x', promptId: 'p', requestedAt: at(1) },
    state: 'offered',
    createdAt: at(1),
    updatedAt: at(1),
  })
  data.profile.appearance = { version: 1, mode: 'character', emblem: '◆', palette: 'slate', accessories: ['hat'] }
  return data
}

describe('deleting evidence', () => {
  it('unlinks it from every hypothesis that pointed at it', () => {
    // A hypothesis still listing a deleted evidence id would claim support that no longer exists.
    const pruned = deleteEvidenceCascade(full(), new Set(['ev-1']))
    expect(pruned.evidence).toHaveLength(0)
    expect(pruned.hypotheses[0]?.evidenceIds).toEqual([])
  })

  it('leaves the hypothesis itself alone', () => {
    // Deleting the evidence for an explanation is not the same as withdrawing the explanation.
    const pruned = deleteEvidenceCascade(full(), new Set(['ev-1']))
    expect(pruned.hypotheses).toHaveLength(1)
    expect(pruned.hypotheses[0]?.status).toBe('open')
  })

  it('does not touch the chosen appearance', () => {
    const data = full()
    const pruned = deleteEvidenceCascade(data, new Set(['ev-1']))
    expect(pruned.profile.appearance).toEqual(data.profile.appearance)
  })

  it('does nothing when the ids are not there', () => {
    const data = full()
    expect(deleteEvidenceCascade(data, new Set())).toBe(data)
  })
})

describe('deleting an activity', () => {
  it('removes its attempt, review and evidence', () => {
    const pruned = deleteActivityCascade(full(), 'act-1')
    expect(pruned.activities).toHaveLength(0)
    expect(pruned.attempts).toHaveLength(0)
    expect(pruned.reviews).toHaveLength(0)
    expect(pruned.evidence).toHaveLength(0)
  })

  it('unlinks it from a perk’s examples and from the campaign path', () => {
    const pruned = deleteActivityCascade(full(), 'act-1')
    expect(pruned.perks[0]?.evidenceActivityIds).toEqual([])
    expect(pruned.campaigns[0]?.path[0]?.activityIds).toEqual([])
  })

  it('invalidates an AI suggestion that referred to it', () => {
    // An offered suggestion about a record that no longer exists cannot be accepted meaningfully.
    const pruned = deleteActivityCascade(full(), 'act-1')
    expect(pruned.proposals[0]?.state).toBe('invalid')
  })

  it('leaves the situation and the campaign in place', () => {
    const pruned = deleteActivityCascade(full(), 'act-1')
    expect(pruned.situations).toHaveLength(1)
    expect(pruned.campaigns).toHaveLength(1)
  })
})

describe('deleting a review', () => {
  it('returns the activity to attempted, not to planned', () => {
    // The attempt still happened. Sending it back to planned would erase a real event.
    const pruned = deleteReviewCascade(full(), 'rev-1')
    expect(pruned.reviews).toHaveLength(0)
    expect(pruned.activities[0]?.state).toBe('attempted')
    expect(pruned.attempts).toHaveLength(1)
  })

  it('removes evidence that hung off the review only', () => {
    const data = full()
    data.evidence.push(evidence({ id: 'ev-rev', reviewId: 'rev-1' }))
    const stripped: UserData = {
      ...data,
      evidence: data.evidence.map((e) => (e.id === 'ev-rev' ? { ...e, reviewId: 'rev-1' } : e)),
    }
    const pruned = deleteReviewCascade(stripped, 'rev-1')
    expect(pruned.evidence.some((e) => e.id === 'ev-rev')).toBe(false)
  })
})

describe('deleting a campaign', () => {
  it('keeps the activities as free-standing practice by default', () => {
    // The practice happened. Removing the container should not remove what was done inside it.
    const pruned = deleteCampaignCascade(full(), 'camp-1', false)
    expect(pruned.campaigns).toHaveLength(0)
    expect(pruned.activities).toHaveLength(1)
    expect(pruned.activities[0]?.campaignId).toBeUndefined()
    expect(pruned.activities[0]?.stepId).toBeUndefined()
    expect(pruned.hypotheses[0]?.campaignId).toBeUndefined()
  })

  it('removes the activities too when that is asked for', () => {
    const pruned = deleteCampaignCascade(full(), 'camp-1', true)
    expect(pruned.activities).toHaveLength(0)
    expect(pruned.attempts).toHaveLength(0)
  })
})

describe('deleting a situation', () => {
  it('removes everything that hung off it', () => {
    const pruned = deleteSituationCascade(full(), 'sit-1')
    expect(pruned.situations).toHaveLength(0)
    expect(pruned.campaigns).toHaveLength(0)
    expect(pruned.hypotheses).toHaveLength(0)
    expect(pruned.activities).toHaveLength(0)
    expect(pruned.attempts).toHaveLength(0)
    expect(pruned.reviews).toHaveLength(0)
    expect(pruned.evidence).toHaveLength(0)
  })

  it('leaves the direction and the appearance', () => {
    const data = full()
    const pruned = deleteSituationCascade(data, 'sit-1')
    expect(pruned.directions).toHaveLength(1)
    expect(pruned.profile.appearance).toEqual(data.profile.appearance)
  })
})

describe('deleting a direction', () => {
  it('unlinks it without destroying the work done under it', () => {
    // Retiring an aspiration is normal; it must not take the practice with it.
    const pruned = deleteDirectionCascade(full(), 'dir-1')
    expect(pruned.directions).toHaveLength(0)
    expect(pruned.activities).toHaveLength(1)
    expect(pruned.activities[0]?.directionId).toBeUndefined()
    expect(pruned.campaigns[0]?.directionId).toBeUndefined()
  })
})

describe('cascades never mutate their input', () => {
  it('leaves the original record set untouched', () => {
    const data = full()
    const snapshot = JSON.stringify(data)
    deleteSituationCascade(data, 'sit-1')
    deleteActivityCascade(data, 'act-1')
    deleteEvidenceCascade(data, new Set(['ev-1']))
    deleteCampaignCascade(data, 'camp-1', true)
    deleteDirectionCascade(data, 'dir-1')
    deleteReviewCascade(data, 'rev-1')
    expect(JSON.stringify(data)).toBe(snapshot)
  })
})
