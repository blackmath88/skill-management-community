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
  planned: ['ready', 'paused', 'abandoned'],
  ready: ['planned', 'attempted', 'paused', 'abandoned'],
  // An attempt happened. It can be reviewed, or set aside without a review.
  attempted: ['reviewed', 'paused', 'abandoned'],
  // Terminal for progression purposes; a further attempt is a new activity.
  reviewed: [],
  paused: ['planned', 'ready', 'attempted', 'abandoned'],
  abandoned: [],
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
