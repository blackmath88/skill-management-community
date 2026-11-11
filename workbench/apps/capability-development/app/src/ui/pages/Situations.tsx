/**
 * Situations: describe one, look at one, start a campaign on one.
 *
 * The form reveals the harder questions progressively: title and description first, the questions
 * about authority and barriers second. Somebody can save a situation after two fields.
 */
import { useState } from 'react'
import { AUTHORITY_LABEL, CHALLENGE_LABEL, CONSTRAINT_LABEL, OWNERSHIP_LABEL, SUPPORT_LABEL } from './labels'
import { ConfirmButton, Field, KindTag, PageHead, RouteTag, SaveStatus, useSave } from '../primitives'
import { href, navigate } from '../router'
import { useApp } from '../state'
import { deleteSituation, recordEvidence, recordSituation, startCampaign } from '~/application/commands'
import { CONSTRAINT_KINDS, SUPPORT_KINDS, type ChallengeKind, type ConstraintKind, type SupportKind } from '~/domain/types'
import { situationsWithoutCampaign } from '~/domain/summary'

export function SituationsPage() {
  const { state, models } = useApp()
  const situations = [...state.data.situations].reverse()
  const free = new Set(situationsWithoutCampaign(state.data).map((s) => s.id))
  return (
    <div className="stack">
      <PageHead kicker="Situations" title="Situations you are in">
        <p>
          A situation is something real you are dealing with. Everything else in this app hangs off one, so there is no
          profile to complete first.
        </p>
      </PageHead>
      <p>
        <a href={href({ name: 'new-situation' })}>Describe a situation</a>
      </p>
      {situations.length === 0 ? (
        <p className="empty">Nothing recorded yet.</p>
      ) : (
        <ul className="record-list">
          {situations.map((situation) => (
            <li key={situation.id}>
              <h2 className="h-small">
                <a href={href({ name: 'situation', id: situation.id })}>{situation.title}</a>
              </h2>
              <p className="meta">
                {situation.context === '' ? 'No setting recorded' : situation.context} · {CHALLENGE_LABEL[situation.challenge]}
                {free.has(situation.id) ? ' · no campaign running on it' : ''}
              </p>
              {situation.constraints.length > 0 ? (
                <p className="meta">Barriers you noticed: {situation.constraints.map((c) => CONSTRAINT_LABEL[c]).join('; ')}.</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {models.summary.activeCampaign ? (
        <p className="hint">
          One campaign runs at a time, so the home screen has one next step rather than several.{' '}
          <a href={href({ name: 'campaign' })}>Open the running campaign</a>.
        </p>
      ) : null}
    </div>
  )
}

export function NewSituationPage() {
  const { run } = useApp()
  const save = useSave()
  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState({
    title: '',
    description: '',
    context: '',
    desiredOutcome: '',
    authority: 'unclear' as const,
    decisionOwnership: 'unclear' as const,
    challenge: 'other' as ChallengeKind,
  })
  const [authority, setAuthority] = useState(form.authority as string)
  const [ownership, setOwnership] = useState(form.decisionOwnership as string)
  const [constraints, setConstraints] = useState<ConstraintKind[]>([])
  const [support, setSupport] = useState<SupportKind[]>([])

  const toggle = <T,>(list: T[], value: T, set: (next: T[]) => void) => {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  const submit = async () => {
    const ok = await save.run(async () => {
      const result = await run((data, deps) =>
        recordSituation(
          data,
          {
            title: form.title,
            description: form.description,
            context: form.context,
            desiredOutcome: form.desiredOutcome,
            authority: authority as typeof form.authority,
            decisionOwnership: ownership as typeof form.decisionOwnership,
            challenge: form.challenge,
            constraints,
            supportAvailable: support,
          },
          deps,
        ),
      )
      return result.ok ? { ok: true } : { ok: false, errors: result.errors }
    })
    if (ok) navigate({ name: 'situations' })
  }

  return (
    <div className="stack">
      <PageHead kicker="Situations" title="Describe a situation">
        <p>
          Two fields are enough to save this. The second set of questions is about what you are allowed to do and what
          is in the way; you can skip them.
        </p>
      </PageHead>

      <section className="panel">
        <h2>What is going on</h2>
        <Field label="A short title" hint="For example: “Three units keep reopening data-request approval”.">
          <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="What has actually happened" hint="What you observed, as distinct from what you think it means.">
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <Field label="The setting" optional hint="A label like “Cross-unit working group”. Used to notice when you practise in more than one setting.">
          <input type="text" value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} />
        </Field>
        <Field label="What you hope for" optional>
          <textarea value={form.desiredOutcome} onChange={(e) => setForm({ ...form, desiredOutcome: e.target.value })} />
        </Field>
        {step === 1 ? (
          <div className="row">
            <button type="button" onClick={() => setStep(2)}>
              Next: what you may do
            </button>
            <button type="button" className="btn-quiet" onClick={() => void submit()} disabled={form.title.trim() === ''}>
              Save it as it is
            </button>
          </div>
        ) : null}
      </section>

      {step === 2 ? (
        <>
          <section className="panel">
            <h2>What you may do here</h2>
            <Field label="Your room to act">
              <select value={authority} onChange={(e) => setAuthority(e.target.value)}>
                {Object.entries(AUTHORITY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Who owns the decision">
              <select value={ownership} onChange={(e) => setOwnership(e.target.value)}>
                {Object.entries(OWNERSHIP_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="What kind of challenge this is">
              <select value={form.challenge} onChange={(e) => setForm({ ...form, challenge: e.target.value as ChallengeKind })}>
                {Object.entries(CHALLENGE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </section>

          <section className="panel">
            <h2>What is in the way</h2>
            <p className="hint">
              Your own observations about the conditions. Recording one of these does not make it your responsibility to
              fix.
            </p>
            <fieldset>
              <legend>Barriers you have noticed</legend>
              <ul className="choice-list">
                {CONSTRAINT_KINDS.map((constraint) => (
                  <li key={constraint}>
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={constraints.includes(constraint)}
                        onChange={() => toggle(constraints, constraint, setConstraints)}
                      />
                      {CONSTRAINT_LABEL[constraint]}
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
            <fieldset>
              <legend>Support that might be available</legend>
              <ul className="choice-list">
                {SUPPORT_KINDS.map((kind) => (
                  <li key={kind}>
                    <label className="check">
                      <input type="checkbox" checked={support.includes(kind)} onChange={() => toggle(support, kind, setSupport)} />
                      {SUPPORT_LABEL[kind]}
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
            <button type="button" onClick={() => void submit()} disabled={form.title.trim() === ''}>
              Save this situation
            </button>
            <SaveStatus state={save.state} />
          </section>
        </>
      ) : (
        <SaveStatus state={save.state} />
      )}
    </div>
  )
}

/**
 * Applying a method to a situation in writing.
 *
 * The Progress page tells somebody with no records that "writing how a method applies to one of
 * your situations would record an exploration". Until this existed, it did not: evidence could
 * only be created from an activity, so the explored stage was unreachable and the instruction
 * pointed at nothing. Exploring before acting is the first move in the behavioural model, and it
 * should not require committing to an activity first.
 */
function ExploreMethod({ situationId }: { situationId: string }) {
  const { content, run } = useApp()
  const save = useSave()
  const [open, setOpen] = useState(false)
  const [methodId, setMethodId] = useState(content.methods()[0]?.id ?? '')
  const [response, setResponse] = useState('')
  const [linked, setLinked] = useState<string[]>([])
  const method = content.method(methodId)

  if (!open) {
    return (
      <section className="panel">
        <h2>Think it through with a method</h2>
        <p className="hint">
          Apply a lens to this situation in writing, before deciding whether to do anything. What you write is recorded
          as an exploration — something you thought about, not something you did.
        </p>
        <button type="button" className="btn-quiet" onClick={() => setOpen(true)}>
          Apply a method to this situation
        </button>
      </section>
    )
  }

  return (
    <section className="panel">
      <h2>Think it through with a method</h2>
      <Field label="Which lens">
        <select
          value={methodId}
          onChange={(e) => {
            setMethodId(e.target.value)
            setLinked(content.method(e.target.value)?.capabilityIds ?? [])
          }}
        >
          {content.methods().map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      </Field>
      {method ? (
        <>
          <p className="meta">{method.summary}</p>
          <p className="meta">What it does not establish: {method.limits}</p>
          <ul>
            {method.prompts.map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ul>
        </>
      ) : null}
      <Field label="What this lens says about your situation" hint="There is no credit for length. A few sentences is plenty.">
        <textarea value={response} onChange={(e) => setResponse(e.target.value)} />
      </Field>
      <fieldset>
        <legend>Capabilities this is about</legend>
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
          disabled={response.trim() === ''}
          onClick={() =>
            void save
              .run(async () => {
                const result = await run((data, deps) =>
                  recordEvidence(
                    data,
                    {
                      situationId,
                      kind: 'self-observation',
                      text: response,
                      ...(method ? { sourceRef: `Applied the method "${method.title}" to this situation` } : {}),
                      capabilityIds: linked,
                    },
                    deps,
                  ),
                )
                return result.ok ? { ok: true } : { ok: false, errors: result.errors }
              })
              .then((done) => {
                if (done) {
                  setResponse('')
                  setOpen(false)
                }
              })
          }
        >
          Save this exploration
        </button>
        <button type="button" className="btn-quiet" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      <p className="meta">
        An exploration records that you thought this through. It does not record that you did anything, and it never
        becomes a rehearsal or an attempt.
      </p>
      <SaveStatus state={save.state} />
    </section>
  )
}

export function SituationPage({ id }: { id: string }) {
  const { state, content, run, models } = useApp()
  const save = useSave()
  const situation = state.data.situations.find((s) => s.id === id)
  const [definitionId, setDefinitionId] = useState<string>('')

  if (!situation) {
    return (
      <section className="panel">
        <h1>That situation no longer exists</h1>
        <p>
          <a href={href({ name: 'situations' })}>Back to your situations</a>
        </p>
      </section>
    )
  }

  const activities = state.data.activities.filter((a) => a.situationId === situation.id)
  const campaigns = state.data.campaigns.filter((c) => c.situationId === situation.id)
  const hypotheses = state.data.hypotheses.filter((h) => h.situationId === situation.id)
  const suggested = content.campaignsForChallenge(situation.challenge)
  const offered = suggested.length > 0 ? suggested : content.campaigns()

  const begin = async () => {
    const chosen = definitionId || offered[0]?.id
    if (!chosen) return
    const ok = await save.run(async () => {
      const result = await run((data, deps) =>
        startCampaign(data, { situationId: situation.id, definitionId: chosen, ...(models.summary.activeDirection ? { directionId: models.summary.activeDirection.id } : {}) }, deps),
      )
      return result.ok ? { ok: true } : { ok: false, errors: result.errors }
    })
    if (ok) navigate({ name: 'campaign' })
  }

  return (
    <div className="stack">
      <PageHead kicker="Situation" title={situation.title} />
      <section className="panel">
        <p>{situation.description === '' ? <span className="empty">No description recorded.</span> : situation.description}</p>
        <dl className="pairs">
          <dt>Setting</dt>
          <dd>{situation.context === '' ? '—' : situation.context}</dd>
          <dt>You hope for</dt>
          <dd>{situation.desiredOutcome === '' ? '—' : situation.desiredOutcome}</dd>
          <dt>Your room to act</dt>
          <dd>{AUTHORITY_LABEL[situation.authority]}</dd>
          <dt>Decision ownership</dt>
          <dd>{OWNERSHIP_LABEL[situation.decisionOwnership]}</dd>
          <dt>Challenge</dt>
          <dd>{CHALLENGE_LABEL[situation.challenge]}</dd>
          <dt>Barriers you noticed</dt>
          <dd>{situation.constraints.length === 0 ? '—' : situation.constraints.map((c) => CONSTRAINT_LABEL[c]).join('; ')}</dd>
          <dt>Support available</dt>
          <dd>{situation.supportAvailable.length === 0 ? '—' : situation.supportAvailable.map((s) => SUPPORT_LABEL[s]).join('; ')}</dd>
        </dl>
      </section>

      <section className="panel">
        <h2>Campaigns</h2>
        {campaigns.length === 0 ? <p className="empty">None started on this situation.</p> : null}
        <ul className="record-list">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <strong>{content.campaign(campaign.definitionId)?.title ?? campaign.definitionId}</strong>
              <p className="meta">
                {campaign.state} · started from definition version {campaign.definitionVersion} ·{' '}
                <a href={href({ name: 'campaign' })}>open</a>
              </p>
            </li>
          ))}
        </ul>
        <Field label="Start a campaign" hint="A campaign is a bounded intention, not a course. You can pause or stop it at any step.">
          <select value={definitionId || (offered[0]?.id ?? '')} onChange={(e) => setDefinitionId(e.target.value)}>
            {offered.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.title}
              </option>
            ))}
          </select>
        </Field>
        <button type="button" onClick={() => void begin()}>
          Start it
        </button>
        <SaveStatus state={save.state} />
      </section>

      <ExploreMethod situationId={situation.id} />

      {hypotheses.length > 0 ? (
        <section className="panel">
          <h2>Explanations under test</h2>
          <ul className="record-list">
            {hypotheses.map((hypothesis) => (
              <li key={hypothesis.id}>
                <p>{hypothesis.text}</p>
                <p className="meta">
                  <RouteTag route={hypothesis.category} /> {hypothesis.status}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {activities.length > 0 ? (
        <section className="panel">
          <h2>Activities on this situation</h2>
          <ul className="record-list">
            {activities.map((activity) => (
              <li key={activity.id}>
                <div className="row">
                  <a href={href({ name: 'activity', id: activity.id })}>{activity.title}</a>
                  <KindTag kind={activity.kind} />
                  <RouteTag route={activity.route} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel panel--caution">
        <h2>Delete this situation</h2>
        <p>
          This removes the situation and everything attached to it: {campaigns.length} campaign(s), {hypotheses.length}{' '}
          explanation(s) under test, {activities.length} activity/activities, their attempts, reviews and evidence, and
          any confirmed strength whose only examples were among them. Everything your records show about those
          capabilities is recalculated, so any claim they supported disappears with them. This cannot be undone.
        </p>
        <ConfirmButton
          label="Delete this situation and everything attached"
          confirmLabel="Yes, delete it all"
          onConfirm={() => {
            void save
              .run(async () => {
                const result = await run((data) => deleteSituation(data, situation.id))
                return result.ok ? { ok: true } : { ok: false, errors: result.errors }
              })
              .then((done) => {
                if (done) navigate({ name: 'situations' })
              })
          }}
        />
      </section>
    </div>
  )
}
