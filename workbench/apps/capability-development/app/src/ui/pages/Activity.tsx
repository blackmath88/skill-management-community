/**
 * One activity, shown as the flow it is: plan, rehearse if you want, try it, reflect.
 *
 * The page always says where the person is (`FlowSteps`) and boxes exactly one thing — the step
 * that is theirs to do now. Finished steps stay on the page as the record they became. Material
 * that supports the flow without being a step of it (the sparring partner, how the attempt is
 * counted, pausing and deleting) sits in labelled disclosures below, reachable and out of the way.
 *
 * Three product rules show up as interface behaviour here. An attempt can only be recorded once,
 * and "the cue never arrived" is offered as an ordinary outcome rather than hidden. A review asks
 * for a competing explanation and says why. And the plan becomes read-only once an attempt exists,
 * because rewriting a plan after the fact would make the record unreadable.
 */
import { useState } from 'react'
import {
  deleteActivity,
  deleteEvidence,
  recordAttempt,
  recordEvidence,
  saveReview,
  setActivityState,
  updateActivityPlan,
} from '~/application/commands'
import { planReadiness, PLAN_FIELD_LABEL, requiredPlanFields } from '~/domain/plan'
import { resumeStateFor } from '~/domain/transitions'
import {
  ASSISTANCE_LEVELS,
  ATTEMPT_OUTCOMES,
  EVIDENCE_KINDS,
  NEXT_MOVES,
  type ActivityPlan,
  type AssistanceLevel,
  type AttemptOutcome,
  type EvidenceKind,
  type NextMove,
} from '~/domain/types'
import { ConfirmButton, Field, formatDate, formatDateTime, KindTag, PageHead, RouteTag, SaveStatus, useSave } from '../primitives'
import { href, navigate } from '../router'
import { useApp } from '../state'
import {
  ACTIVITY_STATE_LABEL,
  ASSISTANCE_LABEL,
  EVIDENCE_LABEL,
  NEXT_MOVE_LABEL,
  OUTCOME_LABEL,
} from './labels'
import { RehearsalPanel } from './Rehearsal'
import { DISCUSSION_REHEARSAL } from '~/content/discussion'
import { MemoryOffer } from '../mobile/MobilePanel'
import { AiSparring } from './AiSparring'

