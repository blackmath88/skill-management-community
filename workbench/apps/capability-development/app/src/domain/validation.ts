/**
 * Runtime validation for untrusted UserData (imports, stored snapshots).
 *
 * Policy: unknown extra fields are dropped; the returned data contains only known fields. Older
 * readable schema versions are migrated to SCHEMA_VERSION. Validation never throws.
 *
 * Adapted from blackmath88/leader-me src/domain/validation.ts (commit 55114f3b). The Reader
 * pattern, the length and collection caps and the drop-unknown-fields policy are carried over;
 * the record set and the relationship and privacy checks are this application's.
 */
import {
  ACTIVITY_KINDS,
  ACTIVITY_STATES,
  AI_PROPOSAL_KINDS,
  ASSISTANCE_LEVELS,
  ATTEMPT_OUTCOMES,
  CAMPAIGN_STATES,
  CONSTRAINT_KINDS,
  DEVELOPMENT_ROUTES,
  EVIDENCE_KINDS,
  NEXT_MOVES,
  READABLE_SCHEMA_VERSIONS,
  SCHEMA_VERSION,
  SUPPORT_KINDS,
  type ActivityKind,
  type ActivityPlan,
  type ActivityState,
  type AiProposal,
  type AiProposalKind,
  type AiProposalState,
  type AiProvenance,
  type Appearance,
  type AppearanceAssemblage,
  type AppearanceMarker,
  type AppearancePiece,
  type AssistanceLevel,
  type Attempt,
  type AttemptOutcome,
  type Authority,
  type Campaign,
  type CampaignPathEntry,
  type CampaignState,
  type ChallengeKind,
  type ConstraintKind,
  type DecisionOwnership,
  type DevelopmentDirection,
  type DevelopmentRoute,
  type DirectionRevision,
  type DirectionState,
  type EvidenceItem,
  type EvidenceKind,
  type HypothesisCategory,
  type HypothesisRevision,
  type HypothesisStatus,
  type NextMove,
  type Perk,
  type PracticeActivity,
  type PresentationMode,
  type Profile,
  type RecordSource,
  type Review,
  type SharePackage,
  type Situation,
  type SupportKind,
  type UserData,
  type Visibility,
  type WorkingHypothesis,
} from './types'

export const MAX_STRING_LENGTH = 20_000
export const MAX_COLLECTION_SIZE = 5_000
/** Attribution is a role, not a person. Long free text here invites storing identities. */
export const MAX_ATTRIBUTION_LENGTH = 120

export type ValidationResult = { ok: true; data: UserData } | { ok: false; errors: string[] }

export interface ValidationOptions {
  /** When given, every capabilityId must be one of these. */
  knownCapabilityIds?: readonly string[]
  /** When given, every methodId must be one of these. */
  knownMethodIds?: readonly string[]
  /** When given, every campaign definitionId must be one of these. */
  knownCampaignIds?: readonly string[]
}

const DIRECTION_STATES: readonly DirectionState[] = ['active', 'paused', 'retired']
const HYPOTHESIS_STATUSES: readonly HypothesisStatus[] = ['open', 'supported', 'contradicted', 'rejected', 'parked']
const RECORD_SOURCES: readonly RecordSource[] = ['user', 'content', 'ai-proposal']
const AUTHORITIES: readonly Authority[] = ['decide', 'recommend', 'negotiate', 'unclear']
const OWNERSHIPS: readonly DecisionOwnership[] = ['clear', 'unclear', 'contested']
const CHALLENGES: readonly ChallengeKind[] = ['priorities', 'ownership', 'adoption', 'handover', 'other']
const VISIBILITIES: readonly Visibility[] = ['private', 'shareable']
const PROPOSAL_STATES: readonly AiProposalState[] = ['offered', 'accepted', 'rejected', 'stale', 'invalid']
const PRESENTATION_MODES: readonly PresentationMode[] = ['character', 'journey', 'evidence']

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
/** Looks like a stored contact detail. Attribution must stay a role. */
const CONTACTISH = /(@[\w.-]+\.[a-z]{2,})|(\+?\d[\d ()-]{7,}\d)/i

type Obj = Record<string, unknown>

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Collects errors while reading fields; returns placeholder values on failure. */
class Reader {
  constructor(private readonly errors: string[]) {}

  fail(path: string, message: string): void {
    if (this.errors.length < 200) this.errors.push(`${path}: ${message}`)
  }

  obj(v: unknown, path: string): Obj | null {
    if (!isObj(v)) {
      this.fail(path, 'must be an object')
      return null
    }
    return v
  }

  str(o: Obj, key: string, path: string, opts: { nonEmpty?: boolean; max?: number } = {}): string {
    const v = o[key]
    if (typeof v !== 'string') {
      this.fail(`${path}.${key}`, 'must be a string')
      return ''
    }
    const max = opts.max ?? MAX_STRING_LENGTH
    if (v.length > max) this.fail(`${path}.${key}`, `is longer than ${max} characters`)
    if (opts.nonEmpty && v.trim() === '') this.fail(`${path}.${key}`, 'must not be empty')
    return v
  }

