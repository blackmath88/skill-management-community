/**
 * Home: the next useful action, and nothing that rewards coming back.
 *
 * There is no streak, no daily goal and no count of visits. The suggestions come from the
 * development summary, each with the reason it is being suggested, and a suggestion about
 * conditions says so rather than being dressed up as a personal training need.
 */
import { href } from '../router'
import { useApp } from '../state'
import { formatDate, KindTag, ROUTE_LABEL, RouteTag } from '../primitives'
import { CONSTRAINT_LABEL } from './labels'
import type { NextAction } from '~/domain/summary'

function actionHref(action: NextAction): string {
  switch (action.kind) {
    case 'review-attempt':
    case 'record-attempt':
    case 'finish-plan':
      return action.activityId ? href({ name: 'activity', id: action.activityId }) : href({ name: 'home' })
    case 'continue-campaign':
      return href({ name: 'campaign' })
    case 'describe-situation':
      return href({ name: 'new-situation' })
    case 'start-campaign':
      return href({ name: 'situations' })
    case 'decide-hypothesis':
      return href({ name: 'records' })
    case 'choose-direction':
      return href({ name: 'settings' })
    case 'nothing-pending':
      return href({ name: 'records' })
  }
}

export function HomePage() {
  const { models, state, presentation } = useApp()
  const { summary } = models

  return (
    <div className="stack">
      <header>
        <p className="kicker">Home</p>
        <h1>{summary.activeDirection ? summary.activeDirection.text : 'What would be useful next?'}</h1>
        {summary.activeDirection ? (
          <p className="meta">
            Your direction, in your words. It is an aspiration you can revise or retire, not something we inferred
            about you.
          </p>
        ) : (
          <p className="lede">
            You can start from a situation you are actually in. A direction is optional and can come later.
          </p>
        )}
      </header>

      <section className="panel panel--accent">
        <h2>Next</h2>
        <ul className="record-list">
          {summary.nextActions.map((action) => (
            <li key={`${action.kind}-${action.activityId ?? action.campaignId ?? ''}`}>
              <div className="row">
                <strong>{action.label}</strong>
                {action.route ? <RouteTag route={action.route} /> : null}
              </div>
              <p className="meta">{action.reason}</p>
              {action.kind === 'nothing-pending' ? null : (
                <a href={actionHref(action)}>
                  {action.kind === 'review-attempt'
                    ? 'Open the review'
                    : action.kind === 'record-attempt'
                      ? 'Record what happened'
                      : action.kind === 'continue-campaign'
                        ? 'Open the campaign'
                        : 'Open'}
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>

      {summary.awaitingReview.length + summary.awaitingAttempt.length > 0 ? (
        <section className="panel">
          <h2>Waiting on you</h2>
          <ul className="record-list">
            {[...summary.awaitingReview, ...summary.awaitingAttempt].map((activity) => (
              <li key={activity.id}>
                <div className="row">
                  <a href={href({ name: 'activity', id: activity.id })}>{activity.title}</a>
                  <KindTag kind={activity.kind} />
                  <RouteTag route={activity.route} />
                </div>
                <p className="meta">
                  {activity.plan.reviewOn ? `Review date ${formatDate(activity.plan.reviewOn)}.` : 'No review date set.'}{' '}
                  {activity.state === 'attempted' ? 'Attempted; not reviewed yet.' : 'Planned; not attempted yet.'}
                </p>
              </li>
            ))}
          </ul>
          <p className="hint">
            Nothing here is overdue in a way that counts against you. Recording that something did not happen is a
            useful answer.
          </p>
        </section>
      ) : null}

      {summary.constraintsNoticed.length > 0 ? (
        <section className="panel">
          <h2>Barriers you have noticed</h2>
          <p className="hint">
            These are your own observations about conditions, recorded against your situations. They are not conclusions
            this app drew about you or your organisation.
          </p>
          <ul>
            {summary.constraintsNoticed.map((constraint) => (
              <li key={constraint}>{CONSTRAINT_LABEL[constraint]}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel panel--quiet">
        <h2>What is recorded</h2>
        <dl className="pairs">
          <dt>Situations</dt>
          <dd>{summary.counts.situations}</dd>
          <dt>Activities</dt>
          <dd>{summary.counts.activities}</dd>
          <dt>Real attempts</dt>
          <dd>{summary.counts.realAttempts}</dd>
          <dt>Rehearsals</dt>
          <dd>{summary.counts.rehearsals}</dd>
          <dt>Reviews</dt>
          <dd>{summary.counts.reviews}</dd>
          <dt>Evidence items</dt>
          <dd>{summary.counts.evidence}</dd>
          <dt>Practice experience</dt>
          <dd>
            {presentation.experienceTotal} (convention v{presentation.experiencePolicyVersion}) ·{' '}
            <a href={href({ name: 'progress' })}>how this is counted</a>
          </dd>
        </dl>
        <p className="meta">
          Counts and practice experience describe what you documented. They do not describe how well anything went, and
          nothing here is an assessment. {state.namespace === 'demo' ? 'These are the fictional demo records.' : ''}
        </p>
      </section>

      {summary.openHypotheses.length > 0 ? (
        <section className="panel">
          <h2>Explanations you are holding open</h2>
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
    </div>
  )
}
