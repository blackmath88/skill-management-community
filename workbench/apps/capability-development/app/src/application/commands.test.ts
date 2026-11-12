/**
 * Commands are where a product rule becomes a refusal a person actually sees. These tests are
 * mostly about what the commands decline to do.
 */
import { describe, expect, it } from 'vitest'
import { at, reviewedRealAttempt, situation, testDeps, withSituation } from '~/test-helpers/fixtures'
import { emptyUserData } from '~/domain/empty'
import { emptyPlan } from '~/domain/plan'
import type { UserData } from '~/domain/types'
import {
  addWorkingHypothesis,
  advanceCampaign,
  confirmPerk,
  createDirection,
  createSharePackage,
  decideHypothesis,
  deleteEvidence,
  deleteHypothesis,
  deleteProposal,
  markProposalAccepted,
  planActivity,
  recordAttempt,
  recordEvidence,
  recordSituation,
  rejectProposal,
  saveReview,
  setActivityState,
  setCampaignState,
  startCampaign,
  updateActivityPlan,
} from './commands'
import type { CommandOutcome } from './results'

const deps = testDeps()
const CAMPAIGN = 'recurring-discussion-to-next-decision'

function expectOk<T>(outcome: CommandOutcome<T>): { data: UserData; value: T } {
  if (!outcome.ok) throw new Error(`expected success, got ${outcome.kind}: ${outcome.errors.join('; ')}`)
  return { data: outcome.data, value: outcome.value }
}

function expectFail<T>(outcome: CommandOutcome<T>) {
  if (outcome.ok) throw new Error('expected a failure')
  return outcome
}

const plan = () => ({
  cue: 'If the question is reopened on Thursday',
  action: 'Ask who can close this and what they need',
  obstacle: 'The group answers with the substance',
  fallback: 'Ask the sponsor afterwards rather than pushing',
  signal: 'A written answer naming a person',
  reviewOn: '2026-11-20',
})

describe('directions', () => {
  it('keeps only one direction active, pausing rather than deleting the others', () => {
    // Two active aspirations make "the next useful action" meaningless, and deleting the old one
    // would throw away something the person wrote.
    const first = expectOk(createDirection(emptyUserData(at(0)), { text: 'An aspiration.' }, deps))
    const second = expectOk(createDirection(first.data, { text: 'A different aspiration.' }, testDeps()))
    expect(second.data.directions.filter((d) => d.state === 'active')).toHaveLength(1)
    expect(second.data.directions).toHaveLength(2)
  })

  it('refuses a focus on a capability no installed pack defines', () => {
    const outcome = expectFail(
      createDirection(emptyUserData(at(0)), { text: 'An aspiration.', focusCapabilityId: 'nope' }, deps),
    )
    expect(outcome.kind).toBe('validation')
    expect(outcome.errors[0]).toMatch(/no capability "nope"/)
  })

  it('records an empty direction as a validation failure, not a silent no-op', () => {
    expect(expectFail(createDirection(emptyUserData(at(0)), { text: '   ' }, deps)).kind).toBe('validation')
  })
})

describe('situations', () => {
  it('accepts a situation with only a title', () => {
    // Somebody has to be able to start from two fields; a mandatory long form is a burden, not rigour.
    const outcome = expectOk(
      recordSituation(
        emptyUserData(at(0)),
        {
          title: 'A question that keeps being reopened',
          description: '',
          context: '',
          desiredOutcome: '',
          authority: 'unclear',
          decisionOwnership: 'unclear',
          challenge: 'other',
          constraints: [],
          supportAvailable: [],
        },
        deps,
      ),
    )
    expect(outcome.data.situations).toHaveLength(1)
  })

  it('deduplicates the barriers that were ticked', () => {
    const outcome = expectOk(
      recordSituation(
        emptyUserData(at(0)),
        {
          title: 'A title',
          description: '',
          context: '',
          desiredOutcome: '',
          authority: 'unclear',
          decisionOwnership: 'unclear',
          challenge: 'other',
          constraints: ['unclear-mandate', 'unclear-mandate'],
          supportAvailable: [],
        },
        deps,
      ),
    )
    expect(outcome.data.situations[0]?.constraints).toEqual(['unclear-mandate'])
  })
})

