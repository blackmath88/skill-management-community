/**
 * The guard the suite was missing.
 *
 * An independent reviewer found that 311 green tests coexisted with a defect in which three
 * ordinary clicks produced a record set the storage layer would refuse to read back — permanently
 * locking somebody out of their own journal, with no export and no delete reachable from the
 * error screen. Nothing in the suite saved a command's output and then read it back, so nothing
 * could see it.
 *
 * This file closes that gap at the level where it belongs: whatever a command produces, from
 * whatever starting point, must be something the reader will accept. If that ever stops being
 * true, this fails before anybody's records do.
 */
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { createContentRegistry } from '~/content/index'
import { createDemoUserData } from '~/content/demo'
import { emptyUserData } from '~/domain/empty'
import { fixedClock, sequentialIdFactory } from '~/domain/ids'
import { MAX_STRING_LENGTH, validateUserData } from '~/domain/validation'
import {
  ACTIVITY_STATES,
  ATTEMPT_OUTCOMES,
  CAMPAIGN_STATES,
  NEXT_MOVES,
  type ActivityState,
  type AttemptOutcome,
  type CampaignState,
  type NextMove,
  type UserData,
} from '~/domain/types'
import { resumeStateFor } from '~/domain/transitions'
import { createMemoryStore } from '~/storage/memory'
import { StorageError } from '~/storage/types'
import { NOW, reviewedRealAttempt, situation, withSituation } from '~/test-helpers/fixtures'
import {
  advanceCampaign,
  confirmPerk,
  createDirection,
  createSharePackage,
  decideHypothesis,
  deleteActivity,
  deleteEvidence,
  deleteHypothesis,
  deleteSituation,
  planActivity,
  recordAttempt,
  recordEvidence,
  recordSituation,
  reviseDirection,
  saveReview,
  setActivityState,
  setCampaignState,
  startCampaign,
  addWorkingHypothesis,
} from './commands'
import type { CommandDeps } from './ports'
import type { CommandOutcome } from './results'

const deps = (): CommandDeps => ({
  clock: fixedClock(NOW),
  newId: sequentialIdFactory(`k${Math.random().toString(36).slice(2, 8)}`),
  content: createContentRegistry(),
})

const plan = () => ({
  cue: 'If the question is reopened on Thursday',
  action: 'Ask who can close this and what they need',
  obstacle: 'The group answers with the substance',
  fallback: 'Ask the sponsor afterwards rather than pushing',
  signal: 'A written answer naming a person',
  reviewOn: '2026-11-20',
})

/** Every command, as a thunk that can be applied to whatever record set it is given. */
type Step = { name: string; apply: (data: UserData, d: CommandDeps) => CommandOutcome<unknown> }

