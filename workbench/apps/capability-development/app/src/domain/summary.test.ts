/**
 * The summary decides what the home screen asks of somebody. These tests are about what it
 * suggests and, more importantly, what it refuses to suggest.
 */
import { describe, expect, it } from 'vitest'
import { activity, at, attempt, review, situation } from '~/test-helpers/fixtures'
import { emptyUserData } from './empty'
import { deriveDevelopmentSummary, situationsWithoutCampaign } from './summary'
import type { UserData } from './types'

const lookup = (_campaignId: string, _definitionId: string, stepId: string) =>
  stepId === 'review' ? { title: 'Review what happened', kind: 'review' } : undefined

describe('an empty record set', () => {
  it('invites a situation rather than a profile', () => {
    // People enter through something real that is happening to them. Asking for a profile first
    // makes the first interaction about being categorised.
    const summary = deriveDevelopmentSummary(emptyUserData(at(0)))
    expect(summary.nextActions.map((a) => a.kind)).toContain('describe-situation')
    expect(summary.nextActions[0]?.reason).toMatch(/direction is optional/i)
  })

  it('offers a direction as optional and never as a gap that was found', () => {
    const summary = deriveDevelopmentSummary(emptyUserData(at(0)))
    const direction = summary.nextActions.find((a) => a.kind === 'choose-direction')
    expect(direction?.reason).toMatch(/not a gap we found/i)
  })
})

describe('what is waiting', () => {
  it('puts an unreviewed attempt first', () => {
    const data = emptyUserData(at(0))
    data.situations.push(situation())
    data.activities.push(activity({ state: 'attempted' }))
    data.attempts.push(attempt())
    const summary = deriveDevelopmentSummary(data)
    expect(summary.nextActions[0]?.kind).toBe('review-attempt')
    expect(summary.awaitingReview).toHaveLength(1)
  })

  it('tells somebody that "it did not happen" is an answer', () => {
    // The alternative is that an absent opportunity reads as a task they failed to do.
    const data = emptyUserData(at(0))
    data.situations.push(situation())
    data.activities.push(activity({ state: 'ready' }))
    const summary = deriveDevelopmentSummary(data)
    const action = summary.nextActions.find((a) => a.kind === 'record-attempt')
    expect(action?.reason).toMatch(/cue never arrived|did not happen/i)
  })

  it('names what a half-finished plan still needs', () => {
    const data = emptyUserData(at(0))
    data.situations.push(situation())
    data.activities.push(activity({ state: 'planned', plan: { ...activity().plan, fallback: '' } }))
    const summary = deriveDevelopmentSummary(data)
    const action = summary.nextActions.find((a) => a.kind === 'finish-plan')
    expect(action?.reason).toMatch(/what you will do instead/i)
  })

  it('orders what is waiting by review date, soonest first', () => {
    const data = emptyUserData(at(0))
    data.situations.push(situation())
    data.activities.push(
      activity({ id: 'later', state: 'ready', plan: { ...activity().plan, reviewOn: '2026-12-01' } }),
      activity({ id: 'sooner', state: 'ready', plan: { ...activity().plan, reviewOn: '2026-11-15' } }),
    )
    const summary = deriveDevelopmentSummary(data)
    expect(summary.awaitingAttempt.map((a) => a.id)).toEqual(['sooner', 'later'])
  })

  it('carries the route on a suggestion so conditions work is not read as training', () => {
    const data = emptyUserData(at(0))
    data.situations.push(situation())
    data.activities.push(activity({ state: 'ready', route: 'conditions' }))
    const summary = deriveDevelopmentSummary(data)
    expect(summary.nextActions.find((a) => a.kind === 'record-attempt')?.route).toBe('conditions')
  })
})