  optStr(o: Obj, key: string, path: string, opts: { max?: number } = {}): string | undefined {
    if (o[key] === undefined) return undefined
    return this.str(o, key, path, opts)
  }

  id(o: Obj, key: string, path: string): string {
    return this.str(o, key, path, { nonEmpty: true })
  }

  optId(o: Obj, key: string, path: string): string | undefined {
    if (o[key] === undefined) return undefined
    return this.id(o, key, path)
  }

  iso(o: Obj, key: string, path: string): string {
    const v = this.str(o, key, path)
    if (!ISO_UTC.test(v) || Number.isNaN(Date.parse(v))) this.fail(`${path}.${key}`, 'must be an ISO-8601 UTC timestamp')
    return v
  }

  optIso(o: Obj, key: string, path: string): string | undefined {
    if (o[key] === undefined) return undefined
    return this.iso(o, key, path)
  }

  /** A review date may be empty while a plan is still a draft. */
  dateOrEmpty(o: Obj, key: string, path: string): string {
    const v = this.str(o, key, path)
    if (v === '') return v
    if (!ISO_DATE.test(v) || Number.isNaN(Date.parse(v))) this.fail(`${path}.${key}`, 'must be a date (YYYY-MM-DD)')
    return v
  }

  int(o: Obj, key: string, path: string, opts: { min?: number; max?: number } = {}): number {
    const v = o[key]
    if (typeof v !== 'number' || !Number.isInteger(v)) {
      this.fail(`${path}.${key}`, 'must be an integer')
      return opts.min ?? 0
    }
    if (opts.min !== undefined && v < opts.min) this.fail(`${path}.${key}`, `must be at least ${opts.min}`)
    if (opts.max !== undefined && v > opts.max) this.fail(`${path}.${key}`, `must be at most ${opts.max}`)
    return v
  }

  /** A finite number in a bounded range. NaN and Infinity are refused, not clamped. */
  num(o: Obj, key: string, path: string, opts: { min: number; max: number }): number {
    const v = o[key]
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      this.fail(`${path}.${key}`, 'must be a finite number')
      return 0
    }
    if (v < opts.min || v > opts.max) {
      this.fail(`${path}.${key}`, `must be between ${opts.min} and ${opts.max}`)
      return 0
    }
    return v
  }

  bool(o: Obj, key: string, path: string): boolean {
    const v = o[key]
    if (typeof v !== 'boolean') {
      this.fail(`${path}.${key}`, 'must be true or false')
      return false
    }
    return v
  }

  oneOf<T extends string>(o: Obj, key: string, allowed: readonly T[], path: string): T {
    const v = o[key]
    if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) {
      this.fail(`${path}.${key}`, `must be one of ${allowed.join(', ')}`)
      return allowed[0] as T
    }
    return v as T
  }

  optOneOf<T extends string>(o: Obj, key: string, allowed: readonly T[], path: string): T | undefined {
    if (o[key] === undefined) return undefined
    return this.oneOf(o, key, allowed, path)
  }

  arr(o: Obj, key: string, path: string): unknown[] {
    const v = o[key]
    if (!Array.isArray(v)) {
      this.fail(`${path}.${key}`, 'must be an array')
      return []
    }
    if (v.length > MAX_COLLECTION_SIZE) {
      this.fail(`${path}.${key}`, `has more than ${MAX_COLLECTION_SIZE} entries`)
      return []
    }
    return v
  }

  strArr(o: Obj, key: string, path: string, opts: { nonEmpty?: boolean } = {}): string[] {
    return this.arr(o, key, path).map((item, i) => {
      if (typeof item !== 'string') {
        this.fail(`${path}.${key}[${i}]`, 'must be a string')
        return ''
      }
      if (item.length > MAX_STRING_LENGTH) this.fail(`${path}.${key}[${i}]`, `is longer than ${MAX_STRING_LENGTH} characters`)
      if (opts.nonEmpty && item.trim() === '') this.fail(`${path}.${key}[${i}]`, 'must not be empty')
      return item
    })
  }

  enumArr<T extends string>(o: Obj, key: string, allowed: readonly T[], path: string): T[] {
    return this.arr(o, key, path).flatMap((item, i) => {
      if (typeof item !== 'string' || !(allowed as readonly string[]).includes(item)) {
        this.fail(`${path}.${key}[${i}]`, `must be one of ${allowed.join(', ')}`)
        return []
      }
      return [item as T]
    })
  }
}

// ------------------------------------------------------------------ Readers per record

/** Caps on the assemblage, so an import cannot arrive with ten thousand placed pieces. */
const MAX_PLACED_PIECES = 24
const MAX_MARKERS = 3