function stepsFor(data: UserData): Step[] {
  const situationId = data.situations[0]?.id
  const activityId = data.activities[0]?.id
  const campaignId = data.campaigns[0]?.id
  const hypothesisId = data.hypotheses[0]?.id
  const evidenceId = data.evidence[0]?.id
  const directionId = data.directions[0]?.id
  const steps: Step[] = [
    { name: 'createDirection', apply: (d, x) => createDirection(d, { text: 'An aspiration.' }, x) },
    {
      name: 'recordSituation',
      apply: (d, x) =>
        recordSituation(
          d,
          {
            title: 'Another situation',
            description: '',
            context: 'Another group',
            desiredOutcome: '',
            authority: 'unclear',
            decisionOwnership: 'unclear',
            challenge: 'other',
            constraints: [],
            supportAvailable: [],
          },
          x,
        ),
    },
  ]
  if (directionId) {
    steps.push({ name: 'reviseDirection', apply: (d, x) => reviseDirection(d, { id: directionId, state: 'paused' }, x) })
  }
  if (situationId) {
    steps.push(
      {
        name: 'startCampaign',
        apply: (d, x) => startCampaign(d, { situationId, definitionId: 'recurring-discussion-to-next-decision' }, x),
      },
      {
        name: 'addWorkingHypothesis',
        apply: (d, x) => addWorkingHypothesis(d, { situationId, category: 'conditions', text: 'A possibility.' }, x),
      },
      {
        name: 'planActivity',
        apply: (d, x) =>
          planActivity(
            d,
            {
              situationId,
              route: 'personal-practice',
              kind: 'real-attempt',
              title: 'An activity',
              plan: plan(),
              capabilityIds: ['clarify-ownership'],
              methodIds: [],
            },
            x,
          ),
      },
      { name: 'deleteSituation', apply: (d) => deleteSituation(d, situationId) },
      {
        name: 'recordEvidence(situation)',
        apply: (d, x) =>
          recordEvidence(d, { situationId, kind: 'self-observation', text: 'A thought.', capabilityIds: [] }, x),
      },
    )
  }
  if (campaignId) {
    const campaign = data.campaigns[0]
    const content = createContentRegistry()
    const step = campaign?.currentStepId ? content.step(campaign.definitionId, campaign.currentStepId) : undefined
    for (const choice of step?.choices ?? []) {
      steps.push({
        name: `advanceCampaign(${choice.id})`,
        apply: (d, x) => advanceCampaign(d, { campaignId, choiceId: choice.id }, x),
      })
    }
    for (const state of CAMPAIGN_STATES as readonly CampaignState[]) {
      steps.push({ name: `setCampaignState(${state})`, apply: (d, x) => setCampaignState(d, { campaignId, state }, x) })
    }
  }
  if (activityId) {
    for (const state of ACTIVITY_STATES as readonly ActivityState[]) {
      steps.push({ name: `setActivityState(${state})`, apply: (d, x) => setActivityState(d, { id: activityId, state }, x) })
    }
    for (const outcome of ATTEMPT_OUTCOMES as readonly AttemptOutcome[]) {
      steps.push({
        name: `recordAttempt(${outcome})`,
        apply: (d, x) => recordAttempt(d, { activityId, outcome, note: 'What happened.', assistance: 'none' }, x),
      })
    }
    for (const nextMove of NEXT_MOVES as readonly NextMove[]) {
      steps.push({
        name: `saveReview(${nextMove})`,
        apply: (d, x) =>
          saveReview(
            d,
            {
              activityId,
              observation: 'Something observable.',
              interpretation: '',
              alternativeExplanation: 'A competing explanation.',
              nextAdjustment: '',
              nextMove,
            },
            x,
          ),
      })
    }
    steps.push(
      { name: 'deleteActivity', apply: (d) => deleteActivity(d, activityId) },
      {
        name: 'recordEvidence(activity)',
        apply: (d, x) =>
          recordEvidence(
            d,
            { activityId, kind: 'attributed-feedback', text: 'They said something.', attribution: 'a colleague', capabilityIds: [] },
            x,
          ),
      },
      {
        name: 'confirmPerk',
        apply: (d, x) => confirmPerk(d, { description: 'I notice things.', evidenceActivityIds: [activityId] }, x),
      },
    )
  }
  if (hypothesisId) {
    steps.push(
      {
        name: 'decideHypothesis(supported)',
        apply: (d, x) =>
          decideHypothesis(
            d,
            { id: hypothesisId, status: 'supported', note: 'Because of what happened.', ...(evidenceId ? { evidenceIds: [evidenceId] } : {}) },
            x,
          ),
      },
      {
        // The exact shape that produced an unreadable record set: text longer than the cap.
        name: 'decideHypothesis(very long note)',
        apply: (d, x) => decideHypothesis(d, { id: hypothesisId, status: 'parked', note: 'x'.repeat(MAX_STRING_LENGTH + 1) }, x),
      },
      { name: 'deleteHypothesis', apply: (d) => deleteHypothesis(d, hypothesisId) },
    )
  }
  if (evidenceId) {
    steps.push({ name: 'deleteEvidence', apply: (d, x) => deleteEvidence(d, [evidenceId], x) })
  }
  steps.push({
    name: 'createSharePackage',
    apply: (d, x) => createSharePackage(d, { title: 'A package', structuralObstacle: 'Nobody can approve this.' }, x),
  })
  return steps
}

const startingPoints: { name: string; make: () => UserData }[] = [
  { name: 'empty', make: () => emptyUserData(NOW) },
  { name: 'one situation', make: withSituation },
  { name: 'a reviewed real attempt', make: reviewedRealAttempt },
  { name: 'the demo records', make: createDemoUserData },
]

describe('whatever a command produces, the reader will accept', () => {
  it('holds for every command applied to every starting point', () => {
    // The direct form of the invariant: one command, one check.
    for (const start of startingPoints) {
      const data = start.make()
      for (const step of stepsFor(data)) {
        const outcome = step.apply(data, deps())
        if (!outcome.ok) continue
        const checked = validateUserData(outcome.data)
        expect(checked.ok, `${start.name} → ${step.name}: ${checked.ok ? '' : checked.errors.join('; ')}`).toBe(true)
      }
    }
  })

  it('holds for any sequence of up to eight commands', () => {
    // The sequences are what matter: the defect that prompted this file needed three commands in
    // order (record an attempt, pause, resume) and no single one of them was wrong on its own.
    fc.assert(
      fc.property(fc.array(fc.nat(), { minLength: 1, maxLength: 8 }), fc.nat(), (picks, startPick) => {
        const start = startingPoints[startPick % startingPoints.length]
        if (!start) return
        let data = start.make()
        const trail: string[] = [start.name]
        for (const pick of picks) {
          const steps = stepsFor(data)
          if (steps.length === 0) break
          const step = steps[pick % steps.length]
          if (!step) break
          const outcome = step.apply(data, deps())
          if (!outcome.ok) continue
          trail.push(step.name)
          data = outcome.data
          const checked = validateUserData(data)
          expect(checked.ok, `${trail.join(' → ')}: ${checked.ok ? '' : checked.errors.join('; ')}`).toBe(true)
        }
      }),
      { numRuns: 400 },
    )
  })
})

