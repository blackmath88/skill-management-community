import { describe, expect, it } from 'vitest'
import {
  ACTIVITY_STATES,
  CAMPAIGN_STATES,
  type ActivityState,
  type CampaignState,
  type HypothesisStatus,
} from './types'
import {
  activityTransitionsFrom,
  canTransitionActivity,
  canTransitionCampaign,
  canTransitionDirection,
  canTransitionHypothesis,
} from './transitions'

describe('activity transitions', () => {
  it('never lets an attempted activity go back to planned or ready', () => {
    // An attempt is history. Allowing it to be un-attempted would let somebody remove a record of
    // something they actually did, and every projection would then disagree with the attempt record.
    expect(canTransitionActivity('attempted', 'planned')).toBe(false)
    expect(canTransitionActivity('attempted', 'ready')).toBe(false)
  })

  it('treats reviewed and abandoned as end states', () => {
    for (const to of ACTIVITY_STATES) {
      expect(canTransitionActivity('reviewed', to)).toBe(false)
      expect(canTransitionActivity('abandoned', to)).toBe(false)
    }
  })

  it('always offers a way to pause or abandon from a live state', () => {
    // Stopping has to be available at every point; a product that only allows forward motion
    // turns a development tool into an obligation.
    const live: ActivityState[] = ['planned', 'ready']
    for (const from of live) {
      expect(canTransitionActivity(from, 'paused'), from).toBe(true)
      expect(canTransitionActivity(from, 'abandoned'), from).toBe(true)
    }
    expect(canTransitionActivity('attempted', 'abandoned')).toBe(true)
  })

  it('lets a paused activity resume to where it was', () => {
    expect(canTransitionActivity('paused', 'planned')).toBe(true)
    expect(canTransitionActivity('paused', 'ready')).toBe(true)
    expect(canTransitionActivity('paused', 'attempted')).toBe(true)
  })

  it('reports no transition as legal to itself', () => {
    for (const state of ACTIVITY_STATES) {
      expect(activityTransitionsFrom(state)).not.toContain(state)
    }
  })
})

describe('campaign transitions', () => {
  it('treats completed and abandoned as end states', () => {
    for (const to of CAMPAIGN_STATES) {
      expect(canTransitionCampaign('completed', to)).toBe(false)
      expect(canTransitionCampaign('abandoned', to)).toBe(false)
    }
  })

  it('lets an active campaign be paused, closed or stopped', () => {
    const allowed: CampaignState[] = ['paused', 'completed', 'abandoned']
    for (const to of allowed) expect(canTransitionCampaign('active', to), to).toBe(true)
  })

  it('does not let a paused campaign jump straight to completed', () => {
    // Closing a campaign is a step the user takes while it is running; a paused campaign is
    // resumed first, so the closing choice is one they actually saw.
    expect(canTransitionCampaign('paused', 'completed')).toBe(false)
    expect(canTransitionCampaign('paused', 'active')).toBe(true)
    expect(canTransitionCampaign('paused', 'abandoned')).toBe(true)
  })
})

describe('direction transitions', () => {
  it('lets a retired direction be taken up again', () => {
    // An aspiration a person set aside is theirs to pick up; retiring it is not a deletion.
    expect(canTransitionDirection('retired', 'active')).toBe(true)
  })

  it('does not allow a no-op transition', () => {
    expect(canTransitionDirection('active', 'active')).toBe(false)
  })
})

describe('hypothesis transitions', () => {
  it('lets evidence change a conclusion in both directions', () => {
    // Being wrong about an explanation twice is ordinary. A one-way ladder would push people
    // towards defending a conclusion rather than testing it.
    expect(canTransitionHypothesis('supported', 'contradicted')).toBe(true)
    expect(canTransitionHypothesis('contradicted', 'supported')).toBe(true)
  })

  it('lets a rejected explanation be reopened, but nothing else', () => {
    const statuses: HypothesisStatus[] = ['open', 'supported', 'contradicted', 'parked', 'rejected']
    for (const to of statuses) {
      expect(canTransitionHypothesis('rejected', to), to).toBe(to === 'open')
    }
  })
})
