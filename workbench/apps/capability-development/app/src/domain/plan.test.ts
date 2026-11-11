import { describe, expect, it } from 'vitest'
import { emptyPlan, MIN_PLAN_FIELD_LENGTH, planReadiness, requiredPlanFields } from './plan'
import { ACTIVITY_KINDS, type ActivityPlan } from './types'

const filled = (overrides: Partial<ActivityPlan> = {}): ActivityPlan => ({
  cue: 'If the question is reopened on Thursday',
  action: 'Ask who can close this and what they need',
  obstacle: 'The group answers with the substance',
  fallback: 'Ask the sponsor afterwards rather than pushing',
  signal: 'A written answer naming a person',
  reviewOn: '2026-11-20',
  ...overrides,
})

describe('plan readiness', () => {
  it('asks a real attempt for a fallback but does not ask an observation for one', () => {
    // Detail in proportion to the activity. A real attempt needs a fallback because the point is
    // to protect the person when the obstacle arrives; demanding one to watch a meeting is a form.
    expect(requiredPlanFields('real-attempt')).toContain('fallback')
    expect(requiredPlanFields('observation')).not.toContain('fallback')
    expect(requiredPlanFields('rehearsal')).not.toContain('cue')
  })

  it('is ready when the fields its kind needs are filled', () => {
    for (const kind of ACTIVITY_KINDS) {
      expect(planReadiness(kind, filled()).ready, kind).toBe(true)
    }
  })

  it('names what is missing in words a person can act on', () => {
    const result = planReadiness('real-attempt', filled({ fallback: '' }))
    expect(result.ready).toBe(false)
    expect(result.missing).toEqual(['what you will do instead if the obstacle appears'])
  })

  it('does not accept whitespace or a token word as a filled field', () => {
    // Otherwise "ok" in every box would mark a plan ready and the readiness state would mean nothing.
    expect(planReadiness('real-attempt', filled({ action: '   ' })).ready).toBe(false)
    expect(planReadiness('real-attempt', filled({ action: 'ask' })).ready).toBe(false)
    expect(planReadiness('real-attempt', filled({ action: 'a'.repeat(MIN_PLAN_FIELD_LENGTH) })).ready).toBe(true)
  })

  it('requires a review date, and treats an empty one as missing', () => {
    const result = planReadiness('observation', filled({ reviewOn: '' }))
    expect(result.missing).toContain('a review date')
  })

  it('reports an empty plan as not ready for any kind', () => {
    for (const kind of ACTIVITY_KINDS) {
      const result = planReadiness(kind, emptyPlan())
      expect(result.ready, kind).toBe(false)
      expect(result.missing.length, kind).toBe(requiredPlanFields(kind).length)
    }
  })
})
