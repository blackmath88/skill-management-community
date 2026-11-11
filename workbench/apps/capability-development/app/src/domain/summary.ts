/**
 * Development summary: the one read model the home screen needs.
 *
 * Its job is to answer "what is the next useful thing I could do?" without implying that doing
 * more is better. Pausing and stopping are offered alongside every suggestion, and a suggestion
 * about conditions is never dressed up as a personal training need.
 */
import { planReadiness } from './plan'
import type {
  Campaign,
  ConstraintKind,
  DevelopmentDirection,
  DevelopmentRoute,
  Id,
  PracticeActivity,
  Situation,
  UserData,
  WorkingHypothesis,
} from './types'

export type NextActionKind =
  | 'choose-direction'
  | 'describe-situation'
  | 'start-campaign'
  | 'continue-campaign'
  | 'finish-plan'
  | 'record-attempt'
  | 'review-attempt'
  | 'decide-hypothesis'
  | 'nothing-pending'

export interface NextAction {
  kind: NextActionKind
  /** Short imperative label. */
  label: string
  /** Why this is being suggested, from the records. Never "you should improve X". */
  reason: string
  route?: DevelopmentRoute
  campaignId?: Id
  activityId?: Id
  situationId?: Id
  hypothesisId?: Id
}

export interface DevelopmentSummary {
  activeDirection: DevelopmentDirection | null
  activeCampaign: Campaign | null
  /** The campaign's current authored step, if the content for it is still installed. */
  currentStepTitle: string | null
  /** Up to three suggestions, most useful first. Always includes a way to pause or stop. */
  nextActions: NextAction[]
  openHypotheses: WorkingHypothesis[]
  /** Barriers the user recorded across their situations, deduplicated. */
  constraintsNoticed: ConstraintKind[]
  /** Activities waiting for an attempt record, oldest review date first. */
  awaitingAttempt: PracticeActivity[]
  awaitingReview: PracticeActivity[]
  counts: {
    situations: number
    activities: number
    realAttempts: number
    rehearsals: number
    reviews: number
    evidence: number
  }
}

export interface StepLookup {
  (campaignId: Id, definitionId: Id, stepId: Id): { title: string; kind: string } | undefined
}

