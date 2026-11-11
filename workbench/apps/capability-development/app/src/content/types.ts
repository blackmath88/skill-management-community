/**
 * Authored content: definitions, sources, templates and branching rules.
 *
 * Content is data. It holds no private records and no executable plugins, and it may never
 * change what counts as evidence, who may see a record, or how progression is calculated.
 */
import type {
  ActivityKind,
  ActivityPlan,
  ChallengeKind,
  ConstraintKind,
  DevelopmentRoute,
  HypothesisCategory,
  Id,
  IsoDate,
} from '~/domain/types'

export type SourceType = 'practitioner-article' | 'academic' | 'book-excerpt' | 'vendor' | 'other'

/**
 * A citation with its verification state attached.
 *
 * `retrieved` and `verificationNote` are required so that an unchecked citation cannot be added
 * without saying so. Recording a citation as accessed when the page was never opened would be
 * exactly the kind of invented verification this project's rules forbid, and the field makes the
 * omission visible in the interface rather than only in a document.
 */
export interface SourceRef {
  title: string
  author: string
  url: string
  sourceType: SourceType
  /** When the citation was last written down. NOT a claim that the page was read on that date. */
  citedOn: IsoDate
  /** True only if the page was actually fetched while this content was authored. */
  retrieved: boolean
  /** What was and was not checked. Shown next to the link, every time. */
  verificationNote: string
  /** The claim this source supports in our paraphrase, so a reader can check the fit. */
  supportedClaim: string
}

export type CapabilityGroup =
  | 'direction'
  | 'coordination'
  | 'relationships'
  | 'learning'
  | 'shared-routines'

export interface CapabilityGroupDefinition {
  id: CapabilityGroup
  title: string
  summary: string
}

/**
 * A capability definition: producing a relevant outcome under conditions. `observable` is what
 * someone could see happening; it is not a rating scale and not a competency assessment.
 */
export interface CapabilityDefinition {
  id: Id
  title: string
  group: CapabilityGroup
  observable: string
  nextExperiment: string
  /** What this definition deliberately does not cover. */
  limits: string
}

/** A method, conceptual lens or practical resource. Changes available support, not numerical power. */
export interface MethodDefinition {
  id: Id
  title: string
  summary: string
  explanation: string
  whenToUse: string[]
  whenItMayNotFit: string[]
  limits: string
  sources: SourceRef[]
  prompts: string[]
  /** Fictional worked example. Never a real case. */
  example: { title: string; narrative: string }
  capabilityIds: Id[]
  fitsChallenges: ChallengeKind[]
}

/** A scripted rehearsal counterpart. Clearly fiction, and clearly not workplace application. */
export interface RehearsalScript {
  /** The role the counterpart plays, e.g. "a colleague who resists a governance discussion". */
  role: string
  /** The counterpart's first utterance, shown before the person says anything. */
  opening: string
  /**
   * The counterpart's REPLIES, in order, after the opening: `lines[0]` answers the person's first
   * turn. Do not repeat `opening` here — two packs following opposite conventions is how an
   * authored line silently never gets shown. Deterministic: nobody is being simulated.
   */
  lines: string[]
  /** Shown with the script, every time. */
  note: string
}

export interface ActivityTemplate {
  id: Id
  kind: ActivityKind
  route: DevelopmentRoute
  title: string
  /** Pre-filled suggestions the user edits. Never saved without the user confirming. */
  suggestedPlan: Partial<ActivityPlan>
  capabilityIds: Id[]
  methodIds: Id[]
  rehearsal?: RehearsalScript
}

export type StepKind =
  | 'orient'
  | 'notice'
  | 'hypothesise'
  | 'choose'
  | 'prepare'
  | 'rehearse'
  | 'attempt'
  | 'review'
  | 'follow-up'
  | 'close'

export interface CampaignChoice {
  id: Id
  label: string
  hint?: string
  /** Where this branch goes. null means the campaign may close here. */
  nextStepId: Id | null
  route: DevelopmentRoute
  /** A working hypothesis seeded when the user takes this branch. Editable and rejectable. */
  seedHypothesis?: { category: HypothesisCategory; text: string }
  /** Constraints this branch implies the user noticed, added to the situation on confirmation. */
  seedConstraints?: ConstraintKind[]
}

export interface CampaignStep {
  id: Id
  title: string
  kind: StepKind
  /** What this step is for, in one sentence. */
  intent: string
  /** The question or instruction shown to the user. */
  prompt: string
  /** Extra guidance when the step concerns conditions rather than personal skill. */
  routeNote?: string
  choices: CampaignChoice[]
  /** The activity offered here, if any. */
  template?: ActivityTemplate
}

export interface CampaignDefinition {
  id: Id
  /** Incremented whenever a step's meaning changes. Running campaigns keep the version they started. */
  version: number
  title: string
  purpose: string
  /** What the campaign deliberately does not do. */
  limits: string
  challenge: ChallengeKind
  /** A fictional opening situation offered to a user who has none yet. */
  situationPrompt: string
  firstStepId: Id
  steps: CampaignStep[]
}

export interface ContentPack {
  id: Id
  version: number
  title: string
  /** The practice domain this pack covers, e.g. "Leadership". */
  domainLabel: string
  summary: string
  note: string
  capabilityGroups: CapabilityGroupDefinition[]
  capabilities: CapabilityDefinition[]
  methods: MethodDefinition[]
  campaigns: CampaignDefinition[]
}
