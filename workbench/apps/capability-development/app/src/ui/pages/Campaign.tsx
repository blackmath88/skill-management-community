/**
 * The running campaign: the current step, its branches, and the activity it offers.
 *
 * Three things this screen has to get right. A branch about conditions must read as a real answer
 * rather than a lesser one, which is why the step's route note is shown prominently and the
 * branch carries its route as text. A rehearsal must be unmistakably a rehearsal. And pausing or
 * stopping must always be available, at every step, without being buried.
 */
import { useState } from 'react'
import { advanceCampaign, planActivity, setCampaignState } from '~/application/commands'
import { emptyPlan, planReadiness, PLAN_FIELD_LABEL, requiredPlanFields } from '~/domain/plan'
import type { ActivityPlan } from '~/domain/types'
import type { CampaignChoice, CampaignStep } from '~/content/types'
import { ConfirmButton, Field, KindTag, PageHead, ROUTE_LABEL, RouteTag, SaveStatus, useSave } from '../primitives'
import { href, navigate } from '../router'
import { useApp } from '../state'
import { CAMPAIGN_STATE_LABEL, CONSTRAINT_LABEL } from './labels'
import { RehearsalPanel } from './Rehearsal'

export function CampaignPage() {
  const { state, content, run } = useApp()
  const save = useSave()
  const campaign =
    state.data.campaigns.find((c) => c.state === 'active') ??
    [...state.data.campaigns].reverse().find((c) => c.state === 'paused') ??
    [...state.data.campaigns].reverse()[0]

  if (!campaign) {
    return (
      <div className="stack">
        <PageHead kicker="Campaign" title="No campaign yet">
          <p>
            A campaign starts from a situation. <a href={href({ name: 'situations' })}>Pick one, or describe a new one</a>.
          </p>
        </PageHead>
      </div>
    )
  }

  const definition = content.campaign(campaign.definitionId)
  const situation = state.data.situations.find((s) => s.id === campaign.situationId)
  const step = campaign.currentStepId ? content.step(campaign.definitionId, campaign.currentStepId) : undefined
  const activities = state.data.activities.filter((a) => a.campaignId === campaign.id)

  const setState_ = (next: 'paused' | 'active' | 'abandoned') =>
    void save.run(async () => {
      const result = await run((data, deps) => setCampaignState(data, { campaignId: campaign.id, state: next }, deps))
      return result.ok ? { ok: true } : { ok: false, errors: result.errors }
    })

  return (
    <div className="stack">
      <PageHead kicker="Campaign" title={definition?.title ?? campaign.definitionId}>
        <p>{campaign.purpose}</p>
        <p className="meta">
          {CAMPAIGN_STATE_LABEL[campaign.state]} · on{' '}
          {situation ? <a href={href({ name: 'situation', id: situation.id })}>{situation.title}</a> : 'a situation that was deleted'} ·
          content version {campaign.definitionVersion}
        </p>
      </PageHead>

      {definition ? (
        <section className="panel panel--quiet">
          <h2>What this campaign does not do</h2>
          <p>{definition.limits}</p>
        </section>
      ) : null}

      {campaign.state === 'completed' || campaign.state === 'abandoned' ? (
        <section className="panel">
          <h2>This campaign is {campaign.state === 'completed' ? 'closed' : 'stopped'}</h2>
          <p>
            Your situation, notes, explanations and activities are all still here. Nothing was deleted by closing the
            campaign.
          </p>
          <p>
            <a href={href({ name: 'situations' })}>Start another one on a situation</a>
          </p>
        </section>
      ) : null}

      {campaign.state === 'paused' ? (
        <section className="panel panel--caution">
          <h2>Paused</h2>
          <p>Nothing is waiting for you while this is paused.</p>
          <button type="button" onClick={() => setState_('active')}>
            Resume it
          </button>
          <SaveStatus state={save.state} />
        </section>
      ) : null}

      {campaign.state === 'active' && !step && campaign.currentStepId ? (
        <section className="panel panel--caution" role="alert">
          <h2>This step is not in the installed content</h2>
          <p>
            The campaign is at step <code>{campaign.currentStepId}</code>, which the installed content packs do not
            contain. Your records are intact and readable. You can pause or stop the campaign; nothing else here can
            move it on.
          </p>
        </section>
      ) : null}

      {campaign.state === 'active' && step ? (
        <StepPanel
          // Keyed by step id so the form state does not survive from one step into the next:
          // without it, the real-attempt form opened pre-filled with the rehearsal's title and
          // plan, and saving it recorded an activity describing something else entirely.
          key={`${campaign.id}:${step.id}`}
          step={step}
          onChoose={(choice, hypothesisText, acceptSeeds) =>
            save.run(async () => {
              const result = await run((data, deps) =>
                advanceCampaign(
                  data,
                  {
                    campaignId: campaign.id,
                    choiceId: choice.id,
                    acceptSeeds,
                    ...(hypothesisText !== undefined ? { hypothesisText } : {}),
                  },
                  deps,
                ),
              )
              return result.ok ? { ok: true } : { ok: false, errors: result.errors }
            })
          }
          campaignId={campaign.id}
          situationId={campaign.situationId}
          saveState={save.state}
        />
      ) : null}

      {activities.length > 0 ? (
        <section className="panel">
          <h2>What you have planned or done in this campaign</h2>
          <ul className="record-list">
            {activities.map((activity) => (
              <li key={activity.id}>
                <div className="row">
                  <a href={href({ name: 'activity', id: activity.id })}>{activity.title}</a>
                  <KindTag kind={activity.kind} />
                  <RouteTag route={activity.route} />
                </div>
                <p className="meta">{activity.state}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel">
        <h2>The path you took</h2>
        <ol>
          {campaign.path.map((entry, index) => {
            const pathStep = content.step(campaign.definitionId, entry.stepId)
            const choice = pathStep?.choices.find((c) => c.id === entry.choiceId)
            return (
              <li key={`${entry.stepId}-${index}`}>
                {pathStep?.title ?? entry.stepId}
                {choice ? (
                  <>
                    {' — you chose '}
                    <em>{choice.label}</em> <RouteTag route={choice.route} />
                  </>
                ) : (
                  <span className="meta"> — current step</span>
                )}
              </li>
            )
          })}
        </ol>
      </section>

      {campaign.state === 'active' || campaign.state === 'paused' ? (
        <section className="panel panel--quiet">
          <h2>Stop or pause</h2>
          <p>
            Stopping a campaign is a legitimate outcome, not a failure. Your situation, notes and activities stay
            exactly as they are either way.
          </p>
          <div className="row">
            {campaign.state === 'active' ? (
              <button type="button" className="btn-quiet" onClick={() => setState_('paused')}>
                Pause it
              </button>
            ) : null}
            <ConfirmButton label="Stop this campaign" confirmLabel="Yes, stop it" onConfirm={() => setState_('abandoned')} />
          </div>
          <SaveStatus state={save.state} />
        </section>
      ) : null}
    </div>
  )
}

function StepPanel({
  step,
  campaignId,
  situationId,
  onChoose,
  saveState,
}: {
  step: CampaignStep
  campaignId: string
  situationId: string
  onChoose: (choice: CampaignChoice, hypothesisText: string | undefined, acceptSeeds: boolean) => Promise<boolean>
  saveState: ReturnType<typeof useSave>['state']
}) {
  const [pending, setPending] = useState<CampaignChoice | null>(null)
  const [hypothesisText, setHypothesisText] = useState('')
  const [keepSeeds, setKeepSeeds] = useState(true)

  const start = (choice: CampaignChoice) => {
    if (choice.seedHypothesis || (choice.seedConstraints && choice.seedConstraints.length > 0)) {
      setPending(choice)
      setHypothesisText(choice.seedHypothesis?.text ?? '')
      setKeepSeeds(true)
      return
    }
    void onChoose(choice, undefined, true)
  }

  return (
    <section className="panel panel--accent">
      <p className="kicker">Step · {step.kind}</p>
      <h2>{step.title}</h2>
      <p className="meta">{step.intent}</p>
      <p>{step.prompt}</p>

      {step.routeNote ? (
        <div className="panel panel--quiet">
          <h3>Before you choose</h3>
          <p>{step.routeNote}</p>
        </div>
      ) : null}

      {step.template ? (
        <TemplateOffer key={step.template.id} step={step} campaignId={campaignId} situationId={situationId} />
      ) : null}

      {pending ? (
        <div className="panel">
          <h3>Keep this as an explanation to test?</h3>
          {pending.seedHypothesis ? (
            <>
              <p className="meta">
                This would be saved as an explanation under test — {ROUTE_LABEL[pending.seedHypothesis.category]}. It is
                a possibility, not a finding. Edit the wording or reject it.
              </p>
              <Field label="The explanation, in whatever words you want">
                <textarea value={hypothesisText} onChange={(e) => setHypothesisText(e.target.value)} />
              </Field>
            </>
          ) : null}
          {pending.seedConstraints && pending.seedConstraints.length > 0 ? (
            <p className="meta">
              This would also record against your situation that you noticed:{' '}
              {pending.seedConstraints.map((c) => CONSTRAINT_LABEL[c]).join('; ')}.
            </p>
          ) : null}
          <label className="check">
            <input type="checkbox" checked={keepSeeds} onChange={(e) => setKeepSeeds(e.target.checked)} />
            Keep what is described above
          </label>
          <div className="row">
            <button
              type="button"
              onClick={() => {
                const choice = pending
                setPending(null)
                void onChoose(choice, keepSeeds && choice.seedHypothesis ? hypothesisText : undefined, keepSeeds)
              }}
            >
              Continue
            </button>
            <button type="button" className="btn-quiet" onClick={() => setPending(null)}>
              Go back to the options
            </button>
          </div>
        </div>
      ) : (
        <div className="branch">
          {step.choices.map((choice) => (
            <button key={choice.id} type="button" onClick={() => start(choice)}>
              <span className="branch__label">{choice.label}</span>
              {choice.hint ? <span className="branch__hint">{choice.hint}</span> : null}
              <span className="branch__route">
                {ROUTE_LABEL[choice.route]}
                {choice.nextStepId === null ? ' · closes the campaign' : ''}
              </span>
            </button>
          ))}
        </div>
      )}
      <SaveStatus state={saveState} />
    </section>
  )
}

function TemplateOffer({ step, campaignId, situationId }: { step: CampaignStep; campaignId: string; situationId: string }) {
  const { state, run } = useApp()
  const save = useSave()
  const template = step.template
  const existing = state.data.activities.find((a) => a.campaignId === campaignId && a.templateId === template?.id)
  const [plan, setPlan] = useState<ActivityPlan>(() => ({ ...emptyPlan(), ...(template?.suggestedPlan ?? {}) }))
  const [title, setTitle] = useState(template?.title ?? '')

  if (!template) return null
  if (existing) {
    return (
      <div className="panel panel--quiet">
        <h3>This step’s activity</h3>
        <p>
          <a href={href({ name: 'activity', id: existing.id })}>{existing.title}</a> <KindTag kind={existing.kind} /> —{' '}
          {existing.state}
        </p>
      </div>
    )
  }

  const required = requiredPlanFields(template.kind)
  const readiness = planReadiness(template.kind, plan)

  const create = async () => {
    // The created activity comes from the command's own result, not from a re-read of the
    // component's snapshot, which would be the state from before the save.
    let createdId: string | null = null
    const ok = await save.run(async () => {
      const result = await run((data, deps) =>
        planActivity(
          data,
          {
            situationId,
            campaignId,
            stepId: step.id,
            templateId: template.id,
            route: template.route,
            kind: template.kind,
            title,
            plan,
            capabilityIds: template.capabilityIds,
            methodIds: template.methodIds,
          },
          deps,
        ),
      )
      if (result.ok) createdId = result.value.id
      return result.ok ? { ok: true } : { ok: false, errors: result.errors }
    })
    if (ok && createdId !== null) navigate({ name: 'activity', id: createdId })
  }

  return (
    <>
      {/* The step's prompt refers to the counterpart "below", so the scripted exchange belongs
          here rather than only on the activity page after saving. It writes nothing either way. */}
      {template.rehearsal ? <RehearsalPanel script={template.rehearsal} /> : null}
      <div className={template.kind === 'rehearsal' ? 'panel panel--rehearsal' : 'panel'}>
      <div>
        <div className="row">
          <h3>{template.kind === 'rehearsal' ? 'Record this rehearsal' : 'An activity this step offers'}</h3>
          <KindTag kind={template.kind} />
          <RouteTag route={template.route} />
        </div>
        {template.kind === 'rehearsal' && template.rehearsal ? (
          <p className="meta">{template.rehearsal.note}</p>
        ) : template.kind === 'real-attempt' ? (
          <p className="meta">
            This one happens with real people. The suggestions below are a starting point; change them to match what you
            would actually do.
          </p>
        ) : (
          <p className="meta">
            Watching without trying to change anything is a real activity. The suggestions below are a starting point.
          </p>
        )}
        <Field label="Title">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        {(['cue', 'action', 'obstacle', 'fallback', 'signal'] as const).map((field) =>
          required.includes(field) || (plan[field] ?? '') !== '' ? (
            <Field
              key={field}
              label={PLAN_FIELD_LABEL[field].replace(/^a |^the /, '').replace(/^\w/, (c) => c.toUpperCase())}
              optional={!required.includes(field)}
            >
              <textarea value={plan[field]} onChange={(e) => setPlan({ ...plan, [field]: e.target.value })} />
            </Field>
          ) : null,
        )}
        <Field label="Review date" hint="When you will come back to this, whatever happened by then.">
          <input type="date" value={plan.reviewOn} onChange={(e) => setPlan({ ...plan, reviewOn: e.target.value })} />
        </Field>
        {!readiness.ready ? (
          <p className="hint">
            You can save this now; it will be marked as still being planned. To be ready it needs{' '}
            {readiness.missing.join(', ')}.
          </p>
        ) : null}
        <button type="button" onClick={() => void create()} disabled={title.trim() === ''}>
          Save this activity
        </button>
        <SaveStatus state={save.state} />
      </div>
      </div>
    </>
  )
}
