/**
 * Turning provider output into reviewable proposals.
 *
 * Every response is validated the way an imported file is: shape, length, references and the
 * guard rules. A proposal that refers to a record that does not exist is invalid — a provider
 * inventing an id is the clearest sign its output should not be trusted. A proposal computed
 * from an older revision is stale and cannot be accepted; the user can ask again.
 */
import type { Clock, IdFactory } from '~/domain/ids'
import { AI_PROPOSAL_KINDS, DEVELOPMENT_ROUTES, type AiProposal, type UserData } from '~/domain/types'
import { checkText, MAX_PROPOSAL_CHARS, MAX_PROPOSALS_PER_RESPONSE, type GuardViolation } from './guards'
import type { AiRawResponse, AiRequest } from './types'

export interface ValidatedProposal {
  proposal: AiProposal
  /** Why it was refused, when its state is `invalid`. Shown to the user. */
  violations: GuardViolation[]
}

export interface ValidationReport {
  /** Proposals that may be offered to the user. */
  offered: AiProposal[]
  /** Proposals that were refused, kept so the refusal is visible rather than silent. */
  refused: ValidatedProposal[]
  /** Problems with the response as a whole. */
  errors: string[]
  note: string | null
}

export interface ValidateOptions {
  request: AiRequest
  response: AiRawResponse
  data: UserData
  /** The store revision right now. Anything older than this produces stale proposals. */
  currentRevision: number
  clock: Clock
  newId: IdFactory
}

/** Every id a proposal is allowed to refer to. */
function knownIds(data: UserData, request: AiRequest): Set<string> {
  const ids = new Set<string>()
  for (const collection of [data.situations, data.activities, data.attempts, data.reviews, data.hypotheses, data.evidence, data.campaigns]) {
    for (const record of collection) ids.add(record.id)
  }
  // Content ids that were in the context are legitimate references too.
  for (const item of request.context) ids.add(item.recordId)
  return ids
}

export function validateResponse(options: ValidateOptions): ValidationReport {
  const { request, response, data, currentRevision, clock, newId } = options
  const errors: string[] = []
  const offered: AiProposal[] = []
  const refused: ValidatedProposal[] = []

  if (!Array.isArray(response.proposals)) {
    return { offered: [], refused: [], errors: ['The provider returned something that is not a list of suggestions.'], note: null }
  }
  if (response.proposals.length > MAX_PROPOSALS_PER_RESPONSE) {
    errors.push(
      `The provider returned ${response.proposals.length} suggestions; only the first ${MAX_PROPOSALS_PER_RESPONSE} are shown.`,
    )
  }
  const stale = request.baseRevision !== currentRevision
  if (stale) {
    errors.push(
      'Your records changed while this was being prepared, so these suggestions are out of date and cannot be accepted. Ask again to get suggestions based on what you have now.',
    )
  }
  const allowed = knownIds(data, request)
  const now = clock.now()

  for (const raw of response.proposals.slice(0, MAX_PROPOSALS_PER_RESPONSE)) {
    const violations: GuardViolation[] = []
    if (typeof raw !== 'object' || raw === null) {
      errors.push('The provider returned a suggestion that is not an object. It was discarded.')
      continue
    }
    if (!AI_PROPOSAL_KINDS.includes(raw.kind)) {
      errors.push(`The provider returned an unknown suggestion kind ${JSON.stringify(raw.kind)}. It was discarded.`)
      continue
    }
    const text = typeof raw.text === 'string' ? raw.text : ''
    if (text.trim() === '') {
      errors.push('The provider returned an empty suggestion. It was discarded.')
      continue
    }
    if (text.length > MAX_PROPOSAL_CHARS) {
      violations.push({
        rule: 'too-long',
        reason: `A suggestion has to be short enough to review. This one is ${text.length} characters; the limit is ${MAX_PROPOSAL_CHARS}.`,
      })
    }
    const referenced = Array.isArray(raw.referencedIds) ? raw.referencedIds.filter((id) => typeof id === 'string') : []
    const invented = referenced.filter((id) => !allowed.has(id))
    if (invented.length > 0) {
      violations.push({
        rule: 'invented-reference',
        reason: `This suggestion refers to ${invented.length === 1 ? 'a record' : 'records'} that do not exist (${invented.join(', ')}), so it cannot be trusted.`,
      })
    }
    if (raw.suggestedRoute !== undefined && !DEVELOPMENT_ROUTES.includes(raw.suggestedRoute)) {
      violations.push({ rule: 'unknown-route', reason: 'This suggestion names a development route this app does not have.' })
    }
    violations.push(...checkText(text))

    const state: AiProposal['state'] = violations.length > 0 ? 'invalid' : stale ? 'stale' : 'offered'
    const proposal: AiProposal = {
      id: newId(),
      kind: raw.kind,
      text,
      ...(raw.suggestedRoute !== undefined && DEVELOPMENT_ROUTES.includes(raw.suggestedRoute)
        ? { suggestedRoute: raw.suggestedRoute }
        : {}),
      referencedIds: referenced.filter((id) => allowed.has(id)),
      baseRevision: request.baseRevision,
      provenance: {
        providerId: response.providerId,
        model: response.model,
        promptId: request.promptId,
        requestedAt: response.respondedAt,
      },
      state,
      createdAt: now,
      updatedAt: now,
    }
    if (state === 'offered') offered.push(proposal)
    else refused.push({ proposal, violations })
  }

  return { offered, refused, errors, note: response.note ?? null }
}

/**
 * Whether a proposal may still be accepted. Checked again at acceptance time, because the records
 * can change between a response arriving and the user clicking.
 */
export function canAccept(proposal: AiProposal, currentRevision: number): { ok: true } | { ok: false; reason: string } {
  if (proposal.state === 'accepted') return { ok: false, reason: 'You have already accepted this suggestion.' }
  if (proposal.state === 'rejected') return { ok: false, reason: 'You rejected this suggestion.' }
  if (proposal.state === 'invalid') return { ok: false, reason: 'This suggestion was refused and cannot be accepted.' }
  if (proposal.state === 'stale' || proposal.baseRevision !== currentRevision) {
    return {
      ok: false,
      reason: 'Your records have changed since this suggestion was prepared. Ask again rather than accepting an out-of-date suggestion.',
    }
  }
  return { ok: true }
}