export function deriveDevelopmentSummary(data: UserData, lookupStep?: StepLookup): DevelopmentSummary {
  const activeDirection = data.directions.find((d) => d.state === 'active') ?? null
  const activeCampaign = data.campaigns.find((c) => c.state === 'active') ?? null
  const attemptedIds = new Set(data.attempts.map((a) => a.activityId))
  const reviewedIds = new Set(data.reviews.map((r) => r.activityId))

  const awaitingAttempt = data.activities
    .filter((a) => a.state === 'ready' && !attemptedIds.has(a.id))
    .sort(byReviewDate)
  const awaitingReview = data.activities
    .filter((a) => a.state === 'attempted' && !reviewedIds.has(a.id))
    .sort(byReviewDate)
  const unfinishedPlans = data.activities.filter(
    (a) => a.state === 'planned' && !planReadiness(a.kind, a.plan).ready,
  )
  const openHypotheses = data.hypotheses.filter((h) => h.status === 'open')

  const step =
    activeCampaign && activeCampaign.currentStepId && lookupStep
      ? lookupStep(activeCampaign.id, activeCampaign.definitionId, activeCampaign.currentStepId)
      : undefined

  const nextActions: NextAction[] = []

  if (awaitingReview[0]) {
    const activity = awaitingReview[0]
    nextActions.push({
      kind: 'review-attempt',
      label: `Review: ${activity.title}`,
      reason: 'You recorded an attempt and have not written down what you observed yet.',
      route: activity.route,
      activityId: activity.id,
    })
  }
  if (awaitingAttempt[0]) {
    const activity = awaitingAttempt[0]
    nextActions.push({
      kind: 'record-attempt',
      label: `Record what happened: ${activity.title}`,
      reason:
        activity.kind === 'real-attempt'
          ? 'This is planned for the real situation. Recording that the cue never arrived is also a useful answer.'
          : 'This is planned. Recording that it did not happen is also a useful answer.',
      route: activity.route,
      activityId: activity.id,
    })
  }
  if (unfinishedPlans[0]) {
    const activity = unfinishedPlans[0]
    const missing = planReadiness(activity.kind, activity.plan).missing
    nextActions.push({
      kind: 'finish-plan',
      label: `Finish planning: ${activity.title}`,
      reason: `This plan still needs ${missing.join(', ')}.`,
      route: activity.route,
      activityId: activity.id,
    })
  }
  if (activeCampaign && activeCampaign.currentStepId) {
    nextActions.push({
      kind: 'continue-campaign',
      label: step ? `Continue: ${step.title}` : 'Continue your campaign',
      reason: step
        ? `Your campaign is at "${step.title}". You can also pause or stop it.`
        : 'Your campaign is part-way through. The step it is on comes from content that is not installed; you can still pause or stop it.',
      campaignId: activeCampaign.id,
    })
  }
  if (openHypotheses[0] && nextActions.length < 3) {
    const hypothesis = openHypotheses[0]
    nextActions.push({
      kind: 'decide-hypothesis',
      label: 'Decide what an open explanation now looks like',
      reason: 'You are holding an explanation open. Evidence may now support it, contradict it, or neither.',
      route: hypothesis.category,
      hypothesisId: hypothesis.id,
    })
  }
  if (data.situations.length === 0) {
    nextActions.push({
      kind: 'describe-situation',
      label: 'Describe a situation you are in',
      reason: 'You can start from a real situation. A direction is optional and can come later.',
    })
  } else if (!activeCampaign) {
    const situation = data.situations[data.situations.length - 1]
    nextActions.push({
      kind: 'start-campaign',
      label: 'Start a campaign on one of your situations',
      reason: 'A campaign is a bounded intention, not a course. You can stop it at any step.',
      ...(situation ? { situationId: situation.id } : {}),
    })
  }
  if (!activeDirection && data.directions.length === 0 && nextActions.length < 3) {
    nextActions.push({
      kind: 'choose-direction',
      label: 'Write a direction in your own words',
      reason: 'Optional. A direction is an aspiration you can revise, not a gap we found.',
    })
  }
  if (nextActions.length === 0) {
    nextActions.push({
      kind: 'nothing-pending',
      label: 'Nothing is waiting for you',
      reason: 'There is no outstanding step. Coming back when something real happens is a reasonable choice.',
    })
  }

  const constraints = new Set<ConstraintKind>()
  for (const situation of data.situations) for (const c of situation.constraints) constraints.add(c)

  const realAttempts = data.attempts.filter((attempt) => {
    const activity = data.activities.find((a) => a.id === attempt.activityId)
    return activity?.kind === 'real-attempt' && attempt.outcome !== 'no-opportunity'
  }).length

  return {
    activeDirection,
    activeCampaign,
    currentStepTitle: step?.title ?? null,
    nextActions: nextActions.slice(0, 3),
    openHypotheses,
    constraintsNoticed: [...constraints],
    awaitingAttempt,
    awaitingReview,
    counts: {
      situations: data.situations.length,
      activities: data.activities.length,
      realAttempts,
      rehearsals: data.activities.filter((a) => a.kind === 'rehearsal').length,
      reviews: data.reviews.length,
      evidence: data.evidence.length,
    },
  }
}

function byReviewDate(a: PracticeActivity, b: PracticeActivity): number {
  const left = a.plan.reviewOn || '9999-12-31'
  const right = b.plan.reviewOn || '9999-12-31'
  if (left !== right) return left < right ? -1 : 1
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
}

/** Situations with no campaign yet, newest first. */
export function situationsWithoutCampaign(data: UserData): Situation[] {
  const used = new Set(data.campaigns.filter((c) => c.state === 'active').map((c) => c.situationId))
  return data.situations.filter((s) => !used.has(s.id)).reverse()
}
