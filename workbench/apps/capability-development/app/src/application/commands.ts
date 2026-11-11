/**
 * Named commands. Each one validates its input and the references it names, checks that the
 * transition is legal, and returns the next record set. None of them touches storage, React or
 * content modules directly: the session persists the result with an expected revision, so a
 * command computed from a stale snapshot can never overwrite newer records.
 */
import {
  deleteActivityCascade,
  deleteCampaignCascade,
  deleteDirectionCascade,
  deleteEvidenceCascade,
  deleteReviewCascade,
  deleteSituationCascade,
} from '~/domain/cascade'
import { upsertById } from '~/domain/empty'
import { planReadiness } from '~/domain/plan'
import {
  canTransitionActivity,
  canTransitionCampaign,
  canTransitionDirection,
  canTransitionHypothesis,
} from '~/domain/transitions'
import type {
  ActivityKind,
  ActivityPlan,
  ActivityState,
  AiProposal,
  Appearance,
  AssistanceLevel,
  Attempt,
  AttemptOutcome,
  Authority,
  Campaign,
  CampaignState,
  ChallengeKind,
  ConstraintKind,
  DecisionOwnership,
  DevelopmentDirection,
  DevelopmentRoute,
  DirectionState,
  EvidenceItem,
  EvidenceKind,
  HypothesisCategory,
  HypothesisStatus,
  Id,
  NextMove,
  Perk,
  PracticeActivity,
  Review,
  SharePackage,
  Situation,
  SupportKind,
  UserData,
  Visibility,
  WorkingHypothesis,
} from '~/domain/types'
import { MAX_ATTRIBUTION_LENGTH } from '~/domain/validation'
import type { CommandDeps } from './ports'
import { fail, ok, type CommandOutcome } from './results'

const MAX_TEXT = 20_000

function text(value: string, field: string, errors: string[], opts: { required?: boolean; max?: number } = {}): string {
  const trimmed = typeof value === 'string' ? value : ''
  if (opts.required && trimmed.trim() === '') errors.push(`${field} is required.`)
  if (trimmed.length > (opts.max ?? MAX_TEXT)) errors.push(`${field} is longer than ${opts.max ?? MAX_TEXT} characters.`)
  return trimmed
}

function requireRecord<T>(items: readonly T[], match: (item: T) => boolean, label: string, id: Id): T | null {
  const found = items.find(match)
  if (!found) return null
  void label
  void id
  return found
}

// ------------------------------------------------------------------ Direction

export interface CreateDirectionInput {
  text: string
  focusCapabilityId?: Id
}

export function createDirection(
  data: UserData,
  input: CreateDirectionInput,
  deps: CommandDeps,
): CommandOutcome<DevelopmentDirection> {
  const errors: string[] = []
  const value = text(input.text, 'A direction', errors, { required: true, max: 1_000 })
  if (input.focusCapabilityId !== undefined && !deps.content.capability(input.focusCapabilityId)) {
    errors.push(`There is no capability "${input.focusCapabilityId}" in the installed content.`)
  }
  if (errors.length > 0) return fail('validation', ...errors)
  const now = deps.clock.now()
  const direction: DevelopmentDirection = {
    id: deps.newId(),
    text: value,
    ...(input.focusCapabilityId !== undefined ? { focusCapabilityId: input.focusCapabilityId } : {}),
    state: 'active',
    createdAt: now,
    updatedAt: now,
    history: [{ at: now, text: value, state: 'active' }],
  }
  // Only one direction is active at a time: two active aspirations make "the next useful action"
  // meaningless. The others are paused, not deleted.
  const directions = data.directions.map((d) => (d.state === 'active' ? { ...d, state: 'paused' as DirectionState, updatedAt: now } : d))
  return ok({ ...data, directions: [...directions, direction] }, direction)
}

export interface ReviseDirectionInput {
  id: Id
  text?: string
  state?: DirectionState
  note?: string
}

export function reviseDirection(data: UserData, input: ReviseDirectionInput, deps: CommandDeps): CommandOutcome<DevelopmentDirection> {
  const existing = data.directions.find((d) => d.id === input.id)
  if (!existing) return fail('not-found', 'That direction no longer exists.')
  const errors: string[] = []
  const nextText = input.text === undefined ? existing.text : text(input.text, 'A direction', errors, { required: true, max: 1_000 })
  if (input.state !== undefined && input.state !== existing.state && !canTransitionDirection(existing.state, input.state)) {
    return fail('illegal-transition', `A direction cannot go from ${existing.state} to ${input.state}.`)
  }
  if (errors.length > 0) return fail('validation', ...errors)
  const now = deps.clock.now()
  const nextState = input.state ?? existing.state
  const revised: DevelopmentDirection = {
    ...existing,
    text: nextText,
    state: nextState,
    updatedAt: now,
    history: [
      ...existing.history,
      { at: now, text: nextText, state: nextState, ...(input.note !== undefined && input.note !== '' ? { note: input.note } : {}) },
    ],
  }
  return ok({ ...data, directions: upsertById(data.directions, revised) }, revised)
}

