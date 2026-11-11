/**
 * Capability evidence: what the records actually show, separately from practice experience.
 *
 * The ladder is deliberately descriptive. "Transferred" means the person practised in more than
 * one setting they described; it does not mean they are good at it. No stage on this ladder is a
 * competence claim, and the top stage is reachable without anybody assessing anything.
 *
 * The milestone names from Leader Me are kept as a second, coarser view so imported records keep
 * their historical meaning: see `legacyMilestoneFor` and ../../PROVENANCE.md.
 */
import type { Id, UserData } from './types'

/** Six independent facts about a capability, not a score. */
export type EvidenceStage =
  | 'none'
  /** A concept was applied to a real situation in writing. */
  | 'explored'
  /** Practised in a safe setting and reviewed. */
  | 'rehearsed'
  /** Attempted for real and reviewed, once. */
  | 'tried'
  /** Attempted for real and reviewed more than once. */
  | 'repeated'
  /** Real, reviewed attempts in more than one described context. */
  | 'transferred'

export const EVIDENCE_STAGES: readonly EvidenceStage[] = [
  'none',
  'explored',
  'rehearsed',
  'tried',
  'repeated',
  'transferred',
]

export const STAGE_LABEL: Readonly<Record<EvidenceStage, string>> = {
  none: 'No records yet',
  explored: 'Explored',
  rehearsed: 'Rehearsed',
  tried: 'Tried for real',
  repeated: 'Repeated',
  transferred: 'Tried in more than one setting',
}

/** Historical milestone vocabulary from Leader Me, retained so old records keep their meaning. */
export type LegacyMilestone = 'unexplored' | 'exploring' | 'practising' | 'broadening'

export const LEGACY_MILESTONE_LABEL: Readonly<Record<LegacyMilestone, string>> = {
  unexplored: 'Unexplored',
  exploring: 'Exploring',
  practising: 'Practising',
  broadening: 'Broadening',
}

/**
 * Documented equivalence between this app's stages and Leader Me's milestones. Broadening meant
 * three reflected quests across two contexts, which is this app's `transferred`; `repeated`
 * without a second context stays Practising, exactly as before.
 */
export function legacyMilestoneFor(stage: EvidenceStage): LegacyMilestone {
  switch (stage) {
    case 'none':
      return 'unexplored'
    case 'explored':
      return 'exploring'
    case 'rehearsed':
    case 'tried':
    case 'repeated':
      return 'practising'
    case 'transferred':
      return 'broadening'
  }
}

export const BROADENING_MIN_ATTEMPTS = 3
export const BROADENING_MIN_CONTEXTS = 2

export interface EvidenceRef {
  evidenceId?: Id
  activityId?: Id
  reviewId?: Id
  kind: string
  context: string
  title: string
}

export interface CapabilityEvidence {
  capabilityId: Id
  stage: EvidenceStage
  legacyMilestone: LegacyMilestone
  /** True when at least one attributed account from another person is linked. */
  feedbackAvailable: boolean
  counts: {
    explorations: number
    rehearsals: number
    realAttempts: number
    contexts: number
    conflictingAccounts: number
  }
  contexts: string[]
  refs: EvidenceRef[]
  /** Neutral explanation of why this stage applies and what would change it. */
  explanation: string
}

/** Normalise a user-described context label for breadth comparison. */
export function normaliseContext(context: string): string {
  return context.trim().replace(/\s+/g, ' ').toLowerCase()
}

interface CapabilityLike {
  id: Id
}

/**
 * Derive capability evidence from records. Pass the capability definitions the registry holds;
 * the domain never reaches into a content module itself.
 */
