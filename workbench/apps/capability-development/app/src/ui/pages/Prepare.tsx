/**
 * Prepare a difficult team discussion: the short way into one piece of practice.
 *
 * One screen, two parts — the discussion, then the plan — saved by a single command so there is
 * never a situation without its plan or a plan without its situation. It writes exactly the
 * records the longer screens write (a Situation and a real-attempt PracticeActivity) through the
 * same commands and the same validation; it is a shorter door, not a second model.
 *
 * A plan can be saved unfinished. The next screen says what is still missing rather than this
 * one refusing to let go, because a half-made plan that exists is more use than a complete one
 * the person abandoned at the form.
 */
import { useState } from 'react'
import { planActivity, recordSituation } from '~/application/commands'
import { emptyPlan, planReadiness } from '~/domain/plan'
import type { ActivityPlan } from '~/domain/types'
import { Field, PageHead, SaveStatus, useSave } from '../primitives'
import { href, navigate } from '../router'
import { useApp } from '../state'

function inAWeek(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function PreparePage({ situationId }: { situationId?: string }) {
  const { state, run, content } = useApp()
  const save = useSave()
  const [capabilityIds, setCapabilityIds] = useState<string[]>([])
  const existing = situationId ? state.data.situations.find((s) => s.id === situationId) : undefined
  const [about, setAbout] = useState({ title: '', context: '', description: '', desiredOutcome: '' })
  const [title, setTitle] = useState('')
  const [plan, setPlan] = useState<ActivityPlan>(() => ({ ...emptyPlan(), reviewOn: inAWeek() }))
  const readiness = planReadiness('real-attempt', plan)
  const set = (field: keyof ActivityPlan) => (e: { target: { value: string } }) => setPlan({ ...plan, [field]: e.target.value })

  if (situationId && !existing) {
    return (
      <section>
        <h1>That situation no longer exists</h1>
        <p>
          <a href={href({ name: 'prepare' })}>Prepare a new discussion</a>
        </p>
      </section>
    )
  }

  const submit = () =>
    void save.run(async () => {
      const result = await run((data, deps) => {
        let base = data
        let sid = existing?.id
        if (!sid) {
          const situation = recordSituation(
            data,
            {
              ...about,
              authority: 'unclear',
              decisionOwnership: 'unclear',
              challenge: 'other',
              constraints: [],
              supportAvailable: [],
            },
            deps,
          )
          if (!situation.ok) return situation
          base = situation.data
          sid = situation.value.id
        }
        return planActivity(
          base,
          {
            situationId: sid,
            route: 'shared-practice',
            kind: 'real-attempt',
            title: title.trim() !== '' ? title : `Raise it: ${existing?.title ?? about.title}`,
            plan,
            capabilityIds,
            methodIds: [],
          },
          deps,
        )
      })
      if (result.ok) navigate({ name: 'activity', id: result.value.id })
      return result.ok ? { ok: true } : { ok: false, errors: result.errors }
    })

  return (
    <div className="stack">
      <PageHead kicker="Practice" title={existing ? 'Prepare the next attempt' : 'Prepare a difficult discussion'}>
        <p>
          {existing
            ? 'Same situation, a fresh plan. What you learned last time is yours to use; nothing is carried over for you.'
            : 'A real one that is coming up. Write roles rather than names — “the project lead”, not who it is.'}
        </p>
      </PageHead>

      {existing ? (
        <section className="surface">
          <p className="kicker">The situation</p>
          <p>
            <a href={href({ name: 'situation', id: existing.id })}>
              <strong>{existing.title}</strong>
            </a>
            {existing.context !== '' ? <span className="meta"> · {existing.context}</span> : null}
          </p>
          {existing.desiredOutcome !== '' ? <p className="meta">You hoped for: {existing.desiredOutcome}</p> : null}
        </section>
      ) : (
        <section aria-labelledby="about-heading">
          <h2 id="about-heading">The discussion</h2>
          <Field label="What is it about?" hint="A few words you would recognise it by.">
            <input type="text" value={about.title} onChange={(e) => setAbout({ ...about, title: e.target.value })} />
          </Field>
          <Field label="Where, and with whom?" optional hint="The setting: “weekly team meeting”, “one-to-one with the project lead”.">
            <input type="text" value={about.context} onChange={(e) => setAbout({ ...about, context: e.target.value })} />
          </Field>
          <Field label="What makes it difficult?" optional>
            <textarea value={about.description} onChange={(e) => setAbout({ ...about, description: e.target.value })} />
          </Field>
          <Field label="What do you hope comes of it?" optional>
            <textarea value={about.desiredOutcome} onChange={(e) => setAbout({ ...about, desiredOutcome: e.target.value })} />
          </Field>
        </section>
      )}

      <section className="panel" aria-labelledby="plan-heading">
        <h2 id="plan-heading">Your plan</h2>
        <p className="hint">Short answers are fine. You can change any of this until you record what happened.</p>
        {existing ? (
          <Field label="What will you try this time?" optional hint="A short name for this attempt.">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
        ) : null}
        <Field label="When will you raise it?" hint="A moment you will recognise: “when we reach the roadmap item on Thursday”.">
          <textarea value={plan.cue} onChange={set('cue')} />
        </Field>
        <Field label="How will you open?" hint="Your first sentence or two, as you would actually say them.">
          <textarea value={plan.action} onChange={set('action')} />
        </Field>
        <Field label="What do you expect to get in the way?">
          <textarea value={plan.obstacle} onChange={set('obstacle')} />
        </Field>
        <Field label="If that happens, what will you do instead?" hint="Stopping, or taking it to somebody who can decide, are both legitimate.">
          <textarea value={plan.fallback} onChange={set('fallback')} />
        </Field>
        <Field label="What would tell you it moved?" hint="Something you could see or hear, so looking back is not a verdict on you.">
          <textarea value={plan.signal} onChange={set('signal')} />
        </Field>
        <Field label="When will you look back on it?">
          <input type="date" value={plan.reviewOn} onChange={set('reviewOn')} />
        </Field>

        <details className="more">
          <summary>
            Name what you are practising <span className="meta">optional</span>
          </summary>
          <div className="more__body">
            <p className="hint">
              Linking a capability is what lets this attempt appear under it in your repertoire. Leave it empty if
              none of these is the point; the attempt is recorded either way.
            </p>
            <ul className="choice-list">
              {content.capabilities().map((capability) => (
                <li key={capability.id}>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={capabilityIds.includes(capability.id)}
                      onChange={() =>
                        setCapabilityIds(
                          capabilityIds.includes(capability.id)
                            ? capabilityIds.filter((c) => c !== capability.id)
                            : [...capabilityIds, capability.id],
                        )
                      }
                    />
                    {capability.title}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </details>

        <div className="row">
          <button type="button" className="btn--primary btn--large" onClick={submit} disabled={save.state.kind === 'saving'}>
            Save the plan
          </button>
          <a href={href({ name: existing ? 'practice' : 'home' })}>Cancel</a>
        </div>
        {!readiness.ready ? (
          <p className="hint">
            You can save now and finish later. Still open: {readiness.missing.join(', ')}.
          </p>
        ) : null}
        <SaveStatus state={save.state} />
      </section>
    </div>
  )
}