export function deleteDirection(data: UserData, id: Id): CommandOutcome {
  if (!data.directions.some((d) => d.id === id)) return fail('not-found', 'That direction no longer exists.')
  return ok(deleteDirectionCascade(data, id), undefined)
}

// ------------------------------------------------------------------ Situation

export interface RecordSituationInput {
  title: string
  description: string
  context: string
  desiredOutcome: string
  authority: Authority
  decisionOwnership: DecisionOwnership
  challenge: ChallengeKind
  constraints: ConstraintKind[]
  supportAvailable: SupportKind[]
}

export function recordSituation(data: UserData, input: RecordSituationInput, deps: CommandDeps): CommandOutcome<Situation> {
  const errors: string[] = []
  const title = text(input.title, 'A short title', errors, { required: true, max: 200 })
  const description = text(input.description, 'The description', errors)
  const context = text(input.context, 'The setting', errors, { max: 200 })
  const desiredOutcome = text(input.desiredOutcome, 'What you hope for', errors)
  if (errors.length > 0) return fail('validation', ...errors)
  const now = deps.clock.now()
  const situation: Situation = {
    id: deps.newId(),
    title,
    description,
    context,
    desiredOutcome,
    authority: input.authority,
    decisionOwnership: input.decisionOwnership,
    challenge: input.challenge,
    constraints: [...new Set(input.constraints)],
    supportAvailable: [...new Set(input.supportAvailable)],
    createdAt: now,
    updatedAt: now,
  }
  return ok({ ...data, situations: [...data.situations, situation] }, situation)
}

export function updateSituation(
  data: UserData,
  input: Partial<RecordSituationInput> & { id: Id },
  deps: CommandDeps,
): CommandOutcome<Situation> {
  const existing = data.situations.find((s) => s.id === input.id)
  if (!existing) return fail('not-found', 'That situation no longer exists.')
  const errors: string[] = []
  const next: Situation = {
    ...existing,
    ...(input.title !== undefined ? { title: text(input.title, 'A short title', errors, { required: true, max: 200 }) } : {}),
    ...(input.description !== undefined ? { description: text(input.description, 'The description', errors) } : {}),
    ...(input.context !== undefined ? { context: text(input.context, 'The setting', errors, { max: 200 }) } : {}),
    ...(input.desiredOutcome !== undefined ? { desiredOutcome: text(input.desiredOutcome, 'What you hope for', errors) } : {}),
    ...(input.authority !== undefined ? { authority: input.authority } : {}),
    ...(input.decisionOwnership !== undefined ? { decisionOwnership: input.decisionOwnership } : {}),
    ...(input.challenge !== undefined ? { challenge: input.challenge } : {}),
    ...(input.constraints !== undefined ? { constraints: [...new Set(input.constraints)] } : {}),
    ...(input.supportAvailable !== undefined ? { supportAvailable: [...new Set(input.supportAvailable)] } : {}),
    updatedAt: deps.clock.now(),
  }
  if (errors.length > 0) return fail('validation', ...errors)
  return ok({ ...data, situations: upsertById(data.situations, next) }, next)
}

export function deleteSituation(data: UserData, id: Id): CommandOutcome {
  if (!data.situations.some((s) => s.id === id)) return fail('not-found', 'That situation no longer exists.')
  return ok(deleteSituationCascade(data, id), undefined)
}

// ------------------------------------------------------------------ Campaign

export interface StartCampaignInput {
  situationId: Id
  definitionId: Id
  directionId?: Id
  purpose?: string
}

export function startCampaign(data: UserData, input: StartCampaignInput, deps: CommandDeps): CommandOutcome<Campaign> {
  if (!data.situations.some((s) => s.id === input.situationId)) {
    return fail('not-found', 'That situation no longer exists.')
  }
  const definition = deps.content.campaign(input.definitionId)
  if (!definition) return fail('not-found', `There is no campaign "${input.definitionId}" in the installed content.`)
  if (input.directionId !== undefined && !data.directions.some((d) => d.id === input.directionId)) {
    return fail('not-found', 'That direction no longer exists.')
  }
  if (data.campaigns.some((c) => c.state === 'active' && c.situationId === input.situationId && c.definitionId === input.definitionId)) {
    return fail('validation', 'This campaign is already running on that situation.')
  }
  const now = deps.clock.now()
  const campaign: Campaign = {
    id: deps.newId(),
    situationId: input.situationId,
    ...(input.directionId !== undefined ? { directionId: input.directionId } : {}),
    definitionId: definition.id,
    // Pinned on purpose: later content edits must not rewrite what this person was asked.
    definitionVersion: definition.version,
    purpose: input.purpose?.trim() || definition.purpose,
    state: 'active',
    path: [{ stepId: definition.firstStepId, enteredAt: now, activityIds: [] }],
    currentStepId: definition.firstStepId,
    createdAt: now,
    updatedAt: now,
  }
  // Only one campaign runs at a time, so the home screen has one next step rather than several.
  const campaigns = data.campaigns.map((c) => (c.state === 'active' ? { ...c, state: 'paused' as CampaignState, updatedAt: now } : c))
  return ok({ ...data, campaigns: [...campaigns, campaign] }, campaign)
}

