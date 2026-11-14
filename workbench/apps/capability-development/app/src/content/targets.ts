/**
 * Target constellations: a few named selections across the skill branches.
 *
 * A target is a direction to build towards, chosen by the person and changeable at any time. It
 * is topic-specific and cuts across branches on purpose, because "leading" or "working with AI"
 * in practice draws on more than one vocabulary.
 *
 * These three are authored here as drafts. "Future skills" in particular is composed from skills
 * that already exist in the installed vocabularies; it is not a published future-skills
 * framework and should not be presented as one.
 */
import type { Id } from '~/domain/types'

export interface Target {
  id: string
  title: string
  summary: string
  note: string
  capabilityIds: Id[]
}

export const TARGETS: readonly Target[] = [
  {
    id: 'leading',
    title: 'Leading a group to a decision',
    summary: 'Framing, ownership, disagreement and learning from what happens — plus the mandate and the dialogue around them.',
    note: 'Draft. The leadership vocabulary with two organisational practices it leans on.',
    capabilityIds: ['frame-challenge', 'make-tradeoff-visible', 'clarify-ownership', 'invite-disagreement', 'explore-perspective', 'plan-experiment', 'reflect-revise', 'od-clarify-mandate', 'od-enable-dialogue'],
  },
  {
    id: 'ai',
    title: 'Working well with AI',
    summary: 'Briefing, checking, tracing and bounding work done with an assistant, and treating each change as a trial.',
    note: 'Draft. The six AI practices with two habits of experimenting and revising.',
    capabilityIds: ['ai-brief-assistant', 'ai-check-before-trust', 'ai-notes-to-action', 'ai-research-trail', 'ai-redesign-task', 'ai-know-when-to-stop', 'plan-experiment', 'reflect-revise'],
  },
  {
    id: 'future',
    title: 'Future skills (a draft)',
    summary: 'Judgement, perspective-taking, systemic inquiry and redesigning work: a cross-cut of what the other vocabularies already hold.',
    note: 'Composed for this prototype from existing skills. Not a published future-skills framework.',
    capabilityIds: ['ai-check-before-trust', 'ai-redesign-task', 'ai-know-when-to-stop', 'explore-perspective', 'make-tradeoff-visible', 'od-inquire-systemically', 'od-design-learning-trials', 'od-judge-evidence', 'compare-expectations'],
  },
]

export function target(id: string | null | undefined): Target | undefined {
  return TARGETS.find((t) => t.id === id)
}