describe('campaigns', () => {
  it('starts at the authored first step and pins the definition version', () => {
    // Pinning the version is what stops a later content edit from rewriting what this person was
    // actually asked.
    const outcome = expectOk(startCampaign(withSituation(), { situationId: 'sit-1', definitionId: CAMPAIGN }, deps))
    expect(outcome.value.currentStepId).toBe('orient')
    expect(outcome.value.definitionVersion).toBe(1)
    expect(outcome.value.path).toHaveLength(1)
  })

  it('refuses a campaign definition that is not installed', () => {
    expect(expectFail(startCampaign(withSituation(), { situationId: 'sit-1', definitionId: 'nope' }, deps)).kind).toBe(
      'not-found',
    )
  })

  it('refuses to start the same campaign twice on one situation', () => {
    const started = expectOk(startCampaign(withSituation(), { situationId: 'sit-1', definitionId: CAMPAIGN }, deps))
    expect(expectFail(startCampaign(started.data, { situationId: 'sit-1', definitionId: CAMPAIGN }, deps)).kind).toBe(
      'validation',
    )
  })

  it('seeds a hypothesis and a barrier only when the user keeps them', () => {
    const started = expectOk(startCampaign(withSituation(), { situationId: 'sit-1', definitionId: CAMPAIGN }, deps))
    const toExplanations = expectOk(
      advanceCampaign(started.data, { campaignId: started.value.id, choiceId: 'orient-continue' }, testDeps()),
    )
    const toChoose = expectOk(
      advanceCampaign(
        toExplanations.data,
        { campaignId: started.value.id, choiceId: 'notice-have-enough' },
        testDeps(),
      ),
    )
    const rejected = expectOk(
      advanceCampaign(
        toChoose.data,
        { campaignId: started.value.id, choiceId: 'explanations-conditions', acceptSeeds: false },
        testDeps(),
      ),
    )
    expect(rejected.value.seededHypothesis).toBeNull()
    expect(rejected.data.hypotheses).toHaveLength(0)
    expect(rejected.data.situations[0]?.constraints).toEqual([])

    const kept = expectOk(
      advanceCampaign(
        toChoose.data,
        { campaignId: started.value.id, choiceId: 'explanations-conditions', acceptSeeds: true },
        testDeps(),
      ),
    )
    expect(kept.value.seededHypothesis?.category).toBe('conditions')
    expect(kept.data.hypotheses[0]?.source).toBe('content')
    expect(kept.data.situations[0]?.constraints).toContain('unclear-mandate')
  })

  it('uses the user’s own wording for a seeded hypothesis when they edited it', () => {
    const started = expectOk(startCampaign(withSituation(), { situationId: 'sit-1', definitionId: CAMPAIGN }, deps))
    const a = expectOk(advanceCampaign(started.data, { campaignId: started.value.id, choiceId: 'orient-continue' }, testDeps()))
    const b = expectOk(advanceCampaign(a.data, { campaignId: started.value.id, choiceId: 'notice-have-enough' }, testDeps()))
    const kept = expectOk(
      advanceCampaign(
        b.data,
        { campaignId: started.value.id, choiceId: 'explanations-personal', hypothesisText: 'My own words for this.' },
        testDeps(),
      ),
    )
    expect(kept.data.hypotheses[0]?.text).toBe('My own words for this.')
  })

  it('closes the campaign on a choice that leads nowhere, and clears the current step', () => {
    const started = expectOk(startCampaign(withSituation(), { situationId: 'sit-1', definitionId: CAMPAIGN }, deps))
    const closed = expectOk(
      advanceCampaign(started.data, { campaignId: started.value.id, choiceId: 'orient-not-now' }, testDeps()),
    )
    expect(closed.value.closed).toBe(true)
    expect(closed.value.campaign.state).toBe('completed')
    expect(closed.value.campaign.currentStepId).toBeNull()
  })

  it('refuses an option that is not one of the current step’s choices', () => {
    const started = expectOk(startCampaign(withSituation(), { situationId: 'sit-1', definitionId: CAMPAIGN }, deps))
    expect(
      expectFail(advanceCampaign(started.data, { campaignId: started.value.id, choiceId: 'review-stop' }, deps)).kind,
    ).toBe('not-found')
  })

  it('refuses to advance a paused campaign, and says to resume it first', () => {
    const started = expectOk(startCampaign(withSituation(), { situationId: 'sit-1', definitionId: CAMPAIGN }, deps))
    const paused = expectOk(setCampaignState(started.data, { campaignId: started.value.id, state: 'paused' }, deps))
    const outcome = expectFail(advanceCampaign(paused.data, { campaignId: started.value.id, choiceId: 'orient-continue' }, deps))
    expect(outcome.kind).toBe('illegal-transition')
    expect(outcome.errors[0]).toMatch(/resume it first/i)
  })

  it('lets a campaign be stopped from any live state', () => {
    // Stopping must always be available; it is the product's answer to "this is not for me".
    const started = expectOk(startCampaign(withSituation(), { situationId: 'sit-1', definitionId: CAMPAIGN }, deps))
    const stopped = expectOk(setCampaignState(started.data, { campaignId: started.value.id, state: 'abandoned' }, deps))
    expect(stopped.value.currentStepId).toBeNull()
  })

  it('reports a step that is no longer in the installed content without losing the records', () => {
    const started = expectOk(startCampaign(withSituation(), { situationId: 'sit-1', definitionId: CAMPAIGN }, deps))
    const drifted: UserData = {
      ...started.data,
      campaigns: started.data.campaigns.map((c) => ({ ...c, currentStepId: 'a-step-that-was-removed' })),
    }
    const outcome = expectFail(advanceCampaign(drifted, { campaignId: started.value.id, choiceId: 'orient-continue' }, deps))
    expect(outcome.errors[0]).toMatch(/not installed/i)
    // The campaign can still be stopped, which is the important part.
    expect(setCampaignState(drifted, { campaignId: started.value.id, state: 'abandoned' }, deps).ok).toBe(true)
  })
})

