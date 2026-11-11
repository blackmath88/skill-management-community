import { type ActivityKind, type ActivityPlan } from './types'

export type PlanField = keyof ActivityPlan

/**
 * Detail in proportion to the activity. An observation needs a cue and something to watch for;
 * a real attempt needs a fallback as well, because the point is to protect the person when the
 * obstacle appears. Requiring a long form for every small attempt is a product failure, not rigour.
 */
const REQUIRED: Record<ActivityKind, readonly PlanField[]> = {
  observation: ['cue', 'action', 'signal', 'reviewOn'],
  rehearsal: ['action', 'signal', 'reviewOn'],
  'real-attempt': ['cue', 'action', 'obstacle', 'fallback', 'signal', 'reviewOn'],
}

export function requiredPlanFields(kind: ActivityKind): readonly PlanField[] {
  return REQUIRED[kind]
}

const LABEL: Record<PlanField, string> = {
  cue: 'a cue that tells you when to act',
  action: 'a specific action',
  obstacle: 'the obstacle you expect',
  fallback: 'what you will do instead if the obstacle appears',
  signal: 'something you could observe',
  reviewOn: 'a review date',
}

export const PLAN_FIELD_LABEL: Readonly<Record<PlanField, string>> = LABEL

/** Minimum useful length for a free-text plan field. Short enough not to demand an essay. */
export const MIN_PLAN_FIELD_LENGTH = 8

export interface Readiness {
  ready: boolean
  /** Human-readable, in the order the form shows the fields. */
  missing: string[]
}

/** An activity is ready only when the fields its kind needs are actually filled in. */
export function planReadiness(kind: ActivityKind, plan: ActivityPlan): Readiness {
  const missing: string[] = []
  for (const field of REQUIRED[kind]) {
    const value = plan[field] ?? ''
    if (field === 'reviewOn') {
      if (value.trim() === '') missing.push(LABEL[field])
      continue
    }
    if (value.trim().length < MIN_PLAN_FIELD_LENGTH) missing.push(LABEL[field])
  }
  return { ready: missing.length === 0, missing }
}

export function emptyPlan(): ActivityPlan {
  return { cue: '', action: '', obstacle: '', fallback: '', signal: '', reviewOn: '' }
}
