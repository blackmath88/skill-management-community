/**
 * Walking the collaboration campaign end to end through the real commands.
 *
 * PLAN.md stage 2 asks that a second domain works "without leadership-specific branching
 * throughout the code". A content-integrity test checks the pack is well formed; it cannot check
 * that the engine is domain-neutral. This does: it drives a campaign from a different pack, with
 * a different mechanism, through the same commands, and asserts the records that come out.
 *
 * If anything in the domain, application or storage layers ever assumes leadership, this is the
 * test that should fail.
 */
import { describe, expect, it } from 'vitest'
import { createRegistry } from '~/content/registry'
import { COLLABORATION_PACK } from '~/content/collaboration/pack'
import { LEADERSHIP_PACK } from '~/content/leadership/pack'
import { emptyUserData } from '~/domain/empty'
import { deriveCapabilityEvidence } from '~/domain/evidence'
import { derivePracticeExperience } from '~/domain/experience'
import { deriveDevelopmentSummary } from '~/domain/summary'
import { fixedClock, sequentialIdFactory } from '~/domain/ids'
import { validateUserData } from '~/domain/validation'
import { exportUserData, parseImport } from '~/storage/portability'
import { NOW } from '~/test-helpers/fixtures'
import type { CommandDeps } from './ports'
import type { CommandOutcome } from './results'
import {
  advanceCampaign,
  planActivity,
  recordAttempt,
  recordSituation,
  saveReview,
  startCampaign,
} from './commands'
import type { UserData } from '~/domain/types'

function expectOk<T>(outcome: CommandOutcome<T>): { data: UserData; value: T } {
  if (!outcome.ok) throw new Error(`expected success, got ${outcome.kind}: ${outcome.errors.join('; ')}`)
  return { data: outcome.data, value: outcome.value }
}

/** A registry holding ONLY the collaboration pack: leadership content is not installed at all. */
const collaborationOnly = createRegistry([COLLABORATION_PACK])

/** One instance per test: a fresh sequential factory would repeat ids across calls. */
function newDeps(): CommandDeps {
  return { clock: fixedClock(NOW), newId: sequentialIdFactory('c'), content: collaborationOnly }
}

const CAMPAIGN_ID = 'handover-between-units'