export interface AdvanceCampaignInput {
  campaignId: Id
  choiceId: Id
  /** Seeded hypotheses and constraints are proposals: they apply only when the user keeps them. */
  acceptSeeds?: boolean
  /** The user's edit of a seeded hypothesis, if they changed the wording. */
  hypothesisText?: string
}

export interface AdvanceCampaignResult {
  campaign: Campaign
  seededHypothesis: WorkingHypothesis | null
  seededConstraints: ConstraintKind[]
  closed: boolean
}

export function advanceCampaign(
  data: UserData,
  input: AdvanceCampaignInput,
  deps: CommandDeps,
): CommandOutcome<AdvanceCampaignResult> {
  const campaign = data.campaigns.find((c) => c.id === input.campaignId)
  if (!campaign) return fail('not-found', 'That campaign no longer exists.')
  if (campaign.state !== 'active') {
    return fail('illegal-transition', `A ${campaign.state} campaign cannot be advanced. Resume it first.`)
  }
  if (campaign.currentStepId === null) return fail('illegal-transition', 'That campaign has no current step.')
  const step = deps.content.step(campaign.definitionId, campaign.currentStepId)
  if (!step) {
    return fail(
      'not-found',
      'The step this campaign is on comes from content that is not installed. You can still pause or stop the campaign.',
    )
  }
  const choice = step.choices.find((c) => c.id === input.choiceId)
  if (!choice) return fail('not-found', 'That option is not one of this step’s choices.')
  if (choice.nextStepId !== null && !deps.content.step(campaign.definitionId, choice.nextStepId)) {
    return fail('not-found', 'That option points at a step that is not in the installed content.')
  }

  const now = deps.clock.now()
  const accept = input.acceptSeeds !== false
  let next = { ...data }
  let seededHypothesis: WorkingHypothesis | null = null
  let seededConstraints: ConstraintKind[] = []

  if (accept && choice.seedHypothesis) {
    const errors: string[] = []
    const value = text(input.hypothesisText ?? choice.seedHypothesis.text, 'The explanation', errors, { required: true })
    if (errors.length > 0) return fail('validation', ...errors)
    seededHypothesis = {
      id: deps.newId(),
      situationId: campaign.situationId,
      campaignId: campaign.id,
      category: choice.seedHypothesis.category as HypothesisCategory,
      text: value,
      source: 'content',
      sourceRef: `Campaign step "${step.title}", option "${choice.label}"`,
      status: 'open',
      evidenceIds: [],
      createdAt: now,
      updatedAt: now,
      history: [{ at: now, status: 'open', text: value, note: 'Offered by the campaign and kept by you.' }],
    }
    next = { ...next, hypotheses: [...next.hypotheses, seededHypothesis] }
  }

  if (accept && choice.seedConstraints && choice.seedConstraints.length > 0) {
    const situation = next.situations.find((s) => s.id === campaign.situationId)
    if (situation) {
      const added = choice.seedConstraints.filter((c) => !situation.constraints.includes(c))
      if (added.length > 0) {
        seededConstraints = added
        next = {
          ...next,
          situations: upsertById(next.situations, {
            ...situation,
            constraints: [...situation.constraints, ...added],
            updatedAt: now,
          }),
        }
      }
    }
  }

  const closed = choice.nextStepId === null
  const path = campaign.path.map((entry, index) =>
    index === campaign.path.length - 1 && entry.stepId === campaign.currentStepId
      ? { ...entry, choiceId: choice.id, completedAt: now }
      : entry,
  )
  const advanced: Campaign = {
    ...campaign,
    path: closed ? path : [...path, { stepId: choice.nextStepId as Id, enteredAt: now, activityIds: [] }],
    currentStepId: closed ? null : choice.nextStepId,
    state: closed ? 'completed' : 'active',
    updatedAt: now,
  }
  return ok({ ...next, campaigns: upsertById(next.campaigns, advanced) }, {
    campaign: advanced,
    seededHypothesis,
    seededConstraints,
    closed,
  })
}