describe('activities', () => {
  it('saves a half-finished plan as planned rather than refusing it', () => {
    const outcome = expectOk(
      planActivity(
        withSituation(),
        {
          situationId: 'sit-1',
          route: 'personal-practice',
          kind: 'real-attempt',
          title: 'Ask who can close this',
          plan: { ...emptyPlan(), action: 'Ask the closing question' },
          capabilityIds: [],
          methodIds: [],
        },
        deps,
      ),
    )
    expect(outcome.value.state).toBe('planned')
  })

  it('marks a complete plan as ready', () => {
    const outcome = expectOk(
      planActivity(
        withSituation(),
        {
          situationId: 'sit-1',
          route: 'personal-practice',
          kind: 'real-attempt',
          title: 'Ask who can close this',
          plan: plan(),
          capabilityIds: ['clarify-ownership'],
          methodIds: ['decision-rights'],
        },
        deps,
      ),
    )
    expect(outcome.value.state).toBe('ready')
  })

  it('refuses a capability or method that is not installed', () => {
    const base = {
      situationId: 'sit-1',
      route: 'personal-practice' as const,
      kind: 'real-attempt' as const,
      title: 'A title',
      plan: plan(),
    }
    expect(
      expectFail(planActivity(withSituation(), { ...base, capabilityIds: ['nope'], methodIds: [] }, deps)).errors[0],
    ).toMatch(/no capability "nope"/)
    expect(
      expectFail(planActivity(withSituation(), { ...base, capabilityIds: [], methodIds: ['nope'] }, deps)).errors[0],
    ).toMatch(/no method "nope"/)
  })

  it('records the activity against the campaign step that offered it', () => {
    const started = expectOk(startCampaign(withSituation(), { situationId: 'sit-1', definitionId: CAMPAIGN }, deps))
    const planned = expectOk(
      planActivity(
        started.data,
        {
          situationId: 'sit-1',
          campaignId: started.value.id,
          stepId: 'orient',
          route: 'personal-practice',
          kind: 'observation',
          title: 'Watch it happen',
          plan: plan(),
          capabilityIds: [],
          methodIds: [],
        },
        testDeps(),
      ),
    )
    expect(planned.data.campaigns[0]?.path[0]?.activityIds).toContain(planned.value.id)
  })

  it('refuses to rewrite a plan once an attempt exists', () => {
    // A plan edited after the fact could not be compared with what happened, so the record would
    // stop being readable.
    const data = reviewedRealAttempt()
    const outcome = expectFail(updateActivityPlan(data, { id: 'act-1', title: 'A different title' }, deps))
    expect(outcome.kind).toBe('illegal-transition')
    expect(outcome.errors[0]).toMatch(/already been attempted/)
  })

  it('refuses to mark an incomplete plan as ready', () => {
    const planned = expectOk(
      planActivity(
        withSituation(),
        {
          situationId: 'sit-1',
          route: 'personal-practice',
          kind: 'real-attempt',
          title: 'A title',
          plan: { ...emptyPlan(), action: 'Ask the closing question' },
          capabilityIds: [],
          methodIds: [],
        },
        deps,
      ),
    )
    const outcome = expectFail(setActivityState(planned.data, { id: planned.value.id, state: 'ready' }, deps))
    expect(outcome.kind).toBe('validation')
  })
})

