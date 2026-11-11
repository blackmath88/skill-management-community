import type { Id, IsoUtc, UserData } from './types'

/**
 * Deletion cascades. Every projection recomputes from records, so removing a record must remove
 * what depended on it: an evidence-linked view may never keep a claim its evidence no longer
 * supports. Cosmetic appearance is deliberately NOT touched here; see experience.ts.
 *
 * Adapted from blackmath88/leader-me src/domain/quest.ts cascade helpers.
 */

/**
 * Remove evidence items, unlink them from hypotheses, and reopen any conclusion that rested on
 * them alone.
 *
 * The unlinking is the easy half. The half that matters: a hypothesis a person marked "evidence
 * supports it" must not keep saying so once the evidence is gone. Leaving the status alone would
 * show them a conclusion as evidence-backed with nothing behind it, which is precisely what an
 * evidence-linked view is supposed to prevent.
 *
 * Only a conclusion that was *derived from evidence* is reopened. A hypothesis somebody decided
 * without linking anything never had links to lose, so it is untouched.
 */
export function deleteEvidenceCascade(
  data: UserData,
  evidenceIds: ReadonlySet<Id>,
  /** Used only for the history entry on a reopened conclusion. */
  now?: IsoUtc,
): UserData {
  if (evidenceIds.size === 0) return data
  const at = now ?? new Date().toISOString()
  return {
    ...data,
    evidence: data.evidence.filter((e) => !evidenceIds.has(e.id)),
    hypotheses: data.hypotheses.map((h) => {
      if (!h.evidenceIds.some((id) => evidenceIds.has(id))) return h
      const remaining = h.evidenceIds.filter((id) => !evidenceIds.has(id))
      const restsOnDeletedEvidence =
        remaining.length === 0 && (h.status === 'supported' || h.status === 'contradicted')
      if (!restsOnDeletedEvidence) return { ...h, evidenceIds: remaining }
      return {
        ...h,
        evidenceIds: remaining,
        status: 'open' as const,
        updatedAt: at,
        history: [
          ...h.history,
          {
            at,
            status: 'open' as const,
            text: h.text,
            note: `Reopened automatically: the evidence this conclusion rested on was deleted. Your earlier view (${h.status}) is kept above.`,
          },
        ],
      }
    }),
  }
}

/** Remove activities with their attempts, reviews, evidence, perk links and campaign path links. */
export function deleteActivitiesCascade(data: UserData, activityIds: ReadonlySet<Id>): UserData {
  if (activityIds.size === 0) return data
  const attemptIds = new Set(data.attempts.filter((a) => activityIds.has(a.activityId)).map((a) => a.id))
  const reviewIds = new Set(data.reviews.filter((r) => activityIds.has(r.activityId)).map((r) => r.id))
  const orphanEvidence = new Set(
    data.evidence
      .filter(
        (e) =>
          (e.activityId !== undefined && activityIds.has(e.activityId)) ||
          (e.attemptId !== undefined && attemptIds.has(e.attemptId)) ||
          (e.reviewId !== undefined && reviewIds.has(e.reviewId)),
      )
      .map((e) => e.id),
  )
  const pruned = deleteEvidenceCascade(data, orphanEvidence)
  return {
    ...pruned,
    activities: pruned.activities.filter((a) => !activityIds.has(a.id)),
    attempts: pruned.attempts.filter((a) => !activityIds.has(a.activityId)),
    reviews: pruned.reviews.filter((r) => !activityIds.has(r.activityId)),
    // A confirmed strength must point at something the person actually did: `confirmPerk`
    // refuses to create one without an example. A perk whose every example has been deleted no
    // longer meets that bar, so it goes with them rather than standing as an unsupported claim
    // about somebody — which is the one thing this product must not leave behind.
    perks: pruned.perks.flatMap((p) => {
      if (!p.evidenceActivityIds.some((id) => activityIds.has(id))) return [p]
      const remaining = p.evidenceActivityIds.filter((id) => !activityIds.has(id))
      return remaining.length === 0 ? [] : [{ ...p, evidenceActivityIds: remaining }]
    }),
    campaigns: pruned.campaigns.map((c) =>
      c.path.some((entry) => entry.activityIds.some((id) => activityIds.has(id)))
        ? {
            ...c,
            path: c.path.map((entry) => ({
              ...entry,
              activityIds: entry.activityIds.filter((id) => !activityIds.has(id)),
            })),
          }
        : c,
    ),
    proposals: pruned.proposals.map((p) =>
      p.referencedIds.some((id) => activityIds.has(id)) && p.state === 'offered'
        ? { ...p, state: 'invalid' as const }
        : p,
    ),
  }
}