function readAppearanceMarker(r: Reader, v: unknown, path: string): AppearanceMarker | null {
  const o = r.obj(v, path)
  if (!o) return null
  const evidenceId = o.evidenceId === null ? null : r.optStr(o, 'evidenceId', path, { max: 200 }) ?? null
  return {
    id: r.str(o, 'id', path, { nonEmpty: true, max: 200 }),
    designId: r.str(o, 'designId', path, { nonEmpty: true, max: 64 }),
    evidenceId,
    hidden: r.bool(o, 'hidden', path),
  }
}

function readAppearancePiece(r: Reader, v: unknown, path: string): AppearancePiece | null {
  const o = r.obj(v, path)
  if (!o) return null
  const markers = r.arr(o, 'markers', path)
  if (markers.length > MAX_MARKERS) r.fail(`${path}.markers`, `holds more than ${MAX_MARKERS} markers`)
  return {
    instanceId: r.str(o, 'instanceId', path, { nonEmpty: true, max: 200 }),
    pieceId: r.str(o, 'pieceId', path, { nonEmpty: true, max: 64 }),
    parentInstanceId: o.parentInstanceId === null ? null : r.optStr(o, 'parentInstanceId', path, { max: 200 }) ?? null,
    receiverFrameId: o.receiverFrameId === null ? null : r.optStr(o, 'receiverFrameId', path, { max: 64 }) ?? null,
    restingFrameId: r.str(o, 'restingFrameId', path, { nonEmpty: true, max: 64 }),
    orientationIndex: r.int(o, 'orientationIndex', path, { min: 0, max: 64 }),
    groundX: r.num(o, 'groundX', path, { min: -50, max: 50 }),
    groundZ: r.num(o, 'groundZ', path, { min: -50, max: 50 }),
    markers: markers.slice(0, MAX_MARKERS).flatMap((m, i) => {
      const marker = readAppearanceMarker(r, m, `${path}.markers[${i}]`)
      return marker ? [marker] : []
    }),
  }
}

/**
 * Reads a saved assemblage.
 *
 * Shape only. Whether the pieces form a composition that can actually be built — roots, cycles,
 * occupied contacts, overlaps — is checked by ~/assemblage/placement, which owns those rules and
 * owns the catalogue they are about. A composition that passes here and fails there is shown as
 * a reported problem with the controls still working, not as a lost record set.
 */
function readAppearanceAssemblage(r: Reader, v: unknown, path: string): AppearanceAssemblage | undefined {
  const o = r.obj(v, path)
  if (!o) return undefined
  const version = r.int(o, 'version', path, { min: 1 })
  if (version !== 1) {
    r.fail(`${path}.version`, 'must be assemblage version 1')
    return undefined
  }
  const pieces = r.arr(o, 'pieces', path)
  if (pieces.length > MAX_PLACED_PIECES) {
    r.fail(`${path}.pieces`, `holds more than ${MAX_PLACED_PIECES} placed pieces`)
    return undefined
  }
  return {
    version: 1,
    catalogueVersion: r.int(o, 'catalogueVersion', path, { min: 0, max: 10_000 }),
    paletteId: r.str(o, 'paletteId', path, { nonEmpty: true, max: 64 }),
    pieces: pieces.flatMap((p, i) => {
      const piece = readAppearancePiece(r, p, `${path}.pieces[${i}]`)
      return piece ? [piece] : []
    }),
  }
}

/**
 * Validates an assemblage that arrived from outside — an imported file, say.
 *
 * Exported so an appearance-only import can be checked by the same reader that checks one
 * arriving inside a full record set. Two readers for one shape would be two places to forget a
 * cap.
 */
export function validateAppearanceAssemblage(
  v: unknown,
): { ok: true; data: AppearanceAssemblage } | { ok: false; errors: string[] } {
  const errors: string[] = []
  const reader = new Reader(errors)
  const data = readAppearanceAssemblage(reader, v, 'assemblage')
  if (!data || errors.length > 0) {
    return { ok: false, errors: errors.length > 0 ? errors : ['The composition could not be read.'] }
  }
  return { ok: true, data }
}

function readAppearance(r: Reader, v: unknown, path: string): Appearance | undefined {
  const o = r.obj(v, path)
  if (!o) return undefined
  const version = r.int(o, 'version', path, { min: 1 })
  if (version !== 1) {
    r.fail(`${path}.version`, 'must be appearance version 1')
    return undefined
  }
  const appearance: Appearance = {
    version: 1,
    mode: r.oneOf(o, 'mode', PRESENTATION_MODES, path),
    emblem: r.str(o, 'emblem', path, { max: 64 }),
    palette: r.str(o, 'palette', path, { max: 64 }),
    accessories: r.strArr(o, 'accessories', path),
  }
  if (o.assemblage !== undefined) {
    const assemblage = readAppearanceAssemblage(r, o.assemblage, `${path}.assemblage`)
    if (assemblage) appearance.assemblage = assemblage
  }
  return appearance
}

