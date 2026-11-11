/**
 * Practice experience: deterministic credit for eligible documented practice.
 *
 * This is an explicit, versioned product convention. It is NOT competence, mastery, a rating or
 * an assessment of anybody's ability. The numbers below are a prototype convention and remain
 * proposed until tested with real users (see ../../PLAN.md stage 3).
 *
 * Invariants the tests hold to:
 *   - Credit is per activity, never per capability tag, so adding tags cannot multiply it.
 *   - Opening the app, text length, conversation volume and duplicate saves earn nothing.
 *   - Claiming success earns nothing; a changed, stopped or interrupted attempt still qualifies.
 *   - A rehearsal earns less than a real attempt and is never recorded as application.
 *   - Deleting a record removes its credit, because every total is derived, never stored.
 */
import type {
  ActivityKind,
  AttemptOutcome,
  Id,
  PracticeActivity,
  UserData,
} from './types'

/** Bump this whenever a weight or rule changes, and keep the old entry readable below. */
export const EXPERIENCE_POLICY_VERSION = 1

export interface ExperiencePolicy {
  version: number
  label: string
  /** Base credit by activity kind, for an attempted activity. */
  base: Record<ActivityKind, number>
  /** A reviewed activity whose review offers a competing explanation. */
  reviewBonus: number
  /** Attributed feedback from another person, linked as evidence. */
  feedbackBonus: number
  /** Outcomes that earn no base credit because the practice did not take place. */
  zeroBaseOutcomes: readonly AttemptOutcome[]
  /** Credit for noticing and reviewing that the opportunity never arrived. */
  noOpportunityReviewCredit: number
}

export const POLICY_V1: ExperiencePolicy = {
  version: 1,
  label: 'Practice experience convention v1 (prototype)',
  base: { observation: 1, rehearsal: 1, 'real-attempt': 2 },
  reviewBonus: 1,
  feedbackBonus: 1,
  zeroBaseOutcomes: ['no-opportunity'],
  noOpportunityReviewCredit: 1,
}

/** Every policy version this build can still explain, so old records stay interpretable. */
export const EXPERIENCE_POLICIES: Readonly<Record<number, ExperiencePolicy>> = { 1: POLICY_V1 }

export function policyForVersion(version: number): ExperiencePolicy | undefined {
  return EXPERIENCE_POLICIES[version]
}

export interface ExperienceEntry {
  activityId: Id
  title: string
  kind: ActivityKind
  outcome: AttemptOutcome | null
  credit: number
  /** Plain-language reason, shown to the user next to the number. */
  explanation: string
  /** Capabilities this activity practised. Credit is NOT multiplied across them. */
  capabilityIds: Id[]
}

export interface PracticeExperience {
  policyVersion: number
  policyLabel: string
  total: number
  entries: ExperienceEntry[]
  /** Credit attributed to each capability for display. Sums may exceed `total` by design: the
   * same activity appears under every capability it practised, without earning more. */
  byCapability: Record<Id, number>
  /** Things that deliberately earn nothing, shown in the UI so the rules are not a mystery. */
  nonCreditedNotes: string[]
}

const NON_CREDITED_NOTES: readonly string[] = [
  'Opening the app, reading content or browsing your records earns nothing.',
  'Longer text, extra capability tags and saving the same activity again earn nothing.',
  'Saying an attempt went well earns nothing. A changed, stopped or interrupted attempt still counts.',
  'A rehearsal counts as preparation. It is never recorded as something you did at work.',
]

function kindLabel(kind: ActivityKind): string {
  if (kind === 'real-attempt') return 'real attempt'
  return kind
}

/**
 * Derive practice experience from eligible records only. Totals are never imported or stored:
 * an import that carried a total would let a file assert practice that never happened.
 */