export function deleteActivityCascade(data: UserData, activityId: Id): UserData {
  return deleteActivitiesCascade(data, new Set([activityId]))
}

/** Remove a campaign. Its activities survive as free-standing practice unless asked otherwise. */
export function deleteCampaignCascade(data: UserData, campaignId: Id, withActivities: boolean): UserData {
  const activityIds = new Set(
    data.activities.filter((a) => a.campaignId === campaignId).map((a) => a.id),
  )
  const base = withActivities ? deleteActivitiesCascade(data, activityIds) : data
  return {
    ...base,
    campaigns: base.campaigns.filter((c) => c.id !== campaignId),
    activities: base.activities.map((a) => {
      if (a.campaignId !== campaignId) return a
      const { campaignId: _dropped, stepId: _step, ...rest } = a
      return rest
    }),
    hypotheses: base.hypotheses.map((h) => {
      if (h.campaignId !== campaignId) return h
      const { campaignId: _dropped, ...rest } = h
      return rest
    }),
  }
}

/** Remove a situation with its campaigns, activities, hypotheses and their dependants. */
export function deleteSituationCascade(data: UserData, situationId: Id): UserData {
  const activityIds = new Set(data.activities.filter((a) => a.situationId === situationId).map((a) => a.id))
  const pruned = deleteActivitiesCascade(data, activityIds)
  const situationEvidence = new Set(
    pruned.evidence.filter((e) => e.situationId === situationId).map((e) => e.id),
  )
  const withoutEvidence = deleteEvidenceCascade(pruned, situationEvidence)
  return {
    ...withoutEvidence,
    situations: withoutEvidence.situations.filter((s) => s.id !== situationId),
    campaigns: withoutEvidence.campaigns.filter((c) => c.situationId !== situationId),
    hypotheses: withoutEvidence.hypotheses.filter((h) => h.situationId !== situationId),
  }
}

/** Remove a direction. Campaigns and activities keep their records but lose the link. */
export function deleteDirectionCascade(data: UserData, directionId: Id): UserData {
  return {
    ...data,
    directions: data.directions.filter((d) => d.id !== directionId),
    campaigns: data.campaigns.map((c) => {
      if (c.directionId !== directionId) return c
      const { directionId: _dropped, ...rest } = c
      return rest
    }),
    activities: data.activities.map((a) => {
      if (a.directionId !== directionId) return a
      const { directionId: _dropped, ...rest } = a
      return rest
    }),
  }
}

export function deleteReviewCascade(data: UserData, reviewId: Id): UserData {
  const review = data.reviews.find((r) => r.id === reviewId)
  if (!review) return data
  const orphanEvidence = new Set(data.evidence.filter((e) => e.reviewId === reviewId).map((e) => e.id))
  const pruned = deleteEvidenceCascade(data, orphanEvidence)
  return {
    ...pruned,
    reviews: pruned.reviews.filter((r) => r.id !== reviewId),
    // The activity was still attempted; it returns to "attempted", not to "planned".
    activities: pruned.activities.map((a) =>
      a.id === review.activityId && a.state === 'reviewed' ? { ...a, state: 'attempted' as const } : a,
    ),
  }
}