function readProfile(r: Reader, v: unknown): Profile {
  const path = 'profile'
  const o = r.obj(v, path) ?? {}
  const profile: Profile = {
    selectedPackIds: r.strArr(o, 'selectedPackIds', path),
    updatedAt: r.iso(o, 'updatedAt', path),
  }
  const displayName = r.optStr(o, 'displayName', path, { max: 200 })
  if (displayName !== undefined) profile.displayName = displayName
  if (o.appearance !== undefined) {
    const appearance = readAppearance(r, o.appearance, `${path}.appearance`)
    if (appearance) profile.appearance = appearance
  }
  return profile
}

function readDirectionRevision(r: Reader, v: unknown, path: string): DirectionRevision | null {
  const o = r.obj(v, path)
  if (!o) return null
  const rev: DirectionRevision = {
    at: r.iso(o, 'at', path),
    text: r.str(o, 'text', path),
    state: r.oneOf(o, 'state', DIRECTION_STATES, path),
  }
  const note = r.optStr(o, 'note', path)
  if (note !== undefined) rev.note = note
  return rev
}

function readDirection(r: Reader, o: Obj, path: string): DevelopmentDirection {
  const direction: DevelopmentDirection = {
    id: r.id(o, 'id', path),
    text: r.str(o, 'text', path, { nonEmpty: true }),
    state: r.oneOf(o, 'state', DIRECTION_STATES, path),
    createdAt: r.iso(o, 'createdAt', path),
    updatedAt: r.iso(o, 'updatedAt', path),
    history: r.arr(o, 'history', path).flatMap((h, i) => readDirectionRevision(r, h, `${path}.history[${i}]`) ?? []),
  }
  const focus = r.optId(o, 'focusCapabilityId', path)
  if (focus !== undefined) direction.focusCapabilityId = focus
  return direction
}

function readSituation(r: Reader, o: Obj, path: string): Situation {
  return {
    id: r.id(o, 'id', path),
    title: r.str(o, 'title', path, { nonEmpty: true }),
    description: r.str(o, 'description', path),
    context: r.str(o, 'context', path),
    desiredOutcome: r.str(o, 'desiredOutcome', path),
    authority: r.oneOf(o, 'authority', AUTHORITIES, path),
    decisionOwnership: r.oneOf(o, 'decisionOwnership', OWNERSHIPS, path),
    challenge: r.oneOf(o, 'challenge', CHALLENGES, path),
    constraints: dedupe(r.enumArr<ConstraintKind>(o, 'constraints', CONSTRAINT_KINDS, path)),
    supportAvailable: dedupe(r.enumArr<SupportKind>(o, 'supportAvailable', SUPPORT_KINDS, path)),
    createdAt: r.iso(o, 'createdAt', path),
    updatedAt: r.iso(o, 'updatedAt', path),
  }
}

function readPathEntry(r: Reader, v: unknown, path: string): CampaignPathEntry | null {
  const o = r.obj(v, path)
  if (!o) return null
  const entry: CampaignPathEntry = {
    stepId: r.id(o, 'stepId', path),
    enteredAt: r.iso(o, 'enteredAt', path),
    activityIds: r.strArr(o, 'activityIds', path, { nonEmpty: true }),
  }
  const choiceId = r.optId(o, 'choiceId', path)
  if (choiceId !== undefined) entry.choiceId = choiceId
  const completedAt = r.optIso(o, 'completedAt', path)
  if (completedAt !== undefined) entry.completedAt = completedAt
  return entry
}

function readCampaign(r: Reader, o: Obj, path: string): Campaign {
  const currentStepId = o.currentStepId
  if (currentStepId !== null && typeof currentStepId !== 'string') {
    r.fail(`${path}.currentStepId`, 'must be a step id or null')
  }
  const campaign: Campaign = {
    id: r.id(o, 'id', path),
    situationId: r.id(o, 'situationId', path),
    definitionId: r.id(o, 'definitionId', path),
    definitionVersion: r.int(o, 'definitionVersion', path, { min: 1 }),
    purpose: r.str(o, 'purpose', path),
    state: r.oneOf<CampaignState>(o, 'state', CAMPAIGN_STATES, path),
    path: r.arr(o, 'path', path).flatMap((e, i) => readPathEntry(r, e, `${path}.path[${i}]`) ?? []),
    currentStepId: typeof currentStepId === 'string' && currentStepId !== '' ? currentStepId : null,
    createdAt: r.iso(o, 'createdAt', path),
    updatedAt: r.iso(o, 'updatedAt', path),
  }
  const directionId = r.optId(o, 'directionId', path)
  if (directionId !== undefined) campaign.directionId = directionId
  const reviewIntent = r.optStr(o, 'reviewIntent', path)
  if (reviewIntent !== undefined) campaign.reviewIntent = reviewIntent
  return campaign
}