describe('attempts', () => {
  it('records one attempt and refuses a second', () => {
    // Saving the same thing twice must not be a way to add anything, including credit.
    const data = withSituation()
    const planned = expectOk(
      planActivity(
        data,
        { situationId: 'sit-1', route: 'personal-practice', kind: 'real-attempt', title: 'A title', plan: plan(), capabilityIds: [], methodIds: [] },
        deps,
      ),
    )
    const first = expectOk(
      recordAttempt(planned.data, { activityId: planned.value.id, outcome: 'changed', note: 'It changed.', assistance: 'none' }, testDeps()),
    )
    expect(first.data.activities[0]?.state).toBe('attempted')
    const second = expectFail(
      recordAttempt(first.data, { activityId: planned.value.id, outcome: 'as-planned', note: 'Again.', assistance: 'none' }, testDeps()),
    )
    expect(second.errors[0]).toMatch(/already recorded/i)
  })

  it('accepts "the cue never arrived" as an ordinary outcome', () => {
    const planned = expectOk(
      planActivity(
        withSituation(),
        { situationId: 'sit-1', route: 'personal-practice', kind: 'real-attempt', title: 'A title', plan: plan(), capabilityIds: [], methodIds: [] },
        deps,
      ),
    )
    const outcome = expectOk(
      recordAttempt(
        planned.data,
        { activityId: planned.value.id, outcome: 'no-opportunity', note: 'It never came up.', assistance: 'none' },
        testDeps(),
      ),
    )
    expect(outcome.value.outcome).toBe('no-opportunity')
  })

  it('keeps the assistance level so assisted work is not read as unaided', () => {
    const planned = expectOk(
      planActivity(
        withSituation(),
        { situationId: 'sit-1', route: 'personal-practice', kind: 'rehearsal', title: 'A title', plan: plan(), capabilityIds: [], methodIds: [] },
        deps,
      ),
    )
    const outcome = expectOk(
      recordAttempt(planned.data, { activityId: planned.value.id, outcome: 'as-planned', note: 'Done.', assistance: 'ai-sparring' }, testDeps()),
    )
    expect(outcome.value.assistance).toBe('ai-sparring')
  })
})

