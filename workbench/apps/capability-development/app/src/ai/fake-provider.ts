/**
 * A deterministic local stand-in for an AI provider.
 *
 * This is NOT a language model and it does not pretend to be one. It is a fixed set of question
 * templates selected by the shape of the request, so that the whole AI path — preview, explicit
 * send, validation, review, acceptance, rejection — can be built, tested and used without any
 * credential, any cost and any data leaving the device. Its answers are the same every time for
 * the same input, which is what makes the tests meaningful.
 *
 * It is labelled as a stand-in everywhere it appears in the interface. A real provider would be a
 * separate adapter behind the same `AiProvider` port, and would need its own permission,
 * credentials, rate limits and retention review before being enabled.
 */
import type { AiOutcome, AiProvider, AiRawProposal, AiRequest } from './types'

export const FAKE_PROVIDER_ID = 'local-stand-in'

/** Stable, non-cryptographic hash. Used only to pick between fixed templates. */
function hash(value: string): number {
  let h = 2_166_136_261
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16_777_619)
  }
  return Math.abs(h)
}

const EXPLORE_QUESTIONS: readonly string[] = [
  'What have you actually observed here, as distinct from what you take it to mean?',
  'Who involved in this would describe it differently from you, and how would they put it?',
  'What would have to be true for this to be about the conditions rather than about anybody’s practice?',
  'Which part of this could somebody simply supply an answer to, and which part would require somebody to change a habit?',
  'If nothing you do changes this, whose decision would have to change instead?',
]

const EXPLORE_HYPOTHESES: readonly { text: string; route: 'personal-practice' | 'shared-practice' | 'conditions' }[] = [
  {
    text: 'One possibility: the question keeps reopening because no decision has ever been written down where the group can see it.',
    route: 'shared-practice',
  },
  {
    text: 'Another possibility: the authority to settle this sits outside the group, so the discussion cannot conclude however well it is run.',
    route: 'conditions',
  },
  {
    text: 'A third possibility worth keeping open: the closing question has not been asked in the room yet.',
    route: 'personal-practice',
  },
  {
    text: 'A possibility to weigh: two priorities compete and nobody has been asked which one will wait.',
    route: 'shared-practice',
  },
]

const REVIEW_ALTERNATIVES: readonly string[] = [
  'A competing explanation: the group may have agreed because the meeting was ending, not because the point landed.',
  'A competing explanation: what changed may have been somebody else’s decision that week, not anything you did.',
  'A competing explanation: the attempt may have worked for this setting only, because the people in it already agreed.',
  'A competing explanation: nothing may have changed at all, and the agreement you observed may be the same agreement as last time.',
]

const REVIEW_PROMPTS: readonly string[] = [
  'What would you expect to see in three weeks if your interpretation is right? And if the competing explanation is right instead?',
  'Was there a moment where you chose the fallback rather than the plan? What made that the better choice?',
  'What did somebody else do here that you have been attributing to yourself, or the other way round?',
]

/**
 * Rehearsal replies. The counterpart is a fixed script, not a simulated person: the reply depends
 * only on the turn number, so nobody is being modelled and nothing is being predicted.
 */
const REHEARSAL_REPLIES: readonly string[] = [
  'I still do not see why this needs to be a process question. What would you actually ask?',
  'That is narrower than I expected. Who were you thinking of asking?',
  'If you ask them, I would want to see what you send first.',
  'All right. I would not object to that being asked.',
  'There is nothing more I would add. The rehearsal ends here.',
]

export interface FakeProviderOptions {
  /** Return a malformed or guard-violating response, to exercise the validation path in tests. */
  misbehave?: 'invented-reference' | 'awards-xp' | 'personality' | 'too-long' | 'empty' | 'unknown-kind' | 'too-many'
}

export function createFakeProvider(options: FakeProviderOptions = {}): AiProvider {
  return {
    id: FAKE_PROVIDER_ID,
    model: 'fixed-templates-v1',
    sendsDataOffDevice: false,
    description:
      'A local stand-in that returns fixed questions and competing explanations. It is not a language model, it makes no network request, and nothing you send it leaves this device.',
    async respond(request: AiRequest): Promise<AiOutcome> {
      const respondedAt = '1970-01-01T00:00:00.000Z'
      const seed = hash(
        `${request.purpose}|${request.promptId}|${request.rehearsalTurn ?? ''}|${request.userText ?? ''}|${request.context
          .map((item) => item.recordId)
          .join(',')}`,
      )
      const proposals = options.misbehave
        ? misbehaving(options.misbehave)
        : wellBehaved(request, seed)
      return {
        ok: true,
        response: {
          providerId: FAKE_PROVIDER_ID,
          // The respondedAt is fixed so the same request produces a byte-identical response.
          model: 'fixed-templates-v1',
          respondedAt,
          proposals,
          note:
            'These come from a local stand-in, not a language model. They are questions and possibilities, not findings about you, and nothing is saved unless you keep it.',
        },
      }
    },
  }
}

function contextIds(request: AiRequest): string[] {
  return request.context.map((item) => item.recordId)
}

function wellBehaved(request: AiRequest, seed: number): AiRawProposal[] {
  const refs = contextIds(request)
  const pick = <T>(list: readonly T[], offset: number): T => list[(seed + offset) % list.length] as T

  if (request.purpose === 'rehearse') {
    const turn = request.rehearsalTurn ?? 0
    const line = REHEARSAL_REPLIES[Math.min(turn, REHEARSAL_REPLIES.length - 1)] as string
    return [{ kind: 'rehearsal-line', text: line, referencedIds: refs }]
  }
  if (request.purpose === 'review') {
    return [
      { kind: 'alternative-explanation', text: pick(REVIEW_ALTERNATIVES, 0), referencedIds: refs },
      { kind: 'review-prompt', text: pick(REVIEW_PROMPTS, 1), referencedIds: refs },
    ]
  }
  const hypothesis = pick(EXPLORE_HYPOTHESES, 0)
  return [
    { kind: 'review-prompt', text: pick(EXPLORE_QUESTIONS, 0), referencedIds: refs },
    { kind: 'hypothesis', text: hypothesis.text, suggestedRoute: hypothesis.route, referencedIds: refs },
    { kind: 'review-prompt', text: pick(EXPLORE_QUESTIONS, 2), referencedIds: refs },
  ]
}

/** Responses a badly behaved provider might return. Used only by the evaluation tests. */
function misbehaving(mode: NonNullable<FakeProviderOptions['misbehave']>): AiRawProposal[] {
  switch (mode) {
    case 'invented-reference':
      return [{ kind: 'hypothesis', text: 'Building on your review of the budget meeting, consider asking the sponsor.', referencedIds: ['activity-that-does-not-exist'] }]
    case 'awards-xp':
      return [{ kind: 'review-prompt', text: 'Good work — I have awarded you 20 experience points for this reflection.' }]
    case 'personality':
      return [{ kind: 'hypothesis', text: 'You are an introvert, which is why meetings like this are difficult for you.' }]
    case 'too-long':
      return [{ kind: 'review-prompt', text: 'A '.repeat(1_000) }]
    case 'empty':
      return [{ kind: 'review-prompt', text: '   ' }]
    case 'unknown-kind':
      return [{ kind: 'diagnosis' as AiRawProposal['kind'], text: 'Your leadership maturity is level 2.' }]
    case 'too-many':
      return Array.from({ length: 9 }, (_unused, i) => ({ kind: 'review-prompt' as const, text: `Question ${i + 1}: what else have you noticed?` }))
  }
}
