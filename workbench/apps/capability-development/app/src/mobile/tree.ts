/**
 * The skill tree: what each piece of the mobile is, right now, and the road ahead.
 *
 * This is the one place that turns records, self-placements, a chosen target and the season in
 * progress into what the main screen shows. It keeps two things apart on purpose:
 *
 *   - what the person SAYS (a placement: "with help", "can do", "regularly"), and
 *   - what the RECORDS show (the evidence stage, derived by ~/domain/evidence, unchanged).
 *
 * A piece's state is the stronger of the two for drawing, but never merges them: a claimed piece
 * is primed, not painted, and only recorded practice paints it. Nothing here goes backwards with
 * time. A season past its review date is "due a look", not late, and no state is ever lost.
 */
import type { CapabilityRow } from '~/application/queries'
import type { CapabilityGroupDefinition } from '~/content/types'
import { target as findTarget, type Target } from '~/content/targets'
import type { ClaimLevel, Id, Season, UserData } from '~/domain/types'

/** How a piece is made, from least to most. Each step means one checkable thing. */
export type PieceState =
  /** Nothing said, nothing recorded: a wire outline in its place. */
  | 'outline'
  /** The person placed themselves on it; no records yet. Primed, unpainted. */
  | 'claimed'
  /** Applied in writing to a real situation. Painted. */
  | 'explored'
  /** Rehearsed and reflected on. One engraved line. */
  | 'rehearsed'
  /** Tried for real and reflected on, once. Engraved and pierced. */
  | 'tried'
  /** Tried for real more than once. An inlaid ring. */
  | 'repeated'
  /** Tried for real in more than one setting. A second, smaller pendant. */
  | 'transferred'

export const PIECE_STATES: readonly PieceState[] = ['outline', 'claimed', 'explored', 'rehearsed', 'tried', 'repeated', 'transferred']

export const PIECE_LABEL: Readonly<Record<PieceState, string>> = {
  outline: 'Not started',
  claimed: 'Your own placement, no records yet',
  explored: 'Explored in writing',
  rehearsed: 'Rehearsed',
  tried: 'Tried for real',
  repeated: 'Tried more than once',
  transferred: 'Tried in more than one setting',
}

export const CLAIM_LABEL: Readonly<Record<ClaimLevel, string>> = {
  'not-yet': 'Not yet',
  'with-help': 'With help',
  'can-do': 'I can do this',
  regularly: 'I do this regularly',
}

export interface Piece {
  slot: number
  capabilityId: Id
  title: string
  branchId: string
  state: PieceState
  claim: ClaimLevel | null
  inTarget: boolean
  inFocus: boolean
  row: CapabilityRow
}

export interface TreeBranch {
  id: string
  title: string
  summary: string
  pieces: Piece[]
  /** Pieces with any state beyond an outline. */
  have: number
  /** Target pieces on this branch that are still outlines or only claimed. */
  open: number
  active: boolean
}

export interface RoadStop {
  branchId: string
  title: string
  /** Why it is here: the person queued it, or the target points at it. */
  because: 'chosen' | 'target'
  open: number
}

export interface Tree {
  branches: TreeBranch[]
  pieces: Piece[]
  target: Target | null
  /** True once the person has placed themselves on anything or recorded anything. */
  begun: boolean
  season: (Season & { title: string; daysLeft: number; due: boolean; weeks: number }) | null
  /** Up to three branches after the current one. */
  next: RoadStop[]
  /** Counts for one quiet line of text. */
  totals: { pieces: number; have: number; practised: number; targetOpen: number; targetSize: number }
  pastSeasons: (Season & { title: string })[]
}

const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)

