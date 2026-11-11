/**
 * Building the exact context that would be sent, from records the user selected.
 *
 * The preview is the same object the request carries: there is no second code path that could
 * send more than was shown. Nothing is included by default — in particular no journal text, no
 * other situation, and no review the user did not pick.
 */
import type { ContentRegistry } from '~/content/registry'
import type { UserData } from '~/domain/types'
import type { AiContextItem, AiPurpose, AiRequest } from './types'

export interface ContextSelection {
  situationIds?: string[]
  activityIds?: string[]
  attemptIds?: string[]
  reviewIds?: string[]
  hypothesisIds?: string[]
  capabilityIds?: string[]
  methodIds?: string[]
}

export function buildContext(data: UserData, content: ContentRegistry, selection: ContextSelection): AiContextItem[] {
  const items: AiContextItem[] = []
  for (const id of selection.situationIds ?? []) {
    const situation = data.situations.find((s) => s.id === id)
    if (!situation) continue
    items.push({
      recordId: situation.id,
      recordKind: 'situation',
      label: `Situation: ${situation.title}`,
      // Only the fields named here. The description is included because an explanation about a
      // situation nobody described would be guesswork; everything else is left out.
      text: [
        situation.description,
        situation.context === '' ? '' : `Setting: ${situation.context}`,
        `Your room to act: ${situation.authority}. Decision ownership: ${situation.decisionOwnership}.`,
        situation.constraints.length > 0 ? `Barriers you noticed: ${situation.constraints.join(', ')}.` : '',
      ]
        .filter((line) => line !== '')
        .join('\n'),
    })
  }
  for (const id of selection.activityIds ?? []) {
    const activity = data.activities.find((a) => a.id === id)
    if (!activity) continue
    items.push({
      recordId: activity.id,
      recordKind: 'activity',
      label: `${activity.kind === 'real-attempt' ? 'Planned real attempt' : activity.kind === 'rehearsal' ? 'Rehearsal' : 'Observation'}: ${activity.title}`,
      text: `Cue: ${activity.plan.cue}\nAction: ${activity.plan.action}\nExpected obstacle: ${activity.plan.obstacle}\nFallback: ${activity.plan.fallback}\nSignal: ${activity.plan.signal}`,
    })
  }
  for (const id of selection.attemptIds ?? []) {
    const attempt = data.attempts.find((a) => a.id === id)
    if (!attempt) continue
    items.push({
      recordId: attempt.id,
      recordKind: 'attempt',
      label: `What happened (${attempt.outcome})`,
      text: attempt.note,
    })
  }
  for (const id of selection.reviewIds ?? []) {
    const review = data.reviews.find((r) => r.id === id)
    if (!review) continue
    items.push({
      recordId: review.id,
      recordKind: 'review',
      label: 'Your review',
      text: `Observed: ${review.observation}\nYou take it to mean: ${review.interpretation}\nCompeting explanation you wrote: ${review.alternativeExplanation}`,
    })
  }
  for (const id of selection.hypothesisIds ?? []) {
    const hypothesis = data.hypotheses.find((h) => h.id === id)
    if (!hypothesis) continue
    items.push({
      recordId: hypothesis.id,
      recordKind: 'hypothesis',
      label: `Explanation under test (${hypothesis.category}, ${hypothesis.status})`,
      text: hypothesis.text,
    })
  }
  for (const id of selection.capabilityIds ?? []) {
    const capability = content.capability(id)
    if (!capability) continue
    items.push({
      recordId: capability.id,
      recordKind: 'capability',
      label: `Capability: ${capability.title}`,
      text: capability.observable,
    })
  }
  for (const id of selection.methodIds ?? []) {
    const method = content.method(id)
    if (!method) continue
    items.push({ recordId: method.id, recordKind: 'method', label: `Method: ${method.title}`, text: method.summary })
  }
  return items
}

export function buildRequest(options: {
  purpose: AiPurpose
  promptId: string
  context: AiContextItem[]
  baseRevision: number
  rehearsalTurn?: number
  userText?: string
}): AiRequest {
  return {
    purpose: options.purpose,
    promptId: options.promptId,
    context: options.context,
    baseRevision: options.baseRevision,
    ...(options.rehearsalTurn !== undefined ? { rehearsalTurn: options.rehearsalTurn } : {}),
    ...(options.userText !== undefined ? { userText: options.userText } : {}),
  }
}

/**
 * Plain text the user reads before confirming a send. What is shown is what is sent — including
 * the metadata, which is listed rather than left out: the record identifiers are specific to this
 * person's records, and a preview that quietly omitted them would not deserve the word "exactly".
 */
export function previewText(request: AiRequest, sendsDataOffDevice: boolean): string {
  const header = sendsDataOffDevice
    ? 'This would be sent off this device to the configured provider:'
    : 'This would be handed to the local stand-in provider. Nothing leaves this device:'
  const metadata = [
    `purpose: ${request.purpose}`,
    `prompt template: ${request.promptId}`,
    `your records at revision: ${request.baseRevision}`,
    ...(request.rehearsalTurn !== undefined ? [`rehearsal turn: ${request.rehearsalTurn}`] : []),
    ...(request.context.length > 0
      ? [`record identifiers: ${request.context.map((item) => `${item.recordKind} ${item.recordId}`).join(', ')}`]
      : []),
  ]
  const footer = `\n\nAlso sent, as labels rather than content:\n${metadata.map((line) => `· ${line}`).join('\n')}`
  if (request.context.length === 0 && (request.userText ?? '') === '') {
    return `${header}\n\n(nothing — no records are selected)${footer}`
  }
  const items = request.context.map((item) => `— ${item.label}\n${item.text}`)
  if (request.userText !== undefined && request.userText !== '') items.push(`— What you typed\n${request.userText}`)
  return `${header}\n\n${items.join('\n\n')}${footer}`
}
