/**
 * Practice: what is in motion.
 *
 * The overview of everything that is not finished — plans, attempts waiting for a reflection, the
 * running journey — and the working material that used to crowd Home: the explanations being
 * held open and the barriers the person has noticed. It reads the same development summary Home
 * does and adds no rules of its own.
 */
import { href } from '../router'
import { useApp } from '../state'
import { formatDate, KindTag, PageHead, ROUTE_LABEL, RouteTag } from '../primitives'
import { planReadiness } from '~/domain/plan'
import type { PracticeActivity } from '~/domain/types'
import { CAMPAIGN_STATE_LABEL, CONSTRAINT_LABEL } from './labels'

function whereItIs(activity: PracticeActivity): string {
  switch (activity.state) {
    case 'planned':
      return planReadiness(activity.kind, activity.plan).ready ? 'Planned' : 'Plan not finished'
    case 'ready':
      return 'Planned — waiting for the moment'
    case 'attempted':
      return 'Attempted — not reflected on yet'
    case 'reviewed':
      return 'Reflected on'
    case 'paused':
      return 'Paused'
    case 'abandoned':
      return 'Abandoned'
  }
}

export function PracticePage() {
  const { state, models, content } = useApp()
  const { summary } = models
  const { data } = state
  const open = data.activities.filter((a) => a.state !== 'reviewed' && a.state !== 'abandoned')
  const order = ['attempted', 'ready', 'planned', 'paused']
  open.sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state))
  const campaign = summary.activeCampaign ?? [...data.campaigns].reverse().find((c) => c.state === 'paused') ?? null
  const definition = campaign ? content.campaign(campaign.definitionId) : undefined
  const campaignSituation = campaign ? data.situations.find((s) => s.id === campaign.situationId) : undefined

  return (
    <div className="stack">
      <PageHead kicker="Practice" title="What you are working on">
        <p>One conversation at a time is plenty. Pausing and stopping are always available, on every screen.</p>
      </PageHead>
      <div className="row">
        <a className="btn btn--primary" href={href({ name: 'prepare' })}>
          Prepare a discussion
        </a>
        <a href={href({ name: 'new-situation' })}>Describe a situation in full</a>
      </div>

      <section className="panel" aria-labelledby="open-heading">
        <h2 id="open-heading">In progress</h2>
        {open.length === 0 ? (
          <p className="empty">
            Nothing is in progress. {data.activities.length === 0 ? 'Preparing one discussion is the way to begin.' : 'Everything you started has been reflected on or set aside.'}
          </p>
        ) : (
          <ul className="record-list">
            {open.map((activity) => (
              <li key={activity.id}>
                <div className="row">
                  <a href={href({ name: 'activity', id: activity.id })}>
                    <strong>{activity.title}</strong>
                  </a>
                  <KindTag kind={activity.kind} />
                  <RouteTag route={activity.route} />
                </div>
                <p className="meta">
                  {whereItIs(activity)}
                  {activity.plan.reviewOn !== '' ? ` · look back on ${formatDate(activity.plan.reviewOn)}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="journey-heading">
        <h2 id="journey-heading">Current journey</h2>
        {campaign ? (
          <div className="surface">
            <p>
              <strong>{definition?.title ?? campaign.definitionId}</strong>{' '}
              <span className="tag">{CAMPAIGN_STATE_LABEL[campaign.state]}</span>
            </p>
            <p className="meta">
              {summary.currentStepTitle && campaign.state === 'active' ? `You are at: ${summary.currentStepTitle}. ` : ''}
              {campaignSituation ? `On “${campaignSituation.title}”.` : ''}
            </p>
            <a className="btn btn--quiet" href={href({ name: 'campaign' })}>
              {campaign.state === 'active' ? 'Continue the journey' : 'Open the journey'}
            </a>
          </div>
        ) : (
          <p className="meta">
            No journey is running. A journey is a longer guided path through one situation — noticing, weighing
            explanations, rehearsing, trying. It starts from <a href={href({ name: 'situations' })}>a situation</a>, and
            you never need one to practise.
          </p>
        )}
      </section>

      {summary.openHypotheses.length > 0 ? (
        <section className="panel" aria-labelledby="hyp-heading">
          <h2 id="hyp-heading">Explanations you are holding open</h2>
          <ul className="record-list">
            {summary.openHypotheses.map((hypothesis) => (
              <li key={hypothesis.id}>
                <p>{hypothesis.text}</p>
                <p className="meta">
                  {ROUTE_LABEL[hypothesis.category]} · <a href={href({ name: 'records' })}>decide what it now looks like</a>
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {summary.constraintsNoticed.length > 0 ? (
        <section className="panel" aria-labelledby="barriers-heading">
          <h2 id="barriers-heading">Barriers you have noticed</h2>
          <p className="hint">
            Your own observations about conditions, recorded against your situations. They are not conclusions this
            app drew about you or your organisation.
          </p>
          <ul>
            {summary.constraintsNoticed.map((constraint) => (
              <li key={constraint}>{CONSTRAINT_LABEL[constraint]}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="meta">
        Looking for a way to think something through? <a href={href({ name: 'content' })}>Methods</a> are lenses you
        can pick up from any situation. What you have finished is under{' '}
        <a href={href({ name: 'repertoire' })}>Repertoire</a>.
      </p>
    </div>
  )
}