describe('campaigns', () => {
  const withCampaign = (currentStepId: string | null): UserData => {
    const data = emptyUserData(at(0))
    data.situations.push(situation())
    data.campaigns.push({
      id: 'camp-1',
      situationId: 'sit-1',
      definitionId: 'recurring-discussion-to-next-decision',
      definitionVersion: 1,
      purpose: 'Something bounded.',
      state: 'active',
      path: [],
      currentStepId,
      createdAt: at(1),
      updatedAt: at(1),
    })
    return data
  }

  it('names the step the campaign is on, and always offers pausing or stopping', () => {
    const summary = deriveDevelopmentSummary(withCampaign('review'), lookup)
    const action = summary.nextActions.find((a) => a.kind === 'continue-campaign')
    expect(summary.currentStepTitle).toBe('Review what happened')
    expect(action?.label).toContain('Review what happened')
    expect(action?.reason).toMatch(/pause or stop/i)
  })

  it('still offers pausing or stopping when the step is not in the installed content', () => {
    // Content can be uninstalled. Somebody must never be stuck in a campaign they cannot end.
    const summary = deriveDevelopmentSummary(withCampaign('a-step-that-was-removed'), lookup)
    const action = summary.nextActions.find((a) => a.kind === 'continue-campaign')
    expect(action?.reason).toMatch(/not installed/i)
    expect(action?.reason).toMatch(/pause or stop/i)
  })

  it('suggests starting one only when none is running', () => {
    const running = deriveDevelopmentSummary(withCampaign('review'), lookup)
    expect(running.nextActions.map((a) => a.kind)).not.toContain('start-campaign')
    const idle = emptyUserData(at(0))
    idle.situations.push(situation())
    const summary = deriveDevelopmentSummary(idle)
    const action = summary.nextActions.find((a) => a.kind === 'start-campaign')
    expect(action?.reason).toMatch(/not a course/i)
  })
})

describe('when nothing is pending', () => {
  it('says so, and says that not coming back is reasonable', () => {
    // This is the opposite of a streak. The product must not manufacture a reason to return.
    const data = emptyUserData(at(0))
    data.situations.push(situation())
    data.activities.push(activity({ state: 'reviewed' }))
    data.attempts.push(attempt())
    data.reviews.push(review())
    data.campaigns.push({
      id: 'camp-done',
      situationId: 'sit-1',
      definitionId: 'recurring-discussion-to-next-decision',
      definitionVersion: 1,
      purpose: 'Done.',
      state: 'completed',
      path: [],
      currentStepId: null,
      createdAt: at(1),
      updatedAt: at(1),
    })
    data.directions.push({
      id: 'dir',
      text: 'An aspiration.',
      state: 'active',
      createdAt: at(0),
      updatedAt: at(0),
      history: [{ at: at(0), text: 'An aspiration.', state: 'active' }],
    })
    const summary = deriveDevelopmentSummary(data)
    expect(summary.nextActions).toHaveLength(1)
    expect(summary.nextActions[0]?.kind).toBe('nothing-pending')
    expect(summary.nextActions[0]?.reason).toMatch(/reasonable choice/i)
  })
})

describe('counts', () => {
  it('does not count a rehearsal or an absent opportunity as a real attempt', () => {
    const data = emptyUserData(at(0))
    data.situations.push(situation())
    data.activities.push(
      activity({ id: 'reh', kind: 'rehearsal', state: 'reviewed' }),
      activity({ id: 'none', kind: 'real-attempt', state: 'reviewed' }),
      activity({ id: 'real', kind: 'real-attempt', state: 'reviewed' }),
    )
    data.attempts.push(
      attempt({ id: 'a1', activityId: 'reh' }),
      attempt({ id: 'a2', activityId: 'none', outcome: 'no-opportunity' }),
      attempt({ id: 'a3', activityId: 'real' }),
    )
    const summary = deriveDevelopmentSummary(data)
    expect(summary.counts.realAttempts).toBe(1)
    expect(summary.counts.rehearsals).toBe(1)
  })

  it('reports barriers as the user’s own observations, deduplicated', () => {
    const data = emptyUserData(at(0))
    data.situations.push(
      situation({ id: 's1', constraints: ['unclear-mandate', 'no-opportunity'] }),
      situation({ id: 's2', constraints: ['unclear-mandate'] }),
    )
    const summary = deriveDevelopmentSummary(data)
    expect(summary.constraintsNoticed.sort()).toEqual(['no-opportunity', 'unclear-mandate'])
  })
})

describe('situations without a campaign', () => {
  it('lists only those with no campaign running on them', () => {
    const data = emptyUserData(at(0))
    data.situations.push(situation({ id: 's1' }), situation({ id: 's2' }))
    data.campaigns.push({
      id: 'camp-1',
      situationId: 's1',
      definitionId: 'recurring-discussion-to-next-decision',
      definitionVersion: 1,
      purpose: 'Running.',
      state: 'active',
      path: [],
      currentStepId: 'orient',
      createdAt: at(1),
      updatedAt: at(1),
    })
    expect(situationsWithoutCampaign(data).map((s) => s.id)).toEqual(['s2'])
  })
})