function readHypothesisRevision(r: Reader, v: unknown, path: string): HypothesisRevision | null {
  const o = r.obj(v, path)
  if (!o) return null
  const rev: HypothesisRevision = {
    at: r.iso(o, 'at', path),
    status: r.oneOf(o, 'status', HYPOTHESIS_STATUSES, path),
    text: r.str(o, 'text', path),
  }
  const note = r.optStr(o, 'note', path)
  if (note !== undefined) rev.note = note
  return rev
}

function readHypothesis(r: Reader, o: Obj, path: string): WorkingHypothesis {
  const hypothesis: WorkingHypothesis = {
    id: r.id(o, 'id', path),
    situationId: r.id(o, 'situationId', path),
    category: r.oneOf<HypothesisCategory>(o, 'category', DEVELOPMENT_ROUTES, path),
    text: r.str(o, 'text', path, { nonEmpty: true }),
    source: r.oneOf(o, 'source', RECORD_SOURCES, path),
    status: r.oneOf(o, 'status', HYPOTHESIS_STATUSES, path),
    evidenceIds: r.strArr(o, 'evidenceIds', path, { nonEmpty: true }),
    createdAt: r.iso(o, 'createdAt', path),
    updatedAt: r.iso(o, 'updatedAt', path),
    history: r.arr(o, 'history', path).flatMap((h, i) => readHypothesisRevision(r, h, `${path}.history[${i}]`) ?? []),
  }
  const campaignId = r.optId(o, 'campaignId', path)
  if (campaignId !== undefined) hypothesis.campaignId = campaignId
  const sourceRef = r.optStr(o, 'sourceRef', path)
  if (sourceRef !== undefined) hypothesis.sourceRef = sourceRef
  return hypothesis
}

function readPlan(r: Reader, v: unknown, path: string): ActivityPlan {
  const o = r.obj(v, path) ?? {}
  return {
    cue: r.str(o, 'cue', path),
    action: r.str(o, 'action', path),
    obstacle: r.str(o, 'obstacle', path),
    fallback: r.str(o, 'fallback', path),
    signal: r.str(o, 'signal', path),
    reviewOn: r.dateOrEmpty(o, 'reviewOn', path),
  }
}

function readActivity(r: Reader, o: Obj, path: string): PracticeActivity {
  const activity: PracticeActivity = {
    id: r.id(o, 'id', path),
    situationId: r.id(o, 'situationId', path),
    route: r.oneOf<DevelopmentRoute>(o, 'route', DEVELOPMENT_ROUTES, path),
    kind: r.oneOf<ActivityKind>(o, 'kind', ACTIVITY_KINDS, path),
    title: r.str(o, 'title', path, { nonEmpty: true }),
    plan: readPlan(r, o.plan, `${path}.plan`),
    capabilityIds: dedupe(r.strArr(o, 'capabilityIds', path, { nonEmpty: true })),
    methodIds: dedupe(r.strArr(o, 'methodIds', path, { nonEmpty: true })),
    state: r.oneOf<ActivityState>(o, 'state', ACTIVITY_STATES, path),
    createdAt: r.iso(o, 'createdAt', path),
    updatedAt: r.iso(o, 'updatedAt', path),
  }
  const campaignId = r.optId(o, 'campaignId', path)
  if (campaignId !== undefined) activity.campaignId = campaignId
  const directionId = r.optId(o, 'directionId', path)
  if (directionId !== undefined) activity.directionId = directionId
  const templateId = r.optId(o, 'templateId', path)
  if (templateId !== undefined) activity.templateId = templateId
  const stepId = r.optId(o, 'stepId', path)
  if (stepId !== undefined) activity.stepId = stepId
  return activity
}

function readAttempt(r: Reader, o: Obj, path: string): Attempt {
  return {
    id: r.id(o, 'id', path),
    activityId: r.id(o, 'activityId', path),
    outcome: r.oneOf<AttemptOutcome>(o, 'outcome', ATTEMPT_OUTCOMES, path),
    note: r.str(o, 'note', path),
    assistance: r.oneOf<AssistanceLevel>(o, 'assistance', ASSISTANCE_LEVELS, path),
    attemptedAt: r.iso(o, 'attemptedAt', path),
    createdAt: r.iso(o, 'createdAt', path),
    updatedAt: r.iso(o, 'updatedAt', path),
  }
}