describe('the second domain, with leadership content not installed', () => {
  it('runs a campaign from start to close using only the collaboration pack', () => {
    const definition = collaborationOnly.campaign(CAMPAIGN_ID)
    expect(definition, 'the collaboration campaign must be installed').toBeDefined()
    if (!definition) return
    const deps = newDeps()

    let data = emptyUserData(NOW)

    // A situation in the other domain's language: a handover, not a decision nobody will close.
    const situation = expectOk(
      recordSituation(
        data,
        {
          title: 'Cases reach the service desk without the checks they expect',
          description: 'Both sides believe the other knows what a complete handover contains.',
          context: 'Service desk handover',
          desiredOutcome: 'Both sides can say what a complete handover contains.',
          authority: 'negotiate',
          decisionOwnership: 'clear',
          challenge: 'handover',
          constraints: ['no-shared-routine'],
          supportAvailable: ['peer'],
        },
        deps,
      ),
    )
    data = situation.data

    const started = expectOk(
      startCampaign(data, { situationId: situation.value.id, definitionId: CAMPAIGN_ID }, deps),
    )
    data = started.data
    expect(started.value.currentStepId).toBe(definition.firstStepId)
    expect(started.value.definitionVersion).toBe(definition.version)

    // Walk the campaign by always taking the first choice, until it closes or 40 steps pass.
    // Taking a fixed path keeps the test deterministic while still exercising the real graph.
    const visited: string[] = []
    const plannedActivities: string[] = []
    for (let guard = 0; guard < 40; guard += 1) {
      const campaign = data.campaigns.find((c) => c.id === started.value.id)
      if (!campaign || campaign.currentStepId === null) break
      const step = collaborationOnly.step(CAMPAIGN_ID, campaign.currentStepId)
      expect(step, `step ${campaign.currentStepId} must be in the installed pack`).toBeDefined()
      if (!step) break
      visited.push(step.id)

      // Where the step offers an activity, plan it with the real command.
      if (step.template && !plannedActivities.includes(step.template.id)) {
        const template = step.template
        const planned = expectOk(
          planActivity(
            data,
            {
              situationId: situation.value.id,
              campaignId: campaign.id,
              stepId: step.id,
              templateId: template.id,
              route: template.route,
              kind: template.kind,
              title: template.title,
              plan: {
                cue: template.suggestedPlan.cue ?? 'When the next case is handed over',
                action: template.suggestedPlan.action ?? 'Write down what was attached and what was missing',
                obstacle: template.suggestedPlan.obstacle ?? 'Only noticing the difficult case',
                fallback: template.suggestedPlan.fallback ?? 'Ask the coordinator which recent case was straightforward',
                signal: template.suggestedPlan.signal ?? 'Two written lists that can be compared',
                reviewOn: '2026-11-25',
              },
              capabilityIds: template.capabilityIds,
              methodIds: template.methodIds,
            },
            deps,
          ),
        )
        data = planned.data
        plannedActivities.push(template.id)

        const attempted = expectOk(
          recordAttempt(
            data,
            { activityId: planned.value.id, outcome: 'changed', note: 'It went differently than planned.', assistance: 'none' },
            deps,
          ),
        )
        data = attempted.data
        const reviewed = expectOk(
          saveReview(
            data,
            {
              activityId: planned.value.id,
              observation: 'The receiving side asked for two things we had not attached.',
              interpretation: 'We do not share the same idea of complete.',
              alternativeExplanation: 'Or this case was unusual and the usual ones are fine.',
              nextAdjustment: 'Compare a second case before concluding anything.',
              nextMove: 'adapt',
            },
            deps,
          ),
        )
        data = reviewed.data
      }

      // Walk strategy: go somewhere new if there is somewhere new, otherwise close. A campaign
      // may legitimately loop (review, adjust, try again), so always taking the first choice
      // would cycle for ever without that being a content defect.
      const unvisited = step.choices.find((c) => c.nextStepId !== null && !visited.includes(c.nextStepId))
      const closing = step.choices.find((c) => c.nextStepId === null)
      const choice = unvisited ?? closing ?? step.choices[0]
      expect(choice, `step ${step.id} must offer a choice`).toBeDefined()
      if (!choice) break
      const advanced = expectOk(
        advanceCampaign(data, { campaignId: campaign.id, choiceId: choice.id }, deps),
      )
      data = advanced.data
      if (advanced.value.closed) break
    }

    const finished = data.campaigns.find((c) => c.id === started.value.id)
    expect(finished?.currentStepId, 'the campaign must reach a closing choice').toBeNull()
    expect(finished?.state).toBe('completed')
    expect(visited.length).toBeGreaterThan(3)
    expect(plannedActivities.length).toBeGreaterThan(0)

    // The records are valid against a registry that has never heard of leadership.
    const validated = validateUserData(data, {
      knownCapabilityIds: collaborationOnly.capabilityIds(),
      knownMethodIds: collaborationOnly.methodIds(),
    })
    expect(validated.ok, validated.ok ? '' : validated.errors.join('; ')).toBe(true)

    // Every projection works, with no leadership capability anywhere in the result.
    const experience = derivePracticeExperience(data)
    expect(experience.total).toBeGreaterThan(0)
    const evidence = deriveCapabilityEvidence(data, collaborationOnly.capabilities())
    expect(evidence.length).toBe(collaborationOnly.capabilities().length)
    expect(evidence.some((row) => row.stage !== 'none')).toBe(true)
    const leadershipIds = new Set(LEADERSHIP_PACK.capabilities.map((c) => c.id))
    for (const row of evidence) expect(leadershipIds.has(row.capabilityId)).toBe(false)
    for (const id of Object.keys(experience.byCapability)) expect(leadershipIds.has(id)).toBe(false)

    const summary = deriveDevelopmentSummary(data, (_c, definitionId, stepId) => {
      const step = collaborationOnly.step(definitionId, stepId)
      return step ? { title: step.title, kind: step.kind } : undefined
    })
    expect(summary.nextActions.length).toBeGreaterThan(0)
    expect(summary.constraintsNoticed).toContain('no-shared-routine')

    // And the records round-trip through export and import unchanged.
    const reimported = parseImport(exportUserData(data), {
      knownCapabilityIds: collaborationOnly.capabilityIds(),
      knownMethodIds: collaborationOnly.methodIds(),
    })
    expect(reimported.ok, reimported.ok ? '' : reimported.errors.join('; ')).toBe(true)
    if (reimported.ok) expect(reimported.data).toEqual(data)
  })

  it('records a handover campaign’s shared-practice and conditions work as such', () => {
    // The collaboration pack's mechanism is a shared routine, not individual persuasion. If every
    // one of its branches came out as personal practice, the second domain would be the first one
    // relabelled — which is exactly what CONCEPT.md §8 warns against.
    const routes = new Set(
      (collaborationOnly.campaign(CAMPAIGN_ID)?.steps ?? []).flatMap((step) => step.choices.map((c) => c.route)),
    )
    expect(routes.has('shared-practice')).toBe(true)
    expect(routes.has('conditions')).toBe(true)

    const templateRoutes = new Set(
      (collaborationOnly.campaign(CAMPAIGN_ID)?.steps ?? []).flatMap((step) =>
        step.template ? [step.template.route] : [],
      ),
    )
    expect(templateRoutes.size).toBeGreaterThan(1)
  })

  it('keeps the two packs’ capability ids disjoint, so a record can always be explained', () => {
    const leadership = new Set(LEADERSHIP_PACK.capabilities.map((c) => c.id))
    const overlap = COLLABORATION_PACK.capabilities.filter((c) => leadership.has(c.id))
    expect(overlap.map((c) => c.id)).toEqual([])
  })
})