export function ActivityPage({ id }: { id: string }) {
  const { state, content, run, models } = useApp()
  const activity = state.data.activities.find((a) => a.id === id)
  const save = useSave()

  if (!activity) {
    return (
      <section className="panel">
        <h1>That activity no longer exists</h1>
        <p>
          <a href={href({ name: 'home' })}>Go to the home screen</a>
        </p>
      </section>
    )
  }

  const attempt = state.data.attempts.find((a) => a.activityId === activity.id)
  const review = state.data.reviews.find((r) => r.activityId === activity.id)
  const situation = state.data.situations.find((s) => s.id === activity.situationId)
  const evidence = state.data.evidence.filter(
    (e) => e.activityId === activity.id || (attempt && e.attemptId === attempt.id) || (review && e.reviewId === review.id),
  )
  const template = activity.templateId
    ? content
        .campaigns()
        .flatMap((c) => c.steps)
        .find((s) => s.template?.id === activity.templateId)?.template
    : undefined
  const credit = models.experience.entries.find((entry) => entry.activityId === activity.id)

  return (
    <div className="stack">
      <PageHead kicker="Practice" title={activity.title}>
        <div className="row">
          <KindTag kind={activity.kind} />
          <RouteTag route={activity.route} />
          <span className="meta">{ACTIVITY_STATE_LABEL[activity.state]}</span>
        </div>
        {activity.kind === 'rehearsal' ? (
          <p>
            This is a rehearsal. It is recorded as preparation, and it is never recorded as something you did in your
            real situation.
          </p>
        ) : null}
        {situation ? (
          <p className="meta">
            On <a href={href({ name: 'situation', id: situation.id })}>{situation.title}</a>
            {situation.context === '' ? '' : ` · ${situation.context}`}
          </p>
        ) : null}
      </PageHead>

      <FlowSteps
        kind={activity.kind}
        planReady={planReadiness(activity.kind, activity.plan).ready}
        attempted={attempt !== undefined}
        reviewed={review !== undefined}
      />

      {activity.state === 'paused' ? (
        <p className="done-note">This is paused. Nothing is waiting for you; resume it under “Pause, abandon or delete” below.</p>
      ) : null}

      <PlanPanel activity={activity} locked={attempt !== undefined} />

      {activity.kind === 'rehearsal' && (template?.rehearsal || activity.state !== 'reviewed') ? (
        <RehearsalPanel script={template?.rehearsal} activityId={activity.id} />
      ) : null}

      {activity.kind === 'real-attempt' && !attempt && activity.state !== 'abandoned' ? (
        <details className="more">
          <summary>
            Rehearse your opening first <span className="meta">optional</span>
          </summary>
          <div className="more__body">
            <p className="hint">
              Try your first sentences against a scripted counterpart. Nothing typed here is saved, and a rehearsal is
              never counted as the real conversation.
            </p>
            <RehearsalPanel script={template?.rehearsal ?? DISCUSSION_REHEARSAL} />
          </div>
        </details>
      ) : null}

      {attempt ? (
        <section className="panel">
          <h2>What happened</h2>
          <dl className="pairs">
            <dt>Outcome</dt>
            <dd>{OUTCOME_LABEL[attempt.outcome]}</dd>
            <dt>Help used</dt>
            <dd>{ASSISTANCE_LABEL[attempt.assistance]}</dd>
            <dt>Recorded</dt>
            <dd>{formatDateTime(attempt.attemptedAt)}</dd>
          </dl>
          <p>{attempt.note === '' ? <span className="empty">No note.</span> : attempt.note}</p>
          <p className="meta">
            An attempt is history. It is recorded once and is not edited afterwards, so the record stays readable.
          </p>
        </section>
      ) : (
        <AttemptForm activityId={activity.id} kind={activity.kind} />
      )}

      {attempt && (activity.state === 'attempted' || activity.state === 'reviewed') ? (
        <ReviewPanel activityId={activity.id} />
      ) : null}
      {attempt && activity.state === 'abandoned' ? (
        <section className="panel panel--quiet">
          <h2>This activity was abandoned</h2>
          <p>
            What happened is still recorded above. Reviewing it would bring it back into what is waiting for you, so it
            is not offered here. If you want to return to this, a new activity is the way.
          </p>
        </section>
      ) : null}

      {review && activity.state === 'reviewed' ? (
        <section className="panel--accent" aria-labelledby="done-heading">
          <h2 id="done-heading">Reflection saved</h2>
          <p>
            You decided: <strong>{NEXT_MOVE_LABEL[review.nextMove].toLowerCase()}</strong>.{' '}
            {review.nextMove === 'pause' || review.nextMove === 'stop'
              ? 'Nothing is waiting for you on this.'
              : review.nextMove === 'escalate'
                ? 'That is a complete answer, not a lesser one.'
                : 'When the next occasion is in sight, you can plan it from here.'}
          </p>
          <div className="row">
            {review.nextMove === 'repeat' || review.nextMove === 'adapt' || review.nextMove === 'transfer' ? (
              <a className="btn btn--primary" href={href({ name: 'prepare', situationId: activity.situationId })}>
                Prepare the next attempt
              </a>
            ) : null}
            <a className="btn btn--quiet" href={href({ name: 'home' })}>
              Back to Home
            </a>
          </div>
          <MemoryOffer activityId={activity.id} />
        </section>
      ) : null}

      <section className="panel">
        <h2>Supporting evidence</h2>
        <p className="hint">
          Evidence is what the records can point at. Something somebody else said is kept separately from your own
          observation, and an account that contradicts yours is kept rather than resolved.
        </p>
        {evidence.length === 0 ? <p className="empty">Nothing attached.</p> : null}
        <ul className="record-list">
          {evidence.map((item) => (
            <li key={item.id}>
              <p>
                <span className="tag">{EVIDENCE_LABEL[item.kind]}</span>
              </p>
              <p>{item.text}</p>
              <p className="meta">
                {item.attribution ? `From: ${item.attribution}. ` : ''}
                Recorded {formatDateTime(item.recordedAt)}.{' '}
                {item.capabilityIds.length > 0
                  ? `Linked to: ${item.capabilityIds.map((cid) => content.capability(cid)?.title ?? cid).join(', ')}.`
                  : 'Not linked to a capability.'}
              </p>
              <ConfirmButton
                label="Delete this evidence"
                confirmLabel="Yes, delete it"
                onConfirm={() =>
                  void save.run(async () => {
                    const result = await run((data) => deleteEvidence(data, [item.id]))
                    return result.ok ? { ok: true } : { ok: false, errors: result.errors }
                  })
                }
              />
            </li>
          ))}
        </ul>
        <SaveStatus state={save.state} />
        <EvidenceForm activityId={activity.id} capabilityIds={activity.capabilityIds} />
      </section>

      {attempt ? (
        <details className="more">
          <summary>Think it through with the sparring partner</summary>
          <div className="more__body">
            <AiSparring
              purpose="review"
              activityId={activity.id}
              {...(attempt ? { attemptId: attempt.id } : {})}
              {...(review ? { reviewId: review.id } : {})}
              situationId={activity.situationId}
            />
          </div>
        </details>
      ) : null}

      {credit ? (
        <details className="more">
          <summary>How this is counted</summary>
          <div className="more__body">
        <section className="panel panel--quiet">
          <h2>Practice experience from this activity</h2>
          <p>
            <strong>{credit.credit}</strong> under {models.experience.policyLabel}.
          </p>
          <p className="meta">{credit.explanation}</p>
          <p className="meta">
            This number describes what you documented. It is not a measure of how well it went.{' '}
            <a href={href({ name: 'progress' })}>How this is counted</a>.
          </p>
        </section>
          </div>
        </details>
      ) : null}

      <details className="more">
        <summary>Pause, abandon or delete</summary>
        <div className="more__body">
      <section className="panel">
        <h2 className="visually-hidden">Pause, abandon or delete</h2>
        <div className="row">
          {activity.state !== 'paused' && activity.state !== 'reviewed' && activity.state !== 'abandoned' ? (
            <button
              type="button"
              className="btn-quiet"
              onClick={() =>
                void save.run(async () => {
                  const result = await run((data, deps) => setActivityState(data, { id: activity.id, state: 'paused' }, deps))
                  return result.ok ? { ok: true } : { ok: false, errors: result.errors }
                })
              }
            >
              Pause it
            </button>
          ) : null}
          {activity.state === 'paused' ? (
            <button
              type="button"
              className="btn-quiet"
              onClick={() =>
                void save.run(async () => {
                  // Back to where it actually was. Resuming an activity with an attempt into
                  // "planned" would contradict the attempt record.
                  const resumed = resumeStateFor({
                    hasAttempt: attempt !== undefined,
                    hasReview: review !== undefined,
                    planIsReady: planReadiness(activity.kind, activity.plan).ready,
                  })
                  const result = await run((data, deps) => setActivityState(data, { id: activity.id, state: resumed }, deps))
                  return result.ok ? { ok: true } : { ok: false, errors: result.errors }
                })
              }
            >
              Resume it
            </button>
          ) : null}
          {activity.state !== 'reviewed' && activity.state !== 'abandoned' ? (
            <ConfirmButton
              label="Abandon it"
              confirmLabel="Yes, abandon it"
              onConfirm={() =>
                void save.run(async () => {
                  const result = await run((data, deps) => setActivityState(data, { id: activity.id, state: 'abandoned' }, deps))
                  return result.ok ? { ok: true } : { ok: false, errors: result.errors }
                })
              }
            />
          ) : null}
          <ConfirmButton
            label="Delete it and everything attached"
            confirmLabel="Yes, delete it"
            onConfirm={() => {
              void save
                .run(async () => {
                  const result = await run((data) => deleteActivity(data, activity.id))
                  return result.ok ? { ok: true } : { ok: false, errors: result.errors }
                })
                .then((done) => {
                  if (done) navigate({ name: 'home' })
                })
            }}
          />
        </div>
        <p className="meta">
          Abandoning keeps the record and stops asking you about it. Deleting removes the activity, its attempt, its
          review and its evidence, and recalculates everything your records show.
        </p>
        <SaveStatus state={save.state} />
      </section>
        </div>
      </details>
    </div>
  )
}

