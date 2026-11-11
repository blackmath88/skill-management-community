/**
 * The AI boundary.
 *
 * What AI may do here: ask questions, offer competing explanations, play a bounded scripted role,
 * and draft text the user edits. What it may never do: write a canonical record, award practice
 * experience, confirm a strength, diagnose a person, or declare a structural problem solved.
 * Those are not policy statements in a document — `proposals.ts` enforces them on every response,
 * and accepting a proposal runs the ordinary command with the user as the author.
 *
 * Provider output is untrusted input. It is validated like an imported file, never executed and
 * never followed as an instruction.
 */
import type { AiProposalKind, DevelopmentRoute, Id, IsoUtc } from '~/domain/types'

export type AiPurpose = 'explore' | 'rehearse' | 'review'

/**
 * One piece of context the user has explicitly chosen to send. `label` and `text` are exactly
 * what the preview shows; nothing else leaves the record set.
 */
export interface AiContextItem {
  /** Which record this came from, so the preview can say so. */
  recordId: Id
  recordKind: 'situation' | 'activity' | 'attempt' | 'review' | 'hypothesis' | 'capability' | 'method'
  label: string
  text: string
}

export interface AiRequest {
  purpose: AiPurpose
  /** Identifies the prompt template. Stored in provenance; the prompt text itself is not stored. */
  promptId: string
  /** Exactly the items the user confirmed. An empty list is valid and means no records are sent. */
  context: AiContextItem[]
  /** The store revision the context was read at. A newer revision makes any proposal stale. */
  baseRevision: number
  /** Only for a rehearsal: how far through the scripted exchange the user is. */
  rehearsalTurn?: number
  /** The user's own words for this turn, if they typed any. */
  userText?: string
}

/** What a provider returns. Deliberately dumb: plain text and ids, no commands, no records. */
export interface AiRawProposal {
  kind: AiProposalKind
  text: string
  suggestedRoute?: DevelopmentRoute
  referencedIds?: string[]
}

export interface AiRawResponse {
  providerId: string
  model: string
  respondedAt: IsoUtc
  proposals: AiRawProposal[]
  /** Shown above the proposals. Not stored as a record. */
  note?: string
}

export type AiOutcome =
  | { ok: true; response: AiRawResponse }
  | { ok: false; errors: string[] }

export interface AiProvider {
  readonly id: string
  readonly model: string
  /** True when calls leave this device. Shown to the user before every send. */
  readonly sendsDataOffDevice: boolean
  /** One-sentence description of what this provider does, shown in settings. */
  readonly description: string
  respond(request: AiRequest): Promise<AiOutcome>
}
