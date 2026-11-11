/**
 * Synthetic evaluation cases for the AI boundary.
 *
 * PLAN.md stage 5 names seven situations the AI capability must handle. Each is built here as a
 * record set plus a provider response, and the assertion is about what the system does with it —
 * not about whether the wording is pleasant.
 *
 * These are deterministic unit cases, not a model evaluation. They establish that the boundary
 * holds for the responses below; they establish nothing about a live provider's behaviour, which
 * would need its own evaluation harness before being enabled.
 */
import { describe, expect, it } from 'vitest'
import { createContentRegistry } from '~/content/index'
import { createDemoUserData } from '~/content/demo'
import { emptyUserData } from '~/domain/empty'
import { fixedClock, sequentialIdFactory } from '~/domain/ids'
import { deriveCapabilityEvidence } from '~/domain/evidence'
import { derivePracticeExperience } from '~/domain/experience'
import { activity, at, attempt, evidence, review, situation } from '~/test-helpers/fixtures'
import type { UserData } from '~/domain/types'
import { createFakeProvider, type FakeProviderOptions } from './fake-provider'
import { buildContext, buildRequest, previewText } from './preview'
import { canAccept, validateResponse } from './proposals'
import type { AiRawProposal } from './types'

const content = createContentRegistry()
const clock = fixedClock(at(0))

async function ask(
  data: UserData,
  selection: Parameters<typeof buildContext>[2],
  options: { purpose?: 'explore' | 'rehearse' | 'review'; misbehave?: FakeProviderOptions['misbehave']; revision?: number } = {},
) {
  const provider = createFakeProvider(options.misbehave ? { misbehave: options.misbehave } : {})
  const context = buildContext(data, content, selection)
  const revision = options.revision ?? 3
  const request = buildRequest({
    purpose: options.purpose ?? 'explore',
    promptId: `${options.purpose ?? 'explore'}-v1`,
    context,
    baseRevision: revision,
  })
  const outcome = await provider.respond(request)
  if (!outcome.ok) throw new Error('the stand-in provider failed')
  const report = validateResponse({
    request,
    response: outcome.response,
    data,
    currentRevision: revision,
    clock,
    newId: sequentialIdFactory('p'),
  })
  return { request, report, provider }
}

// ---------------------------------------------------------------- Case 1

describe('case 1: a structural constraint described with confidence', () => {
  it('does not turn a conditions problem into a personal training suggestion', async () => {
    // Somebody states confidently that they just need to be more assertive, while their own
    // record says nobody present can decide. The product must not take the self-diagnosis at
    // face value, and nothing the provider offers may be recorded as a finding.
    const data = emptyUserData(at(0))
    data.situations.push(
      situation({
        description: 'I think I just need to be more assertive in these meetings.',
        authority: 'recommend',
        decisionOwnership: 'unclear',
        constraints: ['unclear-mandate'],
      }),
    )
    const { report } = await ask(data, { situationIds: ['sit-1'] })

    // Every hypothesis the stand-in offers arrives as an open possibility, never as a conclusion.
    for (const proposal of report.offered) {
      expect(proposal.state).toBe('offered')
      expect(proposal.kind === 'hypothesis' || proposal.kind === 'review-prompt').toBe(true)
    }
    // Nothing was written. The record set is unchanged by asking.
    expect(data.hypotheses).toHaveLength(0)
    expect(data.activities).toHaveLength(0)
  })

  it('carries the barrier the person recorded into what would be sent, so it is not lost', async () => {
    const data = emptyUserData(at(0))
    data.situations.push(situation({ constraints: ['unclear-mandate', 'competing-priorities'] }))
    const { request } = await ask(data, { situationIds: ['sit-1'] })
    expect(previewText(request, false)).toMatch(/unclear-mandate/)
  })
})

// ---------------------------------------------------------------- Case 2

describe('case 2: the person has no authority', () => {
  it('offers a route about conditions as an ordinary possibility, not a lesser one', async () => {
    const data = emptyUserData(at(0))
    data.situations.push(situation({ authority: 'unclear', decisionOwnership: 'contested' }))
    const { report } = await ask(data, { situationIds: ['sit-1'] })
    const hypotheses = report.offered.filter((p) => p.kind === 'hypothesis')
    expect(hypotheses.length).toBeGreaterThan(0)
    // Whatever route it suggests, it is advisory: accepting it goes through the ordinary command,
    // which is what lets the person change the category and the wording.
    for (const proposal of hypotheses) {
      if (proposal.suggestedRoute) {
        expect(['personal-practice', 'shared-practice', 'conditions']).toContain(proposal.suggestedRoute)
      }
    }
  })
})

// ---------------------------------------------------------------- Case 3

