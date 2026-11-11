/**
 * Provider output is untrusted input. These tests cover what happens to a response that is
 * malformed, out of date, inventive about records, or trying to do something the product forbids.
 */
import { describe, expect, it } from 'vitest'
import { at, reviewedRealAttempt } from '~/test-helpers/fixtures'
import { fixedClock, sequentialIdFactory } from '~/domain/ids'
import { createContentRegistry } from '~/content/index'
import { buildContext, buildRequest, previewText } from './preview'
import { canAccept, validateResponse } from './proposals'
import { MAX_PROPOSAL_CHARS, MAX_PROPOSALS_PER_RESPONSE } from './guards'
import type { AiRawProposal, AiRawResponse } from './types'

const content = createContentRegistry()
const clock = fixedClock(at(0))

function run(proposals: AiRawProposal[], options: { baseRevision?: number; currentRevision?: number } = {}) {
  const data = reviewedRealAttempt()
  const context = buildContext(data, content, { situationIds: ['sit-1'], activityIds: ['act-1'] })
  const request = buildRequest({
    purpose: 'review',
    promptId: 'review-v1',
    context,
    baseRevision: options.baseRevision ?? 4,
  })
  const response: AiRawResponse = {
    providerId: 'local-stand-in',
    model: 'fixed-templates-v1',
    respondedAt: at(1),
    proposals,
  }
  return validateResponse({
    request,
    response,
    data,
    currentRevision: options.currentRevision ?? 4,
    clock,
    newId: sequentialIdFactory('p'),
  })
}

describe('what is offered', () => {
  it('offers a well-formed suggestion that refers to a record that exists', () => {
    const report = run([{ kind: 'hypothesis', text: 'One possibility is that the authority sits elsewhere.', referencedIds: ['act-1'] }])
    expect(report.offered).toHaveLength(1)
    expect(report.refused).toHaveLength(0)
    expect(report.offered[0]?.state).toBe('offered')
    expect(report.offered[0]?.provenance.promptId).toBe('review-v1')
  })

  it('records the provenance so a suggestion can be traced without storing the prompt', () => {
    const report = run([{ kind: 'review-prompt', text: 'What would you expect to see in three weeks?' }])
    const proposal = report.offered[0]
    expect(proposal?.provenance.providerId).toBe('local-stand-in')
    expect(proposal?.provenance.model).toBe('fixed-templates-v1')
    expect(proposal?.baseRevision).toBe(4)
  })
})

describe('what is refused', () => {
  it('refuses a suggestion that refers to a record which does not exist', () => {
    // A provider inventing an id is the clearest sign its output should not be acted on.
    const report = run([{ kind: 'hypothesis', text: 'Building on your budget meeting review…', referencedIds: ['never-existed'] }])
    expect(report.offered).toHaveLength(0)
    expect(report.refused[0]?.violations.map((v) => v.rule)).toContain('invented-reference')
    expect(report.refused[0]?.proposal.state).toBe('invalid')
  })

  it('refuses a suggestion that claims to have awarded anything', () => {
    const report = run([{ kind: 'review-prompt', text: 'Good work — I have awarded you 20 experience points for this reflection.' }])
    expect(report.refused[0]?.violations.map((v) => v.rule)).toContain('awards-progression')
  })

  it('refuses a suggestion that claims to have recorded something', () => {
    const report = run([{ kind: 'review-prompt', text: 'I have recorded this as a completed milestone for you.' }])
    expect(report.refused[0]?.violations.map((v) => v.rule)).toContain('claims-progression-authority')
  })

  it('refuses a suggestion that describes who the person is', () => {
    const report = run([{ kind: 'hypothesis', text: 'You are an introvert, which is why meetings like this are difficult for you.' }])
    expect(report.refused[0]?.violations.map((v) => v.rule)).toContain('personality-type')
  })

  it('refuses a suggestion that rates competence', () => {
    const report = run([{ kind: 'review-prompt', text: 'Your competence in this area is still developing; I would score it 2/5.' }])
    const rules = report.refused[0]?.violations.map((v) => v.rule) ?? []
    expect(rules).toContain('competence-assessment')
  })

  it('refuses a suggestion that declares a structural problem solved', () => {
    // Only what actually changed in the organisation can show that, and this app cannot see it.
    const report = run([{ kind: 'review-prompt', text: 'The structural problem is now resolved, so you can move on.' }])
    expect(report.refused[0]?.violations.map((v) => v.rule)).toContain('declares-structural-problem-solved')
  })

  it('refuses a suggestion that asks for somebody’s name or contact details', () => {
    const report = run([{ kind: 'review-prompt', text: 'What is their full name, so I can tailor the approach?' }])
    expect(report.refused[0]?.violations.map((v) => v.rule)).toContain('requests-identifying-details')
  })

  it('refuses a suggestion that says a rehearsal counts as real application', () => {
    const report = run([{ kind: 'review-prompt', text: 'That rehearsal counts as real workplace application, so you are done.' }])
    expect(report.refused[0]?.violations.map((v) => v.rule)).toContain('claims-real-application')
  })

  it('refuses a suggestion too long to review', () => {
    const report = run([{ kind: 'review-prompt', text: 'A'.repeat(MAX_PROPOSAL_CHARS + 1) }])
    expect(report.refused[0]?.violations.map((v) => v.rule)).toContain('too-long')
  })

  it('gives every refusal a reason a person can read', () => {
    const report = run([{ kind: 'hypothesis', text: 'You are an extrovert and should simply speak up more.' }])
    for (const violation of report.refused[0]?.violations ?? []) {
      expect(violation.reason.length).toBeGreaterThan(30)
    }
  })

  it('keeps a refused suggestion rather than dropping it silently', () => {
    // A hidden refusal is indistinguishable from the provider saying nothing, and the boundary
    // stops being checkable.
    const report = run([{ kind: 'review-prompt', text: 'I have awarded you 5 points.' }])
    expect(report.refused).toHaveLength(1)
    expect(report.refused[0]?.proposal.text).toMatch(/awarded/)
  })
})