export function deriveCapabilityEvidence(
  data: UserData,
  capabilities: readonly CapabilityLike[],
): CapabilityEvidence[] {
  const situations = new Map(data.situations.map((s) => [s.id, s]))

  // Earliest qualifying review per activity; a second review adds nothing.
  const reviewFor = new Map<Id, { id: Id; at: string }>()
  for (const review of data.reviews) {
    const prev = reviewFor.get(review.activityId)
    if (!prev || review.reviewedAt < prev.at || (review.reviewedAt === prev.at && review.id < prev.id)) {
      reviewFor.set(review.activityId, { id: review.id, at: review.reviewedAt })
    }
  }
  const attemptedActivities = new Set(data.attempts.map((a) => a.activityId))
  const realisedOutcome = new Map<Id, string>()
  for (const attempt of data.attempts) {
    if (!realisedOutcome.has(attempt.activityId)) realisedOutcome.set(attempt.activityId, attempt.outcome)
  }

  const attemptIds = new Set(data.attempts.map((a) => a.id))
  const reviewIds = new Set(data.reviews.map((r) => r.id))
  const activityIds = new Set(data.activities.map((a) => a.id))
  const situationIdSet = new Set(data.situations.map((s) => s.id))

  // Evidence items that still point at a record that exists. A dangling item is ignored, which is
  // how deleting a record removes the claim it supported.
  const liveEvidence = data.evidence.filter(
    (e) =>
      (e.activityId === undefined || activityIds.has(e.activityId)) &&
      (e.attemptId === undefined || attemptIds.has(e.attemptId)) &&
      (e.reviewId === undefined || reviewIds.has(e.reviewId)) &&
      (e.situationId === undefined || situationIdSet.has(e.situationId)),
  )

  return capabilities.map((capability) => {
    const refs: EvidenceRef[] = []
    let explorations = 0
    let rehearsals = 0
    const realContexts: string[] = []
    let realAttempts = 0

    for (const activity of data.activities) {
      if (!activity.capabilityIds.includes(capability.id)) continue
      const situation = situations.get(activity.situationId)
      if (!situation) continue
      const context = normaliseContext(situation.context)
      const reviewed = reviewFor.get(activity.id)
      const attempted = attemptedActivities.has(activity.id)
      const outcome = realisedOutcome.get(activity.id)

      if (activity.kind === 'observation' && attempted) {
        explorations += 1
        refs.push({ activityId: activity.id, kind: 'observation', context, title: activity.title })
        continue
      }
      if (activity.kind === 'rehearsal' && attempted && reviewed) {
        rehearsals += 1
        refs.push({ activityId: activity.id, reviewId: reviewed.id, kind: 'rehearsal', context, title: activity.title })
        continue
      }
      if (activity.kind === 'real-attempt' && attempted && reviewed) {
        // The cue never arriving is a real thing to know, but it is not application.
        if (outcome === 'no-opportunity') {
          refs.push({ activityId: activity.id, reviewId: reviewed.id, kind: 'no opportunity', context, title: activity.title })
          continue
        }
        realAttempts += 1
        if (context !== '') realContexts.push(context)
        refs.push({ activityId: activity.id, reviewId: reviewed.id, kind: 'real attempt', context, title: activity.title })
      }
    }

    // Written explorations: evidence the user saved against a capability without acting yet.
    for (const item of liveEvidence) {
      if (!item.capabilityIds.includes(capability.id)) continue
      if (item.kind !== 'self-observation') continue
      if (item.activityId !== undefined) continue
      if (item.text.trim() === '') continue
      explorations += 1
      const context = item.situationId ? normaliseContext(situations.get(item.situationId)?.context ?? '') : ''
      refs.push({ evidenceId: item.id, kind: 'written exploration', context, title: item.text.slice(0, 60) })
    }

    const feedback = liveEvidence.filter(
      (e) => e.capabilityIds.includes(capability.id) && e.kind === 'attributed-feedback' && e.text.trim() !== '',
    )
    const conflicting = liveEvidence.filter(
      (e) => e.capabilityIds.includes(capability.id) && e.kind === 'other-account' && e.text.trim() !== '',
    )
    for (const item of feedback) {
      refs.push({ evidenceId: item.id, kind: 'feedback from someone else', context: '', title: item.text.slice(0, 60) })
    }

    const contexts = [...new Set(realContexts)]
    let stage: EvidenceStage = 'none'
    if (realAttempts >= BROADENING_MIN_ATTEMPTS && contexts.length >= BROADENING_MIN_CONTEXTS) stage = 'transferred'
    else if (realAttempts >= 2) stage = 'repeated'
    else if (realAttempts >= 1) stage = 'tried'
    else if (rehearsals >= 1) stage = 'rehearsed'
    else if (explorations >= 1) stage = 'explored'

    return {
      capabilityId: capability.id,
      stage,
      legacyMilestone: legacyMilestoneFor(stage),
      feedbackAvailable: feedback.length > 0,
      counts: {
        explorations,
        rehearsals,
        realAttempts,
        contexts: contexts.length,
        conflictingAccounts: conflicting.length,
      },
      contexts,
      refs,
      explanation: explain(stage, explorations, rehearsals, realAttempts, contexts.length, feedback.length, conflicting.length),
    }
  })
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

function explain(
  stage: EvidenceStage,
  explorations: number,
  rehearsals: number,
  realAttempts: number,
  contexts: number,
  feedback: number,
  conflicting: number,
): string {
  const basis = `Based on ${plural(explorations, 'written exploration', 'written explorations')}, ${plural(
    rehearsals,
    'reviewed rehearsal',
    'reviewed rehearsals',
  )} and ${plural(realAttempts, 'reviewed real attempt', 'reviewed real attempts')} across ${plural(
    contexts,
    'setting',
    'settings',
  )}.`
  const extra: string[] = []
  if (feedback > 0) extra.push(`${plural(feedback, 'account', 'accounts')} from someone else ${feedback === 1 ? 'is' : 'are'} linked.`)
  if (conflicting > 0) extra.push(`${plural(conflicting, 'account', 'accounts')} ${conflicting === 1 ? 'describes' : 'describe'} this differently from you; both are kept.`)

  let next: string
  switch (stage) {
    case 'none':
      next = 'Writing how a method applies to one of your situations would record an exploration.'
      break
    case 'explored':
      next = 'A rehearsal with a review, or a real attempt with a review, would be recorded next.'
      break
    case 'rehearsed':
      next = 'A rehearsal is preparation. A reviewed attempt at work would record that you tried it for real.'
      break
    case 'tried':
      next = 'A second reviewed real attempt would record repetition. This is not a judgement of how well it went.'
      break
    case 'repeated':
      next = `A reviewed real attempt in a different setting, up to ${BROADENING_MIN_ATTEMPTS} in total, would record practice in more than one setting.`
      break
    case 'transferred':
      next = 'This records breadth of practice across settings. It is not mastery and not an assessment.'
      break
  }
  return [basis, ...extra, next].join(' ')
}