export function deriveTree(data: UserData, rows: readonly CapabilityRow[], groups: readonly CapabilityGroupDefinition[], today: string): Tree {
  const journey = data.profile.journey
  const target = findTarget(journey?.targetId) ?? null
  const claims = new Map((journey?.claims ?? []).map((c) => [c.capabilityId, c.level]))
  const active = journey?.seasons.find((s) => s.endedOn === undefined) ?? null
  const inTarget = new Set(target?.capabilityIds ?? [])

  let slot = 0
  const branches: TreeBranch[] = groups
    .map((group) => {
      const pieces: Piece[] = rows
        .filter((row) => row.group === group.id)
        .map((row) => {
          const id = row.evidence.capabilityId
          const claim = claims.get(id) ?? null
          const stage = row.evidence.stage
          const state: PieceState = stage !== 'none' ? stage : claim !== null && claim !== 'not-yet' ? 'claimed' : 'outline'
          return {
            slot: slot++,
            capabilityId: id,
            title: row.title,
            branchId: group.id,
            state,
            claim,
            inTarget: inTarget.has(id),
            inFocus: active !== null && active.branchId === group.id && (active.capabilityIds.length === 0 || active.capabilityIds.includes(id)),
            row,
          }
        })
      return {
        id: group.id,
        title: group.title,
        summary: group.summary,
        pieces,
        have: pieces.filter((p) => p.state !== 'outline').length,
        open: pieces.filter((p) => p.inTarget && (p.state === 'outline' || p.state === 'claimed')).length,
        active: active?.branchId === group.id,
      }
    })
    .filter((branch) => branch.pieces.length > 0)

  const pieces = branches.flatMap((b) => b.pieces)
  const titleOf = (branchId: string) => branches.find((b) => b.id === branchId)?.title ?? 'A branch that is no longer installed'

  // The road ahead: what the person queued, then where the target still has open pieces.
  const queued: RoadStop[] = (journey?.queue ?? [])
    .filter((id) => id !== active?.branchId && branches.some((b) => b.id === id))
    .map((id) => ({ branchId: id, title: titleOf(id), because: 'chosen' as const, open: branches.find((b) => b.id === id)?.open ?? 0 }))
  const suggested: RoadStop[] = branches
    .filter((b) => b.open > 0 && b.id !== active?.branchId && !queued.some((q) => q.branchId === b.id))
    .sort((a, b) => b.open - a.open)
    .map((b) => ({ branchId: b.id, title: b.title, because: 'target' as const, open: b.open }))

  return {
    branches,
    pieces,
    target,
    begun: (journey?.claims.length ?? 0) > 0 || data.attempts.length > 0 || data.situations.length > 0,
    season: active
      ? {
          ...active,
          title: titleOf(active.branchId),
          daysLeft: daysBetween(today, active.reviewOn),
          due: daysBetween(today, active.reviewOn) < 0,
          weeks: Math.max(1, Math.round(daysBetween(active.startedOn, active.reviewOn) / 7)),
        }
      : null,
    next: [...queued, ...suggested].slice(0, 3),
    totals: {
      pieces: pieces.length,
      have: pieces.filter((p) => p.state !== 'outline').length,
      practised: pieces.filter((p) => p.state !== 'outline' && p.state !== 'claimed').length,
      targetOpen: pieces.filter((p) => p.inTarget && (p.state === 'outline' || p.state === 'claimed')).length,
      targetSize: pieces.filter((p) => p.inTarget).length,
    },
    pastSeasons: (journey?.seasons ?? []).filter((s) => s.endedOn !== undefined).map((s) => ({ ...s, title: titleOf(s.branchId) })).reverse(),
  }
}

/** The dated trail of one skill: placement, then each recorded step, oldest first. */
export interface TrailEntry {
  at: string
  what: string
  activityId?: Id
  text?: string
}

export function skillTrail(data: UserData, capabilityId: Id): TrailEntry[] {
  const out: TrailEntry[] = []
  const claim = data.profile.journey?.claims.find((c) => c.capabilityId === capabilityId)
  if (claim) out.push({ at: claim.at, what: `You placed yourself: ${CLAIM_LABEL[claim.level].toLowerCase()}` })
  for (const activity of data.activities.filter((a) => a.capabilityIds.includes(capabilityId))) {
    out.push({ at: activity.createdAt, what: activity.kind === 'rehearsal' ? 'Planned a rehearsal' : activity.kind === 'observation' ? 'Planned an observation' : 'Planned a real attempt', activityId: activity.id, text: activity.title })
    const attempt = data.attempts.find((a) => a.activityId === activity.id)
    if (attempt) out.push({ at: attempt.attemptedAt, what: activity.kind === 'rehearsal' ? 'Rehearsed' : activity.kind === 'observation' ? 'Observed' : 'Tried it for real', activityId: activity.id, ...(attempt.note !== '' ? { text: attempt.note } : {}) })
    const review = data.reviews.find((r) => r.activityId === activity.id)
    if (review) out.push({ at: review.reviewedAt, what: 'Reflected', activityId: activity.id, text: review.observation })
  }
  for (const item of data.evidence.filter((e) => e.capabilityIds.includes(capabilityId))) {
    out.push({ at: item.recordedAt, what: 'Evidence attached', ...(item.activityId ? { activityId: item.activityId } : {}), text: item.text })
  }
  return out.sort((a, b) => a.at.localeCompare(b.at))
}