function readEvidence(r: Reader, o: Obj, path: string): EvidenceItem {
  const item: EvidenceItem = {
    id: r.id(o, 'id', path),
    kind: r.oneOf<EvidenceKind>(o, 'kind', EVIDENCE_KINDS, path),
    text: r.str(o, 'text', path, { nonEmpty: true }),
    source: r.oneOf(o, 'source', RECORD_SOURCES, path),
    visibility: r.oneOf<Visibility>(o, 'visibility', VISIBILITIES, path),
    capabilityIds: dedupe(r.strArr(o, 'capabilityIds', path, { nonEmpty: true })),
    recordedAt: r.iso(o, 'recordedAt', path),
    updatedAt: r.iso(o, 'updatedAt', path),
  }
  const activityId = r.optId(o, 'activityId', path)
  if (activityId !== undefined) item.activityId = activityId
  const attemptId = r.optId(o, 'attemptId', path)
  if (attemptId !== undefined) item.attemptId = attemptId
  const reviewId = r.optId(o, 'reviewId', path)
  if (reviewId !== undefined) item.reviewId = reviewId
  const situationId = r.optId(o, 'situationId', path)
  if (situationId !== undefined) item.situationId = situationId
  const sourceRef = r.optStr(o, 'sourceRef', path)
  if (sourceRef !== undefined) item.sourceRef = sourceRef
  const attribution = r.optStr(o, 'attribution', path, { max: MAX_ATTRIBUTION_LENGTH })
  if (attribution !== undefined) {
    // Data minimisation applies to information about other people.
    if (CONTACTISH.test(attribution)) {
      r.fail(`${path}.attribution`, 'must describe a role, not a contact detail')
    } else {
      item.attribution = attribution
    }
  }
  if (item.activityId === undefined && item.attemptId === undefined && item.reviewId === undefined && item.situationId === undefined) {
    r.fail(path, 'must be anchored to an activity, attempt, review or situation')
  }
  return item
}

function readReview(r: Reader, o: Obj, path: string): Review {
  return {
    id: r.id(o, 'id', path),
    activityId: r.id(o, 'activityId', path),
    observation: r.str(o, 'observation', path),
    interpretation: r.str(o, 'interpretation', path),
    alternativeExplanation: r.str(o, 'alternativeExplanation', path),
    nextAdjustment: r.str(o, 'nextAdjustment', path),
    nextMove: r.oneOf<NextMove>(o, 'nextMove', NEXT_MOVES, path),
    reviewedAt: r.iso(o, 'reviewedAt', path),
    updatedAt: r.iso(o, 'updatedAt', path),
  }
}

function readPerk(r: Reader, o: Obj, path: string): Perk {
  const perk: Perk = {
    id: r.id(o, 'id', path),
    description: r.str(o, 'description', path, { nonEmpty: true }),
    evidenceActivityIds: r.strArr(o, 'evidenceActivityIds', path, { nonEmpty: true }),
    createdAt: r.iso(o, 'createdAt', path),
    updatedAt: r.iso(o, 'updatedAt', path),
  }
  const overuse = r.optStr(o, 'possibleOveruse', path)
  if (overuse !== undefined) perk.possibleOveruse = overuse
  return perk
}

function readProvenance(r: Reader, v: unknown, path: string): AiProvenance {
  const o = r.obj(v, path) ?? {}
  return {
    providerId: r.str(o, 'providerId', path, { nonEmpty: true, max: 120 }),
    model: r.str(o, 'model', path, { max: 120 }),
    promptId: r.str(o, 'promptId', path, { max: 120 }),
    requestedAt: r.iso(o, 'requestedAt', path),
  }
}

function readProposal(r: Reader, o: Obj, path: string): AiProposal {
  const proposal: AiProposal = {
    id: r.id(o, 'id', path),
    kind: r.oneOf<AiProposalKind>(o, 'kind', AI_PROPOSAL_KINDS, path),
    text: r.str(o, 'text', path),
    referencedIds: r.strArr(o, 'referencedIds', path, { nonEmpty: true }),
    baseRevision: r.int(o, 'baseRevision', path, { min: 0 }),
    provenance: readProvenance(r, o.provenance, `${path}.provenance`),
    state: r.oneOf<AiProposalState>(o, 'state', PROPOSAL_STATES, path),
    createdAt: r.iso(o, 'createdAt', path),
    updatedAt: r.iso(o, 'updatedAt', path),
  }
  const route = r.optOneOf<DevelopmentRoute>(o, 'suggestedRoute', DEVELOPMENT_ROUTES, path)
  if (route !== undefined) proposal.suggestedRoute = route
  const note = r.optStr(o, 'rejectionNote', path)
  if (note !== undefined) proposal.rejectionNote = note
  const decidedAt = r.optIso(o, 'decidedAt', path)
  if (decidedAt !== undefined) proposal.decidedAt = decidedAt
  return proposal
}

function readSharePackage(r: Reader, o: Obj, path: string): SharePackage {
  const pkg: SharePackage = {
    id: r.id(o, 'id', path),
    title: r.str(o, 'title', path, { nonEmpty: true }),
    sourceRecordIds: r.strArr(o, 'sourceRecordIds', path, { nonEmpty: true }),
    snapshotAt: r.iso(o, 'snapshotAt', path),
    createdAt: r.iso(o, 'createdAt', path),
    updatedAt: r.iso(o, 'updatedAt', path),
  }
  for (const key of ['anonymisedCase', 'reusablePractice', 'supportRequest', 'structuralObstacle'] as const) {
    const value = r.optStr(o, key, path)
    if (value !== undefined) pkg[key] = value
  }
  return pkg
}

