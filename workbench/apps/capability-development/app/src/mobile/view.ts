/**
 * What the mobile shows, derived from the saved appearance and the records.
 *
 * Two outputs with different privacy. `MobileDrawing` is all the picture receives: geometry,
 * colours and which shapes carry a memory — no titles, no journal text, no identifiers. The
 * memory list is for ordinary labelled HTML next to the picture, and is where a record's own
 * words appear.
 *
 * Nothing is inferred. A memory exists only because the person chose it; a memory whose record
 * has since been deleted is reported as missing and never replaced by another.
 */
import type { Id, UserData } from '~/domain/types'
import {
  composition,
  mobilePalette,
  DEFAULT_COMPOSITION_ID,
  DEFAULT_PALETTE_ID,
  SLOT_COUNT,
  type MobileComposition,
  type MobilePalette,
} from './catalogue'

export interface MobileDrawing {
  composition: MobileComposition
  palette: MobilePalette
  /** Slots that carry a memory. */
  marked: readonly number[]
}

export interface MobileMemory {
  slot: number
  activityId: Id
  /** The shape's name in this composition: "the leaf". */
  shapeName: string
  /** False when the record behind the memory has been deleted. */
  present: boolean
  title: string
  kind: 'observation' | 'rehearsal' | 'real-attempt' | null
  attemptedAt: string | null
  /** The person's own observation from their review, when there is one. */
  observation: string | null
  evidenceCount: number
}

export interface MobileCandidate {
  activityId: Id
  title: string
  kind: 'observation' | 'rehearsal' | 'real-attempt'
  attemptedAt: string
  reviewed: boolean
}

export interface MobileView {
  /** False while the person has never saved a mobile: the default is drawn and nothing is stored. */
  saved: boolean
  compositionId: string
  paletteId: string
  drawing: MobileDrawing
  memories: MobileMemory[]
  /** Attempted activities not yet hung, newest first. */
  candidates: MobileCandidate[]
  freeSlots: number[]
}

export function deriveMobileView(data: UserData): MobileView {
  const saved = data.profile.appearance?.mobile
  const comp = composition(saved?.compositionId)
  const pal = mobilePalette(saved?.paletteId)
  const kept = (saved?.memories ?? []).filter((m) => m.slot >= 0 && m.slot < SLOT_COUNT)

  const memories: MobileMemory[] = kept.map((memory) => {
    const activity = data.activities.find((a) => a.id === memory.activityId)
    const attempt = activity ? data.attempts.find((a) => a.activityId === activity.id) : undefined
    const review = activity ? data.reviews.find((r) => r.activityId === activity.id) : undefined
    const evidenceCount = activity
      ? data.evidence.filter(
          (e) =>
            e.activityId === activity.id ||
            (attempt !== undefined && e.attemptId === attempt.id) ||
            (review !== undefined && e.reviewId === review.id),
        ).length
      : 0
    return {
      slot: memory.slot,
      activityId: memory.activityId,
      shapeName: comp.shapes[memory.slot]?.name ?? 'a shape',
      present: activity !== undefined,
      title: activity?.title ?? 'A record that has been deleted',
      kind: activity?.kind ?? null,
      attemptedAt: attempt?.attemptedAt ?? null,
      observation: review && review.observation.trim() !== '' ? review.observation : null,
      evidenceCount,
    }
  })

  const hung = new Set(kept.map((m) => m.activityId))
  const candidates: MobileCandidate[] = data.attempts
    .flatMap((attempt) => {
      const activity = data.activities.find((a) => a.id === attempt.activityId)
      if (!activity || hung.has(activity.id)) return []
      return [
        {
          activityId: activity.id,
          title: activity.title,
          kind: activity.kind,
          attemptedAt: attempt.attemptedAt,
          reviewed: data.reviews.some((r) => r.activityId === activity.id),
        },
      ]
    })
    .sort((a, b) => b.attemptedAt.localeCompare(a.attemptedAt))

  const used = new Set(kept.map((m) => m.slot))
  return {
    saved: saved !== undefined,
    compositionId: saved?.compositionId ?? DEFAULT_COMPOSITION_ID,
    paletteId: saved?.paletteId ?? DEFAULT_PALETTE_ID,
    drawing: { composition: comp, palette: pal, marked: kept.map((m) => m.slot) },
    memories,
    candidates,
    freeSlots: Array.from({ length: SLOT_COUNT }, (_, i) => i).filter((i) => !used.has(i)),
  }
}
