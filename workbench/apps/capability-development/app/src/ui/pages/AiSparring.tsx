/**
 * The optional sparring partner.
 *
 * The sequence is fixed: choose records → see exactly what would be sent → send explicitly →
 * read what came back → keep, edit or reject each suggestion. Nothing is sent without the person
 * pressing send, and nothing is written without them keeping it.
 *
 * A refused suggestion is shown with the reason it was refused, rather than quietly dropped, so
 * the boundary is visible rather than a claim in a document.
 */
import { useState } from 'react'
import { addWorkingHypothesis, markProposalAccepted, recordProposals, rejectProposal } from '~/application/commands'
import { buildContext, buildRequest, previewText, type ContextSelection } from '~/ai/preview'
import { canAccept, validateResponse, type ValidationReport } from '~/ai/proposals'
import type { AiPurpose } from '~/ai/types'
import { fixedClock, randomIdFactory } from '~/domain/ids'
import { Field, ROUTE_LABEL, SaveStatus, useSave } from '../primitives'
import { useApp } from '../state'

export function AiSparring({
  purpose,
  situationId,
  activityId,
  attemptId,
  reviewId,
  hypothesisId,
}: {
  purpose: AiPurpose
  situationId: string
  activityId?: string
  attemptId?: string
  reviewId?: string
  hypothesisId?: string
}) {
  const { state, content, run, aiProvider } = useApp()
  const save = useSave()
  const [open, setOpen] = useState(false)
  // Nothing is ticked to begin with. The panel says nothing is included unless you tick it, and
  // a pre-ticked box would make that sentence false the moment anybody pressed Send.
  const [include, setInclude] = useState({ situation: false, activity: false, attempt: false, review: false })
  const [preview, setPreview] = useState(false)
  const [report, setReport] = useState<ValidationReport | null>(null)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  if (!open) {
    return (
      <section className="panel panel--quiet">
        <h2>Optional: a sparring partner</h2>
        <p>
          {aiProvider.description} It can offer questions and competing explanations. It cannot record anything, award
          anything, confirm a strength or describe who you are.
        </p>
        <button type="button" className="btn-quiet" onClick={() => setOpen(true)}>
          Use the sparring partner
        </button>
      </section>
    )
  }

  const selection: ContextSelection = {
    ...(include.situation ? { situationIds: [situationId] } : {}),
    ...(include.activity && activityId ? { activityIds: [activityId] } : {}),
    ...(include.attempt && attemptId ? { attemptIds: [attemptId] } : {}),
    ...(include.review && reviewId ? { reviewIds: [reviewId] } : {}),
    ...(hypothesisId ? { hypothesisIds: [hypothesisId] } : {}),
  }
  const context = buildContext(state.data, content, selection)
  const request = buildRequest({ purpose, promptId: `${purpose}-v1`, context, baseRevision: state.revision })

  const send = async () => {
    setBusy(true)
    const outcome = await aiProvider.respond(request)
    setBusy(false)
    if (!outcome.ok) {
      setReport({ offered: [], refused: [], errors: outcome.errors, note: null })
      return
    }
    const validated = validateResponse({
      request,
      response: outcome.response,
      data: state.data,
      currentRevision: state.revision,
      clock: fixedClock(new Date().toISOString()),
      newId: randomIdFactory(),
    })
    setReport(validated)
    // Offered and refused suggestions are both recorded, so a refusal is auditable afterwards.
    await run((data) => recordProposals(data, [...validated.offered, ...validated.refused.map((r) => r.proposal)]))
  }

  return (
    <section className="panel panel--quiet">
      <h2>Sparring partner</h2>
      <p className="meta">
        {aiProvider.description}
        {aiProvider.sendsDataOffDevice ? ' This provider sends what you select off this device.' : ''}
      </p>

      <fieldset>
        <legend>What to send</legend>
        <p className="hint">Nothing is included unless you tick it. Your other situations and records are never sent.</p>
        <ul className="choice-list">
          <li>
            <label className="check">
              <input
                type="checkbox"
                checked={include.situation}
                onChange={(e) => setInclude({ ...include, situation: e.target.checked })}
              />
              The situation description, setting, your room to act and the barriers you noticed
            </label>
          </li>
          {activityId ? (
            <li>
              <label className="check">
                <input
                  type="checkbox"
                  checked={include.activity}
                  onChange={(e) => setInclude({ ...include, activity: e.target.checked })}
                />
                This activity’s plan
              </label>
            </li>
          ) : null}
          {attemptId ? (
            <li>
              <label className="check">
                <input
                  type="checkbox"
                  checked={include.attempt}
                  onChange={(e) => setInclude({ ...include, attempt: e.target.checked })}
                />
                What you recorded happened
              </label>
            </li>
          ) : null}
          {reviewId ? (
            <li>
              <label className="check">
                <input
                  type="checkbox"
                  checked={include.review}
                  onChange={(e) => setInclude({ ...include, review: e.target.checked })}
                />
                Your review
              </label>
            </li>
          ) : null}
        </ul>
      </fieldset>

      <div className="row">
        <button type="button" className="btn-quiet" onClick={() => setPreview(!preview)}>
          {preview ? 'Hide what would be sent' : 'Show exactly what would be sent'}
        </button>
        <button type="button" onClick={() => void send()} disabled={busy || context.length === 0}>
          {busy ? 'Waiting…' : 'Send it'}
        </button>
        <button type="button" className="btn-quiet" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
      {context.length === 0 ? (
        <p className="hint">Tick at least one record above. Nothing is selected, so there is nothing to send.</p>
      ) : null}
      {preview ? <pre>{previewText(request, aiProvider.sendsDataOffDevice)}</pre> : null}

      {report ? (
        <div className="stack">
          {report.note ? <p className="meta">{report.note}</p> : null}
          {report.errors.length > 0 ? (
            <div className="panel panel--caution" role="alert">
              <h3>Problems with this response</h3>
              <ul>
                {report.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {report.offered.length === 0 && report.refused.length === 0 ? (
            <p className="empty">Nothing usable came back.</p>
          ) : null}

          {report.offered.map((proposal) => {
            const acceptable = canAccept(proposal, state.revision)
            return (
              <div className="panel" key={proposal.id}>
                <p className="kicker">{proposal.kind.replace(/-/g, ' ')}</p>
                {proposal.kind === 'hypothesis' ? (
                  <>
                    <Field label="An explanation you could keep, in whatever words you want">
                      <textarea
                        value={edits[proposal.id] ?? proposal.text}
                        onChange={(e) => setEdits({ ...edits, [proposal.id]: e.target.value })}
                      />
                    </Field>
                    {proposal.suggestedRoute ? (
                      <p className="meta">It suggests this is about: {ROUTE_LABEL[proposal.suggestedRoute]}.</p>
                    ) : null}
                    <div className="row">
                      <button
                        type="button"
                        disabled={!acceptable.ok}
                        onClick={() =>
                          void save.run(async () => {
                            const text = edits[proposal.id] ?? proposal.text
                            const added = await run((data, deps) =>
                              addWorkingHypothesis(
                                data,
                                {
                                  situationId,
                                  category: proposal.suggestedRoute ?? 'personal-practice',
                                  text,
                                  source: 'ai-proposal',
                                  sourceRef: `${proposal.provenance.providerId} / ${proposal.provenance.model}, prompt ${proposal.provenance.promptId}`,
                                },
                                deps,
                              ),
                            )
                            if (!added.ok) return { ok: false, errors: added.errors }
                            const marked = await run((data, deps) => markProposalAccepted(data, proposal.id, deps))
                            return marked.ok ? { ok: true } : { ok: false, errors: marked.errors }
                          })
                        }
                      >
                        Keep it as an explanation to test
                      </button>
                      <button
                        type="button"
                        className="btn-quiet"
                        onClick={() =>
                          void save.run(async () => {
                            const result = await run((data, deps) => rejectProposal(data, { id: proposal.id }, deps))
                            return result.ok ? { ok: true } : { ok: false, errors: result.errors }
                          })
                        }
                      >
                        Reject it
                      </button>
                    </div>
                    {!acceptable.ok ? <p className="hint">{acceptable.reason}</p> : null}
                  </>
                ) : (
                  <>
                    <p>{proposal.text}</p>
                    <p className="meta">
                      A question to think about. There is nothing to accept: nothing is recorded unless you write it
                      into your own review.
                    </p>
                  </>
                )}
              </div>
            )
          })}

          {report.refused.map(({ proposal, violations }) => (
            <div className="panel panel--caution" key={proposal.id}>
              {/* A stale suggestion broke no rule; it was simply computed from records that have
                  since changed. Filing it under "refused" with an empty reason list told the
                  person the sparring partner had done something wrong. */}
              <p className="kicker">{proposal.state === 'stale' ? 'Out-of-date suggestion' : 'Refused suggestion'}</p>
              <p>{proposal.text.length > 300 ? `${proposal.text.slice(0, 300)}…` : proposal.text}</p>
              {violations.length > 0 ? (
                <ul>
                  {violations.map((violation) => (
                    <li key={violation.rule}>{violation.reason}</li>
                  ))}
                </ul>
              ) : (
                <p>
                  Your records changed while this was being prepared, so it was computed from a state you are no longer
                  looking at. Ask again to get a suggestion based on what you have now.
                </p>
              )}
              <p className="meta">
                {violations.length > 0
                  ? 'It is shown here rather than hidden, so you can see what the sparring partner tried to do. It cannot be accepted.'
                  : 'Nothing was wrong with it; it is simply out of date. It cannot be accepted.'}
              </p>
            </div>
          ))}
          <SaveStatus state={save.state} />
        </div>
      ) : null}
    </section>
  )
}