export function derivePracticeExperience(
  data: UserData,
  policy: ExperiencePolicy = POLICY_V1,
): PracticeExperience {
  // One attempt per activity counts: the earliest, so re-recording cannot add credit.
  const firstAttempt = new Map<Id, { id: Id; at: string; outcome: AttemptOutcome }>()
  for (const attempt of data.attempts) {
    const prev = firstAttempt.get(attempt.activityId)
    if (!prev || attempt.attemptedAt < prev.at || (attempt.attemptedAt === prev.at && attempt.id < prev.id)) {
      firstAttempt.set(attempt.activityId, { id: attempt.id, at: attempt.attemptedAt, outcome: attempt.outcome })
    }
  }

  // One review per activity counts, and only if it offers a competing explanation.
  const qualifyingReview = new Map<Id, Id>()
  for (const review of [...data.reviews].sort((a, b) => (a.reviewedAt < b.reviewedAt ? -1 : a.reviewedAt > b.reviewedAt ? 1 : a.id < b.id ? -1 : 1))) {
    if (qualifyingReview.has(review.activityId)) continue
    if (review.alternativeExplanation.trim() === '') continue
    qualifyingReview.set(review.activityId, review.id)
  }

  const situationIds = new Set(data.situations.map((s) => s.id))
  const attemptIds = new Set(data.attempts.map((a) => a.id))
  const reviewIds = new Set(data.reviews.map((r) => r.id))

  // Activities with attributed feedback from another person, linked to this activity.
  const withFeedback = new Set<Id>()
  for (const item of data.evidence) {
    if (item.kind !== 'attributed-feedback') continue
    const activityId = resolveActivityId(item.activityId, item.attemptId, item.reviewId, data)
    if (activityId === undefined) continue
    if (item.attemptId !== undefined && !attemptIds.has(item.attemptId)) continue
    if (item.reviewId !== undefined && !reviewIds.has(item.reviewId)) continue
    withFeedback.add(activityId)
  }

  const entries: ExperienceEntry[] = []
  const byCapability: Record<Id, number> = {}
  const seen = new Set<Id>()

  for (const activity of data.activities) {
    if (seen.has(activity.id)) continue
    seen.add(activity.id)
    // An activity hanging off a missing situation is not interpretable practice.
    if (!situationIds.has(activity.situationId)) continue
    const attempt = firstAttempt.get(activity.id)
    if (!attempt) continue
    if (activity.state !== 'attempted' && activity.state !== 'reviewed') continue

    const reviewed = qualifyingReview.has(activity.id)
    const zeroBase = policy.zeroBaseOutcomes.includes(attempt.outcome)
    let credit = zeroBase ? 0 : policy.base[activity.kind]
    const reasons: string[] = []

    if (zeroBase) {
      if (reviewed) {
        credit += policy.noOpportunityReviewCredit
        reasons.push(
          `The cue never arrived, so there is no practice to credit. Noticing that and reviewing it counts ${policy.noOpportunityReviewCredit}.`,
        )
      } else {
        reasons.push('The cue never arrived. Reviewing what blocked it would count.')
      }
    } else {
      reasons.push(`${capitalise(kindLabel(activity.kind))}: ${policy.base[activity.kind]}.`)
      if (attempt.outcome !== 'as-planned') {
        reasons.push(`The attempt ${attempt.outcome === 'changed' ? 'changed as you went' : attempt.outcome}; that still counts.`)
      }
      if (reviewed) {
        credit += policy.reviewBonus
        reasons.push(`Reviewed with a competing explanation: +${policy.reviewBonus}.`)
      } else {
        reasons.push('A review with a competing explanation would add 1.')
      }
    }

    if (withFeedback.has(activity.id)) {
      credit += policy.feedbackBonus
      reasons.push(`Feedback from someone else is linked: +${policy.feedbackBonus}.`)
    }

    if (activity.kind === 'rehearsal') {
      reasons.push('This was a rehearsal. It is preparation, not something you did at work.')
    }

    entries.push({
      activityId: activity.id,
      title: activity.title,
      kind: activity.kind,
      outcome: attempt.outcome,
      credit,
      explanation: reasons.join(' '),
      capabilityIds: [...new Set(activity.capabilityIds)],
    })

    // Display attribution only. The same credit is shown under each capability; it is not added
    // to the total more than once, so tagging more capabilities cannot inflate anything.
    for (const capabilityId of new Set(activity.capabilityIds)) {
      byCapability[capabilityId] = (byCapability[capabilityId] ?? 0) + credit
    }
  }

  return {
    policyVersion: policy.version,
    policyLabel: policy.label,
    total: entries.reduce((sum, entry) => sum + entry.credit, 0),
    entries,
    byCapability,
    nonCreditedNotes: [...NON_CREDITED_NOTES],
  }
}

function resolveActivityId(
  activityId: Id | undefined,
  attemptId: Id | undefined,
  reviewId: Id | undefined,
  data: UserData,
): Id | undefined {
  if (activityId !== undefined) return activityId
  if (attemptId !== undefined) return data.attempts.find((a) => a.id === attemptId)?.activityId
  if (reviewId !== undefined) return data.reviews.find((r) => r.id === reviewId)?.activityId
  return undefined
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

// ---------------------------------------------------------------- Appearance retention

export type AppearanceRetentionPolicy = 'retain-chosen'

/**
 * Decided policy (see ../../DECISIONS.md D-A4): a person keeps an appearance they chose, even
 * after the records that were present when they chose it are deleted. Appearance is a cosmetic
 * choice, not a claim, so it is not recomputed. The separate consequence is that deleting
 * evidence always removes the evidence-linked claim: see evidence.ts.
 *
 * This function exists so the policy is a named, tested decision rather than an accident of
 * which cascade happened to touch the profile.
 */
export const APPEARANCE_RETENTION: AppearanceRetentionPolicy = 'retain-chosen'

export function appearanceSurvivesEvidenceDeletion(): boolean {
  return APPEARANCE_RETENTION === 'retain-chosen'
}

/** Never show an appearance as proof of anything. Used verbatim in the UI. */
export const APPEARANCE_DISCLAIMER =
  'Your appearance is a choice you made, not a record of what you can do. It stays as you set it, whatever you add or delete.'

/** Activities whose practice the user may point to when confirming a perk. */
export function perkEligibleActivities(data: UserData): PracticeActivity[] {
  return data.activities.filter((a) => a.state === 'attempted' || a.state === 'reviewed')
}