export function setCampaignState(
  data: UserData,
  input: { campaignId: Id; state: CampaignState },
  deps: CommandDeps,
): CommandOutcome<Campaign> {
  const campaign = data.campaigns.find((c) => c.id === input.campaignId)
  if (!campaign) return fail('not-found', 'That campaign no longer exists.')
  if (campaign.state === input.state) return ok(data, campaign)
  if (!canTransitionCampaign(campaign.state, input.state)) {
    return fail('illegal-transition', `A campaign cannot go from ${campaign.state} to ${input.state}.`)
  }
  const now = deps.clock.now()
  const terminal = input.state === 'completed' || input.state === 'abandoned'
  const next: Campaign = { ...campaign, state: input.state, currentStepId: terminal ? null : campaign.currentStepId, updatedAt: now }
  let campaigns = upsertById(data.campaigns, next)
  // Resuming a campaign pauses whichever one was active, for the same reason only one starts active.
  if (input.state === 'active') {
    campaigns = campaigns.map((c) => (c.id !== next.id && c.state === 'active' ? { ...c, state: 'paused' as CampaignState, updatedAt: now } : c))
  }
  return ok({ ...data, campaigns }, next)
}

export function deleteCampaign(data: UserData, input: { campaignId: Id; withActivities: boolean }): CommandOutcome {
  if (!data.campaigns.some((c) => c.id === input.campaignId)) return fail('not-found', 'That campaign no longer exists.')
  return ok(deleteCampaignCascade(data, input.campaignId, input.withActivities), undefined)
}

// ------------------------------------------------------------------ Working hypothesis

export interface AddHypothesisInput {
  situationId: Id
  campaignId?: Id
  category: HypothesisCategory
  text: string
  source?: WorkingHypothesis['source']
  sourceRef?: string
}

export function addWorkingHypothesis(data: UserData, input: AddHypothesisInput, deps: CommandDeps): CommandOutcome<WorkingHypothesis> {
  if (!data.situations.some((s) => s.id === input.situationId)) return fail('not-found', 'That situation no longer exists.')
  if (input.campaignId !== undefined && !data.campaigns.some((c) => c.id === input.campaignId)) {
    return fail('not-found', 'That campaign no longer exists.')
  }
  const errors: string[] = []
  const value = text(input.text, 'The explanation', errors, { required: true })
  if (errors.length > 0) return fail('validation', ...errors)
  const now = deps.clock.now()
  const hypothesis: WorkingHypothesis = {
    id: deps.newId(),
    situationId: input.situationId,
    ...(input.campaignId !== undefined ? { campaignId: input.campaignId } : {}),
    category: input.category,
    text: value,
    source: input.source ?? 'user',
    ...(input.sourceRef !== undefined ? { sourceRef: input.sourceRef } : {}),
    status: 'open',
    evidenceIds: [],
    createdAt: now,
    updatedAt: now,
    history: [{ at: now, status: 'open', text: value }],
  }
  return ok({ ...data, hypotheses: [...data.hypotheses, hypothesis] }, hypothesis)
}

export interface DecideHypothesisInput {
  id: Id
  status: HypothesisStatus
  note?: string
  /** Evidence the user is pointing at. Must already exist. */
  evidenceIds?: Id[]
}

export function decideHypothesis(data: UserData, input: DecideHypothesisInput, deps: CommandDeps): CommandOutcome<WorkingHypothesis> {
  const existing = data.hypotheses.find((h) => h.id === input.id)
  if (!existing) return fail('not-found', 'That explanation no longer exists.')
  if (input.status !== existing.status && !canTransitionHypothesis(existing.status, input.status)) {
    return fail('illegal-transition', `An explanation cannot go from ${existing.status} to ${input.status}.`)
  }
  const links = input.evidenceIds ?? existing.evidenceIds
  const missing = links.filter((id) => !data.evidence.some((e) => e.id === id))
  if (missing.length > 0) return fail('not-found', `These evidence items no longer exist: ${missing.join(', ')}.`)
  const now = deps.clock.now()
  const next: WorkingHypothesis = {
    ...existing,
    status: input.status,
    evidenceIds: [...new Set(links)],
    updatedAt: now,
    history: [
      ...existing.history,
      { at: now, status: input.status, text: existing.text, ...(input.note !== undefined && input.note !== '' ? { note: input.note } : {}) },
    ],
  }
  return ok({ ...data, hypotheses: upsertById(data.hypotheses, next) }, next)
}

// ------------------------------------------------------------------ Practice activity

export interface PlanActivityInput {
  situationId: Id
  campaignId?: Id
  directionId?: Id
  templateId?: Id
  stepId?: Id
  route: DevelopmentRoute
  kind: ActivityKind
  title: string
  plan: ActivityPlan
  capabilityIds: Id[]
  methodIds: Id[]
}

