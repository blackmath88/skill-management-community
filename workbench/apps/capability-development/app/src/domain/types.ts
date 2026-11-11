/**
 * Personal records and derived read models.
 *
 * Nothing in this file may import React, storage or content modules: the domain owns records,
 * invariants and legal transitions only. Content definitions live in ~/content/types.
 *
 * Adapted from blackmath88/leader-me src/domain/types.ts (commit 55114f3b, no licence file,
 * reused with the owner's explicit instruction). See ../../PROVENANCE.md.
 */

/** Opaque identifier. Never derive meaning from its contents. */
export type Id = string
/** ISO-8601 UTC timestamp, e.g. 2026-11-11T09:30:00.000Z */
export type IsoUtc = string
/** Calendar date YYYY-MM-DD (no time zone). */
export type IsoDate = string

// ------------------------------------------------------------------ Shared vocabulary

/**
 * The three development routes. Which route a piece of work belongs to is a product distinction
 * that protects people from being handed responsibility for an institutional problem.
 */
export type DevelopmentRoute =
  /** Develop one's own understanding or execution. */
  | 'personal-practice'
  /** Negotiate or test a routine with other people. */
  | 'shared-practice'
  /** Clarify mandate, obtain support, address resources or conflicting incentives. */
  | 'conditions'

export const DEVELOPMENT_ROUTES: readonly DevelopmentRoute[] = [
  'personal-practice',
  'shared-practice',
  'conditions',
]

/** How much room the person has to act in a situation. */
export type Authority = 'decide' | 'recommend' | 'negotiate' | 'unclear'
export type DecisionOwnership = 'clear' | 'unclear' | 'contested'
export type ChallengeKind = 'priorities' | 'ownership' | 'adoption' | 'handover' | 'other'

/**
 * Structural barriers a person may notice. These are the user's own observations about
 * conditions, never an inference the system makes about them or their organisation.
 */
export type ConstraintKind =
  | 'unclear-mandate'
  | 'competing-priorities'
  | 'no-opportunity'
  | 'missing-resources'
  | 'conflicting-incentives'
  | 'no-shared-routine'
  | 'missing-information'

export const CONSTRAINT_KINDS: readonly ConstraintKind[] = [
  'unclear-mandate',
  'competing-priorities',
  'no-opportunity',
  'missing-resources',
  'conflicting-incentives',
  'no-shared-routine',
  'missing-information',
]

/** Support the person believes is available. Used to route towards asking rather than training. */
export type SupportKind = 'sponsor' | 'peer' | 'line-manager' | 'specialist' | 'none-identified'

export const SUPPORT_KINDS: readonly SupportKind[] = [
  'sponsor',
  'peer',
  'line-manager',
  'specialist',
  'none-identified',
]

// ------------------------------------------------------------------ Direction

export interface DirectionRevision {
  at: IsoUtc
  text: string
  state: DirectionState
  note?: string
}

export type DirectionState = 'active' | 'paused' | 'retired'

/**
 * A revisable aspiration in the user's own words. Not an inferred deficit and not a goal the
 * system sets. `focusCapabilityId` is optional: people may enter through a situation instead.
 */
export interface DevelopmentDirection {
  id: Id
  text: string
  focusCapabilityId?: Id
  state: DirectionState
  createdAt: IsoUtc
  updatedAt: IsoUtc
  /** Append-only, so an earlier aspiration is never silently rewritten. */
  history: DirectionRevision[]
}

// ------------------------------------------------------------------ Situation

export interface Situation {
  id: Id
  title: string
  description: string
  /** User-described setting, e.g. "Faculty working group". Used for transfer breadth. */
  context: string
  desiredOutcome: string
  authority: Authority
  decisionOwnership: DecisionOwnership
  challenge: ChallengeKind
  /** Barriers the user noticed. Empty means none reported, not none present. */
  constraints: ConstraintKind[]
  supportAvailable: SupportKind[]
  createdAt: IsoUtc
  updatedAt: IsoUtc
}

// ------------------------------------------------------------------ Working hypothesis

export type HypothesisCategory = DevelopmentRoute