describe('malformed responses', () => {
  it('discards a suggestion of an unknown kind and says so', () => {
    const report = run([{ kind: 'diagnosis' as AiRawProposal['kind'], text: 'Your leadership maturity is level 2.' }])
    expect(report.offered).toHaveLength(0)
    expect(report.refused).toHaveLength(0)
    expect(report.errors.join(' ')).toMatch(/unknown suggestion kind/)
  })

  it('discards an empty suggestion', () => {
    const report = run([{ kind: 'review-prompt', text: '   ' }])
    expect(report.errors.join(' ')).toMatch(/empty suggestion/)
  })

  it('caps how many suggestions one response may offer', () => {
    const many = Array.from({ length: MAX_PROPOSALS_PER_RESPONSE + 4 }, (_unused, i) => ({
      kind: 'review-prompt' as const,
      text: `Question ${i + 1}: what else have you noticed?`,
    }))
    const report = run(many)
    expect(report.offered).toHaveLength(MAX_PROPOSALS_PER_RESPONSE)
    expect(report.errors.join(' ')).toMatch(new RegExp(`only the first ${MAX_PROPOSALS_PER_RESPONSE}`))
  })

  it('handles a response whose proposals are not a list', () => {
    const data = reviewedRealAttempt()
    const request = buildRequest({ purpose: 'review', promptId: 'review-v1', context: [], baseRevision: 1 })
    const report = validateResponse({
      request,
      response: { providerId: 'x', model: 'y', respondedAt: at(1), proposals: null as unknown as AiRawProposal[] },
      data,
      currentRevision: 1,
      clock,
      newId: sequentialIdFactory('p'),
    })
    expect(report.errors[0]).toMatch(/not a list/)
  })

  it('drops an unknown development route rather than inventing one', () => {
    const report = run([
      { kind: 'hypothesis', text: 'A possibility.', suggestedRoute: 'something-else' as 'conditions', referencedIds: ['act-1'] },
    ])
    expect(report.refused[0]?.violations.map((v) => v.rule)).toContain('unknown-route')
  })
})

describe('staleness', () => {
  it('marks every suggestion stale when the records moved on', () => {
    // Accepting a suggestion computed from records that have since changed would write something
    // based on a state nobody is looking at any more.
    const report = run([{ kind: 'hypothesis', text: 'A possibility.', referencedIds: ['act-1'] }], {
      baseRevision: 4,
      currentRevision: 5,
    })
    expect(report.offered).toHaveLength(0)
    expect(report.errors.join(' ')).toMatch(/out of date/)
  })

  it('refuses acceptance of a suggestion whose base revision no longer matches', () => {
    const report = run([{ kind: 'hypothesis', text: 'A possibility.', referencedIds: ['act-1'] }])
    const proposal = report.offered[0]
    expect(proposal).toBeDefined()
    if (!proposal) return
    expect(canAccept(proposal, 4).ok).toBe(true)
    const later = canAccept(proposal, 5)
    expect(later.ok).toBe(false)
    expect(later.ok === false && later.reason).toMatch(/Ask again/)
  })

  it('refuses acceptance twice, and refuses a rejected or refused suggestion', () => {
    const report = run([{ kind: 'hypothesis', text: 'A possibility.', referencedIds: ['act-1'] }])
    const proposal = report.offered[0]
    if (!proposal) throw new Error('expected a proposal')
    expect(canAccept({ ...proposal, state: 'accepted' }, 4).ok).toBe(false)
    expect(canAccept({ ...proposal, state: 'rejected' }, 4).ok).toBe(false)
    expect(canAccept({ ...proposal, state: 'invalid' }, 4).ok).toBe(false)
  })
})

describe('the preview is the request', () => {
  it('includes nothing the user did not select', () => {
    const data = reviewedRealAttempt()
    const context = buildContext(data, content, { situationIds: ['sit-1'] })
    const request = buildRequest({ purpose: 'explore', promptId: 'explore-v1', context, baseRevision: 1 })
    const text = previewText(request, false)
    expect(text).toContain('Situation: A question that keeps being reopened')
    // The review and the attempt note were not selected, so they must not appear.
    expect(text).not.toContain('Nobody in the room could name the approver')
    expect(text).not.toContain('Asked it. Nobody present could name who approves')
  })

  it('says plainly when nothing would be sent', () => {
    const request = buildRequest({ purpose: 'explore', promptId: 'explore-v1', context: [], baseRevision: 1 })
    expect(previewText(request, false)).toMatch(/no records are selected/)
  })

  it('says whether the data would leave the device', () => {
    const request = buildRequest({ purpose: 'explore', promptId: 'explore-v1', context: [], baseRevision: 1 })
    expect(previewText(request, false)).toMatch(/Nothing leaves this device/i)
    expect(previewText(request, true)).toMatch(/sent off this device/i)
  })

  it('skips a selected record that no longer exists rather than failing', () => {
    const data = reviewedRealAttempt()
    const context = buildContext(data, content, { situationIds: ['sit-1', 'deleted-one'] })
    expect(context).toHaveLength(1)
  })
})