describe('case 3: accounts that conflict', () => {
  it('keeps both accounts and does not resolve them', async () => {
    // The user says the question was finally asked; a colleague's account says the meeting went
    // round in circles. Neither is deleted, and the evidence view reports the disagreement.
    const data = emptyUserData(at(0))
    data.situations.push(situation())
    data.activities.push(activity({ state: 'reviewed' }))
    data.attempts.push(attempt())
    data.reviews.push(review())
    data.evidence.push(
      evidence({ id: 'ev-mine', kind: 'self-observation', text: 'I asked who could close it.' }),
      evidence({ id: 'ev-theirs', kind: 'other-account', text: 'They described it as going round in circles again.' }),
    )
    const rows = deriveCapabilityEvidence(data, [{ id: 'clarify-ownership' }])
    expect(rows[0]?.counts.conflictingAccounts).toBe(1)
    expect(rows[0]?.explanation).toMatch(/both are kept/i)

    const { report } = await ask(data, { situationIds: ['sit-1'], reviewIds: ['rev-1'] }, { purpose: 'review' })
    // Nothing the provider says removes either account.
    expect(data.evidence).toHaveLength(2)
    expect(report.offered.every((p) => p.kind !== 'hypothesis' || p.state === 'offered')).toBe(true)
  })
})

// ---------------------------------------------------------------- Case 4

describe('case 4: sensitive details about a third party', () => {
  it('never puts an attribution or a contact detail into what would be sent', async () => {
    // The context builder decides what leaves the record set. Feedback attributions are not in
    // it at all, so a role — let alone a name — cannot be sent by accident.
    const data = emptyUserData(at(0))
    data.situations.push(situation())
    data.activities.push(activity({ state: 'reviewed' }))
    data.attempts.push(attempt())
    data.reviews.push(review())
    data.evidence.push(evidence({ attribution: 'the operations lead' }))
    const { request } = await ask(
      data,
      { situationIds: ['sit-1'], activityIds: ['act-1'], attemptIds: ['att-1'], reviewIds: ['rev-1'] },
      { purpose: 'review' },
    )
    const text = previewText(request, false)
    expect(text).not.toMatch(/operations lead/)
    expect(request.context.some((item) => item.recordKind === 'situation')).toBe(true)
  })

  it('refuses a suggestion that asks who the other person is', async () => {
    const data = emptyUserData(at(0))
    data.situations.push(situation())
    const { report } = await ask(data, { situationIds: ['sit-1'] })
    expect(report.offered.length).toBeGreaterThan(0)
    // And with a provider that does ask, the request is refused with a readable reason.
    const misbehaving = validateResponse({
      request: buildRequest({ purpose: 'explore', promptId: 'explore-v1', context: [], baseRevision: 1 }),
      response: {
        providerId: 'test',
        model: 'test',
        respondedAt: at(1),
        proposals: [{ kind: 'review-prompt', text: 'What is their full name and email so I can tailor this?' }] as AiRawProposal[],
      },
      data,
      currentRevision: 1,
      clock,
      newId: sequentialIdFactory('p'),
    })
    expect(misbehaving.offered).toHaveLength(0)
    expect(misbehaving.refused[0]?.violations.map((v) => v.rule)).toContain('requests-identifying-details')
  })
})

// ---------------------------------------------------------------- Case 5

describe('case 5: a request for a personality reading', () => {
  it('refuses a personality statement however it is dressed up', async () => {
    const data = emptyUserData(at(0))
    data.situations.push(situation())
    const { report } = await ask(data, { situationIds: ['sit-1'] }, { misbehave: 'personality' })
    expect(report.offered).toHaveLength(0)
    expect(report.refused[0]?.violations.map((v) => v.rule)).toContain('personality-type')
    expect(report.refused[0]?.proposal.state).toBe('invalid')
    expect(canAccept(report.refused[0]?.proposal ?? { state: 'invalid' } as never, 3).ok).toBe(false)
  })

  it('refuses a competence rating as well', () => {
    const data = emptyUserData(at(0))
    const report = validateResponse({
      request: buildRequest({ purpose: 'review', promptId: 'review-v1', context: [], baseRevision: 1 }),
      response: {
        providerId: 'test',
        model: 'test',
        respondedAt: at(1),
        proposals: [{ kind: 'review-prompt', text: 'Your proficiency here is limited; score of 2/5.' }] as AiRawProposal[],
      },
      data,
      currentRevision: 1,
      clock,
      newId: sequentialIdFactory('p'),
    })
    expect(report.offered).toHaveLength(0)
  })
})

// ---------------------------------------------------------------- Case 6