/** A competing explanation under test. Never presented as a diagnosis. */
export type HypothesisStatus = 'open' | 'supported' | 'contradicted' | 'rejected' | 'parked'

export type RecordSource = 'user' | 'content' | 'ai-proposal'

export interface HypothesisRevision {
  at: IsoUtc
  status: HypothesisStatus
  text: string
  note?: string
}

export interface WorkingHypothesis {
  id: Id
  situationId: Id
  campaignId?: Id
  category: HypothesisCategory
  text: string
  source: RecordSource
  /** Free-text provenance, e.g. "Campaign step: competing accounts" or "Fake AI provider v1". */
  sourceRef?: string
  status: HypothesisStatus
  /** Evidence the user linked to this explanation. Recomputed views must tolerate deletion. */
  evidenceIds: Id[]
  createdAt: IsoUtc
  updatedAt: IsoUtc
  history: HypothesisRevision[]
}

// ------------------------------------------------------------------ Practice activity

/**
 * What kind of practice this is. The rehearsal/real distinction is a product invariant:
 * a rehearsal is never recorded or credited as workplace application.
 */
export type ActivityKind =
  /** Watch and describe what actually happens. Real setting, no attempt to change it. */
  | 'observation'
  /** Practise in a safe setting, including against a scripted counterpart. Not real application. */
  | 'rehearsal'
  /** Do it for real, with real people and real consequences. */
  | 'real-attempt'

export const ACTIVITY_KINDS: readonly ActivityKind[] = ['observation', 'rehearsal', 'real-attempt']

/** True when the activity did not happen in the person's real working situation. */
export function isRehearsal(kind: ActivityKind): boolean {
  return kind === 'rehearsal'
}

export type ActivityState =
  /** Missing something a plan needs. */
  | 'planned'
  /** Has a cue, an action, an observable signal and a review date. */
  | 'ready'
  /** Actually tried, including changed, stopped, interrupted or no opportunity. */
  | 'attempted'
  /** Attempted and reviewed. */
  | 'reviewed'
  | 'paused'
  | 'abandoned'

export const ACTIVITY_STATES: readonly ActivityState[] = [
  'planned',
  'ready',
  'attempted',
  'reviewed',
  'paused',
  'abandoned',
]

/**
 * A cue-linked plan. Detail is required in proportion to the activity: `requiredPlanFields`
 * in plan.ts states what each kind needs, so a small observation is not a long form.
 */
export interface ActivityPlan {
  /** When or where this will happen: "if the decision is reopened on Thursday". */
  cue: string
  action: string
  /** The obstacle the person expects. */
  obstacle: string
  /** What they will do instead if the obstacle appears. Escalating or pausing is legitimate. */
  fallback: string
  /** Something observable, so review is not a judgement of character. */
  signal: string
  reviewOn: IsoDate
}

export type AssistanceLevel = 'none' | 'app-prompts' | 'ai-sparring' | 'another-person'

export const ASSISTANCE_LEVELS: readonly AssistanceLevel[] = [
  'none',
  'app-prompts',
  'ai-sparring',
  'another-person',
]

export interface PracticeActivity {
  id: Id
  situationId: Id
  campaignId?: Id
  directionId?: Id
  /** Content provenance: which authored template this came from, if any. */
  templateId?: Id
  /** Which campaign step offered it, if any. */
  stepId?: Id
  route: DevelopmentRoute
  kind: ActivityKind
  title: string
  plan: ActivityPlan
  /** Optional and plural. An activity may practise several capabilities or none yet named. */
  capabilityIds: Id[]
  /** Optional and plural: a method is a lens, not a requirement. */
  methodIds: Id[]
  state: ActivityState
  createdAt: IsoUtc
  updatedAt: IsoUtc
}

export type AttemptOutcome =
  | 'as-planned'
  | 'changed'
  | 'stopped'
  | 'interrupted'
  /** The cue never arrived. Recognising this is useful; it is not workplace application. */
  | 'no-opportunity'

export const ATTEMPT_OUTCOMES: readonly AttemptOutcome[] = [
  'as-planned',
  'changed',
  'stopped',
  'interrupted',
  'no-opportunity',
]