const FLOW_LABELS: Record<'observation' | 'rehearsal' | 'real-attempt', readonly string[]> = {
  observation: ['Plan', 'Observe', 'Reflect'],
  rehearsal: ['Plan', 'Rehearse', 'Reflect'],
  'real-attempt': ['Plan', 'Rehearse', 'Try it', 'Reflect'],
}

/** Where this activity is. Text carries the state; the coloured rule only repeats it. */
function FlowSteps({
  kind,
  planReady,
  attempted,
  reviewed,
}: {
  kind: 'observation' | 'rehearsal' | 'real-attempt'
  planReady: boolean
  attempted: boolean
  reviewed: boolean
}) {
  const labels = FLOW_LABELS[kind]
  const last = labels.length - 1
  const tryIndex = last - 1
  const current = reviewed ? labels.length : attempted ? last : planReady ? tryIndex : 0
  return (
    <ol className="flow-steps" aria-label="Where this is">
      {labels.map((label, index) => {
        const optional = kind === 'real-attempt' && index === 1
        const done = optional ? attempted : index < current
        const now = index === current
        return (
          <li key={label} className={now ? 'is-current' : done ? 'is-done' : ''} {...(now ? { 'aria-current': 'step' as const } : {})}>
            <span className="flow-steps__label">{label}</span>
            <span className="flow-steps__state">
              {now ? 'now' : optional && !attempted ? 'optional' : done ? (optional ? 'behind you' : 'done') : 'to come'}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function PlanPanel({
  activity,
  locked,
}: {
  activity: { id: string; kind: 'observation' | 'rehearsal' | 'real-attempt'; plan: ActivityPlan; state: string }
  locked: boolean
}) {
  const { run } = useApp()
  const save = useSave()
  const [plan, setPlan] = useState<ActivityPlan>(activity.plan)
  // An unfinished plan opens ready to finish: that is the step the person is on.
  const [editing, setEditing] = useState(() => !locked && !planReadiness(activity.kind, activity.plan).ready)
  const required = requiredPlanFields(activity.kind)
  const readiness = planReadiness(activity.kind, plan)

  const fields = (['cue', 'action', 'obstacle', 'fallback', 'signal'] as const).filter(
    (f) => required.includes(f) || (activity.plan[f] ?? '') !== '',
  )

  if (locked || !editing) {
    return (
      <section className="panel">
        <h2>The plan</h2>
        <dl className="pairs">
          {fields.map((field) => (
            <div key={field} style={{ display: 'contents' }}>
              <dt>{PLAN_FIELD_LABEL[field].replace(/^a |^the /, '').replace(/^\w/, (c) => c.toUpperCase())}</dt>
              <dd>{activity.plan[field] === '' ? <span className="empty">—</span> : activity.plan[field]}</dd>
            </div>
          ))}
          <dt>Review date</dt>
          <dd>{activity.plan.reviewOn === '' ? <span className="empty">not set</span> : formatDate(activity.plan.reviewOn)}</dd>
        </dl>
        {locked ? (
          <p className="meta">
            An attempt has been recorded, so the plan is part of the record now and is not editable. That is deliberate:
            a plan rewritten afterwards could not be compared with what happened.
          </p>
        ) : (
          <button type="button" className="btn-quiet" onClick={() => setEditing(true)}>
            Edit the plan
          </button>
        )}
      </section>
    )
  }

  return (
    <section className="panel">
      <h2>The plan</h2>
      {fields.map((field) => (
        <Field
          key={field}
          label={PLAN_FIELD_LABEL[field].replace(/^a |^the /, '').replace(/^\w/, (c) => c.toUpperCase())}
          optional={!required.includes(field)}
        >
          <textarea value={plan[field]} onChange={(e) => setPlan({ ...plan, [field]: e.target.value })} />
        </Field>
      ))}
      <Field label="Review date">
        <input type="date" value={plan.reviewOn} onChange={(e) => setPlan({ ...plan, reviewOn: e.target.value })} />
      </Field>
      {!readiness.ready ? <p className="hint">To be ready this needs {readiness.missing.join(', ')}.</p> : null}
      <div className="row">
        <button
          type="button"
          onClick={() =>
            void save
              .run(async () => {
                const result = await run((data, deps) => updateActivityPlan(data, { id: activity.id, plan }, deps))
                return result.ok ? { ok: true } : { ok: false, errors: result.errors }
              })
              .then((done) => {
                if (done) setEditing(false)
              })
          }
        >
          Save the plan
        </button>
        <button
          type="button"
          className="btn-quiet"
          onClick={() => {
            setPlan(activity.plan)
            setEditing(false)
          }}
        >
          Discard these edits
        </button>
      </div>
      <SaveStatus state={save.state} />
    </section>
  )
}

function AttemptForm({ activityId, kind }: { activityId: string; kind: 'observation' | 'rehearsal' | 'real-attempt' }) {
  const { run } = useApp()
  const save = useSave()
  const [outcome, setOutcome] = useState<AttemptOutcome>('as-planned')
  const [note, setNote] = useState('')
  const [assistance, setAssistance] = useState<AssistanceLevel>('none')

  return (
    <section className="panel--accent">
      <h2>Record what happened</h2>
      <p className="hint">
        {kind === 'real-attempt'
          ? 'This can only be recorded once. “The cue never arrived” is a real answer and is recorded as one.'
          : 'This can only be recorded once. Recording that it did not happen is a useful answer.'}
      </p>
      <Field label="Outcome">
        <select value={outcome} onChange={(e) => setOutcome(e.target.value as AttemptOutcome)}>
          {ATTEMPT_OUTCOMES.map((value) => (
            <option key={value} value={value}>
              {OUTCOME_LABEL[value]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="What actually happened" hint="A couple of sentences is plenty. There is no credit for length.">
        <textarea value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Field label="Help you used" hint="Recorded so that assisted performance is never read as something you did unaided.">
        <select value={assistance} onChange={(e) => setAssistance(e.target.value as AssistanceLevel)}>
          {ASSISTANCE_LEVELS.map((value) => (
            <option key={value} value={value}>
              {ASSISTANCE_LABEL[value]}
            </option>
          ))}
        </select>
      </Field>
      <button
        type="button"
        onClick={() =>
          void save.run(async () => {
            const result = await run((data, deps) => recordAttempt(data, { activityId, outcome, note, assistance }, deps))
            return result.ok ? { ok: true } : { ok: false, errors: result.errors }
          })
        }
      >
        Record it
      </button>
      <SaveStatus state={save.state} />
    </section>
  )
}

function ReviewPanel({ activityId }: { activityId: string }) {
  const { state, run } = useApp()
  const save = useSave()
  const existing = state.data.reviews.find((r) => r.activityId === activityId)
  const [form, setForm] = useState({
    observation: existing?.observation ?? '',
    interpretation: existing?.interpretation ?? '',
    alternativeExplanation: existing?.alternativeExplanation ?? '',
    nextAdjustment: existing?.nextAdjustment ?? '',
  })
  const [nextMove, setNextMove] = useState<NextMove>(existing?.nextMove ?? 'adapt')
  const [editing, setEditing] = useState(existing === undefined)

  if (existing && !editing) {
    return (
      <section className="panel">
        <h2>Your review</h2>
        <dl className="pairs">
          <dt>Observed</dt>
          <dd>{existing.observation}</dd>
          <dt>You take it to mean</dt>
          <dd>{existing.interpretation === '' ? <span className="empty">—</span> : existing.interpretation}</dd>
          <dt>Competing explanation</dt>
          <dd>
            {existing.alternativeExplanation === '' ? (
              <span className="empty">none written — writing one would add 1 to practice experience</span>
            ) : (
              existing.alternativeExplanation
            )}
          </dd>
          <dt>Next adjustment</dt>
          <dd>{existing.nextAdjustment === '' ? <span className="empty">—</span> : existing.nextAdjustment}</dd>
          <dt>What you decided</dt>
          <dd>{NEXT_MOVE_LABEL[existing.nextMove]}</dd>
        </dl>
        <button type="button" className="btn-quiet" onClick={() => setEditing(true)}>
          Change the review
        </button>
      </section>
    )
  }

  return (
    <section className="panel--accent">
      <h2>Reflect on it</h2>
      <p className="hint">
        What you observed is kept apart from what you take it to mean, on purpose. The competing explanation is the part
        that does the work: it is what stops a single account from becoming the whole story.
      </p>
      <Field label="What you observed">
        <textarea value={form.observation} onChange={(e) => setForm({ ...form, observation: e.target.value })} />
      </Field>
      <Field label="What you take it to mean" optional>
        <textarea value={form.interpretation} onChange={(e) => setForm({ ...form, interpretation: e.target.value })} />
      </Field>
      <Field
        label="A competing explanation that also fits"
        optional
        hint="Optional, and it is the one thing in this app that adds practice experience on its own."
      >
        <textarea
          value={form.alternativeExplanation}
          onChange={(e) => setForm({ ...form, alternativeExplanation: e.target.value })}
        />
      </Field>
      <Field label="One adjustment for next time" optional>
        <textarea value={form.nextAdjustment} onChange={(e) => setForm({ ...form, nextAdjustment: e.target.value })} />
      </Field>
      <Field label="What you have decided to do">
        <select value={nextMove} onChange={(e) => setNextMove(e.target.value as NextMove)}>
          {NEXT_MOVES.map((value) => (
            <option key={value} value={value}>
              {NEXT_MOVE_LABEL[value]}
            </option>
          ))}
        </select>
      </Field>
      <button
        type="button"
        onClick={() =>
          void save
            .run(async () => {
              const result = await run((data, deps) => saveReview(data, { activityId, ...form, nextMove }, deps))
              return result.ok ? { ok: true } : { ok: false, errors: result.errors }
            })
            .then((done) => {
              if (done) setEditing(false)
            })
        }
      >
        Save the review
      </button>
      <SaveStatus state={save.state} />
    </section>
  )
}

function EvidenceForm({ activityId, capabilityIds }: { activityId: string; capabilityIds: string[] }) {
  const { run, content } = useApp()
  const save = useSave()
  const [kind, setKind] = useState<EvidenceKind>('self-observation')
  const [text, setText] = useState('')
  const [attribution, setAttribution] = useState('')
  const [linked, setLinked] = useState<string[]>(capabilityIds)
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button type="button" className="btn-quiet" onClick={() => setOpen(true)}>
        Attach evidence
      </button>
    )
  }

  const needsAttribution = kind === 'attributed-feedback' || kind === 'other-account'

  return (
    <div className="panel panel--quiet">
      <h3>Attach evidence</h3>
      <Field label="What kind">
        <select value={kind} onChange={(e) => setKind(e.target.value as EvidenceKind)}>
          {EVIDENCE_KINDS.map((value) => (
            <option key={value} value={value}>
              {EVIDENCE_LABEL[value]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="What it says">
        <textarea value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      {needsAttribution ? (
        <Field
          label="Whose account this is"
          hint="A role, not a name: “the service desk coordinator”. Contact details are refused."
        >
          <input type="text" value={attribution} onChange={(e) => setAttribution(e.target.value)} />
        </Field>
      ) : null}
      <fieldset>
        <legend>Capabilities this is evidence about</legend>
        <ul className="choice-list">
          {content.capabilities().map((capability) => (
            <li key={capability.id}>
              <label className="check">
                <input
                  type="checkbox"
                  checked={linked.includes(capability.id)}
                  onChange={() =>
                    setLinked(
                      linked.includes(capability.id)
                        ? linked.filter((c) => c !== capability.id)
                        : [...linked, capability.id],
                    )
                  }
                />
                {capability.title}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <div className="row">
        <button
          type="button"
          onClick={() =>
            void save
              .run(async () => {
                const result = await run((data, deps) =>
                  recordEvidence(
                    data,
                    {
                      activityId,
                      kind,
                      text,
                      ...(needsAttribution && attribution.trim() !== '' ? { attribution } : {}),
                      capabilityIds: linked,
                    },
                    deps,
                  ),
                )
                return result.ok ? { ok: true } : { ok: false, errors: result.errors }
              })
              .then((done) => {
                if (done) {
                  setText('')
                  setAttribution('')
                  setOpen(false)
                }
              })
          }
          disabled={text.trim() === ''}
        >
          Attach it
        </button>
        <button type="button" className="btn-quiet" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      <SaveStatus state={save.state} />
    </div>
  )
}