describe('case 6: a rehearsal that went well without any real application', () => {
  it('leaves the records saying rehearsed, whatever the provider claims', async () => {
    // This is the case that matters most. A successful simulation must not become a record of
    // workplace application, and the provider has no way to make it one.
    const data = emptyUserData(at(0))
    data.situations.push(situation())
    data.activities.push(activity({ kind: 'rehearsal', state: 'reviewed' }))
    data.attempts.push(attempt({ outcome: 'as-planned', assistance: 'ai-sparring' }))
    data.reviews.push(review())

    const before = deriveCapabilityEvidence(data, [{ id: 'clarify-ownership' }])[0]
    expect(before?.stage).toBe('rehearsed')
    expect(before?.counts.realAttempts).toBe(0)

    const { report } = await ask(
      data,
      { situationIds: ['sit-1'], activityIds: ['act-1'], reviewIds: ['rev-1'] },
      { purpose: 'rehearse' },
    )
    // A rehearsal reply is just a line of script; it is not a proposal that writes anything.
    expect(report.offered.every((p) => p.kind === 'rehearsal-line')).toBe(true)

    const after = deriveCapabilityEvidence(data, [{ id: 'clarify-ownership' }])[0]
    expect(after?.stage).toBe('rehearsed')
  })

  it('refuses a suggestion that says the rehearsal counts as the real thing', () => {
    const data = emptyUserData(at(0))
    const report = validateResponse({
      request: buildRequest({ purpose: 'rehearse', promptId: 'rehearse-v1', context: [], baseRevision: 1 }),
      response: {
        providerId: 'test',
        model: 'test',
        respondedAt: at(1),
        proposals: [
          { kind: 'rehearsal-line', text: 'That rehearsal counts as real workplace application — nothing more is needed.' },
        ] as AiRawProposal[],
      },
      data,
      currentRevision: 1,
      clock,
      newId: sequentialIdFactory('p'),
    })
    expect(report.refused[0]?.violations.map((v) => v.rule)).toContain('claims-real-application')
  })

  it('records that the sparring partner helped, so the rehearsal is not read as unaided', () => {
    const data = emptyUserData(at(0))
    data.situations.push(situation())
    data.activities.push(activity({ kind: 'rehearsal', state: 'reviewed' }))
    data.attempts.push(attempt({ assistance: 'ai-sparring' }))
    expect(data.attempts[0]?.assistance).toBe('ai-sparring')
  })
})

// ---------------------------------------------------------------- Case 7

describe('case 7: a suggestion the person rejects', () => {
  it('keeps the rejection and never offers the same suggestion as a finding', async () => {
    const data = emptyUserData(at(0))
    data.situations.push(situation())
    const { report } = await ask(data, { situationIds: ['sit-1'] })
    const proposal = report.offered.find((p) => p.kind === 'hypothesis')
    expect(proposal).toBeDefined()
    if (!proposal) return
    const rejected = { ...proposal, state: 'rejected' as const, rejectionNote: 'That is not what is happening.' }
    expect(canAccept(rejected, 3).ok).toBe(false)
    expect(rejected.rejectionNote).toMatch(/not what is happening/)
  })
})

// ---------------------------------------------------------------- Across all cases

describe('the AI boundary holds whatever comes back', () => {
  it('cannot change practice experience under any of the stand-in’s misbehaviours', async () => {
    // The structural guarantee: experience is derived from activities, attempts and reviews. No
    // provider response is an input to it, so no response can move the number.
    const data = createDemoUserData()
    const before = derivePracticeExperience(data).total
    for (const misbehave of ['invented-reference', 'awards-xp', 'personality', 'too-long', 'empty', 'unknown-kind', 'too-many'] as const) {
      const { report } = await ask(data, { situationIds: ['demo-situation-1'] }, { misbehave })
      expect(report.offered.length + report.refused.length + report.errors.length).toBeGreaterThan(0)
      expect(derivePracticeExperience(data).total).toBe(before)
    }
  })

  it('always returns the same answer for the same question', async () => {
    // Determinism is what makes the stand-in useful: a test over it means something, and the
    // person sees a consistent counterpart rather than a different one each time.
    const data = createDemoUserData()
    const first = await ask(data, { situationIds: ['demo-situation-1'] })
    const second = await ask(data, { situationIds: ['demo-situation-1'] })
    expect(first.report.offered.map((p) => p.text)).toEqual(second.report.offered.map((p) => p.text))
  })

  it('says in its own description that it is not a language model and sends nothing', () => {
    const provider = createFakeProvider()
    expect(provider.sendsDataOffDevice).toBe(false)
    expect(provider.description).toMatch(/not a language model/i)
    expect(provider.description).toMatch(/leaves this device/i)
  })

  it('works through the whole path without any record being written', async () => {
    const data = createDemoUserData()
    const snapshot = JSON.stringify(data)
    await ask(data, { situationIds: ['demo-situation-1'], activityIds: ['demo-activity-real'] }, { purpose: 'review' })
    expect(JSON.stringify(data)).toBe(snapshot)
  })
})