export interface Attempt {
  id: Id
  activityId: Id
  outcome: AttemptOutcome
  /** What actually happened, in the user's words. */
  note: string
  /** Recorded so assisted performance is never read as independent practice. */
  assistance: AssistanceLevel
  attemptedAt: IsoUtc
  createdAt: IsoUtc
  updatedAt: IsoUtc
}

// ------------------------------------------------------------------ Evidence

export type EvidenceKind =
  | 'self-observation'
  /** A pointer to something that exists elsewhere, e.g. "decision note in the team wiki". */
  | 'work-sample-reference'
  /** Something another person said, attributed by role, never named. */
  | 'attributed-feedback'
  /** A third party's account of the situation, which may conflict with the user's. */
  | 'other-account'

export const EVIDENCE_KINDS: readonly EvidenceKind[] = [
  'self-observation',
  'work-sample-reference',
  'attributed-feedback',
  'other-account',
]

export type Visibility = 'private' | 'shareable'

export interface EvidenceItem {
  id: Id
  /** At least one anchor is required; see validation.ts. */
  activityId?: Id
  attemptId?: Id
  reviewId?: Id
  situationId?: Id
  kind: EvidenceKind
  text: string
  source: RecordSource
  sourceRef?: string
  /**
   * Role only, e.g. "a workshop participant". Data minimisation applies to feedback about
   * other people: validation rejects anything that looks like a stored contact detail.
   */
  attribution?: string
  visibility: Visibility
  capabilityIds: Id[]
  recordedAt: IsoUtc
  updatedAt: IsoUtc
}

// ------------------------------------------------------------------ Review

/** What the person decided to do next. Pausing, stopping and escalating are first-class. */
export type NextMove = 'repeat' | 'adapt' | 'transfer' | 'escalate' | 'pause' | 'stop'

export const NEXT_MOVES: readonly NextMove[] = ['repeat', 'adapt', 'transfer', 'escalate', 'pause', 'stop']

export interface Review {
  id: Id
  activityId: Id
  /** What was observed. Kept apart from interpretation on purpose. */
  observation: string
  interpretation: string
  /** A competing explanation. Required for a review to count towards practice experience. */
  alternativeExplanation: string
  nextAdjustment: string
  nextMove: NextMove
  reviewedAt: IsoUtc
  updatedAt: IsoUtc
}

// ------------------------------------------------------------------ Campaign

export type CampaignState = 'active' | 'paused' | 'completed' | 'abandoned'

export const CAMPAIGN_STATES: readonly CampaignState[] = ['active', 'paused', 'completed', 'abandoned']

export interface CampaignPathEntry {
  stepId: Id
  enteredAt: IsoUtc
  /** The branch the user chose at this step, once they chose one. */
  choiceId?: Id
  /** Activities planned from this step. */
  activityIds: Id[]
  completedAt?: IsoUtc
}

/**
 * A bounded intention connecting activities. Not a course and not a fixed sequence: the path
 * records where the user actually went, and a campaign may be paused or abandoned at any step.
 */
export interface Campaign {
  id: Id
  directionId?: Id
  situationId: Id
  /** Authored definition and the exact version used, so later content edits cannot rewrite history. */
  definitionId: Id
  definitionVersion: number
  purpose: string
  state: CampaignState
  path: CampaignPathEntry[]
  /** null once the campaign closed or was abandoned. */
  currentStepId: Id | null
  reviewIntent?: string
  createdAt: IsoUtc
  updatedAt: IsoUtc
}

// ------------------------------------------------------------------ Perk

/**
 * A user-confirmed contextual strength with examples. Never awarded by the system and never a
 * permanent personality bonus, which is why `possibleOveruse` is part of the record.
 */
export interface Perk {
  id: Id
  description: string
  /** Activities the user pointed at as examples. */
  evidenceActivityIds: Id[]
  possibleOveruse?: string
  createdAt: IsoUtc
  updatedAt: IsoUtc
}

// ------------------------------------------------------------------ AI proposals