export function planActivity(data: UserData, input: PlanActivityInput, deps: CommandDeps): CommandOutcome<PracticeActivity> {
  if (!data.situations.some((s) => s.id === input.situationId)) return fail('not-found', 'That situation no longer exists.')
  if (input.campaignId !== undefined && !data.campaigns.some((c) => c.id === input.campaignId)) {
    return fail('not-found', 'That campaign no longer exists.')
  }
  if (input.directionId !== undefined && !data.directions.some((d) => d.id === input.directionId)) {
    return fail('not-found', 'That direction no longer exists.')
  }
  const errors: string[] = []
  const title = text(input.title, 'A title', errors, { required: true, max: 200 })
  for (const id of input.capabilityIds) {
    if (!deps.content.capability(id)) errors.push(`There is no capability "${id}" in the installed content.`)
  }
  for (const id of input.methodIds) {
    if (!deps.content.method(id)) errors.push(`There is no method "${id}" in the installed content.`)
  }
  for (const [field, value] of Object.entries(input.plan)) text(value, `The plan's ${field}`, errors)
  if (errors.length > 0) return fail('validation', ...errors)

  const now = deps.clock.now()
  const readiness = planReadiness(input.kind, input.plan)
  const activity: PracticeActivity = {
    id: deps.newId(),
    situationId: input.situationId,
    ...(input.campaignId !== undefined ? { campaignId: input.campaignId } : {}),
    ...(input.directionId !== undefined ? { directionId: input.directionId } : {}),
    ...(input.templateId !== undefined ? { templateId: input.templateId } : {}),
    ...(input.stepId !== undefined ? { stepId: input.stepId } : {}),
    route: input.route,
    kind: input.kind,
    title,
    plan: { ...input.plan },
    capabilityIds: [...new Set(input.capabilityIds)],
    methodIds: [...new Set(input.methodIds)],
    state: readiness.ready ? 'ready' : 'planned',
    createdAt: now,
    updatedAt: now,
  }
  let next: UserData = { ...data, activities: [...data.activities, activity] }
  // Record the activity against the campaign step that offered it, so the path stays explainable.
  if (input.campaignId !== undefined) {
    const campaign = next.campaigns.find((c) => c.id === input.campaignId)
    if (campaign) {
      const index = campaign.path.length - 1
      next = {
        ...next,
        campaigns: upsertById(next.campaigns, {
          ...campaign,
          path: campaign.path.map((entry, i) => (i === index ? { ...entry, activityIds: [...entry.activityIds, activity.id] } : entry)),
          updatedAt: now,
        }),
      }
    }
  }
  return ok(next, activity)
}

export function updateActivityPlan(
  data: UserData,
  input: { id: Id; title?: string; plan?: ActivityPlan; capabilityIds?: Id[]; methodIds?: Id[] },
  deps: CommandDeps,
): CommandOutcome<PracticeActivity> {
  const existing = data.activities.find((a) => a.id === input.id)
  if (!existing) return fail('not-found', 'That activity no longer exists.')
  if (existing.state === 'attempted' || existing.state === 'reviewed') {
    return fail('illegal-transition', 'This activity has already been attempted. Its plan is part of the record and cannot be rewritten.')
  }
  const errors: string[] = []
  const title = input.title === undefined ? existing.title : text(input.title, 'A title', errors, { required: true, max: 200 })
  for (const id of input.capabilityIds ?? []) {
    if (!deps.content.capability(id)) errors.push(`There is no capability "${id}" in the installed content.`)
  }
  for (const id of input.methodIds ?? []) {
    if (!deps.content.method(id)) errors.push(`There is no method "${id}" in the installed content.`)
  }
  if (errors.length > 0) return fail('validation', ...errors)
  const plan = input.plan ?? existing.plan
  const readiness = planReadiness(existing.kind, plan)
  const next: PracticeActivity = {
    ...existing,
    title,
    plan: { ...plan },
    ...(input.capabilityIds !== undefined ? { capabilityIds: [...new Set(input.capabilityIds)] } : {}),
    ...(input.methodIds !== undefined ? { methodIds: [...new Set(input.methodIds)] } : {}),
    state: existing.state === 'paused' ? 'paused' : readiness.ready ? 'ready' : 'planned',
    updatedAt: deps.clock.now(),
  }
  return ok({ ...data, activities: upsertById(data.activities, next) }, next)
}

export function setActivityState(
  data: UserData,
  input: { id: Id; state: ActivityState },
  deps: CommandDeps,
): CommandOutcome<PracticeActivity> {
  const existing = data.activities.find((a) => a.id === input.id)
  if (!existing) return fail('not-found', 'That activity no longer exists.')
  if (existing.state === input.state) return ok(data, existing)
  if (!canTransitionActivity(existing.state, input.state)) {
    return fail('illegal-transition', `An activity cannot go from ${existing.state} to ${input.state}.`)
  }
  if (input.state === 'ready' && !planReadiness(existing.kind, existing.plan).ready) {
    return fail('validation', `This plan still needs ${planReadiness(existing.kind, existing.plan).missing.join(', ')}.`)
  }
  const next: PracticeActivity = { ...existing, state: input.state, updatedAt: deps.clock.now() }
  return ok({ ...data, activities: upsertById(data.activities, next) }, next)
}

