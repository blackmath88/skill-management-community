import {
  type ActivityState,
  type CampaignState,
  type DirectionState,
  type HypothesisStatus,
} from './types'

/**
 * Legal transitions. History is not editable: an attempted activity cannot be un-attempted, and a
 * reviewed one cannot go back to planned. A person may always pause or abandon.
 *
 * Adapted from the quest transition table in blackmath88/leader-me src/domain/quest.ts.
 */
const ACTIVITY_TRANSITIONS: Record<ActivityState, readonly ActivityState[]> = {
  // An attempt may be recorded against a plan that was never marked ready: somebody can do the
  // thing before finishing the form, and refusing the record would lose what actually happened.
  planned: ['ready', 'attempted', 'paused', 'abandoned'],
  ready: ['planned', 'attempted', 'paused', 'abandoned'],
  // An attempt happened. It can be reviewed, or set aside without a review.
  attempted: ['reviewed', 'paused', 'abandoned'],
  // Terminal for progression purposes; a further attempt is a new activity.
  reviewed: [],
  // Resuming returns the activity to where it was. `resumeStateFor` decides which, because an
  // activity with an attempt must never go back to planned or ready: the attempt record would
  // then describe an activity that says it has not been attempted, which is a shape the stored
  // records are not allowed to take.
  paused: ['planned', 'ready', 'attempted', 'reviewed', 'abandoned'],
  abandoned: [],
}

/**
 * Where a paused activity goes when it is resumed.
 *
 * Resuming is one button, and the user is not asked to choose a state. Sending an activity that
 * has an attempt back to `planned` was a route to an unreadable record set, so the decision is
 * made here from what the records contain rather than from which button was pressed.
 */
export function resumeStateFor(options: { hasAttempt: boolean; hasReview: boolean; planIsReady: boolean }): ActivityState {
  if (options.hasReview) return 'reviewed'
  if (options.hasAttempt) return 'attempted'
  return options.planIsReady ? 'ready' : 'planned'
}

export function canTransitionActivity(from: ActivityState, to: ActivityState): boolean {
  return ACTIVITY_TRANSITIONS[from].includes(to)
}

export function activityTransitionsFrom(from: ActivityState): readonly ActivityState[] {
  return ACTIVITY_TRANSITIONS[from]
}

const CAMPAIGN_TRANSITIONS: Record<CampaignState, readonly CampaignState[]> = {
  active: ['paused', 'completed', 'abandoned'],
  paused: ['active', 'abandoned'],
  completed: [],
  abandoned: [],
}

export function canTransitionCampaign(from: CampaignState, to: CampaignState): boolean {
  return CAMPAIGN_TRANSITIONS[from].includes(to)
}

const DIRECTION_TRANSITIONS: Record<DirectionState, readonly DirectionState[]> = {
  active: ['paused', 'retired'],
  paused: ['active', 'retired'],
  retired: ['active'],
}

export function canTransitionDirection(from: DirectionState, to: DirectionState): boolean {
  return DIRECTION_TRANSITIONS[from].includes(to)
}

/**
 * A hypothesis may move freely between open conclusions: evidence can change a person's mind in
 * both directions. Only `rejected` is a deliberate end state the user can still reopen.
 */
const HYPOTHESIS_TRANSITIONS: Record<HypothesisStatus, readonly HypothesisStatus[]> = {
  open: ['supported', 'contradicted', 'rejected', 'parked'],
  supported: ['open', 'contradicted', 'parked', 'rejected'],
  contradicted: ['open', 'supported', 'parked', 'rejected'],
  parked: ['open', 'supported', 'contradicted', 'rejected'],
  rejected: ['open'],
}

export function canTransitionHypothesis(from: HypothesisStatus, to: HypothesisStatus): boolean {
  return HYPOTHESIS_TRANSITIONS[from].includes(to)
}