describe('reviews', () => {
  it('refuses a review of something that was never attempted', () => {
    const planned = expectOk(
      planActivity(
        withSituation(),
        { situationId: 'sit-1', route: 'personal-practice', kind: 'real-attempt', title: 'A title', plan: plan(), capabilityIds: [], methodIds: [] },
        deps,
      ),
    )
    const outcome = expectFail(
      saveReview(
        planned.data,
        { activityId: planned.value.id, observation: 'Something.', interpretation: '', alternativeExplanation: '', nextAdjustment: '', nextMove: 'adapt' },
        deps,
      ),
    )
    expect(outcome.errors[0]).toMatch(/Record what happened before reviewing/i)
  })

  it('updates the existing review rather than adding a second one', () => {
    const data = reviewedRealAttempt()
    const outcome = expectOk(
      saveReview(
        data,
        { activityId: 'act-1', observation: 'A revised observation.', interpretation: '', alternativeExplanation: 'Still competing.', nextAdjustment: '', nextMove: 'pause' },
        deps,
      ),
    )
    expect(outcome.data.reviews).toHaveLength(1)
    expect(outcome.data.reviews[0]?.id).toBe('rev-1')
    expect(outcome.data.reviews[0]?.reviewedAt).toBe(at(8))
  })
})

describe('evidence', () => {
  it('refuses a contact detail in the attribution and says why', () => {
    const data = reviewedRealAttempt()
    const outcome = expectFail(
      recordEvidence(
        data,
        { activityId: 'act-1', kind: 'attributed-feedback', text: 'They said it helped.', attribution: 'maria@example.org', capabilityIds: [] },
        deps,
      ),
    )
    expect(outcome.errors[0]).toMatch(/role, not by a contact detail/i)
  })

  it('refuses evidence attached to nothing', () => {
    const outcome = expectFail(
      recordEvidence(withSituation(), { kind: 'self-observation', text: 'Something.', capabilityIds: [] }, deps),
    )
    expect(outcome.errors[0]).toMatch(/attached to/i)
  })

  it('deletes evidence and unlinks it from the hypotheses that pointed at it', () => {
    const data = reviewedRealAttempt()
    const linked = expectOk(addWorkingHypothesis(data, { situationId: 'sit-1', category: 'conditions', text: 'A possibility.' }, deps))
    const decided = expectOk(decideHypothesis(linked.data, { id: linked.value.id, status: 'supported', evidenceIds: ['ev-1'] }, deps))
    const outcome = expectOk(deleteEvidence(decided.data, ['ev-1']))
    expect(outcome.value.removed).toBe(1)
    expect(outcome.data.hypotheses[0]?.evidenceIds).toEqual([])
  })

  it('refuses to link a hypothesis to evidence that does not exist', () => {
    const data = reviewedRealAttempt()
    const added = expectOk(addWorkingHypothesis(data, { situationId: 'sit-1', category: 'conditions', text: 'A possibility.' }, deps))
    const outcome = expectFail(decideHypothesis(added.data, { id: added.value.id, status: 'supported', evidenceIds: ['nope'] }, deps))
    expect(outcome.kind).toBe('not-found')
  })

  it('keeps the history when a hypothesis changes status', () => {
    // An earlier view must never be silently overwritten: that is how a hypothesis turns into a
    // fact nobody remembers agreeing to.
    const data = reviewedRealAttempt()
    const added = expectOk(addWorkingHypothesis(data, { situationId: 'sit-1', category: 'conditions', text: 'A possibility.' }, deps))
    const decided = expectOk(decideHypothesis(added.data, { id: added.value.id, status: 'contradicted', note: 'The sponsor said otherwise.' }, deps))
    expect(decided.value.history).toHaveLength(2)
    expect(decided.value.history[1]?.note).toMatch(/sponsor/)
  })
})

