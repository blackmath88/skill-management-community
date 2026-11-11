/**
 * All records: everything that is stored, in one place, with a way to delete any of it.
 *
 * A person cannot be in control of their own records if they cannot see what is there. This page
 * also carries the hypothesis decisions, because deciding what an explanation now looks like is
 * the one action that belongs to the whole record set rather than to a single activity.
 */
import { useState } from 'react'
import { decideHypothesis } from '~/application/commands'
import { HYPOTHESIS_STATUS_LABEL, EVIDENCE_LABEL, NEXT_MOVE_LABEL, OUTCOME_LABEL } from './labels'
import { ConfirmButton, Field, formatDateTime, KindTag, PageHead, RouteTag, SaveStatus, useSave } from '../primitives'
import { href } from '../router'
import { useApp } from '../state'
import type { HypothesisStatus } from '~/domain/types'

export function RecordsPage() {
  const { state, content } = useApp()
  const data = state.data

  return (
    <div className="stack">
      <PageHead kicker="All records" title="Everything that is stored">
        <p>
          This is all of it. Nothing is kept anywhere else, nothing is sent anywhere, and anything here can be deleted.
        </p>
      </PageHead>

      <section className="panel">
        <h2>Explanations under test ({data.hypotheses.length})</h2>
        <p className="hint">
          An explanation is a possibility you are holding, not a finding about you. Evidence can support it, contradict
          it, or neither.
        </p>
        {data.hypotheses.length === 0 ? <p className="empty">None recorded.</p> : null}
        <ul className="record-list">
          {data.hypotheses.map((hypothesis) => (
            <li key={hypothesis.id}>
              <p>{hypothesis.text}</p>
              <p className="meta">
                <RouteTag route={hypothesis.category} /> {HYPOTHESIS_STATUS_LABEL[hypothesis.status]} · from{' '}
                {hypothesis.source === 'user' ? 'you' : hypothesis.source === 'content' ? 'a campaign step' : 'the sparring partner'}
                {hypothesis.sourceRef ? ` (${hypothesis.sourceRef})` : ''}
              </p>
              {hypothesis.evidenceIds.length > 0 ? (
                <p className="meta">{hypothesis.evidenceIds.length} evidence item(s) linked.</p>
              ) : null}
              <HypothesisDecision id={hypothesis.id} status={hypothesis.status} />
              {hypothesis.history.length > 1 ? (
                <details>
                  <summary>How your view of it changed</summary>
                  <ul>
                    {hypothesis.history.map((entry, i) => (
                      <li key={`${entry.at}-${i}`}>
                        {formatDateTime(entry.at)} — {HYPOTHESIS_STATUS_LABEL[entry.status]}
                        {entry.note ? `: ${entry.note}` : ''}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Activities ({data.activities.length})</h2>
        {data.activities.length === 0 ? <p className="empty">None recorded.</p> : null}
        <ul className="record-list">
          {data.activities.map((activity) => {
            const attempt = data.attempts.find((a) => a.activityId === activity.id)
            const review = data.reviews.find((r) => r.activityId === activity.id)
            return (
              <li key={activity.id}>
                <div className="row">
                  <a href={href({ name: 'activity', id: activity.id })}>{activity.title}</a>
                  <KindTag kind={activity.kind} />
                  <RouteTag route={activity.route} />
                </div>
                <p className="meta">
                  {activity.state}
                  {attempt ? ` · ${OUTCOME_LABEL[attempt.outcome]}` : ''}
                  {review ? ` · decided to ${NEXT_MOVE_LABEL[review.nextMove].toLowerCase()}` : ''}
                  {activity.capabilityIds.length > 0
                    ? ` · ${activity.capabilityIds.map((id) => content.capability(id)?.title ?? id).join(', ')}`
                    : ''}
                </p>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="panel">
        <h2>Evidence ({data.evidence.length})</h2>
        {data.evidence.length === 0 ? <p className="empty">None recorded.</p> : null}
        <ul className="record-list">
          {data.evidence.map((item) => (
            <li key={item.id}>
              <p>
                <span className="tag">{EVIDENCE_LABEL[item.kind]}</span>
              </p>
              <p>{item.text}</p>
              <p className="meta">
                {item.attribution ? `From: ${item.attribution}. ` : ''}
                {formatDateTime(item.recordedAt)} · {item.visibility === 'private' ? 'private' : 'marked shareable'}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Contextual strengths you confirmed ({data.perks.length})</h2>
        <p className="hint">
          You wrote these, pointing at your own activities. Nothing here was awarded, and a strength can be overused.
        </p>
        {data.perks.length === 0 ? <p className="empty">None recorded.</p> : null}
        <ul className="record-list">
          {data.perks.map((perk) => (
            <li key={perk.id}>
              <p>{perk.description}</p>
              {perk.possibleOveruse ? <p className="meta">Where it can go wrong: {perk.possibleOveruse}</p> : null}
              <p className="meta">{perk.evidenceActivityIds.length} activity/activities given as examples.</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Suggestions from the sparring partner ({data.proposals.length})</h2>
        <p className="hint">
          Kept so that what was suggested, refused and accepted stays visible afterwards. None of these is a record of
          anything you did.
        </p>
        {data.proposals.length === 0 ? <p className="empty">None.</p> : null}
        <ul className="record-list">
          {data.proposals.map((proposal) => (
            <li key={proposal.id}>
              <p className="meta">
                <span className="tag">{proposal.state}</span> {proposal.kind.replace(/-/g, ' ')} ·{' '}
                {proposal.provenance.providerId} / {proposal.provenance.model} · prompt {proposal.provenance.promptId} ·
                computed at records revision {proposal.baseRevision}
              </p>
              <p>{proposal.text.length > 300 ? `${proposal.text.slice(0, 300)}…` : proposal.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Share packages ({data.sharePackages.length})</h2>
        <p className="hint">
          A package is a snapshot you can copy out. Making one sends nothing and gives nobody access to your records.
        </p>
        {data.sharePackages.length === 0 ? <p className="empty">None made.</p> : null}
        <ul className="record-list">
          {data.sharePackages.map((pkg) => (
            <li key={pkg.id}>
              <strong>{pkg.title}</strong>
              <p className="meta">Snapshot taken {formatDateTime(pkg.snapshotAt)}.</p>
              {pkg.structuralObstacle ? <p>Structural obstacle: {pkg.structuralObstacle}</p> : null}
              {pkg.supportRequest ? <p>Support request: {pkg.supportRequest}</p> : null}
            </li>
          ))}
        </ul>
        <p>
          <a href={href({ name: 'settings' })}>Make one, or export everything, in settings</a>
        </p>
      </section>
    </div>
  )
}

function HypothesisDecision({ id, status }: { id: string; status: HypothesisStatus }) {
  const { run } = useApp()
  const save = useSave()
  const [open, setOpen] = useState(false)
  const [next, setNext] = useState<HypothesisStatus>(status)
  const [note, setNote] = useState('')

  if (!open) {
    return (
      <>
        <button type="button" className="btn-quiet" onClick={() => setOpen(true)}>
          Decide what it now looks like
        </button>
        <SaveStatus state={save.state} />
      </>
    )
  }

  return (
    <div className="panel panel--quiet">
      <Field label="What does the evidence now suggest?">
        <select value={next} onChange={(e) => setNext(e.target.value as HypothesisStatus)}>
          {(Object.keys(HYPOTHESIS_STATUS_LABEL) as HypothesisStatus[]).map((value) => (
            <option key={value} value={value}>
              {HYPOTHESIS_STATUS_LABEL[value]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Why" optional hint="Kept in the history, so an earlier view is never silently overwritten.">
        <textarea value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="row">
        <button
          type="button"
          onClick={() =>
            void save
              .run(async () => {
                const result = await run((data, deps) =>
                  decideHypothesis(data, { id, status: next, ...(note.trim() !== '' ? { note } : {}) }, deps),
                )
                return result.ok ? { ok: true } : { ok: false, errors: result.errors }
              })
              .then((done) => {
                if (done) setOpen(false)
              })
          }
        >
          Record that
        </button>
        <button type="button" className="btn-quiet" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      <SaveStatus state={save.state} />
    </div>
  )
}

export { ConfirmButton }