export function deleteActivity(data: UserData, id: Id): CommandOutcome {
  if (!data.activities.some((a) => a.id === id)) return fail('not-found', 'That activity no longer exists.')
  return ok(deleteActivityCascade(data, id), undefined)
}

// ------------------------------------------------------------------ Attempt

export interface RecordAttemptInput {
  activityId: Id
  outcome: AttemptOutcome
  note: string
  assistance: AssistanceLevel
}

export function recordAttempt(data: UserData, input: RecordAttemptInput, deps: CommandDeps): CommandOutcome<Attempt> {
  const activity = data.activities.find((a) => a.id === input.activityId)
  if (!activity) return fail('not-found', 'That activity no longer exists.')
  if (data.attempts.some((a) => a.activityId === activity.id)) {
    return fail('validation', 'An attempt is already recorded for this activity. Saving it again would not add anything.')
  }
  if (activity.state !== 'ready' && activity.state !== 'planned' && activity.state !== 'paused') {
    return fail('illegal-transition', `An activity that is ${activity.state} cannot take a new attempt record.`)
  }
  const errors: string[] = []
  const note = text(input.note, 'What happened', errors)
  if (errors.length > 0) return fail('validation', ...errors)
  const now = deps.clock.now()
  const attempt: Attempt = {
    id: deps.newId(),
    activityId: activity.id,
    outcome: input.outcome,
    note,
    assistance: input.assistance,
    attemptedAt: now,
    createdAt: now,
    updatedAt: now,
  }
  const nextActivity: PracticeActivity = { ...activity, state: 'attempted', updatedAt: now }
  return ok(
    { ...data, attempts: [...data.attempts, attempt], activities: upsertById(data.activities, nextActivity) },
    attempt,
  )
}

// ------------------------------------------------------------------ Review

export interface SaveReviewInput {
  activityId: Id
  observation: string
  interpretation: string
  alternativeExplanation: string
  nextAdjustment: string
  nextMove: NextMove
}

export function saveReview(data: UserData, input: SaveReviewInput, deps: CommandDeps): CommandOutcome<Review> {
  const activity = data.activities.find((a) => a.id === input.activityId)
  if (!activity) return fail('not-found', 'That activity no longer exists.')
  if (!data.attempts.some((a) => a.activityId === activity.id)) {
    return fail('validation', 'Record what happened before reviewing it. A review of an attempt that was never made would not mean anything.')
  }
  const existing = data.reviews.find((r) => r.activityId === activity.id)
  const errors: string[] = []
  const observation = text(input.observation, 'What you observed', errors, { required: true })
  const interpretation = text(input.interpretation, 'What you take it to mean', errors)
  const alternative = text(input.alternativeExplanation, 'A competing explanation', errors)
  const adjustment = text(input.nextAdjustment, 'The next adjustment', errors)
  if (errors.length > 0) return fail('validation', ...errors)
  const now = deps.clock.now()
  const review: Review = {
    id: existing?.id ?? deps.newId(),
    activityId: activity.id,
    observation,
    interpretation,
    alternativeExplanation: alternative,
    nextAdjustment: adjustment,
    nextMove: input.nextMove,
    reviewedAt: existing?.reviewedAt ?? now,
    updatedAt: now,
  }
  const nextActivity: PracticeActivity = { ...activity, state: 'reviewed', updatedAt: now }
  return ok(
    { ...data, reviews: upsertById(data.reviews, review), activities: upsertById(data.activities, nextActivity) },
    review,
  )
}

export function deleteReview(data: UserData, id: Id): CommandOutcome {
  if (!data.reviews.some((r) => r.id === id)) return fail('not-found', 'That review no longer exists.')
  return ok(deleteReviewCascade(data, id), undefined)
}

// ------------------------------------------------------------------ Evidence

export interface RecordEvidenceInput {
  activityId?: Id
  attemptId?: Id
  reviewId?: Id
  situationId?: Id
  kind: EvidenceKind
  text: string
  attribution?: string
  visibility?: Visibility
  capabilityIds: Id[]
  source?: EvidenceItem['source']
  sourceRef?: string
}

/** Looks like a stored contact detail. Kept in step with validation.ts. */
const CONTACTISH = /(@[\w.-]+\.[a-z]{2,})|(\+?\d[\d ()-]{7,}\d)/i