export type AiProposalKind =
  | 'hypothesis'
  | 'alternative-explanation'
  | 'rehearsal-line'
  | 'activity-plan-draft'
  | 'review-prompt'

export const AI_PROPOSAL_KINDS: readonly AiProposalKind[] = [
  'hypothesis',
  'alternative-explanation',
  'rehearsal-line',
  'activity-plan-draft',
  'review-prompt',
]

export type AiProposalState = 'offered' | 'accepted' | 'rejected' | 'stale' | 'invalid'

export interface AiProvenance {
  providerId: string
  model: string
  /** Identifier of the prompt template, so an output can be traced without storing the prompt. */
  promptId: string
  requestedAt: IsoUtc
}

/**
 * A reviewable suggestion. An AI proposal is never canonical: accepting one runs the ordinary
 * command for that record, with the user as the author of the resulting change.
 */
export interface AiProposal {
  id: Id
  kind: AiProposalKind
  /** Plain text the user can edit before accepting. */
  text: string
  /** For a hypothesis proposal: which route it suggests. Advisory only. */
  suggestedRoute?: DevelopmentRoute
  /** Records the proposal refers to. Invented references make the proposal invalid. */
  referencedIds: Id[]
  /** Store revision the proposal was computed from. A newer revision makes it stale. */
  baseRevision: number
  provenance: AiProvenance
  state: AiProposalState
  rejectionNote?: string
  decidedAt?: IsoUtc
  createdAt: IsoUtc
  updatedAt: IsoUtc
}

// ------------------------------------------------------------------ Share package

/**
 * An explicit, reviewed snapshot. Creating one does not grant anybody access to the journal, and
 * an exported copy cannot be recalled by deleting the original.
 */
export interface SharePackage {
  id: Id
  title: string
  anonymisedCase?: string
  reusablePractice?: string
  supportRequest?: string
  structuralObstacle?: string
  /** Which records the user drew on. Kept for their own traceability, not shared automatically. */
  sourceRecordIds: Id[]
  snapshotAt: IsoUtc
  createdAt: IsoUtc
  updatedAt: IsoUtc
}

// ------------------------------------------------------------------ Presentation (cosmetic)

export type PresentationMode = 'character' | 'journey' | 'evidence'

/**
 * Cosmetic choices only. Appearance never certifies competence and is never derived from
 * evidence; see experience.ts for the retention policy that keeps the two apart.
 */
export interface Appearance {
  /** Appearance format version, separate from the record schema version. */
  version: 1
  mode: PresentationMode
  emblem: string
  palette: string
  accessories: string[]
}

export interface Profile {
  displayName?: string
  /** Which content packs the user selected. Empty means every installed pack. */
  selectedPackIds: Id[]
  appearance?: Appearance
  updatedAt: IsoUtc
}

// ------------------------------------------------------------------ Aggregate

/**
 * Personal-data version for this application. Version 1 is the first version of this derivative;
 * Leader Me exports (its own versions 1 and 2) are converted on import, not read in place.
 * Distinct from the IndexedDB version, the export format version and the appearance version.
 */
export const SCHEMA_VERSION = 1 as const
/** Versions this build can read. Anything newer is refused rather than silently truncated. */
export const READABLE_SCHEMA_VERSIONS: readonly number[] = [1]

export interface UserData {
  schemaVersion: typeof SCHEMA_VERSION
  profile: Profile
  directions: DevelopmentDirection[]
  situations: Situation[]
  campaigns: Campaign[]
  hypotheses: WorkingHypothesis[]
  activities: PracticeActivity[]
  attempts: Attempt[]
  evidence: EvidenceItem[]
  reviews: Review[]
  perks: Perk[]
  proposals: AiProposal[]
  sharePackages: SharePackage[]
}

/** Every collection key on UserData, for counts and generic iteration. */
export const COLLECTION_KEYS = [
  'directions',
  'situations',
  'campaigns',
  'hypotheses',
  'activities',
  'attempts',
  'evidence',
  'reviews',
  'perks',
  'proposals',
  'sharePackages',
] as const

export type CollectionKey = (typeof COLLECTION_KEYS)[number]