describe('perks', () => {
  it('refuses a strength with no example from the person’s own activities', () => {
    // A strength with nothing behind it is a personality claim, which this product does not make.
    const outcome = expectFail(confirmPerk(reviewedRealAttempt(), { description: 'I am good at this.', evidenceActivityIds: [] }, deps))
    expect(outcome.errors[0]).toMatch(/point at least one/i)
  })

  it('refuses an example that has not been attempted', () => {
    const planned = expectOk(
      planActivity(
        withSituation(),
        { situationId: 'sit-1', route: 'personal-practice', kind: 'real-attempt', title: 'Not yet tried', plan: plan(), capabilityIds: [], methodIds: [] },
        deps,
      ),
    )
    const outcome = expectFail(
      confirmPerk(planned.data, { description: 'I notice things.', evidenceActivityIds: [planned.value.id] }, deps),
    )
    expect(outcome.errors[0]).toMatch(/has not been attempted/)
  })

  it('accepts a strength with an attempted example and keeps the overuse note', () => {
    const outcome = expectOk(
      confirmPerk(
        reviewedRealAttempt(),
        { description: 'I notice when a group agrees to end a meeting.', evidenceActivityIds: ['act-1'], possibleOveruse: 'I reopen things that were settled.' },
        deps,
      ),
    )
    expect(outcome.value.possibleOveruse).toMatch(/reopen/)
  })
})

describe('share packages', () => {
  it('refuses an empty package', () => {
    expect(expectFail(createSharePackage(emptyUserData(at(0)), { title: 'A title' }, deps)).kind).toBe('validation')
  })

  it('records only the parts the person wrote', () => {
    // Nothing is copied automatically: an automatic summary of a journal is not something the
    // person reviewed.
    const outcome = expectOk(
      createSharePackage(emptyUserData(at(0)), { title: 'A structural obstacle', structuralObstacle: 'Nobody can approve this.' }, deps),
    )
    expect(outcome.value.structuralObstacle).toMatch(/approve/)
    expect(outcome.value.anonymisedCase).toBeUndefined()
  })
})

describe('AI proposals', () => {
  const withProposal = (state: 'offered' | 'invalid'): UserData => {
    const data = reviewedRealAttempt()
    data.proposals.push({
      id: 'prop-1',
      kind: 'hypothesis',
      text: 'A possibility.',
      referencedIds: ['act-1'],
      baseRevision: 1,
      provenance: { providerId: 'local-stand-in', model: 'x', promptId: 'p', requestedAt: at(1) },
      state,
      createdAt: at(1),
      updatedAt: at(1),
    })
    return data
  }

  it('cannot accept a suggestion that was refused', () => {
    expect(expectFail(markProposalAccepted(withProposal('invalid'), 'prop-1', deps)).kind).toBe('illegal-transition')
  })

  it('cannot accept the same suggestion twice', () => {
    const once = expectOk(markProposalAccepted(withProposal('offered'), 'prop-1', deps))
    expect(expectFail(markProposalAccepted(once.data, 'prop-1', deps)).errors[0]).toMatch(/already been accepted/)
  })

  it('keeps a rejection with its note, rather than deleting the suggestion', () => {
    const outcome = expectOk(rejectProposal(withProposal('offered'), { id: 'prop-1', note: 'Not what is happening.' }, deps))
    expect(outcome.value.state).toBe('rejected')
    expect(outcome.value.rejectionNote).toMatch(/Not what is happening/)
    expect(outcome.data.proposals).toHaveLength(1)
  })
})

describe('commands never mutate their input', () => {
  it('leaves the record set it was given untouched', () => {
    const data = reviewedRealAttempt()
    const snapshot = JSON.stringify(data)
    createDirection(data, { text: 'An aspiration.' }, deps)
    recordSituation(data, { title: 'Another', description: '', context: '', desiredOutcome: '', authority: 'unclear', decisionOwnership: 'unclear', challenge: 'other', constraints: [], supportAvailable: [] }, deps)
    deleteEvidence(data, ['ev-1'])
    setActivityState(data, { id: 'act-1', state: 'abandoned' }, deps)
    expect(JSON.stringify(data)).toBe(snapshot)
  })

  it('does not accept a situation id that is not there', () => {
    const outcome = expectFail(
      planActivity(
        emptyUserData(at(0)),
        { situationId: 'missing', route: 'personal-practice', kind: 'real-attempt', title: 'A title', plan: plan(), capabilityIds: [], methodIds: [] },
        deps,
      ),
    )
    expect(outcome.kind).toBe('not-found')
    void situation
  })
})