export function recordEvidence(data: UserData, input: RecordEvidenceInput, deps: CommandDeps): CommandOutcome<EvidenceItem> {
  const errors: string[] = []
  const value = text(input.text, 'The evidence', errors, { required: true })
  if (input.activityId !== undefined && !data.activities.some((a) => a.id === input.activityId)) errors.push('That activity no longer exists.')
  if (input.attemptId !== undefined && !data.attempts.some((a) => a.id === input.attemptId)) errors.push('That attempt no longer exists.')
  if (input.reviewId !== undefined && !data.reviews.some((r) => r.id === input.reviewId)) errors.push('That review no longer exists.')
  if (input.situationId !== undefined && !data.situations.some((s) => s.id === input.situationId)) errors.push('That situation no longer exists.')
  if (
    input.activityId === undefined &&
    input.attemptId === undefined &&
    input.reviewId === undefined &&
    input.situationId === undefined
  ) {
    errors.push('Evidence has to be attached to an activity, an attempt, a review or a situation.')
  }
  for (const id of input.capabilityIds) {
    if (!deps.content.capability(id)) errors.push(`There is no capability "${id}" in the installed content.`)
  }
  let attribution: string | undefined
  if (input.attribution !== undefined && input.attribution.trim() !== '') {
    attribution = text(input.attribution, 'The attribution', errors, { max: MAX_ATTRIBUTION_LENGTH })
    if (CONTACTISH.test(attribution)) {
      errors.push(
        'Describe who this came from by their role, not by a contact detail. Information about other people is kept to the minimum this app needs.',
      )
    }
  }
  if (errors.length > 0) return fail('validation', ...errors)
  const now = deps.clock.now()
  const item: EvidenceItem = {
    id: deps.newId(),
    ...(input.activityId !== undefined ? { activityId: input.activityId } : {}),
    ...(input.attemptId !== undefined ? { attemptId: input.attemptId } : {}),
    ...(input.reviewId !== undefined ? { reviewId: input.reviewId } : {}),
    ...(input.situationId !== undefined ? { situationId: input.situationId } : {}),
    kind: input.kind,
    text: value,
    source: input.source ?? 'user',
    ...(input.sourceRef !== undefined ? { sourceRef: input.sourceRef } : {}),
    ...(attribution !== undefined ? { attribution } : {}),
    visibility: input.visibility ?? 'private',
    capabilityIds: [...new Set(input.capabilityIds)],
    recordedAt: now,
    updatedAt: now,
  }
  return ok({ ...data, evidence: [...data.evidence, item] }, item)
}

/**
 * Deleting evidence removes it and unlinks it everywhere. Every projection recomputes from
 * records, so a stage or a total that depended on this item disappears with it. The appearance
 * the user chose is deliberately untouched: see domain/experience.ts.
 */
export function deleteEvidence(data: UserData, ids: readonly Id[]): CommandOutcome<{ removed: number }> {
  const present = ids.filter((id) => data.evidence.some((e) => e.id === id))
  if (present.length === 0) return fail('not-found', 'Those evidence items no longer exist.')
  return ok(deleteEvidenceCascade(data, new Set(present)), { removed: present.length })
}

// ------------------------------------------------------------------ Perk

export function confirmPerk(
  data: UserData,
  input: { description: string; evidenceActivityIds: Id[]; possibleOveruse?: string },
  deps: CommandDeps,
): CommandOutcome<Perk> {
  const errors: string[] = []
  const description = text(input.description, 'A description', errors, { required: true, max: 1_000 })
  if (input.evidenceActivityIds.length === 0) {
    errors.push('Point at least one of your own activities at this, so it stays a statement about something you did.')
  }
  for (const id of input.evidenceActivityIds) {
    const activity = requireRecord(data.activities, (a) => a.id === id, 'activity', id)
    if (!activity) errors.push('One of the activities you pointed at no longer exists.')
    else if (activity.state !== 'attempted' && activity.state !== 'reviewed') {
      errors.push(`"${activity.title}" has not been attempted yet, so it cannot be an example.`)
    }
  }
  if (errors.length > 0) return fail('validation', ...errors)
  const now = deps.clock.now()
  const perk: Perk = {
    id: deps.newId(),
    description,
    evidenceActivityIds: [...new Set(input.evidenceActivityIds)],
    ...(input.possibleOveruse !== undefined && input.possibleOveruse.trim() !== '' ? { possibleOveruse: input.possibleOveruse } : {}),
    createdAt: now,
    updatedAt: now,
  }
  return ok({ ...data, perks: [...data.perks, perk] }, perk)
}

export function deletePerk(data: UserData, id: Id): CommandOutcome {
  if (!data.perks.some((p) => p.id === id)) return fail('not-found', 'That strength no longer exists.')
  return ok({ ...data, perks: data.perks.filter((p) => p.id !== id) }, undefined)
}

// ------------------------------------------------------------------ Appearance and profile

export function saveAppearance(data: UserData, appearance: Appearance, deps: CommandDeps): CommandOutcome<Appearance> {
  const errors: string[] = []
  text(appearance.emblem, 'The emblem', errors, { required: true, max: 64 })
  text(appearance.palette, 'The palette', errors, { required: true, max: 64 })
  if (errors.length > 0) return fail('validation', ...errors)
  const next = { ...data, profile: { ...data.profile, appearance: { ...appearance }, updatedAt: deps.clock.now() } }
  return ok(next, appearance)
}