describe('the store refuses to write what it would refuse to read', () => {
  it('rejects an invalid record set instead of persisting it', async () => {
    // Belt and braces behind the invariant above. Even if a command ever produced something
    // unreadable, one save fails rather than the namespace becoming unopenable.
    const store = createMemoryStore()
    const broken = emptyUserData(NOW)
    broken.situations.push(situation())
    broken.activities.push({
      id: 'a-1',
      situationId: 'sit-1',
      route: 'personal-practice',
      kind: 'real-attempt',
      title: 'An activity',
      plan: plan(),
      capabilityIds: [],
      methodIds: [],
      // The exact contradiction the pause/resume route produced.
      state: 'planned',
      createdAt: NOW,
      updatedAt: NOW,
    })
    broken.attempts.push({
      id: 'at-1',
      activityId: 'a-1',
      outcome: 'as-planned',
      note: 'It happened.',
      assistance: 'none',
      attemptedAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    })
    expect(validateUserData(broken).ok).toBe(false)

    await expect(store.save('personal', broken, 0)).rejects.toBeInstanceOf(StorageError)
    const after = await store.load('personal')
    // Nothing was written, so nothing is unreadable.
    expect(after.revision).toBe(0)
    expect(after.data.activities).toHaveLength(0)
  })

  it('reports the refusal as something a person can act on', async () => {
    const store = createMemoryStore()
    const broken = { ...emptyUserData(NOW), schemaVersion: 99 as unknown as 1 }
    await store.save('personal', broken, 0).then(
      () => expect.unreachable('an invalid record set must not be stored'),
      (error: unknown) => {
        expect(error).toBeInstanceOf(StorageError)
        expect((error as StorageError).kind).toBe('invalid')
        expect((error as StorageError).message).toMatch(/not saved/i)
        expect((error as StorageError).message).toMatch(/nothing was changed/i)
      },
    )
  })
})

/** A real attempt that has been recorded but not yet reviewed, so it is still movable. */
function attemptedNotReviewed(): UserData {
  const data = reviewedRealAttempt()
  data.reviews = []
  const activity = data.activities[0]
  if (activity) activity.state = 'attempted'
  return data
}

describe('the route that locked people out', () => {
  it('refuses to send an activity with an attempt back to being planned', () => {
    const data = attemptedNotReviewed()
    const paused = setActivityState(data, { id: 'act-1', state: 'paused' }, deps())
    expect(paused.ok).toBe(true)
    if (!paused.ok) return
    const resumed = setActivityState(paused.data, { id: 'act-1', state: 'planned' }, deps())
    expect(resumed.ok).toBe(false)
    if (resumed.ok) return
    expect(resumed.kind).toBe('illegal-transition')
    expect(resumed.errors[0]).toMatch(/cannot go back to being planned/i)
    // And the state the Resume button actually asks for is the one the records support.
    expect(resumeStateFor({ hasAttempt: true, hasReview: false, planIsReady: true })).toBe('attempted')
    expect(resumeStateFor({ hasAttempt: true, hasReview: true, planIsReady: true })).toBe('reviewed')
    expect(resumeStateFor({ hasAttempt: false, hasReview: false, planIsReady: false })).toBe('planned')
  })

  it('refuses a note longer than the records can hold', () => {
    const data = reviewedRealAttempt()
    const added = addWorkingHypothesis(data, { situationId: 'sit-1', category: 'conditions', text: 'A possibility.' }, deps())
    expect(added.ok).toBe(true)
    if (!added.ok) return
    const outcome = decideHypothesis(
      added.data,
      { id: added.value.id, status: 'parked', note: 'x'.repeat(MAX_STRING_LENGTH + 1) },
      deps(),
    )
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.errors[0]).toMatch(/longer than/i)
  })

  it('does not revive an abandoned activity by reviewing it', () => {
    const data = attemptedNotReviewed()
    const abandoned = setActivityState(data, { id: 'act-1', state: 'abandoned' }, deps())
    expect(abandoned.ok).toBe(true)
    if (!abandoned.ok) return
    const outcome = saveReview(
      abandoned.data,
      { activityId: 'act-1', observation: 'Something.', interpretation: '', alternativeExplanation: '', nextAdjustment: '', nextMove: 'adapt' },
      deps(),
    )
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.errors[0]).toMatch(/abandoned/i)
  })
})