describe('a screen left open while the campaign moved on', () => {
  it('records the activity against the step that offered it, not the step now current', async () => {
    // Regression guard: the path entry used to be assumed to be the last one. A form left open
    // while the campaign advanced would then attach the activity to a step the person had not
    // planned it at, and the recorded path would describe a route they did not take.
    const started = expectOk(startCampaign(withSituation(), { situationId: 'sit-1', definitionId: CAMPAIGN }, deps))
    const atNotice = expectOk(
      advanceCampaign(started.data, { campaignId: started.value.id, choiceId: 'orient-continue' }, testDeps()),
    )
    const atExplanations = expectOk(
      advanceCampaign(atNotice.data, { campaignId: started.value.id, choiceId: 'notice-have-enough' }, testDeps()),
    )
    // The person is now on "explanations" but saves the activity the "notice" step offered.
    const planned = expectOk(
      planActivity(
        atExplanations.data,
        {
          situationId: 'sit-1',
          campaignId: started.value.id,
          stepId: 'notice',
          route: 'personal-practice',
          kind: 'observation',
          title: 'Watch it happen',
          plan: plan(),
          capabilityIds: [],
          methodIds: [],
        },
        testDeps(),
      ),
    )
    const path = planned.data.campaigns[0]?.path ?? []
    const noticeEntry = path.find((entry) => entry.stepId === 'notice')
    const currentEntry = path.find((entry) => entry.stepId === 'explanations')
    expect(noticeEntry?.activityIds).toContain(planned.value.id)
    expect(currentEntry?.activityIds ?? []).not.toContain(planned.value.id)
  })

  it('still records the activity when no step id is given', () => {
    const started = expectOk(startCampaign(withSituation(), { situationId: 'sit-1', definitionId: CAMPAIGN }, deps))
    const planned = expectOk(
      planActivity(
        started.data,
        {
          situationId: 'sit-1',
          campaignId: started.value.id,
          route: 'personal-practice',
          kind: 'observation',
          title: 'Watch it happen',
          plan: plan(),
          capabilityIds: [],
          methodIds: [],
        },
        testDeps(),
      ),
    )
    expect(planned.data.campaigns[0]?.path[0]?.activityIds).toContain(planned.value.id)
  })
})

describe('record identifiers', () => {
  it('refuses to create a record rather than reusing an id that is already taken', () => {
    // If the id factory ever repeated, appending the record would produce two records answering
    // to the same reference. The command would report success and the damage would only surface
    // later as a validation failure on save, with no way to see what caused it.
    const always = (): string => 'always-the-same'
    const collidingDeps = { ...deps, newId: always }
    const first = expectOk(createDirection(emptyUserData(at(0)), { text: 'An aspiration.' }, collidingDeps))
    expect(first.value.id).toBe('always-the-same')
    const second = expectFail(createDirection(first.data, { text: 'A different one.' }, collidingDeps))
    expect(second.kind).toBe('validation')
    expect(second.errors[0]).toMatch(/unique identifier/i)
    // Nothing was added.
    expect(first.data.directions).toHaveLength(1)
  })

  it('checks every collection, not only the one being written to', () => {
    const data = reviewedRealAttempt()
    const takenBySituation = { ...deps, newId: () => 'sit-1' }
    const outcome = expectFail(
      planActivity(
        data,
        { situationId: 'sit-1', route: 'personal-practice', kind: 'real-attempt', title: 'A title', plan: plan(), capabilityIds: [], methodIds: [] },
        takenBySituation,
      ),
    )
    expect(outcome.errors[0]).toMatch(/unique identifier/i)
  })
})