export function saveDisplayName(data: UserData, displayName: string, deps: CommandDeps): CommandOutcome<string> {
  const errors: string[] = []
  const value = text(displayName, 'A name', errors, { max: 200 })
  if (errors.length > 0) return fail('validation', ...errors)
  const profile = { ...data.profile, updatedAt: deps.clock.now() }
  if (value.trim() === '') delete profile.displayName
  else profile.displayName = value
  return ok({ ...data, profile }, value)
}

// ------------------------------------------------------------------ Share package

export interface CreateSharePackageInput {
  title: string
  anonymisedCase?: string
  reusablePractice?: string
  supportRequest?: string
  structuralObstacle?: string
  sourceRecordIds?: Id[]
}

/**
 * Creates a snapshot the user can copy out. It does not transmit anything and it does not grant
 * anybody access to the journal. The copy has its own lifetime: deleting the original later
 * cannot recall it.
 */
export function createSharePackage(data: UserData, input: CreateSharePackageInput, deps: CommandDeps): CommandOutcome<SharePackage> {
  const errors: string[] = []
  const title = text(input.title, 'A title', errors, { required: true, max: 200 })
  const parts = [input.anonymisedCase, input.reusablePractice, input.supportRequest, input.structuralObstacle]
  if (!parts.some((p) => p !== undefined && p.trim() !== '')) {
    errors.push('Write at least one of the four parts, so the package says something.')
  }
  for (const [i, part] of parts.entries()) if (part !== undefined) text(part, `Part ${i + 1}`, errors)
  if (errors.length > 0) return fail('validation', ...errors)
  const now = deps.clock.now()
  const pkg: SharePackage = {
    id: deps.newId(),
    title,
    ...(input.anonymisedCase !== undefined && input.anonymisedCase.trim() !== '' ? { anonymisedCase: input.anonymisedCase } : {}),
    ...(input.reusablePractice !== undefined && input.reusablePractice.trim() !== '' ? { reusablePractice: input.reusablePractice } : {}),
    ...(input.supportRequest !== undefined && input.supportRequest.trim() !== '' ? { supportRequest: input.supportRequest } : {}),
    ...(input.structuralObstacle !== undefined && input.structuralObstacle.trim() !== '' ? { structuralObstacle: input.structuralObstacle } : {}),
    sourceRecordIds: [...new Set(input.sourceRecordIds ?? [])],
    snapshotAt: now,
    createdAt: now,
    updatedAt: now,
  }
  return ok({ ...data, sharePackages: [...data.sharePackages, pkg] }, pkg)
}

export function deleteSharePackage(data: UserData, id: Id): CommandOutcome {
  if (!data.sharePackages.some((p) => p.id === id)) return fail('not-found', 'That package no longer exists.')
  return ok({ ...data, sharePackages: data.sharePackages.filter((p) => p.id !== id) }, undefined)
}

// ------------------------------------------------------------------ AI proposals

/** Stores offered proposals. The AI layer validated them first; this only records them. */
export function recordProposals(data: UserData, proposals: readonly AiProposal[]): CommandOutcome<number> {
  if (proposals.length === 0) return ok(data, 0)
  let next = data
  for (const proposal of proposals) next = { ...next, proposals: upsertById(next.proposals, proposal) }
  return ok(next, proposals.length)
}

export function rejectProposal(data: UserData, input: { id: Id; note?: string }, deps: CommandDeps): CommandOutcome<AiProposal> {
  const existing = data.proposals.find((p) => p.id === input.id)
  if (!existing) return fail('not-found', 'That suggestion no longer exists.')
  const now = deps.clock.now()
  const next: AiProposal = {
    ...existing,
    state: 'rejected',
    ...(input.note !== undefined && input.note !== '' ? { rejectionNote: input.note } : {}),
    decidedAt: now,
    updatedAt: now,
  }
  return ok({ ...data, proposals: upsertById(data.proposals, next) }, next)
}

/** Marks a proposal accepted. The record it produced is created by the ordinary command. */
export function markProposalAccepted(data: UserData, id: Id, deps: CommandDeps): CommandOutcome<AiProposal> {
  const existing = data.proposals.find((p) => p.id === id)
  if (!existing) return fail('not-found', 'That suggestion no longer exists.')
  if (existing.state === 'accepted') return fail('validation', 'That suggestion has already been accepted.')
  if (existing.state !== 'offered') return fail('illegal-transition', `A ${existing.state} suggestion cannot be accepted.`)
  const now = deps.clock.now()
  const next: AiProposal = { ...existing, state: 'accepted', decidedAt: now, updatedAt: now }
  return ok({ ...data, proposals: upsertById(data.proposals, next) }, next)
}