function dedupe<T>(items: T[]): T[] {
  return [...new Set(items)]
}

function readCollection<T extends { id: string }>(
  r: Reader,
  root: Obj,
  key: string,
  read: (r: Reader, o: Obj, path: string) => T,
): T[] {
  const seen = new Set<string>()
  return r.arr(root, key, 'data').flatMap((item, i) => {
    const path = `${key}[${i}]`
    const o = r.obj(item, path)
    if (!o) return []
    const record = read(r, o, path)
    if (record.id !== '') {
      if (seen.has(record.id)) r.fail(`${path}.id`, `duplicate id "${record.id}" in ${key}`)
      seen.add(record.id)
    }
    return [record]
  })
}

// ------------------------------------------------------------------ Whole record set

/** Structural, enum, relationship and privacy validation of a full UserData record set. */
export function validateUserData(input: unknown, options: ValidationOptions = {}): ValidationResult {
  const errors: string[] = []
  const r = new Reader(errors)
  const root = r.obj(input, 'data')
  if (!root) return { ok: false, errors }

  if (typeof root.schemaVersion !== 'number' || !READABLE_SCHEMA_VERSIONS.includes(root.schemaVersion)) {
    r.fail('data.schemaVersion', `must be one of ${READABLE_SCHEMA_VERSIONS.join(', ')}`)
    return { ok: false, errors }
  }

  const data: UserData = {
    schemaVersion: SCHEMA_VERSION,
    profile: readProfile(r, root.profile),
    directions: readCollection(r, root, 'directions', readDirection),
    situations: readCollection(r, root, 'situations', readSituation),
    campaigns: readCollection(r, root, 'campaigns', readCampaign),
    hypotheses: readCollection(r, root, 'hypotheses', readHypothesis),
    activities: readCollection(r, root, 'activities', readActivity),
    attempts: readCollection(r, root, 'attempts', readAttempt),
    evidence: readCollection(r, root, 'evidence', readEvidence),
    reviews: readCollection(r, root, 'reviews', readReview),
    perks: readCollection(r, root, 'perks', readPerk),
    proposals: readCollection(r, root, 'proposals', readProposal),
    sharePackages: readCollection(r, root, 'sharePackages', readSharePackage),
  }

  checkRelationships(r, data, options)
  return errors.length > 0 ? { ok: false, errors } : { ok: true, data }
}