describe('removing a single record of any kind', () => {
  it('deletes one explanation without touching anything else', () => {
    // The All records page tells people anything there can be deleted. Until these existed, an
    // explanation, a strength, a suggestion or a package could only be removed by deleting every
    // record in the namespace.
    const data = reviewedRealAttempt()
    const added = expectOk(addWorkingHypothesis(data, { situationId: 'sit-1', category: 'conditions', text: 'A possibility.' }, deps))
    const outcome = expectOk(deleteHypothesis(added.data, added.value.id))
    expect(outcome.data.hypotheses).toHaveLength(0)
    expect(outcome.data.activities).toHaveLength(1)
    expect(outcome.data.evidence).toHaveLength(1)
  })

  it('deletes one suggestion', () => {
    const data = reviewedRealAttempt()
    data.proposals.push({
      id: 'prop-1',
      kind: 'hypothesis',
      text: 'A possibility.',
      referencedIds: ['act-1'],
      baseRevision: 1,
      provenance: { providerId: 'local-stand-in', model: 'x', promptId: 'p', requestedAt: at(1) },
      state: 'rejected',
      createdAt: at(1),
      updatedAt: at(1),
    })
    expect(expectOk(deleteProposal(data, 'prop-1')).data.proposals).toHaveLength(0)
    expect(expectFail(deleteProposal(data, 'nope')).kind).toBe('not-found')
  })

  it('reports how many conclusions deleting evidence reopened', () => {
    // So the interface can tell somebody that removing evidence changed a conclusion they had
    // recorded, rather than changing it silently.
    const data = reviewedRealAttempt()
    const added = expectOk(addWorkingHypothesis(data, { situationId: 'sit-1', category: 'conditions', text: 'A possibility.' }, deps))
    const decided = expectOk(decideHypothesis(added.data, { id: added.value.id, status: 'supported', evidenceIds: ['ev-1'] }, deps))
    const outcome = expectOk(deleteEvidence(decided.data, ['ev-1'], deps))
    expect(outcome.value.reopened).toBe(1)
    expect(outcome.data.hypotheses[0]?.status).toBe('open')
  })

  it('unlinks an assemblage marker from a deleted record, and keeps the marker', () => {
    // The retention rule, as a command rather than as a promise in a document: the sculpture
    // somebody arranged is not dismantled because a record went, and the marker does not keep an
    // identifier pointing at something that is no longer there.
    const base = reviewedRealAttempt()
    const data: UserData = {
      ...base,
      profile: {
        ...base.profile,
        appearance: {
          version: 1,
          mode: 'character',
          emblem: '◆',
          palette: 'slate',
          accessories: [],
          assemblage: {
            version: 1,
            catalogueVersion: 1,
            paletteId: 'chalk-terracotta',
            pieces: [
              {
                instanceId: 'base',
                pieceId: 'foundation',
                parentInstanceId: null,
                receiverFrameId: null,
                restingFrameId: 'base',
                orientationIndex: 0,
                groundX: 0,
                groundZ: 0,
                markers: [
                  { id: 'm-gone', designId: 'linked-loop', evidenceId: 'ev-1', hidden: false },
                  { id: 'm-stays', designId: 'turned-route', evidenceId: 'ev-other', hidden: false },
                ],
              },
            ],
          },
        },
      },
    }
    const outcome = expectOk(deleteEvidence(data, ['ev-1'], deps))
    const markers = outcome.data.profile.appearance?.assemblage?.pieces[0]?.markers ?? []
    expect(outcome.value.markersUnlinked).toBe(1)
    expect(markers).toHaveLength(2)
    expect(markers[0]?.evidenceId).toBeNull()
    // A marker pointing somewhere else is untouched, and nothing was substituted for the one that
    // lost its record.
    expect(markers[1]?.evidenceId).toBe('ev-other')
    expect(outcome.data.profile.appearance?.assemblage?.pieces).toHaveLength(1)
  })
})
