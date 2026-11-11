/**
 * Read models the presentation receives. The presentation gets projections, never the raw
 * record set plus a licence to recompute the rules itself: that is what stops domain rules from
 * being duplicated in a second interface.
 */
import type { ContentRegistry } from '~/content/registry'
import { deriveCapabilityEvidence, type CapabilityEvidence } from '~/domain/evidence'
import { derivePracticeExperience, POLICY_V1, type ExperiencePolicy, type PracticeExperience } from '~/domain/experience'
import { deriveDevelopmentSummary, type DevelopmentSummary } from '~/domain/summary'
import type { Appearance, Id, UserData } from '~/domain/types'

export interface ViewModels {
  summary: DevelopmentSummary
  experience: PracticeExperience
  evidence: CapabilityEvidence[]
}

export function deriveViewModels(
  data: UserData,
  content: ContentRegistry,
  policy: ExperiencePolicy = POLICY_V1,
): ViewModels {
  return {
    summary: deriveDevelopmentSummary(data, (_campaignId, definitionId, stepId) => {
      const step = content.step(definitionId, stepId)
      return step ? { title: step.title, kind: step.kind } : undefined
    }),
    experience: derivePracticeExperience(data, policy),
    evidence: deriveCapabilityEvidence(data, content.capabilities()),
  }
}

/**
 * The narrow display model a character or emblem renderer receives. It carries no journal text,
 * no evidence and no situation description, so a renderer cannot leak private writing even by
 * accident, and a different presentation can show the same records without this one.
 */
export interface PresentationModel {
  displayName: string | null
  appearance: Appearance | null
  /** Counts only. Never the text of anything. */
  recordedActivities: number
  reviewedActivities: number
  distinctSettings: number
  /** Practice-experience total with its policy version, so a number is never shown bare. */
  experienceTotal: number
  experiencePolicyVersion: number
}

export function derivePresentationModel(data: UserData, models: ViewModels): PresentationModel {
  const settings = new Set(
    data.situations.map((s) => s.context.trim().toLowerCase()).filter((c) => c !== ''),
  )
  return {
    displayName: data.profile.displayName ?? null,
    appearance: data.profile.appearance ?? null,
    recordedActivities: data.attempts.length,
    reviewedActivities: data.reviews.length,
    distinctSettings: settings.size,
    experienceTotal: models.experience.total,
    experiencePolicyVersion: models.experience.policyVersion,
  }
}

/** Capability evidence joined with its definition, for display. */
export interface CapabilityRow {
  evidence: CapabilityEvidence
  title: string
  group: string
  observable: string
  limits: string
  packTitle: string
  experienceCredit: number
}

export function capabilityRows(models: ViewModels, content: ContentRegistry): CapabilityRow[] {
  return models.evidence.flatMap((evidence) => {
    const definition = content.capability(evidence.capabilityId)
    if (!definition) return []
    return [
      {
        evidence,
        title: definition.title,
        group: definition.group,
        observable: definition.observable,
        limits: definition.limits,
        packTitle: content.packOfCapability(definition.id)?.title ?? 'Unknown pack',
        experienceCredit: models.experience.byCapability[definition.id] ?? 0,
      },
    ]
  })
}

export function capabilityTitle(content: ContentRegistry, id: Id): string {
  return content.capability(id)?.title ?? id
}