function checkRelationships(r: Reader, data: UserData, options: ValidationOptions): void {
  const situationIds = new Set(data.situations.map((s) => s.id))
  const campaignIds = new Set(data.campaigns.map((c) => c.id))
  const directionIds = new Set(data.directions.map((d) => d.id))
  const activityIds = new Set(data.activities.map((a) => a.id))
  const attemptIds = new Set(data.attempts.map((a) => a.id))
  const reviewIds = new Set(data.reviews.map((rv) => rv.id))
  const evidenceIds = new Set(data.evidence.map((e) => e.id))

  const capabilities = options.knownCapabilityIds ? new Set(options.knownCapabilityIds) : null
  const methods = options.knownMethodIds ? new Set(options.knownMethodIds) : null
  const definitions = options.knownCampaignIds ? new Set(options.knownCampaignIds) : null

  const checkRef = (set: Set<string>, id: string | undefined, path: string, what: string) => {
    if (id === undefined || id === '') return
    if (!set.has(id)) r.fail(path, `refers to missing ${what} "${id}"`)
  }
  const checkCapabilities = (ids: string[], path: string) => {
    if (!capabilities) return
    ids.forEach((id, i) => {
      if (id !== '' && !capabilities.has(id)) r.fail(`${path}.capabilityIds[${i}]`, `unknown capability "${id}"`)
    })
  }

  data.directions.forEach((d, i) => {
    if (capabilities && d.focusCapabilityId !== undefined && !capabilities.has(d.focusCapabilityId)) {
      r.fail(`directions[${i}].focusCapabilityId`, `unknown capability "${d.focusCapabilityId}"`)
    }
  })

  data.campaigns.forEach((c, i) => {
    const path = `campaigns[${i}]`
    checkRef(situationIds, c.situationId, `${path}.situationId`, 'situation')
    checkRef(directionIds, c.directionId, `${path}.directionId`, 'direction')
    if (definitions && !definitions.has(c.definitionId)) {
      // Not an error: content may have been removed. History must stay readable.
      // Recorded as information only; campaigns pin their definition version on purpose.
    }
    c.path.forEach((entry, j) => {
      entry.activityIds.forEach((id, k) => {
        checkRef(activityIds, id, `${path}.path[${j}].activityIds[${k}]`, 'activity')
      })
    })
    if ((c.state === 'completed' || c.state === 'abandoned') && c.currentStepId !== null) {
      r.fail(`${path}.currentStepId`, `must be null once a campaign is ${c.state}`)
    }
    // The commands assume a live campaign's current step is the one its path ends on, and record
    // the chosen branch there. When the two disagree the choice is written nowhere, and the path
    // stops describing the route the person actually took.
    if (c.currentStepId !== null) {
      if (c.path.length === 0) {
        r.fail(`${path}.path`, 'must hold at least the current step while a campaign is live')
      } else if (c.path[c.path.length - 1]?.stepId !== c.currentStepId) {
        r.fail(
          `${path}.currentStepId`,
          `is "${c.currentStepId}" but the path ends at "${c.path[c.path.length - 1]?.stepId}"; they must agree`,
        )
      }
    }
  })

  data.hypotheses.forEach((h, i) => {
    const path = `hypotheses[${i}]`
    checkRef(situationIds, h.situationId, `${path}.situationId`, 'situation')
    checkRef(campaignIds, h.campaignId, `${path}.campaignId`, 'campaign')
    h.evidenceIds.forEach((id, j) => checkRef(evidenceIds, id, `${path}.evidenceIds[${j}]`, 'evidence item'))
  })

  data.activities.forEach((a, i) => {
    const path = `activities[${i}]`
    checkRef(situationIds, a.situationId, `${path}.situationId`, 'situation')
    checkRef(campaignIds, a.campaignId, `${path}.campaignId`, 'campaign')
    checkRef(directionIds, a.directionId, `${path}.directionId`, 'direction')
    checkCapabilities(a.capabilityIds, path)
    if (methods) {
      a.methodIds.forEach((id, j) => {
        if (id !== '' && !methods.has(id)) r.fail(`${path}.methodIds[${j}]`, `unknown method "${id}"`)
      })
    }
  })

  // An attempt is history: the activity must say it was attempted.
  const activityById = new Map(data.activities.map((a) => [a.id, a]))
  const attemptsPerActivity = new Map<string, number>()
  data.attempts.forEach((attempt, i) => {
    const path = `attempts[${i}]`
    checkRef(activityIds, attempt.activityId, `${path}.activityId`, 'activity')
    attemptsPerActivity.set(attempt.activityId, (attemptsPerActivity.get(attempt.activityId) ?? 0) + 1)
    const activity = activityById.get(attempt.activityId)
    if (activity && activity.state !== 'attempted' && activity.state !== 'reviewed' && activity.state !== 'paused' && activity.state !== 'abandoned') {
      r.fail(`${path}.activityId`, `refers to activity "${attempt.activityId}", which is still ${activity.state}`)
    }
  })
  for (const [activityId, count] of attemptsPerActivity) {
    if (count > 1) r.fail('attempts', `activity "${activityId}" has ${count} attempt records (one per activity)`)
  }

  const reviewsPerActivity = new Map<string, number>()
  data.reviews.forEach((review, i) => {
    const path = `reviews[${i}]`
    checkRef(activityIds, review.activityId, `${path}.activityId`, 'activity')
    reviewsPerActivity.set(review.activityId, (reviewsPerActivity.get(review.activityId) ?? 0) + 1)
    const activity = activityById.get(review.activityId)
    if (activity && activity.state !== 'attempted' && activity.state !== 'reviewed' && activity.state !== 'abandoned') {
      r.fail(`${path}.activityId`, `refers to activity "${review.activityId}", which has not been attempted`)
    }
  })
  for (const [activityId, count] of reviewsPerActivity) {
    if (count > 1) r.fail('reviews', `activity "${activityId}" has ${count} reviews (one per activity)`)
  }

  data.evidence.forEach((e, i) => {
    const path = `evidence[${i}]`
    checkRef(activityIds, e.activityId, `${path}.activityId`, 'activity')
    checkRef(attemptIds, e.attemptId, `${path}.attemptId`, 'attempt')
    checkRef(reviewIds, e.reviewId, `${path}.reviewId`, 'review')
    checkRef(situationIds, e.situationId, `${path}.situationId`, 'situation')
    checkCapabilities(e.capabilityIds, path)
  })

  data.perks.forEach((p, i) => {
    p.evidenceActivityIds.forEach((id, j) => {
      checkRef(activityIds, id, `perks[${i}].evidenceActivityIds[${j}]`, 'activity')
    })
  })

  // A proposal may reference any record; unknown ids make it invalid rather than failing the import.
  data.proposals.forEach((p, i) => {
    if (p.state !== 'offered') return
    const all = new Set([...situationIds, ...campaignIds, ...activityIds, ...attemptIds, ...reviewIds, ...evidenceIds, ...data.hypotheses.map((h) => h.id)])
    const invented = p.referencedIds.filter((id) => id !== '' && !all.has(id))
    if (invented.length > 0) {
      r.fail(`proposals[${i}].referencedIds`, `an offered proposal refers to records that do not exist: ${invented.join(', ')}`)
    }
  })
}
